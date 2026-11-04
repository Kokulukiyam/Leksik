// Intègre au jeu les images Commons validées par les deux vérifications.
//
// Entrées :
//   scripts/termes-candidats.json             termes proposés
//   tmp/commons/<termId>/meta.json + NN.jpg   candidates téléchargées (scripts/commons.mjs)
//   tmp/verif/premiere/<termId>.json          première vérification
//   tmp/verif/contre/*.json                   contre-vérification indépendante
// Sorties :
//   public/images/commons/<termId>-<NN>.webp, data/terms.json, data/images.json, VERIFICATION.md
//
// Les images ajoutées depuis l'interface (source « perso ») et les termes qu'elles utilisent sont conservés.
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const TMP = path.join(ROOT, "tmp");
const lireJson = async (f, defaut) => {
  try {
    return JSON.parse(await fs.readFile(f, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT" && defaut !== undefined) return defaut;
    throw e;
  }
};

const candidats = await lireJson(path.join(ROOT, "scripts", "termes-candidats.json"));
const termsActuels = await lireJson(path.join(ROOT, "data", "terms.json"), []);
const imagesActuelles = await lireJson(path.join(ROOT, "data", "images.json"), []);

// Contre-vérification : clé "<termId>/<NN>" -> { accord, raison }
const contre = new Map();
for (const f of await fs.readdir(path.join(TMP, "verif", "contre")).catch(() => [])) {
  if (!f.endsWith(".json")) continue;
  for (const r of await lireJson(path.join(TMP, "verif", "contre", f))) contre.set(r.cle, r);
}

// Entrée d'images.json ; si l'image existe déjà (modifiée depuis /gerer), ses réglages sont conservés.
function entree(terme, nn, fichier, c, v1, v2) {
  const id = `${terme.id}-${nn}`;
  const actuelle = imagesActuelles.find((i) => i.id === id);
  return {
    id,
    termId: actuelle?.termId ?? terme.id,
    fichier,
    rectangle: actuelle ? actuelle.rectangle : (v1.rectangle ?? null),
    lieu: actuelle?.lieu ?? v1.lieu ?? "",
    source: "commons",
    auteur: c.auteur,
    licence: c.licence,
    lienSource: c.lien,
    statut: actuelle?.statut ?? "validée",
    note: actuelle?.note ?? `Vérification : ${v1.note} Contre-vérification : ${v2.raison}`,
  };
}

const imagesCommons = [];
const rapport = [];
const abandonnes = [];
const sansContre = [];

for (const terme of candidats) {
  const meta = await lireJson(path.join(TMP, "commons", terme.id, "meta.json"), { candidats: [] });
  const premiere = await lireJson(path.join(TMP, "verif", "premiere", `${terme.id}.json`), { candidats: [] });
  const verdicts = new Map(premiere.candidats.map((c) => [c.fichier, c]));
  const lignes = [];
  let retenues = 0;
  for (const c of meta.candidats) {
    const nn = c.fichier.replace(/\.jpg$/, "");
    const v1 = verdicts.get(c.fichier);
    const v2 = contre.get(`${terme.id}/${nn}`);
    if (v1?.verdict === "validée" && !v2) sansContre.push(`${terme.id}/${nn}`);
    const ok = v1?.verdict === "validée" && v2?.accord === true;
    lignes.push({ nn, c, v1, v2, ok });
    if (!ok) continue;
    retenues++;
    const fichier = `commons/${terme.id}-${nn}.webp`;
    // Déjà converti (ex. reprise sur une autre machine) : rien à faire. Sinon, depuis la candidate
    // téléchargée, ou en la retéléchargeant depuis Commons si elle n'est plus là.
    const cible = path.join(ROOT, "public", "images", fichier);
    const exists = (f) => fs.stat(f).then(() => true, () => false);
    if (await exists(cible)) {
      imagesCommons.push(entree(terme, nn, fichier, c, v1, v2));
      continue;
    }
    let source = path.join(TMP, "commons", terme.id, c.fichier);
    if (!(await exists(source))) {
      const rep = await fetch(c.url, { headers: { "User-Agent": "LeksikBot/0.1 (outil local de vocabulaire architectural; usage personnel)" } });
      if (!rep.ok) throw new Error(`Téléchargement impossible (${rep.status}) : ${c.url}`);
      source = Buffer.from(await rep.arrayBuffer());
    }
    await sharp(source).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(cible);
    imagesCommons.push(entree(terme, nn, fichier, c, v1, v2));
  }
  if (!retenues) abandonnes.push(terme);
  rapport.push({ terme, lignes, retenues });
}

if (sansContre.length) {
  console.warn(`En attente de contre-vérification (non intégrées pour l'instant) : ${sansContre.join(", ")}`);
}

// Termes : ceux qui ont au moins une image Commons retenue, plus ceux utilisés par mes photos.
const perso = imagesActuelles.filter((i) => i.source === "perso");
const idsUtiles = new Set([...imagesCommons.map((i) => i.termId), ...perso.map((i) => i.termId)]);
const terms = [];
for (const t of candidats) {
  const actuel = termsActuels.find((x) => x.id === t.id);
  if (idsUtiles.has(t.id)) terms.push(actuel ?? { id: t.id, terme: t.terme, definition: t.definition, categorie: t.categorie });
}
for (const t of termsActuels) if (idsUtiles.has(t.id) && !terms.some((x) => x.id === t.id)) terms.push(t);

// Supprime les anciens fichiers Commons qui ne sont plus utilisés.
const garder = new Set(imagesCommons.map((i) => path.basename(i.fichier)));
for (const f of await fs.readdir(path.join(ROOT, "public", "images", "commons"))) {
  if (!garder.has(f)) await fs.rm(path.join(ROOT, "public", "images", "commons", f));
}

await fs.writeFile(path.join(ROOT, "data", "terms.json"), JSON.stringify(terms, null, 2) + "\n");
await fs.writeFile(path.join(ROOT, "data", "images.json"), JSON.stringify([...imagesCommons, ...perso], null, 2) + "\n");

// VERIFICATION.md
const md = [
  "# Vérification des images",
  "",
  "Chaque image candidate venue de Wikimedia Commons a été examinée deux fois :",
  "",
  "1. **Première vérification** : l'image est regardée (et non seulement son titre), décrite, comparée à la définition et aux métadonnées Commons, contrôlée contre les confusions fréquentes ; si un rectangle est placé, l'image est revue avec le rectangle dessiné.",
  "2. **Contre-vérification** : un agent distinct reçoit seulement l'image (avec son rectangle), le terme et sa définition, sans la note de la première vérification, et décide indépendamment.",
  "",
  "Une image n'est retenue que si les deux vérifications la valident.",
  "",
  `Résultat : ${terms.filter((t) => imagesCommons.some((i) => i.termId === t.id)).length} termes illustrés, ${imagesCommons.length} images retenues, ${abandonnes.length} termes abandonnés faute d'image fiable.`,
  "",
];
if (abandonnes.length) {
  md.push("## Termes abandonnés", "", ...abandonnes.map((t) => `- ${t.terme} (${t.categorie})`), "");
}
let categorie = "";
for (const { terme, lignes, retenues } of [...rapport].sort((a, b) => a.terme.categorie.localeCompare(b.terme.categorie, "fr"))) {
  if (terme.categorie !== categorie) {
    categorie = terme.categorie;
    md.push(`## ${categorie}`, "");
  }
  md.push(`### ${terme.terme} — ${retenues ? `${retenues} image${retenues > 1 ? "s" : ""} retenue${retenues > 1 ? "s" : ""}` : "abandonné"}`, "");
  md.push(`*${terme.definition}*`, "");
  if (!lignes.length) md.push("Aucune image candidate trouvée sur Commons.", "");
  for (const { nn, c, v1, v2, ok } of lignes) {
    const lien = `[${c.titre.replace(/^File:/, "").replace(/([\[\]])/g, "\\$1")}](${c.lien})`;
    md.push(`- **${ok ? "Retenue" : "Rejetée"}** — ${lien}`);
    if (v1) {
      md.push(`  - Vu : ${v1.vu}`);
      md.push(`  - Vérification : ${v1.verdict}${v1.rectangle ? " (avec rectangle)" : ""} — ${v1.note}`);
    } else md.push("  - Vérification : non examinée");
    if (v2) md.push(`  - Contre-vérification : ${v2.accord ? "d'accord" : "pas d'accord"} — ${v2.raison}`);
    else if (v1?.verdict === "validée") md.push("  - Contre-vérification : —");
    else md.push("  - Contre-vérification : sans objet (rejetée à la première vérification)");
  }
  md.push("");
}
await fs.writeFile(path.join(ROOT, "VERIFICATION.md"), md.join("\n"));

const parCat = {};
for (const t of terms) {
  parCat[t.categorie] ??= { termes: 0, images: 0 };
  parCat[t.categorie].termes++;
  parCat[t.categorie].images += imagesCommons.filter((i) => i.termId === t.id).length + perso.filter((i) => i.termId === t.id).length;
}
console.table(parCat);
console.log(`Abandonnés : ${abandonnes.map((t) => t.terme).join(", ") || "aucun"}`);

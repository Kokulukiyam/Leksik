// Cherche des images candidates sur Wikimedia Commons pour chaque terme et les télécharge
// dans tmp/commons/<termId>/ avec leurs métadonnées (meta.json).
//
// Usage : NODE_USE_ENV_PROXY=1 node scripts/commons.mjs [termId ...] [--max=6] [--refaire] [--suite [--categories]]
//   --suite               seconde recherche avec « requetes2 »
//   --suite --categories  seconde recherche par catégories Commons pour des termes déjà téléchargés
// (NODE_USE_ENV_PROXY n'est utile que derrière un proxy HTTP.)
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(ROOT, "tmp", "commons");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "LeksikBot/0.1 (outil local de vocabulaire architectural; usage personnel) node-fetch";
const LARGEUR = 1280; // taille de vignette standard de Commons

const args = process.argv.slice(2);
const MAX = Number(args.find((a) => a.startsWith("--max="))?.slice(6) ?? 6);
const filtre = args.filter((a) => !a.startsWith("--"));

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// L'API Commons limite fortement les clients sans compte (environ 10 requêtes/min, davantage de
// restrictions sur une adresse IP partagée) : les appels à l'API sont espacés et le script attend
// patiemment le délai « Retry-After » indiqué. Les vignettes (upload.wikimedia.org) sont moins limitées.
const INTERVALLES = {
  "commons.wikimedia.org": Number(process.env.INTERVALLE ?? 7000),
  "www.wikidata.org": 1500,
  autre: 1500,
};
const derniers = {};

async function requete(url, type = "json") {
  const hote = new URL(url).hostname in INTERVALLES ? new URL(url).hostname : "autre";
  let erreurs = 0;
  // Une vignette refusée plusieurs fois est souvent un original trop lourd à réduire : on passe à la suivante.
  const essais = type === "json" ? 40 : 3;
  for (let essai = 0; essai < essais; essai++) {
    const attente = (derniers[hote] ?? 0) + INTERVALLES[hote] - Date.now();
    if (attente > 0) await pause(attente);
    derniers[hote] = Date.now();
    try {
      const rep = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      const texte = type === "json" ? await rep.text() : null;
      if (rep.status === 429 || (texte && texte.startsWith("You are making too many"))) {
        const delai = Math.min(Number(rep.headers.get("retry-after")) || 30, type === "json" ? 90 : 15);
        console.error(`  limite de débit (${hote}), nouvel essai dans ${delai} s`);
        await pause(1000 * delai + 1000);
        continue;
      }
      if (!rep.ok) throw new Error(`HTTP ${rep.status} ${url}`);
      return type === "json" ? JSON.parse(texte) : Buffer.from(await rep.arrayBuffer());
    } catch (e) {
      console.error(`  erreur réseau (${e.message})`);
      if (++erreurs >= 5) throw e;
      await pause(3000 * erreurs);
    }
  }
  throw new Error(`Échec : ${url}`);
}

async function api(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", ...params })) u.searchParams.set(k, v);
  return requete(u);
}

const sansHtml = (s = "") =>
  s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();

// Scans de livres de l'Internet Archive (« Titre (1911) (14781119804).jpg ») : jamais des photos utilisables.
const SCAN_DE_LIVRE = /\(\d{4}\) \(\d{10,}\)/;
const EXCLUS = /\b(ai[- ]generated|drawing|diagram|plan|engraving|illustration|lithograph|painting|map|scheme|sketch|render(ing)?|3d model|clipart)\b/i;

// Une seule requête par recherche (generator=search) pour rester sous les limites de débit de l'API.
async function rechercher(q) {
  const r = await api({
    action: "query",
    generator: "search",
    gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "30",
    ...IIPROPS,
  });
  return (r.query?.pages ?? []).sort((a, b) => a.index - b.index);
}

const IIPROPS = { prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: String(LARGEUR), iiextmetadatalanguage: "fr" };

// Fichiers d'une catégorie Commons (bien plus précis que la recherche plein texte).
async function fichiersDeCategorie(cat) {
  const r = await api({ action: "query", generator: "categorymembers", gcmtitle: cat, gcmtype: "file", gcmlimit: "40", ...IIPROPS });
  return r.query?.pages ?? [];
}

// Catégories Commons pour un terme : celles proposées et vérifiées (champ categoriesCommons, voir
// scripts/verifier_categories.mjs), sinon celle de l'élément Wikidata dont le libellé français est exactement
// le terme (propriété P373), sinon les catégories trouvées par la recherche (hors catégories de photographes).
const CAT_PARASITE = /photograph|taken by|uploaded by|images by|files by|created by|media by|quality images|featured|\d{4}/i;
async function categoriesPour(terme) {
  if (terme.categoriesCommons?.length) return terme.categoriesCommons.slice(0, 3);
  const cats = [];
  try {
    const libelle = terme.terme.replace(/^(l['’]\s*|le |la |les )/i, "").toLowerCase();
    const u = new URL("https://www.wikidata.org/w/api.php");
    for (const [k, v] of Object.entries({ action: "wbsearchentities", search: libelle, language: "fr", uselang: "fr", type: "item", limit: "5", format: "json" }))
      u.searchParams.set(k, v);
    const ids = ((await requete(u)).search ?? []).filter((e) => (e.label ?? "").toLowerCase() === libelle).map((e) => e.id);
    if (ids.length) {
      const g = new URL("https://www.wikidata.org/w/api.php");
      for (const [k, v] of Object.entries({ action: "wbgetentities", ids: ids.join("|"), props: "claims", format: "json" })) g.searchParams.set(k, v);
      const ent = (await requete(g)).entities ?? {};
      for (const id of ids) {
        const c = ent[id]?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
        if (c) {
          cats.push(`Category:${c}`);
          break;
        }
      }
    }
  } catch (e) {
    console.error(`  wikidata indisponible (${e.message})`);
  }
  if (!cats.length) {
    const q = terme.requetes.find((x) => !x.startsWith("incategory:")) ?? terme.requetes[0];
    const r = await api({ action: "query", list: "search", srsearch: q, srnamespace: "14", srlimit: "5" });
    for (const p of r.query?.search ?? []) if (!CAT_PARASITE.test(p.title) && !cats.includes(p.title)) cats.push(p.title);
  }
  return cats.slice(0, 2);
}

function candidat(page) {
  const ii = page.imageinfo?.[0];
  if (!ii || ii.mime !== "image/jpeg" || ii.width < 900 || ii.height < 600) return null;
  const m = ii.extmetadata ?? {};
  const categories = (m.Categories?.value ?? "").split("|").filter(Boolean);
  const description = sansHtml(m.ImageDescription?.value);
  const licence = sansHtml(m.LicenseShortName?.value);
  const texte = `${page.title} ${categories.join(" ")}`;
  if (EXCLUS.test(texte) || SCAN_DE_LIVRE.test(page.title) || /ai-generated|generated by ai/i.test(`${texte} ${description}`)) return null;
  if (!licence) return null;
  return {
    titre: page.title,
    description: description.slice(0, 600),
    categories,
    auteur: sansHtml(m.Artist?.value).slice(0, 200) || "Inconnu",
    licence,
    lien: ii.descriptionurl,
    url: ii.thumburl ?? ii.url,
    largeur: ii.width,
    hauteur: ii.height,
  };
}

function melanger(t) {
  const a = [...t];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Au plus 2 fichiers d'une même série (titres qui commencent pareil), pour varier les candidates.
function limiterSeries(liste) {
  const vus = new Map();
  return liste.filter((c) => {
    const cle = c.titre.replace(/^File:/, "").slice(0, 24).toLowerCase();
    vus.set(cle, (vus.get(cle) ?? 0) + 1);
    return vus.get(cle) <= 2;
  });
}

async function main() {
  const termes = JSON.parse(await fs.readFile(path.join(ROOT, "scripts", "termes-candidats.json"), "utf8"));
  // Les termes les plus courants sur un chantier d'abord (priorité 1, puis 2, puis 3).
  const choisis = (filtre.length ? termes.filter((t) => filtre.includes(t.id)) : termes)
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.priorite ?? 0) - (b.t.priorite ?? 0) || a.i - b.i)
    .map(({ t }) => t);
  for (const terme of choisis) {
    const dossier = path.join(SORTIE, terme.id);
    // --suite : seconde recherche avec « requetes2 », candidates ajoutées après celles déjà téléchargées.
    const suite = args.includes("--suite");
    const existant = await fs.readFile(path.join(dossier, "meta.json"), "utf8").then(JSON.parse, () => null);
    const suiteCat = suite && args.includes("--categories");
    if (suiteCat ? !existant || existant.suiteCategories : suite ? !terme.requetes2 || existant?.suite : existant && !args.includes("--refaire")) continue;
    const deja = suite ? (existant?.candidats ?? []) : [];
    await fs.mkdir(dossier, { recursive: true });
    // Requêtes dans l'ordre, jusqu'à avoir assez de candidates (pour économiser les appels à l'API),
    // puis sélection alternée entre les requêtes pour varier les sources.
    const listes = [];
    const nouveau = (c) => c && !deja.some((d) => d.titre === c.titre);
    // Catégories Commons d'abord (sauf seconde recherche par requetes2), puis recherche plein texte si besoin.
    if (!suite || args.includes("--categories")) {
      for (const cat of await categoriesPour(terme)) {
        listes.push(limiterSeries(melanger((await fichiersDeCategorie(cat)).map(candidat).filter(nouveau))));
      }
    }
    for (const q of suite && !args.includes("--categories") ? terme.requetes2 : terme.requetes) {
      if (new Set(listes.flat().map((c) => c.titre)).size >= MAX * 2) break;
      const pages = await rechercher(q);
      listes.push(limiterSeries(pages.map(candidat).filter(nouveau)));
    }
    const vus = new Set(deja.map((d) => d.titre));
    const retenus = [];
    for (let i = 0; retenus.length < MAX && listes.some((l) => l.length > i); i++) {
      for (const l of listes) {
        const c = l[i];
        if (c && !vus.has(c.titre) && retenus.length < MAX) {
          vus.add(c.titre);
          retenus.push(c);
        }
      }
    }
    const meta = [...deja];
    // Candidates de réserve si certains téléchargements échouent.
    const reserve = [...new Map(listes.flat().filter((c) => !vus.has(c.titre)).map((c) => [c.titre, c])).values()];
    for (const c of [...retenus, ...reserve]) {
      if (meta.length - deja.length >= MAX) break;
      const fichier = `${String(meta.length + 1).padStart(2, "0")}.jpg`;
      try {
        await fs.writeFile(path.join(dossier, fichier), await requete(c.url, "binaire"));
        meta.push({ fichier, ...c });
      } catch (e) {
        console.warn(`  ${terme.id}: téléchargement impossible (${c.titre}) : ${e.message}`);
      }
    }
    await fs.writeFile(path.join(dossier, "meta.json"), JSON.stringify({ terme, candidats: meta, ...(suite || existant?.suite ? { suite: true } : {}), ...(suiteCat || existant?.suiteCategories ? { suiteCategories: true } : {}) }, null, 2));
    console.log(`${terme.id}: ${meta.length - deja.length} candidates${suite ? " (seconde recherche)" : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

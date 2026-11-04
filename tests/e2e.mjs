// Test de bout en bout de Leksik (Playwright, bibliothèque seule).
// Prérequis : serveur lancé (`npm run dev > tmp/e2e-server.log 2>&1`) sur http://localhost:3000.
// Usage : npm run e2e   (variables facultatives : BASE_URL, SERVER_LOG)
// Les données (data/*.json, public/images/perso/) sont sauvegardées au début et remises en état à la fin.
import { chromium } from "playwright";
import sharp from "sharp";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LOG = process.env.SERVER_LOG ?? path.join(ROOT, "tmp", "e2e-server.log");
const DATA = ["terms.json", "images.json"].map((f) => path.join(ROOT, "data", f));
const PERSO = path.join(ROOT, "public", "images", "perso");
const TMP = path.join(ROOT, "tmp", "e2e");
const CATEGORIES = [
  "Façade et ouvertures",
  "Toitures",
  "Structure",
  "Ornement",
  "Matériaux et revêtements",
  "Afrique de l'Ouest",
];
const NOUVEAU_TERME = "le gousset de test e2e";
const IMAGE_REFUSEE = "toguna-03";

// ---------- Vérifications ----------
let ok = 0;
const echecs = [];
let section = "";
function check(nom, cond, detail = "") {
  if (cond) ok++;
  else {
    echecs.push(`[${section}] ${nom}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${nom}${detail ? ` — ${detail}` : ""}`);
  }
  return cond;
}
const proche = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;
const rectProche = (r, e) =>
  !!r && proche(r.x, e.x) && proche(r.y, e.y) && proche(r.largeur, e.largeur) && proche(r.hauteur, e.hauteur);

// ---------- Données ----------
const lireJson = async (f) => JSON.parse(await fs.readFile(f, "utf8"));
const donnees = async () => {
  const [terms, images] = await Promise.all(DATA.map(lireJson));
  return { terms, images, termsParId: new Map(terms.map((t) => [t.id, t])) };
};
const listePerso = async () => (existsSync(PERSO) ? (await fs.readdir(PERSO)).sort() : null);

// Paires incompatibles (lib/shared.ts), pour vérifier les mauvaises réponses.
async function incompatibles() {
  const src = await fs.readFile(path.join(ROOT, "lib", "shared.ts"), "utf8");
  const bloc = src.match(/INCOMPATIBLES[^=]*=\s*\[([\s\S]*?)\];/)?.[1] ?? "";
  return [...bloc.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)].map((m) => [m[1], m[2]]);
}

// ---------- Navigateur ----------
const erreursNavigateur = [];
function surveiller(page, nom) {
  page.on("console", (m) => {
    if (m.type() === "error") erreursNavigateur.push(`${nom} console : ${m.text()}`);
  });
  page.on("pageerror", (e) => erreursNavigateur.push(`${nom} pageerror : ${e.message}`));
  page.on("response", (r) => {
    if (r.url().startsWith(BASE) && r.status() >= 400) erreursNavigateur.push(`${nom} HTTP ${r.status()} : ${r.url()}`);
  });
  page.on("dialog", (d) => d.dismiss().catch(() => {})); // par défaut ; les tests qui confirment le gèrent eux-mêmes
}

async function imageChargee(loc, timeout = 15000) {
  try {
    await loc.scrollIntoViewIfNeeded({ timeout });
    await loc.evaluate(
      (img, t) =>
        new Promise((res, rej) => {
          const fin = Date.now() + t;
          (function attendre() {
            if (img.complete && img.naturalWidth > 0) return res(true);
            if (img.complete && img.naturalWidth === 0 && img.currentSrc) return rej(new Error("cassée"));
            if (Date.now() > fin) return rej(new Error("délai"));
            setTimeout(attendre, 50);
          })();
        }),
      timeout,
    );
    return true;
  } catch {
    return false;
  }
}

const fichierDe = (src) => decodeURIComponent(new URL(src, BASE).pathname).replace(/^\/images\//, "");

async function pasDeDefilementHorizontal(page, ou) {
  const ko = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(`pas de défilement horizontal (${ou})`, !ko);
}

async function accueil(page) {
  await page.goto(BASE + "/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /^Toutes/ }).waitFor();
}

// Joue une partie déjà démarrée. `faux(i)` dit s'il faut répondre faux à la manche i.
async function jouerPartie(page, ctx, { faux, attendu, refusee, termesPermis, relancer }) {
  const prog = page.getByTestId("progression");
  await prog.waitFor();
  const total = Number((await prog.textContent()).match(/\/\s*(\d+)/)[1]);
  if (attendu !== undefined) check(`${total} manches (attendu ${attendu})`, total === attendu);
  const rates = [];
  let justes = 0;
  for (let i = 0; i < total; i++) {
    if (relancer && i === relancer) {
      await page.reload();
      await prog.waitFor();
    }
    check(`manche ${i + 1} affichée`, (await prog.textContent()).startsWith(`${i + 1} /`), await prog.textContent());
    const img = page.locator("main img").first();
    const src = await img.getAttribute("src");
    const fichier = fichierDe(src);
    const image = ctx.images.find((x) => x.fichier === fichier);
    check(`image connue (${fichier})`, !!image);
    if (!image) break;
    check(`image non cassée (${fichier})`, await imageChargee(img));
    check(`image validée (${image.id})`, image.statut === "validée" && image.id !== refusee);
    if (termesPermis) check(`terme à revoir (${image.termId})`, termesPermis.has(image.termId));
    const term = ctx.termsParId.get(image.termId);
    // Rectangle
    const cadres = await page.locator("main [data-testid=cadre]").count();
    check(`rectangle ${image.rectangle ? "affiché" : "absent"} (${image.id})`, cadres === (image.rectangle ? 1 : 0));
    // Crédit
    const credit = (await page.getByTestId("credit").textContent()) ?? "";
    check(`crédit auteur et licence (${image.id})`, credit.includes(image.auteur) && credit.includes(image.licence), credit);
    // Les 4 mots
    const boutons = page.getByTestId("choix").locator("button");
    const n = await boutons.count();
    const ids = await boutons.evaluateAll((bs) => bs.map((b) => b.dataset.term));
    const textes = (await boutons.allTextContents()).map((t) => t.trim());
    check(`4 mots (${image.id})`, n === 4, String(n));
    check(`mots distincts (${image.id})`, new Set(ids).size === n && new Set(textes).size === n, textes.join(" | "));
    check(`bonne réponse présente (${image.id})`, ids.includes(term.id) && textes.includes(term.terme), textes.join(" | "));
    check(`mots = termes existants`, ids.every((id, k) => ctx.termsParId.get(id)?.terme === textes[k]));
    const autresMemeCat = ctx.terms.filter(
      (t) => t.id !== term.id && t.categorie === term.categorie && !ctx.incompat.some(([a, b]) => (a === t.id && b === term.id) || (b === t.id && a === term.id)),
    ).length;
    const memeCat = ids.filter((id) => id !== term.id && ctx.termsParId.get(id)?.categorie === term.categorie).length;
    check(`mauvaises réponses de la même catégorie (${image.id})`, memeCat === Math.min(3, autresMemeCat), `${memeCat}/${Math.min(3, autresMemeCat)}`);
    check(`pas de paire incompatible (${image.id})`, !ids.some((id) => ctx.incompat.some(([a, b]) => (a === id && b === term.id) || (b === id && a === term.id))));
    // Réponse
    const repondreFaux = faux(i);
    const choix = repondreFaux ? ids.find((id) => id !== term.id) : term.id;
    await boutons.filter({ has: page.locator(`xpath=self::*[@data-term="${choix}"]`) }).first().click();
    const retour = page.getByTestId("retour");
    await retour.waitFor();
    const classeBon = await page.locator(`[data-testid=choix] button[data-term="${term.id}"]`).getAttribute("class");
    check(`bonne réponse en vert`, /border-green-500/.test(classeBon));
    if (repondreFaux) {
      const classeFaux = await page.locator(`[data-testid=choix] button[data-term="${choix}"]`).getAttribute("class");
      check(`mauvais choix en rouge`, /border-red-500/.test(classeFaux));
      rates.push(term.id);
    } else justes++;
    check(`pas d'autre rouge`, (await page.locator("[data-testid=choix] button.border-red-500").count()) === (repondreFaux ? 1 : 0));
    const texteRetour = (await retour.textContent()) ?? "";
    check(`verdict ${repondreFaux ? "Faux" : "Juste"}`, texteRetour.includes(repondreFaux ? "Faux." : "Juste."));
    check(`définition affichée`, texteRetour.includes(term.definition) && texteRetour.includes(term.terme));
    check(`boutons désactivés après réponse`, (await page.locator("[data-testid=choix] button:disabled").count()) === 4);
    await page.getByRole("button", { name: "Suivant" }).click();
  }
  // Écran de fin
  const score = page.getByTestId("score");
  await score.waitFor();
  check(`score ${justes} / ${total}`, ((await score.textContent()) ?? "").replace(/\s+/g, " ").includes(`${justes} / ${total}`), await score.textContent());
  if (rates.length) {
    const items = page.getByTestId("rates").locator("li");
    check(`${rates.length} mots ratés listés`, (await items.count()) === rates.length);
    for (let k = 0; k < (await items.count()); k++) {
      const it = items.nth(k);
      const t = ctx.termsParId.get(rates[k]);
      const txt = (await it.textContent()) ?? "";
      check(`raté ${k + 1} : terme et définition`, txt.includes(t.terme) && txt.includes(t.definition), txt.slice(0, 80));
      check(`raté ${k + 1} : image non cassée`, await imageChargee(it.locator("img")));
    }
  } else {
    check(`aucune erreur annoncée`, await page.getByText("Aucune erreur, bravo !").isVisible());
    check(`pas de bouton Revoir`, (await page.getByRole("button", { name: "Revoir mes erreurs" }).count()) === 0);
  }
  return { rates, justes, total };
}

async function testerJeu(page, ctx, nom) {
  section = `${nom} · jeu`;
  console.log(`- ${section}`);
  await accueil(page);
  await pasDeDefilementHorizontal(page, "accueil");
  const jouables = ctx.images.filter((i) => i.statut === "validée" && ctx.termsParId.has(i.termId));
  for (const cat of ["Toutes", ...CATEGORIES]) {
    const attendu = cat === "Toutes" ? jouables.length : jouables.filter((i) => ctx.termsParId.get(i.termId).categorie === cat).length;
    const bouton = page.getByRole("button", { name: new RegExp(`^${cat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
    const libelle = (await bouton.textContent()) ?? "";
    check(`compte « ${cat} » = ${attendu}`, libelle.includes(`${attendu} image`), libelle);
    await bouton.click();
    check(`catégorie affichée (${cat})`, ((await page.getByTestId("progression").textContent()) ?? "").includes(cat));
    if (cat === "Toutes") await pasDeDefilementHorizontal(page, "manche");
    const { rates } = await jouerPartie(page, ctx, {
      faux: (i) => i % 3 === 1,
      attendu: 10,
      refusee: IMAGE_REFUSEE,
      relancer: cat === "Toutes" ? 4 : undefined, // reprise après rechargement
    });
    if (cat === "Toutes") await pasDeDefilementHorizontal(page, "fin de partie");
    // Revoir mes erreurs : une manche par terme raté, que des termes ratés, tout juste.
    const distincts = new Set(rates);
    await page.getByRole("button", { name: "Revoir mes erreurs" }).click();
    check(`partie « Revoir mes erreurs »`, ((await page.getByTestId("progression").textContent()) ?? "").includes("Revoir mes erreurs"));
    await jouerPartie(page, ctx, { faux: () => false, attendu: distincts.size, refusee: IMAGE_REFUSEE, termesPermis: distincts });
    await page.getByRole("button", { name: "Nouvelle partie" }).click();
    await page.getByRole("button", { name: /^Toutes/ }).waitFor();
  }
  // Une partie avec toutes les réponses fausses pour « Toutes » : 10 ratés, Revoir puis Quitter.
  await page.getByRole("button", { name: /^Toutes/ }).click();
  const { rates } = await jouerPartie(page, ctx, { faux: () => true, attendu: 10, refusee: IMAGE_REFUSEE });
  check(`10 ratés`, rates.length === 10);
  await page.getByRole("button", { name: "Revoir mes erreurs" }).click();
  await page.getByTestId("progression").waitFor();
  await page.getByRole("button", { name: "Quitter" }).click();
  await page.getByRole("button", { name: /^Toutes/ }).waitFor();
  check(`Quitter ramène à l'accueil`, true);
}

// ---------- Ajouter ----------
async function dessiner(page, zone, r) {
  await zone.scrollIntoViewIfNeeded();
  await imageChargee(zone.locator("img"));
  const b = await zone.boundingBox();
  await page.mouse.move(b.x + r.x * b.width, b.y + r.y * b.height);
  await page.mouse.down();
  await page.mouse.move(b.x + (r.x + r.largeur / 2) * b.width, b.y + (r.y + r.hauteur / 2) * b.height, { steps: 4 });
  await page.mouse.move(b.x + (r.x + r.largeur) * b.width, b.y + (r.y + r.hauteur) * b.height, { steps: 4 });
  await page.mouse.up();
}

async function ajouter(page, { photo, saisie, choisir, attenduId, nouveau, rect, lieu, largeurAttendue }) {
  const avant = await donnees();
  await page.goto(BASE + "/ajouter");
  const bouton = page.getByRole("button", { name: "Ajouter", exact: true });
  check(`Ajouter désactivé sans photo`, await bouton.isDisabled());
  await page.setInputFiles("#photo", photo);
  const zone = page.getByTestId("zone-rect");
  await zone.waitFor();
  check(`aperçu de la photo`, await imageChargee(zone.locator("img")));
  if (rect) {
    await dessiner(page, zone, rect);
    check(`rectangle dessiné`, await zone.getByTestId("cadre").isVisible());
  } else check(`pas de rectangle`, (await zone.getByTestId("cadre").count()) === 0);

  const objet = page.locator("#objet");
  await objet.click();
  await objet.fill(saisie);
  if (choisir === "proche") {
    const p = page.getByTestId("terme-proche");
    await p.waitFor();
    check(`suggestion « ${saisie} » → « le meneau »`, ((await p.textContent()) ?? "").includes("le meneau"), await p.textContent());
    check(`saisie proche = nouveau terme possible`, await page.getByTestId("nouveau-terme").isVisible());
    await p.getByRole("button", { name: "le meneau" }).click();
  } else if (choisir) {
    const liste = page.getByTestId("suggestions");
    await liste.waitFor();
    check(`autocomplétion « ${saisie} » propose « ${choisir} »`, await liste.getByRole("button", { name: new RegExp(choisir) }).isVisible());
    await liste.getByRole("button", { name: new RegExp(choisir) }).click();
  }
  if (nouveau) {
    check(`bloc nouveau terme`, await page.getByTestId("nouveau-terme").isVisible());
    check(`Ajouter désactivé sans définition`, await bouton.isDisabled());
    await page.locator("#definition").fill(nouveau.definition);
    check(`Ajouter désactivé sans catégorie`, await bouton.isDisabled());
    await page.locator("#categorie").selectOption(nouveau.categorie);
  } else {
    const term = avant.termsParId.get(attenduId);
    await page.getByTestId("terme-existant").waitFor();
    check(`terme existant reconnu (${term.terme})`, ((await page.getByTestId("terme-existant").textContent()) ?? "").includes(term.terme));
    check(`pas de bloc nouveau terme`, (await page.getByTestId("nouveau-terme").count()) === 0);
    check(`champ Objet = ${term.terme}`, (await objet.inputValue()) === term.terme);
  }
  if (lieu) await page.locator("#lieu").fill(lieu);
  check(`Ajouter actif`, await bouton.isEnabled());
  await bouton.click();
  const statut = page.getByRole("status");
  await statut.waitFor({ timeout: 30000 });
  check(`message de succès`, ((await statut.textContent()) ?? "").includes("Image ajoutée"), await statut.textContent());
  check(`formulaire vidé`, (await objet.inputValue()) === "" && (await page.getByTestId("zone-rect").count()) === 0);

  // Fichiers JSON et dossier perso
  const apres = await donnees();
  const nouvelles = apres.images.filter((i) => !avant.images.some((a) => a.id === i.id));
  check(`une image ajoutée dans images.json`, nouvelles.length === 1, String(nouvelles.length));
  const img = nouvelles[0];
  if (!img) return null;
  let termId = attenduId;
  if (nouveau) {
    const t = apres.terms.filter((x) => !avant.terms.some((a) => a.id === x.id));
    check(`un terme ajouté dans terms.json`, t.length === 1);
    check(`nouveau terme complet`, t[0]?.terme === saisie && t[0]?.definition === nouveau.definition && t[0]?.categorie === nouveau.categorie, JSON.stringify(t[0]));
    termId = t[0]?.id;
  } else check(`terms.json inchangé`, JSON.stringify(apres.terms) === JSON.stringify(avant.terms));
  check(`termId = ${termId}`, img.termId === termId, img.termId);
  check(`source perso, validée, auteur Moi`, img.source === "perso" && img.statut === "validée" && img.auteur === "Moi", JSON.stringify(img));
  check(`lieu enregistré`, img.lieu === (lieu ?? ""), img.lieu);
  check(`rectangle enregistré`, rect ? rectProche(img.rectangle, rect) : img.rectangle === null, JSON.stringify(img.rectangle));
  check(`fichier perso/<id>.webp`, img.fichier === `perso/${img.id}.webp`, img.fichier);
  const chemin = path.join(ROOT, "public", "images", img.fichier);
  check(`fichier présent dans public/images/perso/`, existsSync(chemin));
  if (existsSync(chemin)) {
    const meta = await sharp(chemin).metadata();
    check(`format WebP`, meta.format === "webp", meta.format);
    check(`largeur ≤ 1600 px`, meta.width <= 1600, String(meta.width));
    if (largeurAttendue) check(`largeur ${largeurAttendue} px`, meta.width === largeurAttendue, String(meta.width));
  }
  const rep = await fetch(`${BASE}/images/${img.fichier}`);
  check(`image servie par le serveur`, rep.status === 200, String(rep.status));
  return img;
}

async function testerAjouter(page, nom, photos, mobile) {
  section = `${nom} · ajouter`;
  console.log(`- ${section}`);
  // Accent manquant : « allege » est reconnu comme « l'allège ».
  await page.goto(BASE + "/ajouter");
  await page.locator("#objet").fill("allege");
  check(`« allege » reconnu comme « l'allège »`, ((await page.getByTestId("terme-existant").textContent()) ?? "").includes("l'allège"));
  await pasDeDefilementHorizontal(page, "ajouter");

  const ajoutees = [];
  const nouveauTerme = { definition: "Pièce de test ajoutée par le test de bout en bout.", categorie: "Structure" };
  if (!mobile) {
    // Terme existant (faute de frappe « menau »), avec rectangle, photo de 2400 px → 1600 px.
    ajoutees.push(await ajouter(page, { photo: photos.grande, saisie: "menau", choisir: "proche", attenduId: "meneau", rect: { x: 0.2, y: 0.3, largeur: 0.4, hauteur: 0.4 }, lieu: "Plateau, Dakar", largeurAttendue: 1600 }));
    // Nouveau terme, sans rectangle, petite photo PNG (non agrandie).
    ajoutees.push(await ajouter(page, { photo: photos.petite, saisie: NOUVEAU_TERME, nouveau: nouveauTerme, largeurAttendue: 800 }));
  } else {
    // Terme existant par autocomplétion, sans rectangle.
    ajoutees.push(await ajouter(page, { photo: photos.petite, saisie: "lint", choisir: "le linteau", attenduId: "linteau" }));
    // Nouveau terme (déjà créé si le passage ordinateur a eu lieu : on en crée un autre), avec rectangle.
    ajoutees.push(await ajouter(page, { photo: photos.grande, saisie: NOUVEAU_TERME + " bis", nouveau: nouveauTerme, rect: { x: 0.5, y: 0.1, largeur: 0.3, hauteur: 0.5 }, lieu: "Médina", largeurAttendue: 1600 }));
  }
  // Créer un terme qui existe déjà est refusé par l'API.
  const form = new FormData();
  form.append("fichier", new Blob([await fs.readFile(photos.petite)], { type: "image/png" }), "x.png");
  form.append("terme", "Le Linteau");
  form.append("definition", "x");
  form.append("categorie", "Structure");
  const rep = await fetch(`${BASE}/api/images`, { method: "POST", body: form });
  check(`API : terme déjà existant refusé (400)`, rep.status === 400, String(rep.status));
  return ajoutees.filter(Boolean);
}

// ---------- Gérer ----------
async function compte(page) {
  return Number(((await page.getByTestId("compte").textContent()) ?? "").match(/\d+/)[0]);
}

async function testerGerer(page, nom, ajoutees) {
  section = `${nom} · gérer`;
  console.log(`- ${section}`);
  let d = await donnees();
  await page.goto(BASE + "/gerer");
  await page.getByTestId("compte").waitFor();
  await pasDeDefilementHorizontal(page, "gérer");
  check(`toutes les images listées`, (await compte(page)) === d.images.length, `${await compte(page)} / ${d.images.length}`);

  // Toutes les cartes : image, terme, note, rectangle.
  const cartes = page.getByTestId("carte");
  const n = await cartes.count();
  let cassees = [];
  let incoherentes = [];
  for (let k = 0; k < n; k++) {
    const c = cartes.nth(k);
    const id = await c.getAttribute("data-id");
    const img = d.images.find((i) => i.id === id);
    if (!(await imageChargee(c.locator("img").first()))) cassees.push(id);
    const terme = (await c.getByTestId("terme").textContent()) ?? "";
    const cadre = await c.getByTestId("cadre").count();
    const note = img.note ? ((await c.getByTestId("note").textContent()) ?? "") : "";
    if (!img || terme !== d.termsParId.get(img.termId)?.terme || cadre !== (img.rectangle ? 1 : 0) || note !== img.note) incoherentes.push(id);
  }
  check(`aucune image cassée dans Gérer (${n})`, cassees.length === 0, cassees.join(", "));
  check(`terme, note et rectangle de chaque carte`, incoherentes.length === 0, incoherentes.join(", "));

  // Filtres
  const filtre = async (label, valeur) => {
    await page.getByLabel(label, { exact: true }).selectOption(valeur);
  };
  const ids = async () => cartes.evaluateAll((cs) => cs.map((c) => c.dataset.id).sort());
  const attendus = (f) => d.images.filter(f).map((i) => i.id).sort();
  await filtre("Source", "perso");
  check(`filtre Mes photos`, JSON.stringify(await ids()) === JSON.stringify(attendus((i) => i.source === "perso")));
  await filtre("Source", "commons");
  check(`filtre Commons`, JSON.stringify(await ids()) === JSON.stringify(attendus((i) => i.source === "commons")));
  await filtre("Source", "");
  for (const cat of CATEGORIES) {
    await filtre("Catégorie", cat);
    check(`filtre catégorie ${cat}`, JSON.stringify(await ids()) === JSON.stringify(attendus((i) => d.termsParId.get(i.termId)?.categorie === cat)));
  }
  await filtre("Statut", "refusée");
  check(`filtre refusée`, JSON.stringify(await ids()) === JSON.stringify(attendus((i) => i.statut === "refusée")));
  check(`image refusée de test listée`, (await ids()).includes(IMAGE_REFUSEE));
  await filtre("Catégorie", "Afrique de l'Ouest");
  check(`filtres combinés`, JSON.stringify(await ids()) === JSON.stringify(attendus((i) => i.statut === "refusée" && d.termsParId.get(i.termId)?.categorie === "Afrique de l'Ouest")));
  await filtre("Statut", "validée");
  check(`filtre validée`, JSON.stringify(await ids()) === JSON.stringify(attendus((i) => i.statut === "validée" && d.termsParId.get(i.termId)?.categorie === "Afrique de l'Ouest")));
  await filtre("Catégorie", "");
  await filtre("Statut", "");
  await filtre("Source", "perso");

  const [a, b] = ajoutees;
  const carte = (id) => page.locator(`[data-testid=carte][data-id="${id}"]`);

  // Modifier le terme et le rectangle de la première image ajoutée.
  let c = carte(a.id);
  await c.getByRole("button", { name: "Modifier" }).click();
  await c.getByLabel("Terme").selectOption("trumeau");
  const nouveauRect = { x: 0.1, y: 0.15, largeur: 0.5, hauteur: 0.6 };
  await dessiner(page, c.getByTestId("zone-rect"), nouveauRect);
  await c.getByRole("button", { name: "Enregistrer" }).click();
  await c.getByRole("button", { name: "Modifier" }).waitFor();
  await page.waitForFunction((id) => document.querySelector(`[data-id="${id}"] [data-testid=terme]`)?.textContent === "le trumeau", a.id, { timeout: 10000 }).catch(() => {});
  check(`terme modifié affiché`, (await c.getByTestId("terme").textContent()) === "le trumeau");
  d = await donnees();
  let img = d.images.find((i) => i.id === a.id);
  check(`terme modifié dans images.json`, img.termId === "trumeau", img.termId);
  check(`rectangle modifié dans images.json`, rectProche(img.rectangle, nouveauRect), JSON.stringify(img.rectangle));
  check(`rectangle modifié affiché`, (await c.getByTestId("cadre").count()) === 1);

  // Annuler ne change rien ; effacer le rectangle le supprime.
  await c.getByRole("button", { name: "Modifier" }).click();
  await c.getByLabel("Terme").selectOption("linteau");
  await c.getByRole("button", { name: "Annuler" }).click();
  check(`Annuler ne modifie pas`, (await donnees()).images.find((i) => i.id === a.id).termId === "trumeau");
  await c.getByRole("button", { name: "Modifier" }).click();
  await c.getByRole("button", { name: "Effacer le rectangle" }).click();
  await c.getByRole("button", { name: "Enregistrer" }).click();
  await c.getByRole("button", { name: "Modifier" }).waitFor();
  await page.waitForFunction((id) => !document.querySelector(`[data-id="${id}"] [data-testid=cadre]`), a.id, { timeout: 10000 }).catch(() => {});
  check(`rectangle effacé dans images.json`, (await donnees()).images.find((i) => i.id === a.id).rectangle === null);
  check(`rectangle effacé affiché`, (await c.getByTestId("cadre").count()) === 0);

  // Refuser puis revalider la seconde.
  c = carte(b.id);
  await c.getByRole("button", { name: "Refuser" }).click();
  await c.getByRole("button", { name: "Valider" }).waitFor();
  check(`statut refusée affiché`, (await c.getByTestId("statut").textContent()) === "refusée");
  check(`statut refusée dans images.json`, (await donnees()).images.find((i) => i.id === b.id).statut === "refusée");
  // L'image refusée disparaît du jeu.
  await accueil(page);
  const avant = (await page.getByRole("button", { name: /^Toutes/ }).textContent()) ?? "";
  d = await donnees();
  const jouables = d.images.filter((i) => i.statut === "validée").length;
  check(`jeu : image refusée exclue du compte`, avant.includes(`${jouables} image`), avant);
  await page.goto(BASE + "/gerer");
  await filtre("Source", "perso");
  c = carte(b.id);
  await c.getByRole("button", { name: "Valider" }).click();
  await c.getByRole("button", { name: "Refuser" }).waitFor();
  check(`revalidée dans images.json`, (await donnees()).images.find((i) => i.id === b.id).statut === "validée");

  // Suppression : refus de la confirmation, puis confirmation.
  await c.getByRole("button", { name: "Supprimer" }).click();
  await page.waitForTimeout(300);
  check(`suppression annulée`, (await donnees()).images.some((i) => i.id === b.id));
  for (const x of ajoutees) {
    c = carte(x.id);
    page.removeAllListeners("dialog");
    page.once("dialog", (dlg) => dlg.accept());
    await c.getByRole("button", { name: "Supprimer" }).click();
    await c.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    page.on("dialog", (dlg) => dlg.dismiss().catch(() => {}));
    check(`carte supprimée (${x.id})`, (await c.count()) === 0);
    check(`supprimée de images.json`, !(await donnees()).images.some((i) => i.id === x.id));
    check(`fichier supprimé`, !existsSync(path.join(ROOT, "public", "images", x.fichier)));
  }
  check(`plus aucune image perso de test`, (await compte(page)) === 0);
}

// ---------- Programme ----------
async function main() {
  const t0 = Date.now();
  const sauvegarde = await Promise.all(DATA.map((f) => fs.readFile(f)));
  const persoAvant = await listePerso();
  const logDebut = existsSync(LOG) ? (await fs.stat(LOG)).size : null;
  let browser;
  try {
    try {
      await fetch(BASE);
    } catch {
      throw new Error(`Serveur injoignable sur ${BASE} : lancer d'abord « npm run dev > tmp/e2e-server.log 2>&1 ».`);
    }
    // Photos de test : 2400 × 1600 JPEG et 800 × 600 PNG.
    await fs.mkdir(TMP, { recursive: true });
    const degrade = (w, h) =>
      sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 90, b: 60 } } })
        .composite([{ input: Buffer.from(`<svg width="${w}" height="${h}"><rect x="${w / 4}" y="${h / 4}" width="${w / 2}" height="${h / 2}" fill="#ddd"/></svg>`) }]);
    const photos = { grande: path.join(TMP, "grande.jpg"), petite: path.join(TMP, "petite.png") };
    await degrade(2400, 1600).jpeg().toFile(photos.grande);
    await degrade(800, 600).png().toFile(photos.petite);

    // Une image refusée pour le test.
    const rep = await fetch(`${BASE}/api/images/${IMAGE_REFUSEE}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "refusée" }),
    });
    section = "préparation";
    check(`API : passage en refusée`, rep.status === 200, String(rep.status));
    const incompat = await incompatibles();

    browser = await chromium.launch();
    for (const [nom, options] of [
      ["390×844", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
      ["1280×860", { viewport: { width: 1280, height: 860 } }],
    ]) {
      const contexte = await browser.newContext({ ...options, locale: "fr-FR" });
      contexte.setDefaultTimeout(15000);
      const page = await contexte.newPage();
      surveiller(page, nom);
      const ctx = { ...(await donnees()), incompat }; // relu : le passage précédent a pu créer des termes
      await testerJeu(page, ctx, nom);
      const ajoutees = await testerAjouter(page, nom, photos, nom.startsWith("390"));
      if (ajoutees.length === 2) await testerGerer(page, nom, ajoutees);
      else check(`deux images ajoutées pour tester Gérer`, false);
      await contexte.close();
    }
  } catch (e) {
    check(`exécution sans exception`, false, e.stack ?? String(e));
  } finally {
    await browser?.close().catch(() => {});
    // Remise en état
    await Promise.all(DATA.map((f, k) => fs.writeFile(f, sauvegarde[k])));
    const persoApres = await listePerso();
    for (const f of persoApres ?? []) if (!persoAvant?.includes(f)) await fs.rm(path.join(PERSO, f), { force: true });
    if (persoAvant === null && existsSync(PERSO) && (await fs.readdir(PERSO)).length === 0) await fs.rmdir(PERSO);
    await fs.rm(TMP, { recursive: true, force: true });
  }

  section = "remise en état";
  const remis = await Promise.all(DATA.map((f) => fs.readFile(f)));
  check(`data/*.json restaurés`, remis.every((b, k) => b.equals(sauvegarde[k])));
  check(`public/images/perso/ restauré`, JSON.stringify(await listePerso()) === JSON.stringify(persoAvant));

  section = "erreurs";
  check(`aucune erreur dans le navigateur`, erreursNavigateur.length === 0, `\n    ${[...new Set(erreursNavigateur)].slice(0, 20).join("\n    ")}`);
  if (logDebut !== null) {
    await new Promise((r) => setTimeout(r, 500));
    const log = (await fs.readFile(LOG, "utf8")).slice(logDebut);
    const lignes = log.split("\n").filter((l) => /error|erreur|⨯|unhandled|^\s+at\s|\s5\d\d in /i.test(l));
    check(`aucune erreur dans le log du serveur`, lignes.length === 0, `\n    ${lignes.slice(0, 20).join("\n    ")}`);
  } else check(`log du serveur trouvé (${LOG})`, false);

  const duree = Math.round((Date.now() - t0) / 1000);
  console.log(`\n=== Résumé : ${ok} vérifications réussies, ${echecs.length} échouées (${duree} s) ===`);
  for (const e of echecs) console.log(`  ✗ ${e}`);
  process.exit(echecs.length ? 1 : 0);
}

main();

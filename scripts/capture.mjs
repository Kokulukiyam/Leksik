// Captures d'écran de toutes les pages et de leurs états, pour relire le design.
// Formats : téléphone 390×844, tablettes 820×1180, 768×1024 et 1024×768, ordinateur 1280×800.
// Usage : node scripts/capture.mjs <dossier de sortie>   (serveur lancé sur http://localhost:3000)
// Lecture seule : rien n'est envoyé au serveur (pas d'ajout, pas d'enregistrement), `data/` et `public/images/` restent intacts.
import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const out = process.argv[2];
if (!out) throw new Error("Usage : node scripts/capture.mjs <dossier>");
await fs.mkdir(out, { recursive: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const racine = path.resolve(import.meta.dirname, "..");
const terms = JSON.parse(await fs.readFile(path.join(racine, "data", "terms.json"), "utf8"));
const images = JSON.parse(await fs.readFile(path.join(racine, "data", "images.json"), "utf8")).filter((i) => i.statut === "validée");
const definition = new Map(terms.map((t) => [t.id, t.definition]));
const termeDe = new Map(terms.map((t) => [t.id, t]));

// Progression de démonstration, contrastée d'une catégorie à l'autre : presque finie, vierge, beaucoup à revoir…
// Parts [maîtrisés, en cours, à revoir] des mots de chaque catégorie, dans l'ordre des catégories.
const PROFILS = [[0.9, 0.06, 0.02], [0, 0, 0], [0.15, 0.1, 0.5], [0.5, 0.2, 0.05], [0.3, 0.35, 0.1], [0.06, 0.12, 0.06], [0.7, 0.1, 0.1], [0.2, 0.05, 0.3], [0.4, 0.4, 0.05], [0.1, 0.3, 0.2], [0.6, 0.05, 0.2], [0.25, 0.15, 0.15], [0.03, 0, 0.03]];
const jour = Math.floor(Date.now() / 86400000);
const categories = [...new Set(terms.map((t) => t.categorie))];
const progres = {};
for (const [c, cat] of categories.entries()) {
  const mots = terms.filter((t) => t.categorie === cat);
  const [m, e, r] = PROFILS[c % PROFILS.length];
  mots.forEach((t, k) => {
    const f = (k + 0.5) / mots.length;
    if (f < m) progres[t.id] = { j: 3, f: 0, s: 3, d: jour };
    else if (f < m + e) progres[t.id] = { j: 1, f: 0, s: 1, d: jour };
    else if (f < m + e + r) progres[t.id] = { j: 0, f: 1, s: 0, d: jour };
  });
}

// Photo pour l'aperçu de la page Ajouter : copie temporaire d'une photo du projet (jamais envoyée).
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "leksik-capture-"));
const commons = path.join(racine, "public", "images", "commons");
const source = (await fs.readdir(commons)).filter((f) => f.startsWith("linteau")).sort()[0];
const photoEssai = path.join(tmp, "linteau-rue-carnot.webp");
await fs.copyFile(path.join(commons, source), photoEssai);

// Cas extrêmes de la manche : la photo la plus en hauteur, la plus panoramique, une carrée (toutes avec un cadre),
// chacune avec, parmi les mauvaises réponses, le mot à la définition la plus longue.
const formes = [];
for (const i of images.filter((x) => x.rectangle)) {
  try {
    const m = await sharp(path.join(racine, "public", "images", i.fichier)).metadata();
    formes.push({ i, a: m.width / m.height });
  } catch {
    /* fichier illisible : ignoré */
  }
}
formes.sort((x, y) => x.a - y.a);
const extremes = {
  portrait: formes[0].i,
  panoramique: formes[formes.length - 1].i,
  carree: [...formes].sort((x, y) => Math.abs(x.a - 1) - Math.abs(y.a - 1))[0].i,
};
const longs = [...terms].sort((x, y) => y.definition.length - x.definition.length);
const mancheExtreme = (img, nombre) => {
  const bon = termeDe.get(img.termId);
  const autres = [...longs.filter((t) => t.id !== bon.id).slice(0, 1), ...terms.filter((t) => t.categorie === bon.categorie && t.id !== bon.id && t.id !== longs[0].id)].slice(0, nombre - 1);
  return { imageId: img.id, termId: bon.id, choix: [autres[0].id, bon.id, ...autres.slice(1).map((t) => t.id)] };
};
const partieExtreme = (nombre) => {
  const manches = Object.values(extremes).map((img) => mancheExtreme(img, nombre));
  return { categorie: "Toutes", manches, reponses: manches.map(() => null) };
};

// Une partie crédible : pas d'alternance parfaite juste / faux.
const SUITE = "JFJJFJJJFJ";

const FORMATS = [
  ["tel", 390, 844, "tout"],
  ["tab", 820, 1180, "jeu"],
  ["tab768", 768, 1024, "jeu"],
  ["tabpaysage", 1024, 768, "jeu"],
  ["ordi", 1280, 800, "tout"],
];

const b = await chromium.launch();
for (const [nom, w, h, etendue] of FORMATS) {
  const mobile = w < 500;
  const tactile = nom !== "ordi";
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: "fr-FR", ...(tactile ? { isMobile: true, hasTouch: true } : {}) });
  const p = await c.newPage();
  // État de repos : la souris est écartée avant chaque capture (sauf capture de survol).
  const photo = async (n, opts = {}) => {
    const { survol, ...reste } = opts;
    if (!survol && !tactile) await p.mouse.move(2, 2);
    if (!survol) await p.waitForTimeout(150);
    await p.screenshot({ path: `${out}/${nom}-${n}.png`, ...reste });
  };
  // Page longue : pleine page sur ordinateur ; ailleurs, le haut puis le bas de la page.
  const pageLongue = async (n) => {
    if (!tactile) return photo(n, { fullPage: true });
    await p.evaluate(() => window.scrollTo(0, 0));
    await photo(`${n}-haut`);
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(400);
    await photo(`${n}-bas`);
    await p.evaluate(() => window.scrollTo(0, 0));
  };
  const choix = p.locator("[data-testid=choix] button");
  const bonneReponse = () =>
    p.evaluate(() => {
      const partie = JSON.parse(localStorage.getItem("leksik:partie"));
      return partie.manches[partie.reponses.findIndex((r) => r === null)]?.termId;
    });
  // Mauvaise réponse dont la définition est la plus longue (le pire cas pour la mise en page).
  const pireMauvaise = async (bon) => {
    const ids = await choix.evaluateAll((bs) => bs.map((x) => x.dataset.term));
    const id = ids.filter((x) => x !== bon).sort((x, y) => (definition.get(y)?.length ?? 0) - (definition.get(x)?.length ?? 0))[0];
    return p.locator(`[data-testid=choix] button[data-term="${id}"]`);
  };
  const accueil = async (reglages, partie) => {
    await p.goto(BASE + "/");
    await p.evaluate(
      ([pr, r, pa]) => {
        localStorage.clear();
        localStorage.setItem("leksik:progres", JSON.stringify(pr));
        if (r) localStorage.setItem("leksik:parametres", JSON.stringify(r));
        if (pa) localStorage.setItem("leksik:partie", JSON.stringify(pa));
      },
      [progres, reglages ?? null, partie ?? null],
    );
    await p.reload();
    if (partie) await choix.first().waitFor();
    else await p.getByRole("button", { name: /^Toutes/ }).waitFor();
    await p.waitForTimeout(700);
  };
  const attendrePhoto = () => p.locator("main img").first().evaluate((i) => i.complete || new Promise((r) => (i.onload = i.onerror = r)));

  // Cas extrêmes : question puis verdict faux pour chaque forme de photo, à 4 puis à 6 mots ; un verdict juste.
  const casExtremes = async (nombre) => {
    await accueil({ propositions: nombre }, partieExtreme(nombre));
    for (const forme of Object.keys(extremes)) {
      await attendrePhoto();
      await p.waitForTimeout(500);
      await photo(`x-${nombre}mots-${forme}-question`);
      const bon = await bonneReponse();
      if (forme === "carree" && nombre === 4) await p.locator(`[data-testid=choix] button[data-term="${bon}"]`).click();
      else await (await pireMauvaise(bon)).click();
      await p.getByTestId("retour").waitFor();
      await p.waitForTimeout(400);
      await photo(`x-${nombre}mots-${forme}-${forme === "carree" && nombre === 4 ? "juste" : "faux"}`);
      await p.getByRole("button", { name: "Suivant" }).click();
      await p.waitForTimeout(300);
    }
  };

  await accueil();
  await pageLongue("1-accueil");

  if (etendue === "jeu") {
    await p.getByRole("button", { name: /^Toutes/ }).click();
    await choix.first().waitFor();
    await attendrePhoto();
    await p.waitForTimeout(600);
    await photo("2-manche");
    await casExtremes(4);
    await casExtremes(6);
    await c.close();
    continue;
  }

  if (nom === "ordi") {
    await p.getByRole("button", { name: /^Structure/ }).hover();
    await p.waitForTimeout(200);
    await photo("1-accueil-survol-categorie", { survol: true });
    await p.mouse.move(2, 2);
    for (let k = 0; k < 9; k++) await p.keyboard.press("Tab");
    await p.waitForTimeout(200);
    await photo("1-accueil-focus-clavier");
  }

  await p.getByRole("button", { name: /^Toutes/ }).click();
  await choix.first().waitFor();
  await attendrePhoto();
  await p.waitForTimeout(600);
  await photo("2-manche");
  if (nom === "ordi") {
    await choix.nth(1).hover();
    await p.waitForTimeout(200);
    await photo("2-manche-survol-reponse", { survol: true });
    await choix.nth(1).focus();
    await p.keyboard.press("Tab");
    await p.waitForTimeout(200);
    await photo("2-manche-focus-reponse");
  }

  // Image agrandie : à l'ouverture pour une photo en largeur et une en hauteur, puis agrandie d'un toucher.
  const vues = new Set();
  const agrandir = async () => {
    const forme = await p.locator("main img").first().evaluate((i) => (i.naturalWidth / i.naturalHeight > 1.2 ? "paysage" : i.naturalWidth / i.naturalHeight < 0.85 ? "portrait" : ""));
    if (!forme || vues.has(forme)) return;
    vues.add(forme);
    await p.locator("main img").first().click();
    const vis = p.getByTestId("visionneuse");
    await vis.waitFor();
    await p.waitForTimeout(500);
    await photo(`5-image-agrandie-${forme}`);
    if (vues.size === 1) {
      await vis.locator("img").click();
      await p.waitForTimeout(400);
      await photo(`5-image-agrandie-${forme}-zoom`);
    }
    await p.keyboard.press("Escape");
    await vis.waitFor({ state: "detached" });
  };

  for (let i = 0; ; i++) {
    const bon = await bonneReponse();
    const juste = SUITE[i % SUITE.length] === "J";
    const cible = juste ? p.locator(`[data-testid=choix] button[data-term="${bon}"]`) : await pireMauvaise(bon);
    await attendrePhoto();
    if (i === 1) {
      await p.waitForTimeout(400);
      await photo("2-manche-suivante");
    }
    await cible.click();
    await p.getByTestId("retour").waitFor();
    await p.waitForTimeout(300);
    if (i === 0) await photo("3-retour-juste");
    if (i === 1) await photo("4-retour-faux");
    await agrandir();
    await p.getByRole("button", { name: "Suivant" }).click();
    await p.waitForTimeout(250);
    if (await p.getByTestId("score").count()) break;
  }
  await p.waitForTimeout(800);
  await pageLongue("6-fin");

  await casExtremes(4);
  await casExtremes(6);
  await accueil();

  // Lexique : liste, filtre avec la valeur la plus longue, photo agrandie d'un mot à plusieurs photos.
  await p.goto(`${BASE}/lexique`);
  await p.getByTestId("mot").first().waitFor();
  await p.waitForTimeout(1200);
  await photo("7-lexique");
  await p.getByLabel("Catégorie", { exact: true }).selectOption("Second œuvre et finitions");
  await p.waitForTimeout(800);
  await photo("7-lexique-filtre-long");
  await p.getByLabel("Catégorie", { exact: true }).selectOption("");
  await p.locator("[data-testid=mot] button[aria-label^='Voir les']").first().click();
  await p.getByTestId("visionneuse").waitFor();
  await p.waitForTimeout(600);
  await photo("7-lexique-photo-agrandie");
  await p.keyboard.press("Escape");

  // Gérer : liste, contrôle déplié, fiche en cours de modification (rien n'est enregistré).
  await p.goto(`${BASE}/gerer`);
  await p.getByTestId("carte").first().waitFor();
  await p.waitForTimeout(1500);
  await photo("7-gerer");
  await p.getByTestId("carte").first().locator("summary").click();
  await p.waitForTimeout(200);
  await photo("7-gerer-controle");
  await p.getByTestId("carte").first().getByRole("button", { name: "Modifier" }).click();
  await p.getByTestId("zone-rect").locator("img").waitFor();
  await p.waitForTimeout(800);
  await photo("7-gerer-modification");
  if (mobile) {
    await p.getByTestId("carte").first().evaluate((el) => el.scrollIntoView({ block: "end" }));
    await p.waitForTimeout(300);
    await photo("7-gerer-modification-bas");
  }

  // Paramètres.
  await p.goto(`${BASE}/parametres`);
  await p.getByTestId("param-compte").waitFor();
  await p.waitForTimeout(400);
  await pageLongue("8-parametres");

  // Ajouter : vide, saisie d'un terme inconnu, puis photo choisie et terme reconnu (jamais envoyé).
  await p.goto(`${BASE}/ajouter`);
  await p.locator("#objet").waitFor();
  await p.waitForTimeout(400);
  await photo("9-ajouter");
  await p.locator("#objet").fill("lintau");
  await p.locator("#objet").blur();
  await p.waitForTimeout(400);
  await pageLongue("9-ajouter-saisie");
  await p.setInputFiles("#photo", photoEssai);
  await p.getByTestId("zone-rect").locator("img").waitFor();
  await p.locator("#objet").fill("le linteau");
  const zone = await p.getByTestId("zone-rect").boundingBox();
  await p.mouse.move(zone.x + zone.width * 0.25, zone.y + zone.height * 0.3);
  await p.mouse.down();
  await p.mouse.move(zone.x + zone.width * 0.75, zone.y + zone.height * 0.45, { steps: 5 });
  await p.mouse.up();
  await p.locator("#lieu").fill("Plateau, Dakar");
  await p.locator("#lieu").blur();
  await p.waitForTimeout(400);
  await pageLongue("9-ajouter-photo");
  await c.close();
}
await b.close();
await fs.rm(tmp, { recursive: true, force: true });
console.log(`Captures dans ${out}`);

// Captures d'écran de toutes les pages et de leurs états, pour relire le design.
// Trois largeurs : téléphone 390 px, tablette 820 px (accueil et manche), ordinateur 1280 px.
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
const terms = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, "..", "data", "terms.json"), "utf8"));
const definition = new Map(terms.map((t) => [t.id, t.definition]));

// Progression factice : un mot sur trois déjà vu, pour que les jauges et les états soient visibles.
const jour = Math.floor(Date.now() / 86400000);
const progres = Object.fromEntries(
  terms.filter((_, k) => k % 3 === 0).map((t, k) => [t.id, k % 4 === 0 ? { j: 0, f: 1, s: 0, d: jour } : k % 4 === 1 ? { j: 1, f: 0, s: 1, d: jour } : { j: 3, f: 0, s: 3, d: jour }]),
);

// Photo d'essai pour l'aperçu de la page Ajouter (fichier temporaire, jamais envoyé).
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "leksik-capture-"));
const photoEssai = path.join(tmp, "facade-essai.jpg");
await sharp({
  create: { width: 1200, height: 800, channels: 3, background: "#b9a58c" },
})
  .composite([
    { input: await sharp({ create: { width: 1200, height: 260, channels: 3, background: "#8fb3cf" } }).png().toBuffer(), top: 0, left: 0 },
    { input: await sharp({ create: { width: 260, height: 330, channels: 3, background: "#3b4650" } }).png().toBuffer(), top: 340, left: 470 },
    { input: await sharp({ create: { width: 300, height: 36, channels: 3, background: "#e8e1d3" } }).png().toBuffer(), top: 304, left: 450 },
  ])
  .jpeg()
  .toFile(photoEssai);

// Une partie crédible : pas d'alternance parfaite juste / faux.
const SUITE = "JFJJFJJJFJ";

const b = await chromium.launch();
for (const [nom, w, h] of [["tel", 390, 844], ["tab", 820, 1180], ["ordi", 1280, 800]]) {
  const mobile = w < 500;
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: "fr-FR", ...(w < 1000 ? { isMobile: true, hasTouch: true } : {}) });
  const p = await c.newPage();
  const photo = (n, opts = {}) => p.screenshot({ path: `${out}/${nom}-${n}.png`, ...opts });
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
  const accueil = async (reglages) => {
    await p.goto(BASE + "/");
    await p.evaluate(
      ([pr, r]) => {
        localStorage.clear();
        localStorage.setItem("leksik:progres", JSON.stringify(pr));
        if (r) localStorage.setItem("leksik:parametres", JSON.stringify(r));
      },
      [progres, reglages ?? null],
    );
    await p.reload();
    await p.getByRole("button", { name: /^Toutes/ }).waitFor();
    await p.waitForTimeout(300);
  };

  await accueil();
  await photo("1-accueil", { fullPage: true });

  if (nom === "ordi") {
    await p.getByRole("button", { name: /^Structure/ }).hover();
    await p.waitForTimeout(200);
    await photo("1-accueil-survol-categorie");
    await p.mouse.move(0, 0);
    for (let k = 0; k < 9; k++) await p.keyboard.press("Tab");
    await p.waitForTimeout(200);
    await photo("1-accueil-focus-clavier");
  }

  await p.getByRole("button", { name: /^Toutes/ }).click();
  await choix.first().waitFor();
  await p.waitForTimeout(800);
  await photo("2-manche");
  if (nom === "ordi") {
    await choix.nth(1).hover();
    await p.waitForTimeout(200);
    await photo("2-manche-survol-reponse");
    await p.mouse.move(0, 0);
  }

  if (nom === "tab") {
    const bon = await bonneReponse();
    await (await pireMauvaise(bon)).click();
    await p.getByTestId("retour").waitFor();
    await p.waitForTimeout(300);
    await photo("4-retour-faux");
    await c.close();
    continue;
  }

  for (let i = 0; ; i++) {
    const bon = await bonneReponse();
    const juste = SUITE[i % SUITE.length] === "J";
    const cible = juste ? p.locator(`[data-testid=choix] button[data-term="${bon}"]`) : await pireMauvaise(bon);
    await cible.click();
    await p.getByTestId("retour").waitFor();
    await p.waitForTimeout(300);
    if (i === 0) await photo("3-retour-juste");
    if (i === 1) await photo("4-retour-faux");
    if (i === 2) {
      await p.locator("main img").first().click();
      await p.waitForTimeout(500);
      await photo("5-image-agrandie");
      await p.keyboard.press("Escape");
    }
    await p.getByRole("button", { name: "Suivant" }).click();
    await p.waitForTimeout(250);
    if (await p.getByTestId("score").count()) break;
  }
  await p.waitForTimeout(800);
  await photo("6-fin", { fullPage: true });

  // Partie à 6 propositions : avant et après une mauvaise réponse.
  await accueil({ propositions: 6 });
  await p.getByRole("button", { name: /^Toutes/ }).click();
  await choix.first().waitFor();
  await p.waitForTimeout(800);
  await photo("2-manche-6-mots");
  await (await pireMauvaise(await bonneReponse())).click();
  await p.getByTestId("retour").waitFor();
  await p.waitForTimeout(300);
  await photo("4-retour-faux-6-mots");
  await p.getByRole("button", { name: "Quitter" }).click();
  await accueil();

  // Lexique : liste, filtre avec une valeur longue, photo agrandie d'un mot à plusieurs photos.
  await p.goto(`${BASE}/lexique`);
  await p.getByTestId("mot").first().waitFor();
  await p.waitForTimeout(1200);
  await photo("7-lexique");
  await p.getByLabel("Catégorie", { exact: true }).selectOption("Matériaux et revêtements");
  await p.waitForTimeout(800);
  await photo("7-lexique-filtre-long");
  await p.locator("[data-testid=mot] button[aria-label^='Voir les']").first().click();
  await p.getByTestId("visionneuse").waitFor();
  await p.waitForTimeout(600);
  await photo("7-lexique-photo-agrandie");
  await p.keyboard.press("Escape");

  // Gérer : liste, vérification dépliée, fiche en cours de modification (rien n'est enregistré).
  await p.goto(`${BASE}/gerer`);
  await p.getByTestId("carte").first().waitFor();
  await p.waitForTimeout(1500);
  await photo("7-gerer");
  await p.getByTestId("carte").first().locator("summary").click();
  await p.waitForTimeout(200);
  await photo("7-gerer-verification");
  await p.getByTestId("carte").first().getByRole("button", { name: "Modifier" }).click();
  await p.getByTestId("zone-rect").locator("img").waitFor();
  await p.waitForTimeout(800);
  await photo("7-gerer-modification");

  // Paramètres.
  await p.goto(`${BASE}/parametres`);
  await p.getByTestId("param-compte").waitFor();
  await p.waitForTimeout(400);
  await photo("8-parametres", { fullPage: true });

  // Ajouter : vide, saisie d'un terme inconnu, puis photo choisie et terme reconnu (jamais envoyé).
  await p.goto(`${BASE}/ajouter`);
  await p.locator("#objet").waitFor();
  await p.waitForTimeout(400);
  await photo("9-ajouter");
  await p.locator("#objet").fill("lintau");
  await p.waitForTimeout(400);
  await photo("9-ajouter-saisie", { fullPage: mobile });
  await p.setInputFiles("#photo", photoEssai);
  await p.getByTestId("zone-rect").locator("img").waitFor();
  await p.locator("#objet").fill("le linteau");
  const zone = await p.getByTestId("zone-rect").boundingBox();
  await p.mouse.move(zone.x + zone.width * 0.36, zone.y + zone.height * 0.36);
  await p.mouse.down();
  await p.mouse.move(zone.x + zone.width * 0.64, zone.y + zone.height * 0.44, { steps: 5 });
  await p.mouse.up();
  await p.locator("#lieu").fill("Plateau, Dakar");
  await p.locator("#lieu").blur();
  await p.waitForTimeout(400);
  await photo("9-ajouter-photo", { fullPage: mobile });
  await c.close();
}
await b.close();
await fs.rm(tmp, { recursive: true, force: true });
console.log(`Captures dans ${out}`);

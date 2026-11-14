// Captures d'écran de toutes les pages (téléphone 390 px et ordinateur 1280 px), pour relire le design.
// Usage : node scripts/capture.mjs <dossier de sortie>   (serveur lancé sur http://localhost:3000)
import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const out = process.argv[2];
if (!out) throw new Error("Usage : node scripts/capture.mjs <dossier>");
await fs.mkdir(out, { recursive: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const terms = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, "..", "data", "terms.json"), "utf8"));
// Progression factice : un mot sur trois déjà vu, pour que les jauges et les étiquettes soient visibles.
const jour = Math.floor(Date.now() / 86400000);
const progres = Object.fromEntries(
  terms.filter((_, k) => k % 3 === 0).map((t, k) => [t.id, k % 4 === 0 ? { j: 0, f: 1, s: 0, d: jour } : k % 4 === 1 ? { j: 1, f: 0, s: 1, d: jour } : { j: 3, f: 0, s: 3, d: jour }]),
);

const b = await chromium.launch();
for (const [nom, w, h] of [["tel", 390, 844], ["ordi", 1280, 800]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: "fr-FR", ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
  const p = await c.newPage();
  const photo = (n, opts = {}) => p.screenshot({ path: `${out}/${nom}-${n}.png`, ...opts });
  await p.goto(BASE + "/");
  await p.evaluate((pr) => { localStorage.clear(); localStorage.setItem("leksik:progres", JSON.stringify(pr)); }, progres);
  await p.reload();
  await p.getByRole("button", { name: /^Toutes/ }).waitFor();
  await photo("1-accueil", { fullPage: true });
  await p.getByRole("button", { name: /^Toutes/ }).click();
  const choix = p.locator("[data-testid=choix] button");
  await choix.first().waitFor();
  await p.waitForTimeout(800);
  await photo("2-manche");
  for (let i = 0; ; i++) {
    const bon = await p.evaluate(() => {
      const partie = JSON.parse(localStorage.getItem("leksik:partie"));
      return partie.manches[partie.reponses.findIndex((r) => r === null)]?.termId;
    });
    // Une bonne réponse, puis une mauvaise, et ainsi de suite.
    const cible = i % 2 === 0 ? p.locator(`[data-testid=choix] button[data-term="${bon}"]`) : p.locator(`[data-testid=choix] button:not([data-term="${bon}"])`).first();
    await cible.click();
    await p.getByTestId("retour").waitFor();
    await p.waitForTimeout(300);
    if (i === 0) await photo("3-retour-juste");
    if (i === 1) await photo("4-retour-faux");
    if (i === 2) {
      await p.locator("main img").first().click();
      await p.waitForTimeout(400);
      await photo("5-image-agrandie");
      await p.keyboard.press("Escape");
    }
    await p.getByRole("button", { name: "Suivant" }).click();
    await p.waitForTimeout(250);
    if (await p.getByTestId("score").count()) break;
  }
  await p.waitForTimeout(800);
  await photo("6-fin", { fullPage: true });
  await p.getByRole("button", { name: "Nouvelle partie" }).click();
  for (const page of ["lexique", "ajouter", "gerer", "parametres"]) {
    await p.goto(`${BASE}/${page}`);
    await p.waitForTimeout(1500);
    await photo(`7-${page}`);
  }
  await p.goto(`${BASE}/parametres`);
  await p.waitForTimeout(500);
  await photo("8-parametres-entier", { fullPage: true });
  await p.goto(`${BASE}/ajouter`);
  await p.locator("#objet").fill("lintau");
  await p.waitForTimeout(400);
  await photo("9-ajouter-saisie");
  await c.close();
}
await b.close();
console.log(`Captures dans ${out}`);

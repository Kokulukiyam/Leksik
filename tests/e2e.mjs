// Test de bout en bout de Leksik (Playwright, bibliothèque seule).
// Prérequis : serveur lancé (`npm run dev > tmp/e2e-server.log 2>&1`) sur http://localhost:3000.
// Couvre : jeu, progression et clavier, lexique, ajouter, paramètres, gérer.
// Usage : npm run e2e   (variables facultatives : BASE_URL, SERVER_LOG)
// Si un serveur `next dev` tourne déjà (lancé ailleurs), SERVER_LOG=.next/dev/logs/next-development.log.
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
// Catégories lues dans lib/shared.ts (source de vérité de l'app).
const CATEGORIES = [
  ...(await fs.readFile(path.join(ROOT, "lib", "shared.ts"), "utf8"))
    .match(/CATEGORIES = \[([\s\S]*?)\] as const/)[1]
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);
const PAQUET = 60; // cartes affichées à la fois dans Gérer
const DEFAUTS = { imagesParPartie: 10, propositions: 4, frequence: 3, sources: "toutes", mauvaisesReponses: "categorie", suivantAuto: false, tirage: "adapte" };
const CLE_PARAMS = "leksik:parametres";
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

// Paires incompatibles (champ `incompatibles` des termes, dans un sens ou dans l'autre).
const incompatibles = (a, b) => !!(a.incompatibles?.includes(b.id) || b.incompatibles?.includes(a.id));

// Copie de normaliser() (lib/shared.ts) : minuscules, sans accents, sans article.
const normaliser = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/’/g, "'")
    .trim().replace(/^(l['’]\s*|le\s+|la\s+|les\s+|un\s+|une\s+|des\s+)/, "").replace(/[-\s]+/g, " ").trim();

// Images jouables selon les réglages (validée, terme connu, source, fréquence).
const jouablesSelon = (ctx, p = DEFAUTS) =>
  ctx.images.filter((i) => {
    const t = ctx.termsParId.get(i.termId);
    return i.statut === "validée" && t && (p.sources === "toutes" || i.source === p.sources) && (t.priorite === undefined || t.priorite <= p.frequence);
  });

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

const boutonCategorie = (page, cat) =>
  page.locator("main").getByRole("button", { name: new RegExp(`^${cat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d+ image`) });

async function accueil(page) {
  await page.goto(BASE + "/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /^Toutes/ }).waitFor();
}

// Joue une partie déjà démarrée. `faux(i)` dit s'il faut répondre faux à la manche i.
// `p` : réglages en vigueur (nombre de mots, mauvaises réponses, fréquence, source, suivant automatique).
async function jouerPartie(page, ctx, { faux, attendu, refusee, termesPermis, relancer, p = DEFAUTS, stats }) {
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
    else {
      check(`source ${p.sources} (${image.id})`, p.sources === "toutes" || image.source === p.sources, image.source);
      const pr = ctx.termsParId.get(image.termId)?.priorite;
      check(`fréquence ≤ ${p.frequence} (${image.termId})`, pr === undefined || pr <= p.frequence, String(pr));
    }
    const term = ctx.termsParId.get(image.termId);
    // Rectangle
    const cadres = await page.locator("main [data-testid=cadre]").count();
    check(`rectangle ${image.rectangle ? "affiché" : "absent"} (${image.id})`, cadres === (image.rectangle ? 1 : 0));
    // Crédit
    const credit = (await page.getByTestId("credit").textContent()) ?? "";
    check(`crédit auteur et licence (${image.id})`, credit.includes(image.auteur) && credit.includes(image.licence), credit);
    // Les mots proposés
    const boutons = page.getByTestId("choix").locator("button");
    const n = await boutons.count();
    const ids = await boutons.evaluateAll((bs) => bs.map((b) => b.dataset.term));
    const textes = (await boutons.allTextContents()).map((t) => t.trim());
    const candidats = ctx.terms.filter((t) => t.id !== term.id && t.terme !== term.terme && !incompatibles(t, term));
    const mots = Math.min(p.propositions, candidats.length + 1); // (les incompatibilités ne réduisent pas ce nombre ici : 60+ termes)
    check(`${mots} mots (${image.id})`, n === mots, String(n));
    check(`mots distincts (${image.id})`, new Set(ids).size === n && new Set(textes).size === n, textes.join(" | "));
    check(`bonne réponse présente (${image.id})`, ids.includes(term.id) && textes.includes(term.terme), textes.join(" | "));
    check(`mots = termes existants`, ids.every((id, k) => ctx.termsParId.get(id)?.terme === textes[k]));
    const termes = ids.map((id) => ctx.termsParId.get(id)).filter(Boolean);
    const paires = termes.flatMap((x, k) => termes.slice(k + 1).filter((y) => incompatibles(x, y)).map((y) => `${x.id}/${y.id}`));
    check(`aucune paire incompatible dans la manche (${image.id})`, paires.length === 0, paires.join(", "));
    // Mauvaises réponses : même catégorie d'abord (si demandé), puis termes de la fréquence choisie.
    const faussesIds = ids.filter((id) => id !== term.id);
    const autresMemeCat = candidats.filter((t) => t.categorie === term.categorie).length;
    const memeCat = faussesIds.filter((id) => ctx.termsParId.get(id)?.categorie === term.categorie).length;
    // Candidat écarté alors qu'il était compatible avec tous les mots proposés.
    const ecartables = candidats.filter((t) => !ids.includes(t.id) && termes.every((x) => !incompatibles(x, t)));
    if (p.mauvaisesReponses === "categorie")
      check(`mauvaises réponses de la même catégorie (${image.id})`,
        memeCat === Math.min(mots - 1, autresMemeCat) || (memeCat < mots - 1 && !ecartables.some((t) => t.categorie === term.categorie)),
        `${memeCat}/${Math.min(mots - 1, autresMemeCat)}`);
    const rang = (t) => (p.mauvaisesReponses === "categorie" && t.categorie !== term.categorie ? 2 : 0) + ((t.priorite ?? 1) > p.frequence ? 1 : 0);
    const pire = Math.max(-1, ...faussesIds.map((id) => rang(ctx.termsParId.get(id))));
    const meilleurRestant = Math.min(9, ...ecartables.map(rang));
    check(`mauvaises réponses les plus pertinentes (${image.id})`, pire <= meilleurRestant, `${pire} > ${meilleurRestant}`);
    if (stats) {
      stats.fausses += faussesIds.length;
      stats.autreCat += faussesIds.length - memeCat;
    }
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
    check(`boutons désactivés après réponse`, (await page.locator("[data-testid=choix] button:disabled").count()) === n);
    const suivante = async () =>
      page.waitForFunction(
        (k) => !document.querySelector("[data-testid=progression]")?.textContent?.startsWith(`${k} /`),
        i + 1,
        { timeout: 6000 },
      ).then(() => true, () => false);
    if (p.suivantAuto && !repondreFaux) {
      // Image suivante automatique, sans appuyer sur « Suivant ».
      check(`suivant automatique après une bonne réponse (manche ${i + 1})`, await suivante());
    } else {
      if (p.suivantAuto) {
        await page.waitForTimeout(2500);
        check(`pas de suivant automatique après une mauvaise réponse (manche ${i + 1})`,
          ((await prog.textContent()) ?? "").startsWith(`${i + 1} /`) && (await retour.isVisible()));
      }
      await page.getByRole("button", { name: "Suivant" }).click();
    }
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
  const jouables = jouablesSelon(ctx);
  const texte = (await page.locator("main").textContent()) ?? "";
  check(`accueil : 4 mots, parties de 10 images`, texte.includes("Une image, 4 mots") && texte.includes("Parties de 10 images"), texte.slice(0, 120));
  check(`${CATEGORIES.length + 1} boutons de catégorie`, (await page.locator("main button").count()) === CATEGORIES.length + 1);
  for (const cat of ["Toutes", ...CATEGORIES]) {
    const attendu = cat === "Toutes" ? jouables.length : jouables.filter((i) => ctx.termsParId.get(i.termId).categorie === cat).length;
    const bouton = boutonCategorie(page, cat);
    const libelle = (await bouton.textContent()) ?? "";
    check(`compte « ${cat} » = ${attendu}`, libelle.includes(`${attendu} image${attendu > 1 ? "s" : ""}`), libelle);
    if (attendu === 0) {
      // Catégorie encore sans image : bouton désactivé.
      check(`« ${cat} » désactivé (0 image)`, await bouton.isDisabled());
      continue;
    }
    check(`« ${cat} » actif`, await bouton.isEnabled());
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

// ---------- Paramètres ----------
const LIBELLES = {
  frequence: { 1: "Les plus courants", 2: "Courants et fréquents", 3: "Tous" },
  sources: { toutes: "Toutes", commons: "Commons", perso: "Mes photos" },
  mauvaisesReponses: { categorie: "Même catégorie", toutes: "Toutes catégories" },
  suivantAuto: { false: "J'appuie sur « Suivant »", true: "Image suivante automatique" },
  tirage: { adapte: "Mots à apprendre d'abord", hasard: "Au hasard" },
};
const GROUPES = { imagesParPartie: "images", propositions: "propositions", frequence: "frequence", sources: "sources", mauvaisesReponses: "mauvaises", suivantAuto: "suivant", tirage: "tirage" };
const libelle = (cle, v) => LIBELLES[cle]?.[String(v)] ?? String(v);

async function regler(page, modif) {
  for (const [cle, v] of Object.entries(modif)) {
    const b = page.getByTestId(`param-${GROUPES[cle]}`).getByRole("button", { name: libelle(cle, v), exact: true });
    await b.click();
    check(`réglage ${cle} = ${v} sélectionné`, (await b.getAttribute("aria-pressed")) === "true");
  }
}

// Vérifie que la page affiche exactement les réglages `p` (un seul bouton pressé par groupe) et le compte d'images.
async function verifierAffiches(page, ctx, p, ou) {
  for (const [cle, groupe] of Object.entries(GROUPES)) {
    const presses = await page.getByTestId(`param-${groupe}`).locator('button[aria-pressed="true"]').allTextContents();
    check(`${ou} : ${cle} = ${p[cle]}`, presses.length === 1 && presses[0].trim() === libelle(cle, p[cle]), presses.join(" | "));
  }
  const n = jouablesSelon(ctx, p).length;
  const txt = ((await page.getByTestId("param-compte").textContent()) ?? "").replace(/\s+/g, " ");
  check(`${ou} : ${n} images jouables`, txt.includes(`${n} image${n > 1 ? "s" : ""} jouable`), txt);
}

const lireStockage = (page) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return "illisible"; } }, CLE_PARAMS);

async function ouvrirParametres(page) {
  await page.goto(BASE + "/parametres");
  await page.getByTestId("param-compte").waitFor();
}

// Lance une partie dans `cat` avec les réglages `p` et la joue entièrement.
async function partieAvec(page, ctx, p, { cat = "Toutes", faux = (i) => i % 2 === 1, stats } = {}) {
  await page.goto(BASE + "/");
  await boutonCategorie(page, "Toutes").waitFor();
  const texte = (await page.locator("main").textContent()) ?? "";
  check(`accueil : ${p.propositions} mots, parties de ${p.imagesParPartie}`, texte.includes(`Une image, ${p.propositions} mots`) && texte.includes(`Parties de ${p.imagesParPartie} images`), texte.slice(0, 100));
  const pool = jouablesSelon(ctx, p);
  for (const c of ["Toutes", ...CATEGORIES]) {
    const n = c === "Toutes" ? pool.length : pool.filter((i) => ctx.termsParId.get(i.termId).categorie === c).length;
    const b = boutonCategorie(page, c);
    const lib = (await b.textContent()) ?? "";
    if (!lib.includes(`${n} image${n > 1 ? "s" : ""}`) || (await b.isDisabled()) !== (n === 0)) check(`compte « ${c} » = ${n} (${p.sources}, fréquence ${p.frequence})`, false, lib);
  }
  await boutonCategorie(page, cat).click();
  if (p.propositions === 6) await pasDeDefilementHorizontal(page, "manche à 6 mots");
  const r = await jouerPartie(page, ctx, { faux, attendu: p.imagesParPartie, refusee: IMAGE_REFUSEE, p, stats });
  await page.getByRole("button", { name: "Nouvelle partie" }).click();
  await boutonCategorie(page, "Toutes").waitFor();
  return r;
}

async function testerParametres(page, nom) {
  section = `${nom} · paramètres`;
  console.log(`- ${section}`);
  let ctx = await donnees();
  await accueil(page); // localStorage vidé
  await page.getByRole("link", { name: "Paramètres" }).click();
  await page.getByTestId("param-compte").waitFor();
  check(`lien « Paramètres » de l'en-tête`, new URL(page.url()).pathname === "/parametres", page.url());
  await pasDeDefilementHorizontal(page, "paramètres");
  await verifierAffiches(page, ctx, DEFAUTS, "défauts");

  // 5 images, 6 mots.
  let p = { ...DEFAUTS, imagesParPartie: 5, propositions: 6 };
  await regler(page, { imagesParPartie: 5, propositions: 6 });
  check(`réglages enregistrés dans localStorage`, JSON.stringify(await lireStockage(page)) === JSON.stringify(p), JSON.stringify(await lireStockage(page)));
  await page.reload();
  await page.getByTestId("param-compte").waitFor();
  await verifierAffiches(page, ctx, p, "après rechargement");
  await partieAvec(page, ctx, p);

  // 2 mots, mauvaises réponses de toutes catégories.
  await ouvrirParametres(page);
  p = { ...p, propositions: 2, mauvaisesReponses: "toutes", imagesParPartie: 10 };
  await regler(page, { propositions: 2, mauvaisesReponses: "toutes", imagesParPartie: 10 });
  const stats = { fausses: 0, autreCat: 0 };
  await partieAvec(page, ctx, p, { stats });
  check(`« Toutes catégories » : mauvaises réponses hors catégorie`, stats.autreCat > 0, `${stats.autreCat}/${stats.fausses}`);

  // 3 mots, même catégorie, dans une catégorie.
  await ouvrirParametres(page);
  p = { ...p, propositions: 3, mauvaisesReponses: "categorie", imagesParPartie: 5 };
  await regler(page, { propositions: 3, mauvaisesReponses: "categorie", imagesParPartie: 5 });
  await partieAvec(page, ctx, p, { cat: "Ornement" });

  // Sources : Mes photos, puis Commons.
  await ouvrirParametres(page);
  p = { ...p, propositions: 4, sources: "perso" };
  await regler(page, { propositions: 4, sources: "perso" });
  await verifierAffiches(page, ctx, p, "Mes photos");
  check(`des photos perso à jouer`, jouablesSelon(ctx, p).length > 0);
  await partieAvec(page, ctx, p);
  await ouvrirParametres(page);
  p = { ...p, sources: "commons" };
  await regler(page, { sources: "commons" });
  await verifierAffiches(page, ctx, p, "Commons");
  await partieAvec(page, ctx, p);

  // Fréquence : priorités posées temporairement sur les termes (1, 2, 3 en alternance).
  const sauvegarde = await fs.readFile(DATA[0]);
  try {
    const terms = JSON.parse(sauvegarde.toString("utf8"));
    const avecImages = [...new Set(ctx.images.filter((i) => i.source === "commons").map((i) => i.termId))].sort();
    for (const t of terms) {
      const k = avecImages.indexOf(t.id);
      if (k >= 0) t.priorite = (k % 3) + 1;
    }
    await fs.writeFile(DATA[0], JSON.stringify(terms, null, 2) + "\n");
    ctx = await donnees();
    await ouvrirParametres(page);
    p = { ...p, sources: "toutes" };
    await regler(page, { sources: "toutes" });
    await verifierAffiches(page, ctx, p, "fréquence Tous");
    for (const f of [1, 2]) {
      p = { ...p, frequence: f };
      await regler(page, { frequence: f });
      await verifierAffiches(page, ctx, p, `fréquence ${f}`);
      check(`fréquence ${f} : moins d'images que Tous`, jouablesSelon(ctx, p).length < jouablesSelon(ctx, { ...p, frequence: 3 }).length);
    }
    p = { ...p, frequence: 1 };
    await regler(page, { frequence: 1 });
    await partieAvec(page, ctx, p);
    p = { ...p, frequence: 2, mauvaisesReponses: "toutes" };
    await ouvrirParametres(page);
    await regler(page, { frequence: 2, mauvaisesReponses: "toutes" });
    await partieAvec(page, ctx, p);
  } finally {
    await fs.writeFile(DATA[0], sauvegarde);
    ctx = await donnees();
  }

  // Image suivante automatique : après une bonne réponse seulement.
  await ouvrirParametres(page);
  p = { ...p, frequence: 3, mauvaisesReponses: "categorie", suivantAuto: true };
  await regler(page, { frequence: 3, mauvaisesReponses: "categorie", suivantAuto: true });
  await partieAvec(page, ctx, p, { faux: (i) => i === 1 || i === 4 });

  // Réglages par défaut.
  await ouvrirParametres(page);
  await page.getByRole("button", { name: "Réglages par défaut" }).click();
  await verifierAffiches(page, ctx, DEFAUTS, "Réglages par défaut");
  check(`défauts enregistrés`, JSON.stringify(await lireStockage(page)) === JSON.stringify(DEFAUTS), JSON.stringify(await lireStockage(page)));
  await page.reload();
  await page.getByTestId("param-compte").waitFor();
  await verifierAffiches(page, ctx, DEFAUTS, "défauts après rechargement");

  // Valeurs corrompues : réglages par défaut, sans erreur.
  for (const [quoi, brut, attendu] of [
    ["JSON illisible", "{pas du json", DEFAUTS],
    ["null", "null", DEFAUTS],
    ["nombre", "42", DEFAUTS],
    ["valeurs invalides", JSON.stringify({ imagesParPartie: 7, propositions: "6", frequence: 0, sources: "x", mauvaisesReponses: 1, suivantAuto: "oui", tirage: "x" }), DEFAUTS],
    ["valeur partielle", JSON.stringify({ imagesParPartie: 5 }), { ...DEFAUTS, imagesParPartie: 5 }],
  ]) {
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [CLE_PARAMS, brut]);
    await ouvrirParametres(page);
    await verifierAffiches(page, ctx, attendu, `stockage ${quoi}`);
    await page.goto(BASE + "/");
    await boutonCategorie(page, "Toutes").click();
    const prog = page.getByTestId("progression");
    await prog.waitFor();
    check(`stockage ${quoi} : partie de ${attendu.imagesParPartie}`, ((await prog.textContent()) ?? "").includes(`/ ${attendu.imagesParPartie}`), await prog.textContent());
    check(`stockage ${quoi} : 4 mots`, (await page.getByTestId("choix").locator("button").count()) === 4);
    await page.getByRole("button", { name: "Quitter" }).click();
    await boutonCategorie(page, "Toutes").waitFor();
  }
  await page.evaluate(() => localStorage.clear());
}

// ---------- Progression, clavier, image agrandie ----------
const CLE_PROGRES = "leksik:progres";
const lireCle = (page, cle) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return "illisible"; } }, cle);

async function testerProgression(page, ctx, nom) {
  section = `${nom} · progression`;
  console.log(`- ${section}`);
  await accueil(page);
  const mots = new Set(jouablesSelon(ctx).map((i) => i.termId)).size;
  const bilan = ((await page.getByTestId("bilan").textContent()) ?? "").replace(/\s+/g, " ");
  check(`bilan de départ : 0 / ${mots} mots`, bilan.includes(`0 / ${mots} mot`) && bilan.includes(`${mots} jamais vu`), bilan);
  check(`pas de bouton « Réviser » sans mot raté`, (await page.getByTestId("a-revoir").count()) === 0);

  await boutonCategorie(page, "Toutes").click();
  const prog = page.getByTestId("progression");
  await prog.waitFor();
  const manche = async () => {
    const ids = await page.getByTestId("choix").locator("button").evaluateAll((bs) => bs.map((b) => b.dataset.term));
    const fichier = fichierDe(await page.locator("main img").first().getAttribute("src"));
    return { ids, bon: ctx.images.find((x) => x.fichier === fichier).termId };
  };

  // Manche 1 : bonne réponse au clavier (touche 1 à 4), puis → pour continuer.
  let m = await manche();
  await page.keyboard.press(String(m.ids.indexOf(m.bon) + 1));
  await page.getByTestId("retour").waitFor();
  check(`clavier : la touche du bon mot répond juste`, ((await page.getByTestId("retour").textContent()) ?? "").includes("Juste."));
  check(`pas de rappel du choix après une bonne réponse`, (await page.getByTestId("retour-choix").count()) === 0);
  let pr = await lireCle(page, CLE_PROGRES);
  check(`progression notée (juste)`, pr?.[m.bon]?.j === 1 && pr[m.bon].f === 0 && pr[m.bon].s === 1, JSON.stringify(pr));
  const premier = m.bon;
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector("[data-testid=progression]")?.textContent?.startsWith("2 /"));
  check(`clavier : → passe à l'image suivante`, true);

  // Image agrandie : clic sur l'image, Échap pour fermer.
  await page.locator("main img").first().click();
  const vis = page.getByTestId("visionneuse");
  await vis.waitFor();
  check(`image agrandie non cassée`, await imageChargee(vis.locator("img")));
  await page.keyboard.press("1");
  check(`pas de réponse au clavier pendant que l'image est agrandie`, (await page.getByTestId("retour").count()) === 0);
  await page.keyboard.press("Escape");
  await vis.waitFor({ state: "detached" });
  check(`Échap ferme l'image agrandie`, (await vis.count()) === 0);

  // Manche 2 : mauvaise réponse ; la définition du mot choisi est rappelée.
  m = await manche();
  const faux = m.ids.find((id) => id !== m.bon);
  await page.locator(`[data-testid=choix] button[data-term="${faux}"]`).click();
  const rappel = ((await page.getByTestId("retour-choix").textContent()) ?? "");
  const tf = ctx.termsParId.get(faux);
  check(`rappel du mot choisi et de sa définition`, rappel.includes(tf.terme) && rappel.includes(tf.definition), rappel);
  pr = await lireCle(page, CLE_PROGRES);
  check(`progression notée (faux)`, pr?.[m.bon]?.f === 1 && pr[m.bon].s === 0, JSON.stringify(pr?.[m.bon]));
  const rate = m.bon;
  await page.getByRole("button", { name: "Quitter" }).click();

  // Accueil : bilan mis à jour, bouton « Réviser mes mots ratés ».
  await boutonCategorie(page, "Toutes").waitFor();
  const b2 = ((await page.getByTestId("bilan").textContent()) ?? "").replace(/\s+/g, " ");
  check(`bilan : 1 en cours, 1 à revoir`, b2.includes("1 en cours") && b2.includes("1 à revoir") && b2.includes(`${mots - 2} jamais vu`), b2);
  const reviser = page.getByTestId("a-revoir");
  check(`bouton « Réviser » : 1 mot`, ((await reviser.textContent()) ?? "").includes("1 mot"), await reviser.textContent().catch(() => ""));
  await reviser.click();
  await prog.waitFor();
  check(`partie « Mots à revoir » d'une manche`, /^1 \/ 1 · Mots à revoir/.test((await prog.textContent()) ?? ""), await prog.textContent());
  m = await manche();
  check(`le mot raté est rejoué`, m.bon === rate, m.bon);
  await page.locator(`[data-testid=choix] button[data-term="${m.bon}"]`).click();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByTestId("score").waitFor();
  await page.getByRole("button", { name: "Nouvelle partie" }).click();
  await boutonCategorie(page, "Toutes").waitFor();
  check(`plus de mot à revoir après une bonne réponse`, (await page.getByTestId("a-revoir").count()) === 0);

  // Tirage adapté : les mots à revoir reviennent dans la partie suivante ; un mot maîtrisé compte dans le bilan.
  const jour = Math.floor(Date.now() / 86400000);
  const aRevoir = [...new Set(jouablesSelon(ctx).map((i) => i.termId))].filter((id) => id !== premier).slice(0, 3);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [CLE_PROGRES, JSON.stringify({
    ...Object.fromEntries(aRevoir.map((id) => [id, { j: 0, f: 1, s: 0, d: jour }])),
    [premier]: { j: 2, f: 0, s: 2, d: jour },
    corrompu: { j: "x" },
  })]);
  await page.reload();
  await boutonCategorie(page, "Toutes").waitFor();
  const b3 = ((await page.getByTestId("bilan").textContent()) ?? "").replace(/\s+/g, " ");
  check(`bilan : 1 maîtrisé, 3 à revoir (entrée corrompue ignorée)`, b3.startsWith(`1 / ${mots} mot`) && b3.includes("3 à revoir"), b3);
  await boutonCategorie(page, "Toutes").click();
  await prog.waitFor();
  const partie = await lireCle(page, "leksik:partie");
  const tires = partie.manches.map((x) => x.termId);
  check(`tirage adapté : les 3 mots à revoir sont dans la partie`, aRevoir.every((id) => tires.includes(id)), tires.join(", "));
  check(`tirage adapté : 10 termes distincts`, new Set(tires).size === 10);
  await page.getByRole("button", { name: "Quitter" }).click();

  // Lexique : le mot maîtrisé et les mots à revoir sont étiquetés.
  await page.goto(BASE + "/lexique");
  await page.getByTestId("compte").waitFor();
  await page.getByLabel("Progression", { exact: true }).selectOption("a-revoir");
  const idsLex = await page.getByTestId("mot").evaluateAll((ms) => ms.map((x) => x.dataset.id).sort());
  check(`lexique : filtre « À revoir »`, JSON.stringify(idsLex) === JSON.stringify([...aRevoir].sort()), idsLex.join(", "));
  await page.getByLabel("Progression", { exact: true }).selectOption("maitrise");
  check(`lexique : filtre « Maîtrisé »`, (await page.getByTestId("mot").count()) === 1 && (await page.getByTestId("etat").textContent()) === "Maîtrisé");

  // Paramètres : résumé et effacement de la progression.
  await ouvrirParametres(page);
  const resume = ((await page.getByTestId("param-progression").textContent()) ?? "").replace(/\s+/g, " ");
  check(`paramètres : 4 mots vus, 1 maîtrisé, 3 à revoir`, resume.includes(`4 mots vus sur ${mots}`) && resume.includes("1 maîtrisé") && resume.includes("3 à revoir"), resume);
  await page.getByRole("button", { name: "Effacer ma progression" }).click();
  await page.waitForTimeout(200);
  check(`effacement annulé : progression gardée`, (await lireCle(page, CLE_PROGRES)) !== null);
  page.removeAllListeners("dialog");
  page.once("dialog", (dlg) => dlg.accept());
  await page.getByRole("button", { name: "Effacer ma progression" }).click();
  await page.waitForTimeout(200);
  page.on("dialog", (dlg) => dlg.dismiss().catch(() => {}));
  check(`progression effacée`, (await lireCle(page, CLE_PROGRES)) === null);
  check(`bouton « Effacer » désactivé ensuite`, await page.getByRole("button", { name: "Effacer ma progression" }).isDisabled());

  // Tirage au hasard : réglage pris en compte, partie normale.
  await regler(page, { tirage: "hasard" });
  await partieAvec(page, ctx, { ...DEFAUTS, tirage: "hasard" });
  await page.evaluate(() => localStorage.clear());
}

// ---------- Lexique ----------
async function testerLexique(page, ctx, nom) {
  section = `${nom} · lexique`;
  console.log(`- ${section}`);
  await accueil(page);
  await page.getByRole("link", { name: "Lexique" }).click();
  const compteMots = async () => Number(((await page.getByTestId("compte").textContent()) ?? "").match(/\d+/)[0]);
  await page.getByTestId("compte").waitFor();
  await pasDeDefilementHorizontal(page, "lexique");
  const valides = ctx.images.filter((i) => i.statut === "validée");
  const illustres = ctx.terms.filter((t) => valides.some((i) => i.termId === t.id));
  const mots = page.getByTestId("mot");
  check(`tous les mots illustrés listés`, (await compteMots()) === illustres.length, `${await compteMots()} / ${illustres.length}`);
  check(`premier paquet de ${PAQUET} mots`, (await mots.count()) === Math.min(PAQUET, illustres.length));
  const termes = await mots.getByTestId("terme").allTextContents();
  const tries = [...termes].sort((a, b) => normaliser(a).localeCompare(normaliser(b), "fr"));
  check(`ordre alphabétique sans l'article`, JSON.stringify(termes) === JSON.stringify(tries), termes.slice(0, 5).join(", "));
  let cassees = 0;
  for (let k = 0; k < 12; k++) if (!(await imageChargee(mots.nth(k).locator("img")))) cassees++;
  check(`vignettes non cassées`, cassees === 0, String(cassees));
  await page.getByRole("button", { name: /^Afficher \d+ mots? de plus$/ }).click();
  check(`second paquet`, (await mots.count()) === Math.min(2 * PAQUET, illustres.length), String(await mots.count()));

  const chercher = (t) => page.getByLabel("Rechercher un mot ou une définition", { exact: true }).fill(t);
  await chercher("ALLEGE");
  check(`recherche « ALLEGE » : l'allège en premier`, (await mots.first().getByTestId("terme").textContent()) === "l'allège");
  const allege = ctx.termsParId.get("allege");
  check(`définition affichée`, ((await mots.first().textContent()) ?? "").includes(allege.definition));
  // Recherche dans les définitions : un mot de la définition du linteau qui n'est pas dans son nom.
  const linteau = ctx.termsParId.get("linteau");
  const motDef = normaliser(linteau.definition).split(/[^a-z]+/).filter((w) => w.length > 6)[0];
  await chercher(motDef);
  const attendus = illustres.filter((t) => normaliser(t.terme).includes(motDef) || normaliser(t.definition).includes(motDef)).length;
  check(`recherche dans les définitions (« ${motDef} ») : ${attendus} mots`, (await compteMots()) === attendus && attendus > 0, String(await compteMots()));
  await chercher("");
  await page.getByLabel("Catégorie", { exact: true }).selectOption("Toitures");
  check(`filtre catégorie Toitures`, (await compteMots()) === illustres.filter((t) => t.categorie === "Toitures").length);
  await page.getByLabel("Catégorie", { exact: true }).selectOption("");
  await chercher("zzzz introuvable");
  check(`recherche sans résultat`, (await compteMots()) === 0 && (await page.getByText("Aucun mot ne correspond.").isVisible()));

  // Photos d'un mot : plein écran, image suivante, fermeture.
  const plusieurs = illustres.find((t) => valides.filter((i) => i.termId === t.id).length > 1);
  await chercher(plusieurs.terme);
  const ligne = page.locator(`[data-testid=mot][data-id="${plusieurs.id}"]`);
  await ligne.getByRole("button").click();
  const vis = page.getByTestId("visionneuse");
  await vis.waitFor();
  const n = valides.filter((i) => i.termId === plusieurs.id).length;
  check(`photo agrandie (1 / ${n})`, (await imageChargee(vis.locator("img"))) && ((await vis.textContent()) ?? "").includes(`1 / ${n}`), await vis.textContent());
  const src1 = await vis.locator("img").getAttribute("src");
  await vis.getByRole("button", { name: "Image suivante" }).click();
  check(`photo suivante (2 / ${n})`, ((await vis.textContent()) ?? "").includes(`2 / ${n}`) && (await vis.locator("img").getAttribute("src")) !== src1);
  check(`seconde photo non cassée`, await imageChargee(vis.locator("img")));
  await vis.getByRole("button", { name: "Fermer" }).click();
  await vis.waitFor({ state: "detached" });
  check(`photo refermée`, (await vis.count()) === 0);
  const refusee = ctx.images.find((i) => i.id === IMAGE_REFUSEE);
  if (refusee) {
    const reste = valides.filter((i) => i.termId === refusee.termId).length;
    await chercher(ctx.termsParId.get(refusee.termId).terme);
    const l = page.locator(`[data-testid=mot][data-id="${refusee.termId}"]`);
    check(`image refusée absente du lexique`, reste === 0 ? (await l.count()) === 0 : !((await l.locator("img").getAttribute("src")) ?? "").includes(IMAGE_REFUSEE));
  }
  const rep = await fetch(`${BASE}/vignettes/commons/..%2F..%2F..%2Fpackage.json`);
  check(`vignettes : chemin hors du dossier refusé`, rep.status === 400 || rep.status === 404, String(rep.status));
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

  // Pagination : 60 cartes, puis « Afficher N images de plus ».
  const cartes = page.getByTestId("carte");
  const plus = page.getByRole("button", { name: /^Afficher \d+ images? de plus$/ });
  const toutAfficher = async () => {
    for (let k = 0; k < 100 && (await plus.count()); k++) {
      const avant = await cartes.count();
      await plus.click();
      await page.waitForFunction((n) => document.querySelectorAll("[data-testid=carte]").length > n, avant, { timeout: 10000 }).catch(() => {});
    }
  };
  check(`premier paquet de ${Math.min(PAQUET, d.images.length)} cartes`, (await cartes.count()) === Math.min(PAQUET, d.images.length), String(await cartes.count()));
  if (d.images.length > PAQUET) {
    const libelle = `Afficher ${Math.min(PAQUET, d.images.length - PAQUET)} image${Math.min(PAQUET, d.images.length - PAQUET) > 1 ? "s" : ""} de plus`;
    check(`bouton « ${libelle} »`, ((await plus.textContent()) ?? "").trim() === libelle, await plus.textContent());
    await plus.click();
    check(`second paquet`, (await cartes.count()) === Math.min(2 * PAQUET, d.images.length), String(await cartes.count()));
  } else check(`pas de bouton « Afficher plus »`, (await plus.count()) === 0);
  await toutAfficher();
  check(`toutes les cartes affichées après « Afficher plus »`, (await cartes.count()) === d.images.length && (await plus.count()) === 0, String(await cartes.count()));

  // Toutes les cartes : image, terme, note, rectangle.
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
    const note = img?.note ? ((await c.getByTestId("note").textContent()) ?? "") : "";
    if (!img || terme !== d.termsParId.get(img.termId)?.terme || cadre !== (img.rectangle ? 1 : 0) || note !== img.note) incoherentes.push(id);
  }
  check(`aucune image cassée dans Gérer (${n})`, cassees.length === 0, cassees.join(", "));
  check(`terme, note et rectangle de chaque carte`, incoherentes.length === 0, incoherentes.join(", "));

  // Filtres et recherche : compte et premier paquet, puis tout afficher et comparer les ids.
  const filtre = async (label, valeur) => {
    await page.getByLabel(label, { exact: true }).selectOption(valeur);
  };
  const rechercher = async (texte) => {
    await page.getByLabel("Rechercher un terme", { exact: true }).fill(texte);
  };
  const ids = async () => cartes.evaluateAll((cs) => cs.map((c) => c.dataset.id).sort());
  const verifier = async (nomFiltre, f) => {
    const attendus = d.images.filter(f).map((i) => i.id).sort();
    const nb = await compte(page);
    const affichees = await cartes.count();
    check(`${nomFiltre} : compte ${attendus.length}`, nb === attendus.length, String(nb));
    check(`${nomFiltre} : ${Math.min(PAQUET, attendus.length)} cartes d'abord`, affichees === Math.min(PAQUET, attendus.length), String(affichees));
    await toutAfficher();
    check(`${nomFiltre} : images affichées`, JSON.stringify(await ids()) === JSON.stringify(attendus));
    return attendus;
  };
  const cat = (i) => d.termsParId.get(i.termId)?.categorie;
  const terme = (i) => normaliser(d.termsParId.get(i.termId)?.terme ?? i.termId);
  await filtre("Source", "perso");
  await verifier(`filtre Mes photos`, (i) => i.source === "perso");
  await filtre("Source", "commons");
  await verifier(`filtre Commons`, (i) => i.source === "commons");
  await filtre("Source", "");
  check(`changer de filtre repart du premier paquet`, (await cartes.count()) === Math.min(PAQUET, d.images.length), String(await cartes.count()));
  for (const c of CATEGORIES) {
    await filtre("Catégorie", c);
    await verifier(`filtre catégorie ${c}`, (i) => cat(i) === c);
  }
  await filtre("Catégorie", "");
  await filtre("Statut", "refusée");
  check(`image refusée de test listée`, (await verifier(`filtre refusée`, (i) => i.statut === "refusée")).includes(IMAGE_REFUSEE));
  await filtre("Catégorie", "Afrique de l'Ouest");
  await verifier(`filtres combinés`, (i) => i.statut === "refusée" && cat(i) === "Afrique de l'Ouest");
  await filtre("Statut", "validée");
  await verifier(`filtre validée`, (i) => i.statut === "validée" && cat(i) === "Afrique de l'Ouest");
  await filtre("Catégorie", "");
  await filtre("Statut", "");

  // Recherche d'un terme : sans accents, sans article, majuscules indifférentes.
  for (const [saisie, cle] of [
    ["allege", "allege"],
    ["L'ALLÈGE", "allege"],
    ["linteau", "linteau"],
    ["le linteau", "linteau"],
    ["fenetre", "fenetre"],
    ["voute", "voute"],
  ]) {
    await rechercher(saisie);
    const r = await verifier(`recherche « ${saisie} »`, (i) => terme(i).includes(cle));
    check(`recherche « ${saisie} » non vide`, r.length > 0);
  }
  await rechercher("arc");
  await filtre("Catégorie", "Structure");
  await verifier(`recherche « arc » + catégorie Structure`, (i) => terme(i).includes("arc") && cat(i) === "Structure");
  await filtre("Catégorie", "");
  await rechercher("zzzz introuvable");
  check(`recherche sans résultat : 0 image`, (await compte(page)) === 0 && (await cartes.count()) === 0);
  await rechercher("");
  check(`recherche effacée : toutes les images`, (await compte(page)) === d.images.length);
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

    browser = await chromium.launch();
    for (const [nom, options] of [
      ["390×844", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
      ["1280×860", { viewport: { width: 1280, height: 860 } }],
    ]) {
      const contexte = await browser.newContext({ ...options, locale: "fr-FR" });
      contexte.setDefaultTimeout(15000);
      const page = await contexte.newPage();
      surveiller(page, nom);
      const ctx = await donnees(); // relu : le passage précédent a pu créer des termes
      await testerJeu(page, ctx, nom);
      await testerProgression(page, ctx, nom);
      await testerLexique(page, ctx, nom);
      const ajoutees = await testerAjouter(page, nom, photos, nom.startsWith("390"));
      await testerParametres(page, nom);
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

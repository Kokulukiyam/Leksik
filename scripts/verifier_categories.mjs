// Vérifie auprès de Commons les catégories proposées par les agents (scripts/termes/categories/g*.json,
// format { "<termId>": ["Category:…", …] }) et écrit celles qui existent et contiennent au moins 3 fichiers
// dans le champ `categoriesCommons` de scripts/termes-candidats.json. 50 catégories par requête.
//
// Usage : node scripts/verifier_categories.mjs
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOSSIER = path.join(ROOT, "scripts", "termes", "categories");
const CANDIDATS = path.join(ROOT, "scripts", "termes-candidats.json");
const UA = "LeksikBot/0.1 (outil local de vocabulaire architectural; usage personnel) node-fetch";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const propositions = {};
for (const f of await fs.readdir(DOSSIER)) {
  if (/^g\d+\.json$/.test(f)) Object.assign(propositions, JSON.parse(await fs.readFile(path.join(DOSSIER, f), "utf8")));
}
const norm = (c) => {
  const t = c.trim().replace(/^category:/i, "").replace(/_/g, " ");
  return `Category:${t.charAt(0).toUpperCase()}${t.slice(1)}`;
};
const toutes = [...new Set(Object.values(propositions).flat().map(norm))];
console.log(`${Object.keys(propositions).length} termes, ${toutes.length} catégories à vérifier`);

const fichiers = new Map(); // catégorie (ou sa cible de redirection) -> nombre de fichiers
const cible = new Map(); // nom proposé -> nom réel après normalisation/redirection
for (let i = 0; i < toutes.length; i += 50) {
  const lot = toutes.slice(i, i + 50);
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({ action: "query", format: "json", formatversion: "2", prop: "categoryinfo", redirects: "1", titles: lot.join("|") }))
    u.searchParams.set(k, v);
  let r;
  for (let essai = 0; ; essai++) {
    const rep = await fetch(u, { headers: { "User-Agent": UA } });
    if (rep.status === 429 && essai < 20) {
      await pause(30000);
      continue;
    }
    r = await rep.json();
    break;
  }
  const renomme = new Map([...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])].map((x) => [x.from, x.to]));
  for (const t of lot) {
    let n = t;
    while (renomme.has(n)) n = renomme.get(n);
    cible.set(t, n);
  }
  for (const p of r.query?.pages ?? []) if (!p.missing && p.categoryinfo) fichiers.set(p.title, p.categoryinfo.files ?? 0);
  process.stdout.write(`\r${Math.min(i + 50, toutes.length)} / ${toutes.length}`);
  await pause(7000);
}
console.log();

const termes = JSON.parse(await fs.readFile(CANDIDATS, "utf8"));
let avec = 0;
for (const t of termes) {
  const ok = [...new Set((propositions[t.id] ?? []).map(norm).map((c) => cible.get(c) ?? c))].filter((c) => (fichiers.get(c) ?? 0) >= 3);
  if (ok.length) {
    t.categoriesCommons = ok;
    avec++;
  } else delete t.categoriesCommons;
}
await fs.writeFile(CANDIDATS, JSON.stringify(termes, null, 2) + "\n");
const existantes = toutes.filter((c) => (fichiers.get(cible.get(c) ?? c) ?? 0) >= 3).length;
console.log(`${existantes} / ${toutes.length} catégories existent avec au moins 3 fichiers ; ${avec} / ${termes.length} termes en ont au moins une`);

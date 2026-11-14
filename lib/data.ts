// Module unique d'accès aux données : fichiers JSON du repo + images dans public/images.
// Pour passer plus tard à Supabase, seul ce fichier est à réécrire.
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { CATEGORIES, rectValide, slug, termeIdentique, type Categorie, type Image, type Rect, type Statut, type Term } from "./shared";

const ROOT = process.cwd();
const TERMS = path.join(ROOT, "data", "terms.json");
const IMAGES = path.join(ROOT, "data", "images.json");
const PUBLIC_IMAGES = path.join(ROOT, "public", "images");

export const AUTEUR_PERSO = "Moi";
export const LICENCE_PERSO = "Photo personnelle";

async function lire<T>(fichier: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(fichier, "utf8")) as T[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function ecrire(fichier: string, data: unknown) {
  const tmp = `${fichier}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, fichier);
}

// Les écritures sont sérialisées pour éviter que deux requêtes s'écrasent.
let file: Promise<unknown> = Promise.resolve();
function enSerie<T>(fn: () => Promise<T>): Promise<T> {
  const p = file.then(fn, fn);
  file = p.catch(() => undefined);
  return p;
}

export class ErreurDonnees extends Error {}

export function getTerms() {
  return lire<Term>(TERMS);
}

export function getImages() {
  return lire<Image>(IMAGES);
}

const VIGNETTES = path.join(ROOT, ".next", "cache", "vignettes");

/** Version réduite d'une image (640 px de large), fabriquée à la demande puis gardée en cache. */
export async function getVignette(fichier: string): Promise<Buffer | null> {
  const source = path.resolve(PUBLIC_IMAGES, fichier);
  if (!source.startsWith(PUBLIC_IMAGES + path.sep) || !source.endsWith(".webp")) return null;
  const cible = path.join(VIGNETTES, path.relative(PUBLIC_IMAGES, source).replace(/[\\/]/g, "__"));
  try {
    const [s, c] = await Promise.all([fs.stat(source), fs.stat(cible).catch(() => null)]);
    if (c && c.mtimeMs >= s.mtimeMs) return await fs.readFile(cible);
    const vignette = await sharp(source).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    await fs.mkdir(VIGNETTES, { recursive: true });
    const tmp = `${cible}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    await fs.writeFile(tmp, vignette);
    await fs.rename(tmp, cible);
    return vignette;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export type NouveauTerme = { terme: string; definition: string; categorie: string };

function verifierNouveauTerme(n: NouveauTerme, terms: Term[]): Term {
  const terme = n.terme.trim().replace(/\s+/g, " ").replace(/’/g, "'");
  const definition = n.definition.trim().replace(/\s+/g, " ");
  if (!terme) throw new ErreurDonnees("Le nom de l'objet est vide.");
  if (!definition) throw new ErreurDonnees("La définition est obligatoire pour un nouveau terme.");
  if (!CATEGORIES.includes(n.categorie as Categorie)) throw new ErreurDonnees("Catégorie inconnue.");
  if (termeIdentique(terme, terms)) throw new ErreurDonnees("Ce terme existe déjà.");
  let id = slug(terme) || "terme";
  const base = id;
  for (let i = 2; terms.some((t) => t.id === id); i++) id = `${base}-${i}`;
  return { id, terme, definition, categorie: n.categorie as Categorie };
}

export async function addImage(input: {
  fichier: Buffer;
  termId?: string;
  nouveauTerme?: NouveauTerme;
  rectangle?: Rect | null;
  lieu?: string;
}): Promise<Image> {
  if (input.rectangle && !rectValide(input.rectangle)) throw new ErreurDonnees("Rectangle invalide.");
  // Redimensionnement : largeur max 1600 px, WebP, orientation EXIF appliquée.
  let webp: Buffer;
  try {
    webp = await sharp(input.fichier).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw new ErreurDonnees("Fichier image illisible.");
  }

  return enSerie(async () => {
    const terms = await getTerms();
    const images = await getImages();
    let termId = input.termId;
    if (input.nouveauTerme) {
      const t = verifierNouveauTerme(input.nouveauTerme, terms);
      terms.push(t);
      termId = t.id;
    }
    if (!termId || !terms.some((t) => t.id === termId)) throw new ErreurDonnees("Terme inconnu.");

    const id = `perso-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const fichier = `perso/${id}.webp`;
    await fs.mkdir(path.join(PUBLIC_IMAGES, "perso"), { recursive: true });
    await fs.writeFile(path.join(PUBLIC_IMAGES, fichier), webp);

    const image: Image = {
      id,
      termId,
      fichier,
      rectangle: input.rectangle ?? null,
      lieu: (input.lieu ?? "").trim(),
      source: "perso",
      auteur: AUTEUR_PERSO,
      licence: LICENCE_PERSO,
      lienSource: "",
      statut: "validée",
      note: "Photo personnelle ajoutée depuis l'interface.",
    };
    images.push(image);
    if (input.nouveauTerme) await ecrire(TERMS, terms);
    await ecrire(IMAGES, images);
    return image;
  });
}

export async function updateImage(
  id: string,
  patch: { termId?: string; rectangle?: Rect | null; statut?: Statut },
): Promise<Image> {
  return enSerie(async () => {
    const images = await getImages();
    const img = images.find((i) => i.id === id);
    if (!img) throw new ErreurDonnees("Image introuvable.");
    if (patch.termId !== undefined) {
      const terms = await getTerms();
      if (!terms.some((t) => t.id === patch.termId)) throw new ErreurDonnees("Terme inconnu.");
      img.termId = patch.termId;
    }
    if (patch.rectangle !== undefined) {
      if (patch.rectangle !== null && !rectValide(patch.rectangle)) throw new ErreurDonnees("Rectangle invalide.");
      img.rectangle = patch.rectangle;
    }
    if (patch.statut !== undefined) {
      if (patch.statut !== "validée" && patch.statut !== "refusée") throw new ErreurDonnees("Statut inconnu.");
      img.statut = patch.statut;
    }
    await ecrire(IMAGES, images);
    return img;
  });
}

export async function deleteImage(id: string): Promise<void> {
  return enSerie(async () => {
    const images = await getImages();
    const img = images.find((i) => i.id === id);
    if (!img) throw new ErreurDonnees("Image introuvable.");
    await ecrire(IMAGES, images.filter((i) => i.id !== id));
    await fs.rm(path.join(PUBLIC_IMAGES, img.fichier), { force: true });
  });
}

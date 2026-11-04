// Types et utilitaires partagés entre serveur et navigateur (aucun accès disque ici).

export const CATEGORIES = [
  "Façade et ouvertures",
  "Toitures",
  "Structure",
  "Ornement",
  "Matériaux et revêtements",
  "Afrique de l'Ouest",
] as const;

export type Categorie = (typeof CATEGORIES)[number];

export type Term = {
  id: string;
  terme: string;
  definition: string;
  categorie: Categorie;
};

export type Rect = { x: number; y: number; largeur: number; hauteur: number };

export type Statut = "validée" | "refusée";

export type Image = {
  id: string;
  termId: string;
  fichier: string; // chemin relatif à public/images, ex. "commons/linteau-1.webp"
  rectangle: Rect | null;
  lieu: string;
  source: "commons" | "perso";
  auteur: string;
  licence: string;
  lienSource: string;
  statut: Statut;
  note: string;
};

export function imageSrc(img: Pick<Image, "fichier">) {
  return `/images/${img.fichier}`;
}

const ARTICLE = /^(l['’]\s*|le\s+|la\s+|les\s+|un\s+|une\s+|des\s+)/;

/** Minuscules, sans accents, sans article, espaces normalisés. */
export function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’]/g, "'")
    .trim()
    .replace(ARTICLE, "")
    .replace(/[-\s]+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Terme existant identique (aux accents, majuscules et article près). */
export function termeIdentique(saisie: string, terms: Term[]) {
  const n = normaliser(saisie);
  if (!n) return undefined;
  return terms.find((t) => normaliser(t.terme) === n);
}

/** Terme existant proche (faute de frappe), si la saisie n'est pas déjà identique. */
export function termeProche(saisie: string, terms: Term[]) {
  const n = normaliser(saisie);
  if (n.length < 3) return undefined;
  let best: { t: Term; d: number } | undefined;
  for (const t of terms) {
    const d = levenshtein(n, normaliser(t.terme));
    const seuil = n.length <= 5 ? 1 : 2;
    if (d > 0 && d <= seuil && (!best || d < best.d)) best = { t, d };
  }
  return best?.t;
}

export function slug(s: string) {
  return normaliser(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function rectValide(r: unknown): r is Rect {
  if (!r || typeof r !== "object") return false;
  const { x, y, largeur, hauteur } = r as Record<string, unknown>;
  const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
  return (
    ok(x) && ok(y) && ok(largeur) && ok(hauteur) &&
    (largeur as number) > 0.01 && (hauteur as number) > 0.01 &&
    (x as number) + (largeur as number) <= 1.0001 && (y as number) + (hauteur as number) <= 1.0001
  );
}

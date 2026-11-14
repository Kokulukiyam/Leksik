// Progression par terme, gardée dans le navigateur (localStorage, avec try/catch).

/** j : bonnes réponses, f : mauvaises, s : bonnes réponses d'affilée, d : dernier jour vu (jours depuis 1970). */
export type Suivi = { j: number; f: number; s: number; d: number };
export type Progres = Record<string, Suivi>;
export type Etat = "nouveau" | "a-revoir" | "en-cours" | "maitrise";

export const ETATS: Record<Etat, string> = {
  nouveau: "Jamais vu",
  "a-revoir": "À revoir",
  "en-cours": "En cours",
  maitrise: "Maîtrisé",
};

/** Un mot est maîtrisé après deux bonnes réponses d'affilée ; il est à revoir si la dernière réponse était fausse. */
export const SERIE_MAITRISE = 2;

const CLE = "leksik:progres";
const entier = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export const aujourdhui = () => Math.floor(Date.now() / 86_400_000);

/** Lit la progression ; toute entrée invalide est ignorée. */
export function lireProgres(): Progres {
  const p: Progres = {};
  try {
    const brut: unknown = JSON.parse(localStorage.getItem(CLE) ?? "{}");
    if (brut && typeof brut === "object" && !Array.isArray(brut)) {
      for (const [id, v] of Object.entries(brut as Record<string, Partial<Suivi> | null>)) {
        if (v && entier(v.j) && entier(v.f) && entier(v.s) && entier(v.d)) p[id] = { j: v.j, f: v.f, s: v.s, d: v.d };
      }
    }
  } catch {
    /* stockage indisponible ou illisible */
  }
  return p;
}

export function ecrireProgres(p: Progres) {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    /* stockage indisponible : progression perdue à la fermeture */
  }
}

export function effacerProgres() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à effacer */
  }
}

/** Nouvelle progression après une réponse (ne modifie pas l'ancienne). */
export function noter(p: Progres, termId: string, juste: boolean): Progres {
  const a = p[termId] ?? { j: 0, f: 0, s: 0, d: 0 };
  return { ...p, [termId]: { j: a.j + (juste ? 1 : 0), f: a.f + (juste ? 0 : 1), s: juste ? a.s + 1 : 0, d: aujourdhui() } };
}

export function etat(s: Suivi | undefined): Etat {
  if (!s) return "nouveau";
  if (s.s >= SERIE_MAITRISE) return "maitrise";
  return s.s === 0 ? "a-revoir" : "en-cours";
}

/** Poids d'un terme dans le tirage : un mot maîtrisé revient peu, puis de plus en plus avec le temps. */
export function poids(s: Suivi | undefined, jour = aujourdhui()): number {
  if (etat(s) !== "maitrise") return 3;
  const age = jour - s!.d;
  return age < 3 ? 0.4 : age < 14 ? 1 : 2;
}

/** Nombre de termes par état, parmi `ids`. */
export function bilan(ids: Iterable<string>, p: Progres): Record<Etat, number> & { total: number } {
  const b = { nouveau: 0, "a-revoir": 0, "en-cours": 0, maitrise: 0, total: 0 };
  for (const id of ids) {
    b[etat(p[id])]++;
    b.total++;
  }
  return b;
}

// Réglages du jeu, gardés dans le navigateur (localStorage, avec try/catch).

export type Parametres = {
  /** Nombre d'images par partie. */
  imagesParPartie: number;
  /** Nombre de mots proposés pour chaque image. */
  propositions: number;
  /** Termes joués selon leur fréquence sur un chantier : 1 = les plus courants, 2 = courants et fréquents, 3 = tous. */
  frequence: 1 | 2 | 3;
  /** Images jouées : toutes, seulement Commons, seulement mes photos. */
  sources: "toutes" | "commons" | "perso";
  /** Mauvaises réponses tirées de la même catégorie (plus difficile) ou de toutes. */
  mauvaisesReponses: "categorie" | "toutes";
  /** Après une bonne réponse, passer seul à l'image suivante. */
  suivantAuto: boolean;
  /** Tirage : « adapte » fait revenir les mots ratés et passer les mots jamais vus avant les mots maîtrisés. */
  tirage: "adapte" | "hasard";
};

export const PAR_DEFAUT: Parametres = {
  imagesParPartie: 10,
  propositions: 4,
  frequence: 3,
  sources: "toutes",
  mauvaisesReponses: "categorie",
  suivantAuto: false,
  tirage: "adapte",
};

export const CHOIX = {
  imagesParPartie: [5, 10, 15, 20, 30, 50],
  propositions: [2, 3, 4, 6],
} as const;

const CLE = "leksik:parametres";

/** Lit les réglages ; toute valeur absente ou invalide reprend sa valeur par défaut. */
export function lireParametres(): Parametres {
  let brut: Partial<Parametres> = {};
  try {
    brut = JSON.parse(localStorage.getItem(CLE) ?? "{}") ?? {};
  } catch {
    /* stockage indisponible ou illisible */
  }
  const p = { ...PAR_DEFAUT };
  if ((CHOIX.imagesParPartie as readonly number[]).includes(brut.imagesParPartie as number)) p.imagesParPartie = brut.imagesParPartie!;
  if ((CHOIX.propositions as readonly number[]).includes(brut.propositions as number)) p.propositions = brut.propositions!;
  if ([1, 2, 3].includes(brut.frequence as number)) p.frequence = brut.frequence!;
  if (["toutes", "commons", "perso"].includes(brut.sources as string)) p.sources = brut.sources!;
  if (["categorie", "toutes"].includes(brut.mauvaisesReponses as string)) p.mauvaisesReponses = brut.mauvaisesReponses!;
  if (typeof brut.suivantAuto === "boolean") p.suivantAuto = brut.suivantAuto;
  if (["adapte", "hasard"].includes(brut.tirage as string)) p.tirage = brut.tirage!;
  return p;
}

export function ecrireParametres(p: Parametres) {
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    /* stockage indisponible : réglages perdus à la fermeture */
  }
}

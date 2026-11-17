"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Figure from "./Figure";
import Jauge from "./Jauge";
import Nombre from "./Nombre";
import Poche from "./Poche";
import Vignette from "./Vignette";
import Visionneuse from "./Visionneuse";
import { CATEGORIES, compatibles, imageSrc, jouables as filtrer, vignetteSrc, type Image, type Term } from "@/lib/shared";
import { PAR_DEFAUT, lireParametres, type Parametres } from "@/lib/parametres";
import { bilan, ecrireProgres, etat, lireProgres, noter, poids, type Etat, type Progres } from "@/lib/progres";

const CLE = "leksik:partie";
const A_REVOIR = "Mots à revoir";
const ERREURS = "Revoir mes erreurs";

type Manche = { imageId: string; termId: string; choix: string[] };
type Partie = { categorie: string; manches: Manche[]; reponses: (string | null)[] };

function melanger<T>(t: T[]): T[] {
  const a = [...t];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function charger(): Partie | null {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as Partie) : null;
  } catch {
    return null;
  }
}

function sauver(p: Partie | null) {
  try {
    if (p) localStorage.setItem(CLE, JSON.stringify(p));
    else localStorage.removeItem(CLE);
  } catch {
    /* stockage indisponible : la partie continue en mémoire */
  }
}

/**
 * Mauvaises réponses : de la même catégorie si demandé (complétées ailleurs si elle est trop petite),
 * en préférant les termes de la fréquence choisie.
 */
function choixPour(term: Term, terms: Term[], p: Parametres): string[] {
  const autres = terms.filter((t) => t.id !== term.id && t.terme !== term.terme && compatibles(t, term));
  const rang = (t: Term) =>
    (p.mauvaisesReponses === "categorie" && t.categorie !== term.categorie ? 2 : 0) +
    ((t.priorite ?? 1) > p.frequence ? 1 : 0);
  // Aucune paire incompatible dans la manche, y compris entre deux mauvaises réponses.
  const retenus: Term[] = [term];
  for (const t of melanger(autres).sort((a, b) => rang(a) - rang(b))) {
    if (retenus.length >= p.propositions) break;
    if (retenus.every((r) => compatibles(r, t))) retenus.push(t);
  }
  return melanger(retenus.map((t) => t.id));
}

/**
 * Ordre de tirage des termes. Au hasard, ou « adapté » : jusqu'à un tiers de la partie pour les mots
 * dont la dernière réponse était fausse, le reste tiré avec un poids faible pour les mots maîtrisés.
 */
function ordonner(ids: string[], nombre: number, progres: Progres | null): string[] {
  if (!progres) return melanger(ids);
  const revus = melanger(ids.filter((id) => etat(progres[id]) === "a-revoir")).slice(0, Math.ceil(nombre / 3));
  const reste = ids
    .filter((id) => !revus.includes(id))
    .map((id) => ({ id, cle: Math.random() ** (1 / poids(progres[id])) }))
    .sort((a, b) => b.cle - a.cle)
    .map((x) => x.id);
  const ordre = [...revus, ...reste];
  return [...melanger(ordre.slice(0, nombre)), ...ordre.slice(nombre)];
}

/** Tire les manches en variant le plus possible les termes. */
function creerManches(images: Image[], terms: Term[], nombre: number, p: Parametres, progres: Progres | null): Manche[] {
  const parTerme = new Map<string, Image[]>();
  for (const img of images) parTerme.set(img.termId, [...(parTerme.get(img.termId) ?? []), img]);
  const ids = ordonner([...parTerme.keys()], nombre, progres);
  if (ids.length === 0) return [];
  const restantes = new Map(ids.map((id) => [id, melanger(parTerme.get(id)!)]));
  const manches: Manche[] = [];
  for (let i = 0; manches.length < nombre && i < nombre * 4; i++) {
    const termId = ids[i % ids.length];
    let pile = restantes.get(termId)!;
    if (pile.length === 0) pile = melanger(parTerme.get(termId)!);
    const img = pile.pop()!;
    restantes.set(termId, pile);
    const term = terms.find((t) => t.id === termId)!;
    manches.push({ imageId: img.id, termId, choix: choixPour(term, terms, p) });
  }
  return manches;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export default function Jeu({ terms, images }: { terms: Term[]; images: Image[] }) {
  const termsParId = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);
  const imagesParId = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const [partie, setPartie] = useState<Partie | null>(null);
  const [pret, setPret] = useState(false);
  const [params, setParams] = useState<Parametres>(PAR_DEFAUT);
  const [progres, setProgres] = useState<Progres>({});
  // Images validées dont le terme existe, filtrées selon les réglages (source, fréquence).
  const jouables = useMemo(() => filtrer(images, terms, params), [images, terms, params]);
  // Photo d'exemple de l'accueil : une image du jeu qui a un cadre, tirée au hasard à chaque visite.
  const exemple = useMemo(() => {
    // Cadre ni minuscule ni plein champ : la photo n'a pas à être grossie et la ligne de rappel se lit bien.
    const moyen = (v: number) => v >= 0.2 && v <= 0.65;
    const candidates = jouables.filter((i) => i.rectangle && moyen(i.rectangle.largeur) && moyen(i.rectangle.hauteur) && i.rectangle.x > 0.08);
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }, [jouables]);

  useEffect(() => {
    setParams(lireParametres());
    setProgres(lireProgres());
    const p = charger();
    const valide =
      p &&
      Array.isArray(p.manches) &&
      p.manches.length > 0 &&
      p.manches.every(
        (m) => imagesParId.get(m.imageId)?.statut === "validée" && m.choix.every((c) => termsParId.has(c)),
      );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du localStorage au montage
    setPartie(valide ? p : null);
    if (!valide) sauver(null);
    setPret(true);
  }, [imagesParId, termsParId]);

  // Pendant une manche, la navigation s'efface sur téléphone (voir globals.css).
  const enManche = pret && !!partie && partie.reponses.some((r) => r === null);
  useEffect(() => {
    if (!enManche) return;
    document.documentElement.dataset.partie = "";
    return () => {
      delete document.documentElement.dataset.partie;
    };
  }, [enManche]);

  function maj(p: Partie | null) {
    setPartie(p);
    sauver(p);
    window.scrollTo(0, 0);
  }

  function lancer(categorie: string, pool: Image[], nombre: number, adapte: boolean) {
    const manches = creerManches(pool, terms, nombre, params, adapte ? progres : null);
    if (manches.length) maj({ categorie, manches, reponses: manches.map(() => null) });
  }

  const categorieDe = (i: Image) => termsParId.get(i.termId)?.categorie;
  const adapte = params.tirage === "adapte";

  function demarrer(categorie: string) {
    const pool = categorie === "Toutes" ? jouables : jouables.filter((i) => categorieDe(i) === categorie);
    lancer(categorie, pool, params.imagesParPartie, adapte);
  }

  function revoir(p: Partie) {
    const rates = [...new Set(p.manches.filter((m, i) => p.reponses[i] !== m.termId).map((m) => m.termId))];
    // Toutes les images validées de ces termes, même si les réglages ont changé depuis.
    const pool = filtrer(images, terms, { sources: "toutes", frequence: 3 }).filter((i) => rates.includes(i.termId));
    lancer(ERREURS, pool, rates.length, false);
  }

  if (!pret) return null;

  if (!partie) {
    const idsJouables = (cat: string) => new Set(jouables.filter((i) => cat === "Toutes" || categorieDe(i) === cat).map((i) => i.termId));
    const total = bilan(idsJouables("Toutes"), progres);
    const aRevoir = jouables.filter((i) => etat(progres[i.termId]) === "a-revoir");
    const motsARevoir = new Set(aRevoir.map((i) => i.termId)).size;
    const motsJouables = idsJouables("Toutes").size;
    const termeExemple = exemple && termsParId.get(exemple.termId);
    return (
      <div className="py-5 sm:py-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
        <div>
          <h1 className="etroit text-[2.125rem] leading-none sm:text-[2.75rem]">
            Une image, {params.propositions} mots&nbsp;:
            <br />
            trouvez le bon.
          </h1>
          <p className="mt-2 text-sourdine sm:mt-3">Parties de {params.imagesParPartie} images.</p>

          {/* Le principe du jeu, montré plutôt que dit : une photo du jeu, son cadre, et une ligne de rappel jusqu'à son nom. */}
          {exemple && termeExemple && (
            <figure className="mt-5 sm:mt-7 sm:max-lg:grid sm:max-lg:grid-cols-2 sm:max-lg:gap-x-6 sm:max-lg:[&_.rappel]:hidden">
              <Vignette src={imageSrc(exemple)} rect={exemple.rectangle} alt={termeExemple.terme} grande rappel />
              <figcaption className="mt-6 flex gap-3 sm:max-lg:mt-0">
                <span aria-hidden className="h-4 w-3 shrink-0 border-2 border-accent" />
                <span className="-mt-1">
                  <span className="mi-etroit block text-xl leading-tight sm:max-lg:text-2xl">{termeExemple.terme}</span>
                  <span className="mt-1 block text-sm leading-snug text-sourdine sm:max-lg:text-base">{termeExemple.definition}</span>
                </span>
              </figcaption>
            </figure>
          )}

          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 lg:grid-cols-1">
            <button
              onClick={() => demarrer("Toutes")}
              disabled={jouables.length === 0}
              className="btn btn-plein min-h-[4.5rem] w-full justify-between gap-4 py-3 text-left"
            >
              <span>
                <span className="etroit block text-[1.75rem] leading-none">Toutes</span>
                <span className="mt-1 block text-sm tabular-nums [font-stretch:100%] [font-weight:400]">
                  <Nombre n={jouables.length} /> image{jouables.length > 1 ? "s" : ""} · <Nombre n={motsJouables} /> mot{motsJouables > 1 ? "s" : ""}
                </span>
              </span>
              <span className="flex items-center gap-2 text-lg">
                Jouer
                <Fleche />
              </span>
            </button>

            {aRevoir.length > 0 && (
              <button
                onClick={() => lancer(A_REVOIR, aRevoir, Math.min(motsARevoir, params.imagesParPartie), false)}
                className="btn min-h-[4.5rem] w-full justify-between gap-4 py-3 text-left"
                data-testid="a-revoir"
              >
                <span>
                  <span className="block text-xl leading-tight">Réviser mes mots ratés</span>
                  <span className="mt-0.5 block text-sm text-sourdine [font-stretch:100%] [font-weight:400]">
                    {pluriel(motsARevoir, "mot")} dont la dernière réponse était fausse
                  </span>
                </span>
                <Fleche />
              </button>
            )}
          </div>
        </div>

        <div className="mt-9 lg:mt-0">
          <div className="mb-8" data-testid="bilan">
            <p className="flex items-baseline">
              <span className="mi-etroit text-[1.75rem] leading-none tabular-nums">{total.maitrise}</span>
              <span className="whitespace-pre text-sourdine">
                {" "}/ {pluriel(total.total, "mot")} maîtrisé{total.total > 1 ? "s" : ""}
              </span>
            </p>
            <Jauge bilan={total} className="mt-2.5 h-3" />
            <p className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-1 text-sm text-sourdine min-[30rem]:flex min-[30rem]:flex-wrap">
              <Legende etat="maitrise" n={total.maitrise} texte={`maîtrisé${total.maitrise > 1 ? "s" : ""}`} />
              <Legende etat="en-cours" n={total["en-cours"]} texte="en cours" />
              <Legende etat="a-revoir" n={total["a-revoir"]} texte="à revoir" />
              <Legende etat="nouveau" n={total.nouveau} texte={`jamais vu${total.nouveau > 1 ? "s" : ""}`} />
            </p>
          </div>
          <div aria-hidden className={`${LIGNE} tete-tableau`}>
            <span>Catégorie</span>
            <span className="text-right max-sm:hidden">Images</span>
            <span>Mots maîtrisés</span>
            <span />
          </div>
          {CATEGORIES.map((cat) => {
            const ids = idsJouables(cat);
            const n = jouables.filter((i) => categorieDe(i) === cat).length;
            const b = bilan(ids, progres);
            return (
              // Marge interne compensée en négatif : le survol et l'anneau de focus respirent, le texte reste sur la marge.
              <button
                key={cat}
                onClick={() => demarrer(cat)}
                disabled={n === 0}
                className={`${LIGNE} group -mx-3 min-h-12 w-[calc(100%+1.5rem)] bg-[linear-gradient(var(--color-trait),var(--color-trait))] bg-[length:calc(100%-1.5rem)_1px] bg-[position:center_bottom] bg-no-repeat px-3 py-1.5 text-left transition-colors duration-100 hover:bg-surface focus-visible:-outline-offset-4 active:bg-relief disabled:text-faible`}
              >
                <span className="mi-etroit text-[1.1875rem] leading-tight">{cat}</span>
                <span className="text-right tabular-nums text-sourdine max-sm:sr-only">
                  {n}
                  <span className="sr-only"> image{n > 1 ? "s" : ""}</span>
                </span>
                <span aria-hidden className="block">
                  <span className="block text-sm leading-none tabular-nums text-faible">
                    <span className={b.maitrise ? "text-encre" : ""}>{b.maitrise}</span> / {b.total}
                  </span>
                  <Jauge bilan={b} className="mt-1.5 h-2" />
                </span>
                <span aria-hidden className="justify-self-end text-faible transition-colors duration-100 group-hover:text-accent group-active:text-accent group-disabled:invisible">
                  <Fleche petite />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const index = partie.reponses.findIndex((r) => r === null);
  const finie = index === -1;

  if (finie) {
    const score = partie.manches.filter((m, i) => partie.reponses[i] === m.termId).length;
    const total = partie.manches.length;
    const rates = partie.manches.map((m, i) => ({ m, reponse: partie.reponses[i] })).filter(({ m, reponse }) => reponse !== m.termId);
    const part = score / total;
    const mention = part === 1 ? "Sans faute." : part >= 0.8 ? "Très bien." : part >= 0.5 ? "Pas mal." : "À retravailler.";
    const trouves = partie.manches.filter((m, i) => partie.reponses[i] === m.termId);
    return (
      <div className="py-5 sm:py-10">
        {/* Le bilan : le score fait titre, la mention en regard, puis la frise des manches et les deux suites possibles. */}
        <div className="grid gap-y-6 border-b border-trait-fort pb-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
          <div className="flex items-end gap-5">
            <h1 className="etroit text-[6rem] leading-[0.8] tabular-nums [word-spacing:0] sm:text-[8.5rem]" data-testid="score">
              <span className="sr-only">Score : </span>
              {score}
              <span className="text-faible"> / {total}</span>
            </h1>
            <p className="mi-etroit pb-1 text-2xl leading-tight">
              {rates.length ? mention : "Aucune erreur, bravo !"}
              <span className="mt-1 block text-base text-sourdine">{partie.categorie}</span>
            </p>
          </div>
          <div className="flex flex-col justify-end gap-4">
            <Reperes partie={partie} className="[&>div]:h-2" />
            <div className="grid gap-2 sm:grid-cols-2">
              {rates.length > 0 && (
                <button onClick={() => revoir(partie)} className="btn btn-plein min-h-14 justify-between text-lg">
                  Revoir mes erreurs
                  <Fleche />
                </button>
              )}
              <button onClick={() => maj(null)} className={`btn min-h-14 justify-between text-lg ${rates.length ? "" : "btn-plein"}`}>
                Nouvelle partie
                <Fleche />
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-10 ${rates.length ? "lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-16" : ""}`}>
          {rates.length > 0 && (
            <div>
              <h2 className={TITRE_LISTE}>
                <span>Mots ratés</span>
                <span className={COMPTE_LISTE}>{rates.length}</span>
              </h2>
              <ul data-testid="rates">
                {rates.map(({ m, reponse }, i) => {
                  const img = imagesParId.get(m.imageId)!;
                  const t = termsParId.get(m.termId)!;
                  return (
                    <li key={i} className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 border-b border-trait py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-6">
                      <Vignette src={vignetteSrc(img)} rect={img.rectangle} alt={t.terme} />
                      <div>
                        <p className="mi-etroit -mt-0.5 text-xl leading-tight">{t.terme}</p>
                        <p className="mt-1 max-w-[58ch] text-sm leading-snug text-sourdine">{t.definition}</p>
                        {reponse && termsParId.has(reponse) && (
                          <p className="mt-2 text-sm text-faible">
                            Ma réponse&nbsp;: <span className="mi-etroit text-red-500">{termsParId.get(reponse)!.terme}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {/* Les mots trouvés : une simple nomenclature, sans définition (on les connaît). */}
          {trouves.length > 0 && (
            <div className={rates.length ? "mt-10 lg:mt-0" : ""}>
              <h2 className={TITRE_LISTE}>
                <span>Mots trouvés</span>
                <span className={COMPTE_LISTE}>{trouves.length}</span>
              </h2>
              <ul className={`gap-x-6 ${rates.length ? "columns-2 lg:columns-1" : "columns-2 lg:columns-3"}`} data-testid="trouves">
                {trouves.map((m, i) => {
                  const img = imagesParId.get(m.imageId)!;
                  const t = termsParId.get(m.termId)!;
                  return (
                    <li key={i} className="flex break-inside-avoid items-center gap-3 border-b border-trait py-2">
                      <Vignette src={vignetteSrc(img)} rect={img.rectangle} alt="" className="w-16 shrink-0" />
                      <span className="mi-etroit leading-tight">{t.terme}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Manche
      key={index}
      partie={partie}
      index={index}
      termsParId={termsParId}
      imagesParId={imagesParId}
      suivantAuto={params.suivantAuto}
      onChoisir={(termId, juste) => {
        const n = noter(progres, termId, juste);
        setProgres(n);
        ecrireProgres(n);
      }}
      onRepondre={(rep) => {
        const reponses = [...partie.reponses];
        reponses[index] = rep;
        maj({ ...partie, reponses });
      }}
      onQuitter={() => maj(null)}
    />
  );
}

// Sections des listes de fin de partie : même titre pour les deux.
const TITRE_LISTE = "mi-etroit flex items-baseline justify-between border-b border-trait pb-2 text-xl";
const COMPTE_LISTE = "text-sm tabular-nums text-sourdine [font-stretch:100%] [font-weight:400]";

// Ligne du tableau des catégories : nom, images (à partir de la tablette), mots maîtrisés (chiffres et jauge), flèche.
const LIGNE = "grid grid-cols-[minmax(0,1fr)_5.5rem_1.25rem] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_4rem_8rem_2rem] sm:gap-x-5";

function Legende({ etat, n, texte }: { etat: Etat; n: number; texte: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <Poche etat={etat} className="translate-y-px" />
      <span>
        <span className="tabular-nums text-encre">{n} </span>
        {texte}
      </span>
    </span>
  );
}

function Fleche({ petite = false }: { petite?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 ${petite ? "h-[1.125rem] w-[1.125rem]" : "h-6 w-6"}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h17M13 5l7 7-7 7" strokeLinecap="square" />
    </svg>
  );
}

/** Un segment par manche : vert ou rouge une fois jouée, clair pour la manche en cours. */
function Reperes({ partie, index = -1, className = "" }: { partie: Partie; index?: number; className?: string }) {
  return (
    <div className={`flex gap-[3px] ${className}`} aria-hidden>
      {partie.manches.map((m, i) => {
        const r = partie.reponses[i];
        const couleur = r === null ? (i === index ? "bg-encre" : "bg-trait") : r === m.termId ? "bg-green-500" : "bg-red-500";
        return <div key={i} className={`h-1 flex-1 ${couleur}`} />;
      })}
    </div>
  );
}

function Manche({
  partie,
  index,
  termsParId,
  imagesParId,
  suivantAuto,
  onChoisir,
  onRepondre,
  onQuitter,
}: {
  partie: Partie;
  index: number;
  termsParId: Map<string, Term>;
  imagesParId: Map<string, Image>;
  suivantAuto: boolean;
  onChoisir: (termId: string, juste: boolean) => void;
  onRepondre: (termId: string) => void;
  onQuitter: () => void;
}) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const manche = partie.manches[index];
  const img = imagesParId.get(manche.imageId)!;
  const bon = termsParId.get(manche.termId)!;
  const juste = choisi === bon.id;

  function choisir(id: string) {
    if (choisi) return;
    setChoisi(id);
    onChoisir(bon.id, id === bon.id);
  }

  // Réglage « image suivante automatique » : seulement après une bonne réponse.
  useEffect(() => {
    if (!suivantAuto || choisi !== bon.id) return;
    const t = setTimeout(() => onRepondre(choisi), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onRepondre change à chaque rendu ; le délai ne doit pas repartir
  }, [suivantAuto, choisi, bon.id]);

  // Clavier : 1, 2, 3… pour répondre ; Entrée (bouton « Suivant » actif) ou → pour continuer.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (zoom || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!choisi && Number.isInteger(n) && n >= 1 && n <= manche.choix.length) choisir(manche.choix[n - 1]);
      else if (choisi && e.key === "ArrowRight") onRepondre(choisi);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  // L'image suivante est chargée d'avance.
  useEffect(() => {
    const suivante = partie.manches[index + 1] && imagesParId.get(partie.manches[index + 1].imageId);
    if (suivante) new window.Image().src = imageSrc(suivante);
  }, [partie.manches, index, imagesParId]);

  // « Suivant » n'existe qu'après la réponse ; il reçoit alors le focus (Entrée continue).
  const suivant = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (choisi) suivant.current?.focus({ preventScroll: true });
  }, [choisi]);


  const colonnes = manche.choix.length === 3 ? "grid-cols-1 sm:max-lg:grid-cols-3" : "grid-cols-2";
  const six = manche.choix.length > 4;
  const monChoix = choisi ? termsParId.get(choisi)! : null;

  // Une règle par format, la même pour juste ou faux et pour 2, 3, 4 ou 6 mots ; les réponses ne bougent jamais.
  // Téléphone : énoncé puis verdict en tête, photo calée sur les réponses, « Suivant » à sa place réservée en bas.
  // Tablette en hauteur : photo en haut, crédit dessous, réponses, puis verdict à gauche et « Suivant » à droite.
  // Écran large (≥ 1024 px) : photo à gauche avec le verdict dessous, réponses et « Suivant » dans la marge de droite.
  return (
    <div className="flex min-h-dvh flex-col sm:grid sm:min-h-0 sm:grid-cols-[minmax(0,1fr)_15rem] sm:content-start sm:gap-x-6 sm:pb-10 sm:pt-3 lg:min-h-[calc(100dvh-3.5rem-1px)] lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-x-8 lg:pb-4 lg:pt-6">
      <div className="contents lg:block">
        <div className="order-3 sm:col-span-2 lg:order-none">
          <div className="text-center leading-[0] sm:text-left">
            <Figure
              src={imageSrc(img)}
              rect={img.rectangle}
              alt="Élément à reconnaître"
              imgClassName="h-auto w-auto max-w-full max-h-[40dvh] sm:max-h-[50dvh] lg:max-h-[max(16rem,calc(100dvh-18.5rem))]"
              onClick={() => setZoom(true)}
            />
          </div>
          {/* Le crédit tient au bord bas de la photo. L'auteur peut être abrégé si la place manque ; la licence et la source, jamais. */}
          <p className="mt-1.5 flex h-5 shrink-0 justify-center text-xs sm:justify-start leading-5 text-faible" data-testid="credit">
            <span className="truncate">{img.auteur}</span>
            <span className="shrink-0 whitespace-pre">
              {img.auteur && img.licence ? " · " : ""}
              {img.licence}
              {img.lienSource && (
                <>
                  {" · "}
                  <a href={img.lienSource} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-encre">
                    source
                  </a>
                </>
              )}
            </span>
          </p>
        </div>

        {/* L'énoncé devient le verdict, au même endroit. */}
        <div className="order-5 mt-4 shrink-0 sm:order-5 lg:order-none lg:mt-3 lg:min-h-[9.5rem]">
          {choisi && monChoix ? (
            <div className="apparition lg:grid lg:grid-cols-2 lg:gap-x-8" data-testid="retour">
              <div>
                <p className={`mi-etroit text-xl leading-none ${juste ? "text-green-500" : "text-red-500"}`}>{juste ? "Juste. " : "Faux. "}</p>
                <p className="mi-etroit mt-2 text-xl leading-tight">
                  {bon.terme}
                  <span className="sr-only"> : </span>
                </p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-sourdine">{bon.definition}</p>
              </div>
              {!juste && (
                <div className="mt-3 border-t border-trait pt-3 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" data-testid="retour-choix">
                  <p className="leading-tight text-faible">
                    Ma réponse&nbsp;: <span className="mi-etroit text-red-500">{monChoix.terme}</span>
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-faible lg:mt-2 lg:text-[0.9375rem]">{monChoix.definition}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="contents lg:block">
        <div className="order-1 sm:col-span-2 lg:order-none">
          <div className="flex min-h-12 items-center justify-between gap-3 lg:min-h-0 lg:items-baseline">
            <span data-testid="progression" className="tabular-nums">
              <span className="mi-etroit text-xl">
                {index + 1} / {partie.manches.length}
              </span>
              <span className="text-sourdine">
                {" · "}
                {partie.categorie}
              </span>
            </span>
            <button onClick={onQuitter} className="lien -mr-3 min-h-12 px-3 !text-sourdine hover:!text-encre lg:min-h-0 lg:py-1">
              Quitter
            </button>
          </div>
          <Reperes partie={partie} index={index} className="mb-3 lg:mb-5 lg:mt-3" />
        </div>

        {/* Tablette et écran large : l'énoncé reste en place pendant toute la manche, au-dessus de la photo (tablette)
            ou en tête de la colonne des réponses (écran large). */}
        <p className="mi-etroit order-2 mb-3 text-[1.375rem] leading-tight sm:col-span-2 sm:mb-4 sm:text-2xl lg:mb-5">
          {img.rectangle ? "Comment s’appelle l’élément encadré ?" : "Que montre la photo ?"}
        </p>

        <div className={`order-4 mt-3 grid gap-1.5 sm:order-4 sm:col-span-2 sm:mt-3 lg:order-none lg:mt-0 lg:flex lg:flex-col ${colonnes}`} data-testid="choix">
          {manche.choix.map((id, k) => {
            const t = termsParId.get(id)!;
            // Survol : la tuile s'éclaircit. Le contour est réservé au focus clavier (anneau jaune).
            let style = "border-relief bg-relief hover:border-trait-fort hover:bg-trait active:border-trait-fort active:bg-trait-fort";
            if (choisi) {
              if (id === bon.id) style = "border-green-500 bg-green-500 text-black";
              else if (id === choisi) style = "border-red-500 bg-red-500 text-black";
              else style = "border-trait bg-transparent text-faible";
            }
            return (
              <button
                key={id}
                data-term={id}
                data-touche={k + 1}
                disabled={!!choisi}
                onClick={() => choisir(id)}
                className={`mi-etroit relative border-2 px-3 py-2 text-left text-[1.125rem] leading-[1.15] transition-colors duration-100 lg:text-xl ${six ? "min-h-[3.75rem] lg:h-[4.5rem]" : "min-h-[4.5rem] lg:h-20"} ${style}`}
              >
                {t.terme}
              </button>
            );
          })}
        </div>

        {/* Place réservée : « Suivant » y vient après la réponse. La consigne n'y figure qu'à la première manche. */}
        <div className={`${choisi ? "sticky bottom-0" : ""} order-6 -mx-4 mt-auto shrink-0 bg-fond px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mx-0 sm:mt-4 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 lg:order-none`}>
          <div className="flex h-14 items-center">
            {choisi ? (
              <button ref={suivant} onClick={() => onRepondre(choisi)} className="btn btn-plein apparition h-14 w-full justify-between text-lg">
                Suivant
                <Fleche />
              </button>
            ) : (
              index === 0 && (
                <p aria-hidden className="text-sm leading-snug text-faible sm:max-lg:hidden">
                  <span className="[@media(hover:hover)]:hidden">Touchez la photo pour l’agrandir.</span>
                  <span className="hidden [@media(hover:hover)]:inline">
                    Touches 1 à {manche.choix.length} pour répondre, Entrée pour continuer. Un clic sur la photo l’agrandit.
                  </span>
                </p>
              )
            )}
          </div>
        </div>
      </div>

      {zoom && (
        <Visionneuse vues={[{ src: imageSrc(img), rect: img.rectangle, legende: img.auteur, licence: img.licence, lien: img.lienSource }]} onFermer={() => setZoom(false)} />
      )}
    </div>
  );
}

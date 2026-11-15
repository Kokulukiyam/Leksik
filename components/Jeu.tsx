"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
    const candidates = jouables.filter((i) => i.rectangle);
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
          <h1 className="etroit text-[2.25rem] leading-[0.98] sm:text-[3.25rem]">
            Une image, {params.propositions} mots&nbsp;:
            <br />
            trouvez le bon.
          </h1>
          <p className="mt-2 text-sourdine sm:mt-3">Parties de {params.imagesParPartie} images.</p>

          {/* Le principe du jeu, montré plutôt que dit : une photo du jeu, son cadre, et le nom en légende. */}
          {exemple && termeExemple && (
            <figure className="mt-5 sm:mt-7">
              <Vignette src={vignetteSrc(exemple)} rect={exemple.rectangle} alt={termeExemple.terme} />
              <figcaption className="mt-2.5 flex gap-3">
                <span aria-hidden className="mt-[0.3rem] h-4 w-3 shrink-0 border-2 border-accent" />
                <span>
                  <span className="mi-etroit block text-xl leading-tight">{termeExemple.terme}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-sourdine">{termeExemple.definition}</span>
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
              <button
                key={cat}
                onClick={() => demarrer(cat)}
                disabled={n === 0}
                className={`${LIGNE} group min-h-[3.5rem] w-full border-b border-trait py-2 text-left transition-colors duration-100 hover:bg-surface focus-visible:-outline-offset-2 active:bg-relief disabled:text-faible`}
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
                  <Jauge bilan={b} fine className="mt-1.5 h-1.5" />
                </span>
                <span aria-hidden className="justify-self-end text-faible transition-[color,translate] duration-100 group-hover:translate-x-1 group-hover:text-accent group-active:text-accent group-disabled:invisible">
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
      <div className="py-5 sm:py-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
        <div className="lg:sticky lg:top-10 lg:self-start">
          {/* Même ligne de base que l'intitulé du tableau de droite. */}
          <p className="pb-2 text-xs text-sourdine">{partie.categorie}</p>
          <h1 className="etroit mt-3 text-[6.5rem] leading-[0.8] tabular-nums [word-spacing:0] sm:text-[9rem]" data-testid="score">
            <span className="sr-only">Score : </span>
            {score}
            <span className="text-faible"> / {total}</span>
          </h1>
          <p className="mi-etroit mt-6 text-xl">{rates.length ? mention : "Aucune erreur, bravo !"}</p>
          <Reperes partie={partie} className="mt-3 [&>div]:h-2" />
          <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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

        <div className="mt-10 lg:mt-0">
          {rates.length > 0 && (
            <>
              <h2 className="tete-tableau flex items-baseline justify-between">
                <span>Mots ratés</span>
                <span className="tabular-nums">{rates.length}</span>
              </h2>
              <ul data-testid="rates">
                {rates.map(({ m, reponse }, i) => {
                  const img = imagesParId.get(m.imageId)!;
                  const t = termsParId.get(m.termId)!;
                  return (
                    <li key={i} className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 border-b border-trait py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6">
                      <Vignette src={vignetteSrc(img)} rect={img.rectangle} alt={t.terme} />
                      <div>
                        <p className="mi-etroit -mt-0.5 text-xl leading-tight">{t.terme}</p>
                        <p className="mt-1 max-w-[58ch] text-sm leading-snug text-sourdine">{t.definition}</p>
                        {reponse && termsParId.has(reponse) && (
                          <p className="mt-2 text-sm text-faible">
                            Ma réponse&nbsp;: <span className="text-red-500 line-through decoration-1">{termsParId.get(reponse)!.terme}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {/* Les mots trouvés : une planche de vignettes légendées, sans définition (on les connaît). */}
          {trouves.length > 0 && (
            <>
              <h2 className={rates.length ? "mi-etroit mb-3 mt-9 flex items-baseline justify-between text-xl" : "tete-tableau mb-4 flex items-baseline justify-between"}>
                <span>Mots trouvés</span>
                <span className={`tabular-nums ${rates.length ? "text-sm font-normal text-sourdine [font-stretch:100%]" : ""}`}>{trouves.length}</span>
              </h2>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4" data-testid="trouves">
                {trouves.map((m, i) => {
                  const img = imagesParId.get(m.imageId)!;
                  const t = termsParId.get(m.termId)!;
                  return (
                    <li key={i}>
                      <Vignette src={vignetteSrc(img)} rect={img.rectangle} alt="" />
                      <p className="mi-etroit mt-1.5 text-[0.9375rem] leading-tight">{t.terme}</p>
                    </li>
                  );
                })}
              </ul>
            </>
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

  // « Suivant » prend la place de la consigne dès qu'on a répondu, et reçoit le focus (Entrée continue).
  const suivant = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (choisi) suivant.current?.focus({ preventScroll: true });
  }, [choisi]);

  // La scène a la taille que lui laisse la mise en page ; la photo s'y inscrit (mesure en pixels, mise à jour si l'écran change).
  const scene = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const z = scene.current;
    if (!z) return;
    const mesurer = () => {
      z.style.setProperty("--scene-h", `${z.clientHeight}px`);
      z.style.setProperty("--scene-l", `${z.clientWidth}px`);
    };
    mesurer();
    const o = new ResizeObserver(mesurer);
    o.observe(z);
    return () => o.disconnect();
  }, []);

  const colonnes = manche.choix.length === 3 ? "grid-cols-1" : "grid-cols-2";
  // Le verdict s'inscrit dans la scène comme un cartouche, du côté opposé au cadre jaune pour ne pas le couvrir.
  const cartoucheEnHaut = !!img.rectangle && img.rectangle.y + img.rectangle.hauteur / 2 > 0.55;

  // Une seule règle, sur tous les formats : la scène a la couleur de la page et une taille fixée par la mise en page ;
  // la photo, les réponses et l'emplacement du bas (consigne, puis « Suivant ») ne bougent jamais pendant une manche.
  // Téléphone : une colonne à la hauteur de l'écran. À partir de la tablette : photo à gauche, réponses à droite.
  return (
    <div className="flex min-h-dvh flex-col sm:min-h-[calc(100dvh-3.5rem-1px)] md:grid md:h-[calc(100dvh-3.5rem-1px)] md:min-h-[34rem] md:grid-cols-[minmax(0,1fr)_19rem] md:grid-rows-[minmax(0,1fr)] md:gap-x-6 md:pb-4 md:pt-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-x-8">
      <div className="order-2 flex min-h-0 flex-1 flex-col md:order-none">
        <div ref={scene} className="relative -mx-4 min-h-[32dvh] flex-1 sm:mx-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <Figure
              src={imageSrc(img)}
              rect={img.rectangle}
              alt="Élément à reconnaître"
              imgClassName="h-auto w-auto max-h-[var(--scene-h,32dvh)] max-w-[var(--scene-l,100%)]"
              onClick={() => setZoom(true)}
            />
          </div>
          {choisi && (
            <div
              className={`apparition absolute inset-x-0 border-trait bg-fond px-4 py-3 sm:px-0 md:grid md:grid-cols-2 md:gap-x-8 md:py-4 ${
                cartoucheEnHaut ? "top-0 border-b" : "bottom-0 border-t"
              }`}
              data-testid="retour"
            >
              <div>
                <p className={`mi-etroit text-xl leading-none ${juste ? "text-green-500" : "text-red-500"}`}>{juste ? "Juste. " : "Faux. "}</p>
                <p className="mi-etroit mt-2.5 text-xl leading-tight">
                  {bon.terme}
                  <span className="sr-only"> : </span>
                </p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-sourdine">{bon.definition}</p>
              </div>
              {!juste && (
                <p className="mt-2.5 border-t border-trait pt-2.5 text-sm leading-snug text-faible md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0" data-testid="retour-choix">
                  <span className="md:mb-2.5 md:block md:text-xl md:leading-none">Ma réponse,{" "}</span>
                  <span className="mi-etroit text-red-500 md:block md:text-xl md:leading-tight">{termsParId.get(choisi)!.terme}</span>
                  <span className="md:sr-only">&nbsp;: </span>
                  <span className="md:mt-1 md:block md:text-[0.9375rem]">{termsParId.get(choisi)!.definition}</span>
                </p>
              )}
            </div>
          )}
        </div>
        {/* L'auteur peut être abrégé si la place manque ; la licence et la source, jamais. */}
        <p className="mt-1.5 flex h-5 text-xs leading-5 text-faible" data-testid="credit">
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

      <div className="contents md:flex md:min-h-0 md:flex-col md:pb-[1.625rem]">
        <div className="order-1 md:order-none">
          <div className="flex min-h-12 items-center justify-between gap-3 md:min-h-0 md:items-baseline">
            <span data-testid="progression" className="tabular-nums">
              <span className="mi-etroit text-xl">
                {index + 1} / {partie.manches.length}
              </span>
              <span className="text-sourdine">
                {" · "}
                {partie.categorie}
              </span>
            </span>
            <button onClick={onQuitter} className="lien -mr-3 min-h-12 px-3 !text-sourdine hover:!text-encre md:min-h-0 md:py-1">
              Quitter
            </button>
          </div>
          <Reperes partie={partie} index={index} className="mb-3 md:mb-5 md:mt-3" />
        </div>

        <div className={`order-4 mt-2 grid gap-1.5 md:order-none md:mt-0 md:flex md:min-h-0 md:flex-[0_1_auto] md:flex-col ${colonnes}`} data-testid="choix">
          {manche.choix.map((id, k) => {
            const t = termsParId.get(id)!;
            let style = "border-relief bg-relief hover:border-encre active:border-trait-fort active:bg-trait";
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
                className={`mi-etroit relative border-2 px-3 py-2 text-left text-[1.125rem] leading-[1.15] transition-colors duration-100 md:h-28 md:min-h-12 md:shrink lg:text-xl ${manche.choix.length > 4 ? "min-h-[3.75rem]" : "min-h-[4.5rem]"} ${style}`}
              >
                {t.terme}
              </button>
            );
          })}
        </div>

        {/* Emplacement fixe : la consigne avant la réponse, « Suivant » après. Rien d'autre ne bouge. */}
        <div className="order-5 mt-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:order-none md:mt-4 md:pb-0">
          <div className="flex h-14 items-center">
            {choisi ? (
              <button ref={suivant} onClick={() => onRepondre(choisi)} className="btn btn-plein apparition h-14 w-full justify-between text-lg">
                Suivant
                <Fleche />
              </button>
            ) : (
              <p aria-hidden className="text-sm leading-snug text-faible">
                <span className="[@media(hover:hover)]:hidden">Touchez la photo pour l’agrandir.</span>
                <span className="hidden [@media(hover:hover)]:inline">
                  Touches 1 à {manche.choix.length} pour répondre, Entrée pour continuer. Un clic sur la photo l’agrandit.
                </span>
              </p>
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

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
    return (
      <div className="py-6 sm:py-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
        <div className="lg:sticky lg:top-10 lg:self-start">
          <h1 className="etroit whitespace-nowrap text-[2.5rem] leading-[0.95] sm:text-[3.5rem]">
            Une image, {params.propositions} mots&nbsp;:
            <br />
            trouvez le bon.
          </h1>
          <p className="mt-3 text-sourdine">Parties de {params.imagesParPartie} images.</p>

          <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button
              onClick={() => demarrer("Toutes")}
              disabled={jouables.length === 0}
              className="group flex min-h-[4.5rem] w-full items-center justify-between gap-4 border border-accent bg-accent px-4 py-3 text-left text-black transition-colors duration-100 hover:border-white hover:bg-white active:border-accent active:bg-accent disabled:border-trait disabled:bg-transparent disabled:text-faible"
            >
              <span>
                <span className="etroit block text-[1.75rem] leading-none">Toutes</span>
                <span className="mt-1 block text-sm tabular-nums">
                  <Nombre n={jouables.length} /> image{jouables.length > 1 ? "s" : ""} · <Nombre n={motsJouables} /> mot{motsJouables > 1 ? "s" : ""}
                </span>
              </span>
              <span className="mi-etroit flex items-center gap-2 text-lg">
                Jouer
                <Fleche />
              </span>
            </button>

            {aRevoir.length > 0 && (
              <button
                onClick={() => lancer(A_REVOIR, aRevoir, Math.min(motsARevoir, params.imagesParPartie), false)}
                className="flex min-h-[4.5rem] w-full items-center justify-between gap-4 border border-trait-fort px-4 py-3 text-left transition-colors duration-100 hover:border-encre hover:bg-relief active:bg-trait"
                data-testid="a-revoir"
              >
                <span>
                  <span className="mi-etroit block text-xl leading-tight">Réviser mes mots ratés</span>
                  <span className="mt-0.5 block text-sm text-sourdine">{pluriel(motsARevoir, "mot")} dont la dernière réponse était fausse</span>
                </span>
                <Fleche />
              </button>
            )}
          </div>

          <div className="mt-8" data-testid="bilan">
            <p className="flex items-baseline">
              <span className="mi-etroit text-[1.75rem] leading-none tabular-nums">{total.maitrise}</span>
              <span className="whitespace-pre text-sourdine">
                {" "}/ {pluriel(total.total, "mot")} maîtrisé{total.total > 1 ? "s" : ""}
              </span>
            </p>
            <Jauge bilan={total} className="mt-2.5 h-3" />
            <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-sourdine">
              <Legende etat="maitrise" texte={`maîtrisé${total.maitrise > 1 ? "s" : ""}`} />
              <Legende etat="en-cours" n={total["en-cours"]} texte="en cours" />
              <Legende etat="a-revoir" n={total["a-revoir"]} texte="à revoir" />
              <Legende etat="nouveau" n={total.nouveau} texte={`jamais vu${total.nouveau > 1 ? "s" : ""}`} />
            </p>
          </div>
        </div>

        <div className="mt-10 lg:mt-0">
          <div aria-hidden className={`${LIGNE} tete-tableau`}>
            <span>Catégorie</span>
            <span className="text-right">Images</span>
            <span>Maîtrisés</span>
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
                className={`${LIGNE} group min-h-[3.25rem] w-full border-b border-trait py-2 text-left transition-colors duration-100 hover:bg-surface active:bg-relief disabled:text-faible`}
              >
                <span className="mi-etroit text-lg leading-tight sm:text-[1.1875rem]">{cat}</span>
                <span className="text-right tabular-nums text-sourdine">
                  {n}
                  <span className="sr-only"> image{n > 1 ? "s" : ""}</span>
                </span>
                <span aria-hidden className="block">
                  <span className="block text-sm leading-none tabular-nums text-faible">
                    <span className={b.maitrise ? "text-encre" : ""}>{b.maitrise}</span> / {b.total}
                  </span>
                  <Jauge bilan={b} className="mt-1.5 h-1.5" />
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
    return (
      <div className="py-6 sm:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-x-16">
          <div>
            <p className="text-sourdine">{partie.categorie}</p>
            <h1 className="etroit mt-1 text-[6.5rem] leading-[0.8] tabular-nums [word-spacing:0] sm:text-[9rem]" data-testid="score">
              <span className="sr-only">Score : </span>
              {score}
              <span className="text-faible"> / {total}</span>
            </h1>
          </div>
          <div className="mt-6 lg:mt-0">
            <p className="mi-etroit text-xl">{mention}</p>
            <Reperes partie={partie} className="mt-3 [&>div]:h-2" />
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
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

        <div className="mt-12">
          {rates.length > 0 ? (
            <>
              <h2 className="tete-tableau flex items-baseline justify-between">
                <span>Mots ratés</span>
                <span className="tabular-nums">{rates.length}</span>
              </h2>
              <ul className="lg:grid lg:grid-cols-2 lg:gap-x-16" data-testid="rates">
                {rates.map(({ m, reponse }, i) => {
                  const img = imagesParId.get(m.imageId)!;
                  const t = termsParId.get(m.termId)!;
                  return (
                    <li key={i} className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 border-b border-trait py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-6">
                      <Vignette src={vignetteSrc(img)} rect={img.rectangle} alt={t.terme} />
                      <div>
                        <p className="mi-etroit -mt-0.5 text-xl leading-tight">{t.terme}</p>
                        <p className="mt-1 text-sm leading-snug text-sourdine">{t.definition}</p>
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
          ) : (
            <p className="mi-etroit border-t border-trait pt-4 text-2xl">Aucune erreur, bravo !</p>
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

// Ligne du tableau des catégories : nom, images, mots maîtrisés (chiffres et jauge), flèche.
const LIGNE = "grid grid-cols-[minmax(0,1fr)_2.25rem_3.5rem_1rem] items-center gap-x-2.5 sm:grid-cols-[minmax(0,1fr)_4rem_7rem_2rem] sm:gap-x-5";

function Legende({ etat, n, texte }: { etat: Etat; n?: number; texte: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <Poche etat={etat} className="translate-y-px" />
      <span>
        {n !== undefined && <span className="tabular-nums text-encre">{n} </span>}
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
  const credit = [img.auteur, img.licence].filter(Boolean).join(" · ");
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

  // « Suivant » est toujours à sa place ; il reçoit le focus dès qu'on a répondu (Entrée continue).
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

  const colonnes = manche.choix.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2";

  // Téléphone : une colonne à la hauteur de l'écran (photo, légende, réponses, « Suivant »), la photo prend la place libre.
  // Ordinateur : la photo à gauche, le reste dans une marge à droite, « Suivant » aligné sur le bas de la photo.
  return (
    <div className="flex min-h-dvh flex-col sm:min-h-[calc(100dvh-3.5rem-1px)] lg:grid lg:h-[calc(100dvh-3.5rem-1px)] lg:min-h-[35rem] lg:grid-cols-[minmax(0,1fr)_23rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-x-8 lg:pb-3 lg:pt-6">
      <div className="order-2 flex min-h-0 flex-1 flex-col lg:order-none">
        {/* La scène a une taille fixée par la mise en page, jamais par la photo : rien ne bouge d'une image à l'autre. */}
        <div ref={scene} className="relative -mx-4 min-h-[32dvh] flex-1 bg-surface sm:mx-0">
          <div className="absolute inset-0 flex items-center justify-center">
          <Figure
            src={imageSrc(img)}
            rect={img.rectangle}
            alt="Élément à reconnaître"
            imgClassName="h-auto w-auto max-h-[var(--scene-h,32dvh)] max-w-[var(--scene-l,100%)]"
            onClick={() => setZoom(true)}
          />
          </div>
        </div>
        <p className="mt-1.5 h-5 truncate text-xs leading-5 text-faible" data-testid="credit">
          {credit}
          {img.lienSource && (
            <>
              {" · "}
              <a href={img.lienSource} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-encre">
                source
              </a>
            </>
          )}
        </p>
      </div>

      <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:pb-[1.625rem]">
        <div className="order-1 lg:order-none">
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

        <div className={`order-4 mt-2 grid gap-1.5 lg:order-none lg:mt-0 lg:grid-cols-1 ${colonnes}`} data-testid="choix">
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
                className={`mi-etroit relative min-h-[4.5rem] border-2 px-3 py-2 text-left text-[1.125rem] leading-[1.15] transition-colors duration-100 lg:text-xl ${manche.choix.length > 4 ? "lg:min-h-12" : "lg:min-h-[3.75rem]"} ${style}`}
              >
                {t.terme}
              </button>
            );
          })}
        </div>

        {/* Le verdict se lit comme la légende de la photo : sur téléphone il vient entre la photo et les réponses, qui ne bougent pas. */}
        {choisi ? (
          <div className="apparition order-3 mt-2 lg:order-none lg:mt-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" data-testid="retour">
            <p className="leading-snug">
              <span className={`mi-etroit text-xl ${juste ? "text-green-500" : "text-red-500"}`}>{juste ? "Juste. " : "Faux. "}</span>
              <span className="mi-etroit text-xl">{bon.terme}</span>
              <span className="sr-only"> : </span>
              <span className="mt-0.5 block text-[0.9375rem] text-sourdine lg:text-base">{bon.definition}</span>
            </p>
            {!juste && (
              <p className="mt-2 text-sm leading-snug text-faible lg:mt-3 lg:border-t lg:border-trait lg:pt-3" data-testid="retour-choix">
                Ma réponse, <span className="mi-etroit text-red-500">{termsParId.get(choisi)!.terme}</span>&nbsp;: {termsParId.get(choisi)!.definition}
              </p>
            )}
          </div>
        ) : (
          <p aria-hidden className="mt-5 hidden text-xs leading-relaxed text-faible lg:[@media(hover:hover)]:block lg:flex-1">
            Touches 1 à {manche.choix.length} pour répondre, Entrée pour continuer.
            <br />
            Un clic sur la photo l’agrandit.
          </p>
        )}

        <div className="sticky bottom-0 order-5 -mx-4 mt-3 border-t border-trait bg-fond px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:mx-0 sm:border-t-0 sm:px-0 lg:static lg:order-none lg:mt-auto lg:p-0 lg:pt-4">
          <button ref={suivant} disabled={!choisi} onClick={() => choisi && onRepondre(choisi)} className="btn btn-plein min-h-14 w-full justify-between text-lg">
            Suivant
            <Fleche />
          </button>
        </div>
      </div>

      {zoom && <Visionneuse vues={[{ src: imageSrc(img), rect: img.rectangle, legende: credit, lien: img.lienSource }]} onFermer={() => setZoom(false)} />}
    </div>
  );
}

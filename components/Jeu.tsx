"use client";

import { useEffect, useMemo, useState } from "react";
import Figure from "./Figure";
import Jauge from "./Jauge";
import Visionneuse from "./Visionneuse";
import { CATEGORIES, compatibles, imageSrc, jouables as filtrer, vignetteSrc, type Image, type Term } from "@/lib/shared";
import { PAR_DEFAUT, lireParametres, type Parametres } from "@/lib/parametres";
import { bilan, ecrireProgres, etat, lireProgres, noter, poids, type Progres } from "@/lib/progres";

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
    return (
      <div className="py-6 sm:py-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
        <div className="lg:sticky lg:top-10 lg:self-start">
          <h1 className="etroit text-[2.9rem] leading-[0.92] sm:text-[4rem]">
            Une image, {params.propositions} mots&nbsp;:
            <br />
            trouvez le bon.
          </h1>
          <p className="mt-3 text-sourdine">Parties de {params.imagesParPartie} images.</p>

          <div className="mt-8 border-t-2 border-encre pt-3" data-testid="bilan">
            <p className="flex items-baseline">
              <span className="etroit text-5xl leading-none tabular-nums">{total.maitrise}</span>
              <span className="whitespace-pre text-sourdine">
                {" "}/ {pluriel(total.total, "mot")} maîtrisé{total.total > 1 ? "s" : ""}
              </span>
            </p>
            <Jauge bilan={total} className="mt-3" />
            <p className="mt-2.5 grid grid-cols-3 text-sm text-sourdine">
              <Compte n={total["en-cours"]} couleur="text-accent" texte="en cours" />
              <Compte n={total["a-revoir"]} couleur="text-red-400" texte="à revoir" />
              <Compte n={total.nouveau} couleur="text-encre" texte={`jamais vu${total.nouveau > 1 ? "s" : ""}`} />
            </p>
          </div>

          {(() => {
            const n = jouables.length;
            return (
              <button
                onClick={() => demarrer("Toutes")}
                disabled={n === 0}
                className="mt-8 flex min-h-[4.5rem] w-full items-center justify-between gap-4 bg-accent px-4 py-3 text-left text-black transition-colors duration-100 hover:bg-white active:bg-accent disabled:bg-relief disabled:text-faible"
              >
                <span>
                  <span className="etroit block text-[2rem] leading-none">Toutes</span>
                  <span className="mt-1 block text-sm tabular-nums">
                    {pluriel(n, "image")} · {pluriel(idsJouables("Toutes").size, "mot")}
                  </span>
                </span>
                <Fleche />
              </button>
            );
          })()}

          {aRevoir.length > 0 && (
            <button
              onClick={() => lancer(A_REVOIR, aRevoir, Math.min(motsARevoir, params.imagesParPartie), false)}
              className="mt-2 flex min-h-[4.5rem] w-full items-center justify-between gap-4 border border-trait-fort px-4 py-3 text-left transition-colors duration-100 hover:border-encre hover:bg-relief active:bg-trait"
              data-testid="a-revoir"
            >
              <span>
                <span className="mi-etroit block text-xl leading-tight">Réviser mes mots ratés</span>
                <span className="mt-0.5 block text-sm text-sourdine">
                  <span className="text-red-400">{pluriel(motsARevoir, "mot")}</span> dont la dernière réponse était fausse
                </span>
              </span>
              <Fleche />
            </button>
          )}
        </div>

        <div className="mt-10 lg:mt-0">
          <div aria-hidden className={`${LIGNE} border-b-2 border-encre pb-2 text-xs text-sourdine`}>
            <span>N°</span>
            <span>Catégorie</span>
            <span className="text-right">Images</span>
            <span className="text-right">Maîtrisés</span>
          </div>
          {CATEGORIES.map((cat, k) => {
            const ids = idsJouables(cat);
            const n = jouables.filter((i) => categorieDe(i) === cat).length;
            const b = bilan(ids, progres);
            return (
              <button
                key={cat}
                onClick={() => demarrer(cat)}
                disabled={n === 0}
                className={`${LIGNE} group min-h-12 w-full border-b border-trait py-2.5 text-left transition-colors duration-100 hover:bg-surface active:bg-relief disabled:text-faible`}
              >
                <span aria-hidden className="text-sm tabular-nums text-faible group-hover:text-accent">
                  {String(k + 1).padStart(2, "0")}
                </span>
                <span className="mi-etroit text-[1.1875rem] leading-tight">{cat}</span>
                <span className="text-right tabular-nums text-sourdine">
                  {n}
                  <span className="sr-only"> image{n > 1 ? "s" : ""}</span>
                </span>
                <span aria-hidden className="text-right tabular-nums text-faible">
                  <span className={b.maitrise ? "text-encre" : ""}>{b.maitrise}</span>/{b.total}
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
      <div className="py-6 sm:py-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16">
        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="text-sourdine">{partie.categorie}</p>
          <h1 className="etroit mt-1 text-[7rem] leading-[0.8] tabular-nums sm:text-[10rem]" data-testid="score">
            <span className="sr-only">Score : </span>
            {score}
            <span className="text-faible"> / {total}</span>
          </h1>
          <p className="mi-etroit mt-5 text-xl">{mention}</p>
          <Reperes partie={partie} className="mt-3 [&>div]:h-2" />
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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
          {rates.length > 0 ? (
            <>
              <h2 className="flex items-baseline justify-between border-b-2 border-encre pb-2 text-xs font-normal text-sourdine">
                <span>Mots ratés</span>
                <span className="tabular-nums">{rates.length}</span>
              </h2>
              <ul data-testid="rates">
                {rates.map(({ m, reponse }, i) => {
                  const img = imagesParId.get(m.imageId)!;
                  const t = termsParId.get(m.termId)!;
                  return (
                    <li key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 border-b border-trait py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6">
                      <div className="flex h-[6.5rem] items-center justify-center bg-scene sm:h-32">
                        <Figure src={vignetteSrc(img)} rect={img.rectangle} alt={t.terme} imgClassName="max-h-[6.5rem] sm:max-h-32" />
                      </div>
                      <div>
                        <p className="mi-etroit text-xl leading-tight">{t.terme}</p>
                        <p className="mt-1 max-w-[60ch] text-sm leading-snug text-sourdine">{t.definition}</p>
                        {reponse && termsParId.has(reponse) && (
                          <p className="mt-2 text-sm text-faible">
                            Votre réponse&nbsp;: <span className="text-red-400 line-through decoration-1">{termsParId.get(reponse)!.terme}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="etroit border-t-2 border-encre pt-3 text-3xl">Aucune erreur, bravo !</p>
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

// Ligne de la nomenclature des catégories : repère, nom, images, mots maîtrisés.
const LIGNE = "grid grid-cols-[2rem_minmax(0,1fr)_3.25rem_4.25rem] items-baseline sm:grid-cols-[2.75rem_minmax(0,1fr)_5rem_6rem]";

function Compte({ n, couleur, texte }: { n: number; couleur: string; texte: string }) {
  return (
    <span>
      <span className={`mi-etroit text-xl tabular-nums ${couleur}`}>{n}</span> {texte}
    </span>
  );
}

function Fleche() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
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

  const colonnes = manche.choix.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2";

  return (
    <div className={`flex flex-col sm:pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-8 lg:py-6 ${choisi ? "pb-24" : "pb-6"}`}>
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="flex min-h-11 items-center justify-between gap-3 lg:items-start">
          <span data-testid="progression" className="tabular-nums lg:flex lg:flex-col">
            <span className="etroit text-xl lg:text-[4rem] lg:leading-[0.85]">
              {index + 1} / {partie.manches.length}
            </span>
            <span className="text-sourdine lg:mt-2">
              <span className="lg:hidden">{" · "}</span>
              {partie.categorie}
            </span>
          </span>
          <button onClick={onQuitter} className="-mr-3 min-h-11 px-3 text-sourdine underline decoration-trait-fort underline-offset-4 hover:text-encre hover:decoration-encre lg:-mt-2">
            Quitter
          </button>
        </div>
        <Reperes partie={partie} index={index} className="mb-3 lg:mb-5 lg:mt-4" />
      </div>

      {/* Hauteur fixe : les réponses restent au même endroit d'une image à l'autre. */}
      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div className="-mx-4 flex h-[40dvh] items-center justify-center bg-scene sm:mx-0 sm:h-[52dvh] lg:h-[calc(100dvh-9.75rem)] lg:min-h-[26rem]">
          <Figure
            src={imageSrc(img)}
            rect={img.rectangle}
            alt="Élément à reconnaître"
            imgClassName="max-h-[40dvh] sm:max-h-[52dvh] lg:max-h-[max(26rem,calc(100dvh-9.75rem))]"
            onClick={() => setZoom(true)}
          />
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

      <div className="mt-2 flex flex-col lg:col-start-2 lg:row-start-2 lg:mt-0">
        <div className={`grid gap-1.5 lg:grid-cols-1 ${colonnes}`} data-testid="choix">
          {manche.choix.map((id, k) => {
            const t = termsParId.get(id)!;
            let style = "border-relief bg-relief hover:border-encre active:border-trait-fort active:bg-trait";
            if (choisi) {
              if (id === bon.id) style = "border-green-500 bg-green-500 text-black";
              else if (id === choisi) style = "border-red-500 bg-red-500 text-white";
              else style = "border-trait bg-transparent text-faible";
            }
            return (
              <button
                key={id}
                data-term={id}
                data-touche={k + 1}
                disabled={!!choisi}
                onClick={() => choisir(id)}
                className={`mi-etroit relative min-h-[4.5rem] border-2 px-3 py-2 text-left text-[1.125rem] leading-[1.15] transition-colors duration-100 lg:min-h-[3.75rem] lg:text-xl ${style}`}
              >
                {t.terme}
              </button>
            );
          })}
        </div>

        {!choisi && (
          <p aria-hidden className="mt-auto hidden pt-4 text-xs leading-relaxed text-faible lg:[@media(hover:hover)]:block">
            Touches 1 à {manche.choix.length} pour répondre, Entrée ou → pour continuer.
            <br />
            Un clic sur la photo l’agrandit.
          </p>
        )}

        {choisi && (
          <div className="apparition mt-4 flex flex-1 flex-col" data-testid="retour">
            <div>
              <p className="leading-snug">
                <span className={`etroit block text-3xl leading-none ${juste ? "text-green-400" : "text-red-400"}`}>{juste ? "Juste. " : "Faux. "}</span>
                <span className="mi-etroit mt-2 block text-lg leading-tight">{bon.terme}</span>
                <span className="sr-only"> : </span>
                <span className="text-sourdine">{bon.definition}</span>
              </p>
              {!juste && (
                <p className="mt-3 border-t border-trait pt-3 text-sm leading-snug text-sourdine" data-testid="retour-choix">
                  Votre choix, <span className="mi-etroit text-red-400">{termsParId.get(choisi)!.terme}</span>&nbsp;: {termsParId.get(choisi)!.definition}
                </p>
              )}
            </div>
            <div className="mt-4 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-10 max-sm:mt-0 max-sm:border-t max-sm:border-trait max-sm:bg-fond max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:mt-auto lg:pt-4">
              <button autoFocus onClick={() => onRepondre(choisi)} className="btn btn-plein min-h-14 w-full justify-between text-lg">
                Suivant
                <Fleche />
              </button>
            </div>
          </div>
        )}
      </div>

      {zoom && <Visionneuse vues={[{ src: imageSrc(img), rect: img.rectangle, legende: credit }]} onFermer={() => setZoom(false)} />}
    </div>
  );
}

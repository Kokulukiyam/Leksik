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
    return (
      <div className="mx-auto max-w-3xl py-2 sm:py-6">
        <p className="surtitre mb-2">Vocabulaire architectural</p>
        <h1 className="mb-2 font-serif text-4xl sm:text-5xl">Jouer</h1>
        <p className="mb-6 text-sourdine">
          Une image, {params.propositions} mots : trouvez le bon. Parties de {params.imagesParPartie} images.
        </p>

        <div className="panneau mb-6 p-4" data-testid="bilan">
          <p className="mb-2.5">
            <span className="font-serif text-3xl">{total.maitrise}</span>
            <span className="text-sourdine">
              {" "}/ {pluriel(total.total, "mot")} maîtrisé{total.total > 1 ? "s" : ""}
            </span>
          </p>
          <Jauge bilan={total} />
          <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sourdine">
            <Legende couleur="bg-green-500" texte={`${total.maitrise} maîtrisé${total.maitrise > 1 ? "s" : ""}`} />
            <Legende couleur="bg-accent" texte={`${total["en-cours"]} en cours`} />
            <Legende couleur="bg-red-500" texte={`${total["a-revoir"]} à revoir`} />
            <Legende couleur="bg-trait" texte={`${total.nouveau} jamais vu${total.nouveau > 1 ? "s" : ""}`} />
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {["Toutes", ...CATEGORIES].map((cat) => {
            const ids = idsJouables(cat);
            const n = cat === "Toutes" ? jouables.length : jouables.filter((i) => categorieDe(i) === cat).length;
            if (cat === "Toutes")
              return (
                <button
                  key={cat}
                  onClick={() => demarrer(cat)}
                  disabled={n === 0}
                  className="rounded-xl border border-encre bg-encre px-4 py-4 text-left text-fond transition-colors hover:bg-white disabled:opacity-40 sm:col-span-2 sm:py-5"
                >
                  <span className="block font-serif text-2xl">{cat}</span>
                  <span className="block text-sm text-fond/70">
                    {pluriel(n, "image")} · {pluriel(ids.size, "mot")}
                  </span>
                </button>
              );
            return (
              <button
                key={cat}
                onClick={() => demarrer(cat)}
                disabled={n === 0}
                className="rounded-xl border border-trait bg-surface px-4 py-3 text-left transition-colors hover:border-sourdine disabled:opacity-40"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-lg leading-snug">{cat}</span>
                  <span className="shrink-0 text-xs text-faible">{pluriel(n, "image")}</span>
                </span>
                <Jauge bilan={bilan(ids, progres)} className="mt-2 !h-1" />
              </button>
            );
          })}
        </div>

        {aRevoir.length > 0 && (
          <button
            onClick={() => lancer(A_REVOIR, aRevoir, Math.min(new Set(aRevoir.map((i) => i.termId)).size, params.imagesParPartie), false)}
            className="mt-3 w-full rounded-xl border border-red-900 bg-red-950/40 px-4 py-3.5 text-left transition-colors hover:border-red-500"
            data-testid="a-revoir"
          >
            <span className="block font-serif text-lg">Réviser mes mots ratés</span>
            <span className="block text-sm text-sourdine">{pluriel(new Set(aRevoir.map((i) => i.termId)).size, "mot")} dont la dernière réponse était fausse</span>
          </button>
        )}
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
      <div className="mx-auto max-w-3xl py-2 sm:py-6">
        <p className="surtitre mb-2">{partie.categorie}</p>
        <h1 className="font-serif text-5xl sm:text-6xl" data-testid="score">
          <span className="sr-only">Score : </span>
          {score} / {total}
        </h1>
        <p className="mb-4 mt-1 text-sourdine">{mention}</p>
        <Pastilles partie={partie} className="mb-8" />
        {rates.length > 0 ? (
          <>
            <h2 className="mb-3 font-serif text-xl">Mots ratés</h2>
            <ul className="mb-8 grid gap-3 sm:grid-cols-2" data-testid="rates">
              {rates.map(({ m, reponse }, i) => {
                const img = imagesParId.get(m.imageId)!;
                const t = termsParId.get(m.termId)!;
                return (
                  <li key={i} className="panneau p-3">
                    <div className="mb-3 rounded-lg bg-black/40 text-center">
                      <Figure src={vignetteSrc(img)} rect={img.rectangle} alt={t.terme} imgClassName="max-h-48" />
                    </div>
                    <p className="font-serif text-lg text-green-400">{t.terme}</p>
                    <p className="text-sm text-encre/85">{t.definition}</p>
                    {reponse && termsParId.has(reponse) && (
                      <p className="mt-2 text-xs text-faible">
                        Votre réponse : <span className="text-red-300">{termsParId.get(reponse)!.terme}</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mb-8 text-encre/85">Aucune erreur, bravo !</p>
        )}
        <div className="flex flex-wrap gap-3">
          {rates.length > 0 && (
            <button onClick={() => revoir(partie)} className="btn btn-plein px-5 py-3">
              Revoir mes erreurs
            </button>
          )}
          <button onClick={() => maj(null)} className={`btn px-5 py-3 ${rates.length ? "" : "btn-plein"}`}>
            Nouvelle partie
          </button>
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

function Legende({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`h-2 w-2 rounded-full ${couleur}`} />
      {texte}
    </span>
  );
}

/** Une pastille par manche : verte ou rouge une fois jouée, claire pour la manche en cours. */
function Pastilles({ partie, index = -1, className = "" }: { partie: Partie; index?: number; className?: string }) {
  return (
    <div className={`flex gap-1 ${className}`} aria-hidden>
      {partie.manches.map((m, i) => {
        const r = partie.reponses[i];
        const couleur = r === null ? (i === index ? "bg-encre" : "bg-trait") : r === m.termId ? "bg-green-500" : "bg-red-500";
        return <div key={i} className={`h-1.5 flex-1 rounded-full ${couleur}`} />;
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
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-sourdine">
        <span data-testid="progression" className="tabular-nums">
          {index + 1} / {partie.manches.length} · {partie.categorie}
        </span>
        <button onClick={onQuitter} className="-my-1 py-1 hover:text-encre">
          Quitter
        </button>
      </div>
      <Pastilles partie={partie} index={index} className="mb-3" />

      {/* Hauteur fixe : les réponses restent au même endroit d'une image à l'autre. */}
      <div className="flex h-[42dvh] items-center justify-center rounded-xl bg-black/40 sm:h-[50dvh]">
        <Figure
          src={imageSrc(img)}
          rect={img.rectangle}
          alt="Élément à reconnaître"
          imgClassName="max-h-[42dvh] rounded-lg sm:max-h-[50dvh]"
          onClick={() => setZoom(true)}
        />
      </div>
      <p className="mt-1.5 text-center text-xs text-faible" data-testid="credit">
        {credit}
        {img.lienSource && (
          <>
            {" · "}
            <a href={img.lienSource} target="_blank" rel="noreferrer" className="underline hover:text-sourdine">
              source
            </a>
          </>
        )}
      </p>

      <div className={`mt-3 grid gap-2 sm:gap-3 ${colonnes}`} data-testid="choix">
        {manche.choix.map((id, k) => {
          const t = termsParId.get(id)!;
          let style = "border-trait bg-surface hover:border-sourdine active:bg-relief";
          if (choisi) {
            if (id === bon.id) style = "border-green-500 bg-green-950 text-green-100";
            else if (id === choisi) style = "border-red-500 bg-red-950 text-red-100";
            else style = "border-trait bg-surface opacity-40";
          }
          return (
            <button
              key={id}
              data-term={id}
              data-touche={k + 1}
              disabled={!!choisi}
              onClick={() => choisir(id)}
              className={`relative min-h-14 rounded-xl border-2 px-3 py-2.5 font-serif text-[1.05rem] leading-snug transition-colors sm:min-h-16 sm:px-9 sm:text-xl ${style}`}
            >
              {t.terme}
            </button>
          );
        })}
      </div>

      {choisi && (
        <div className="apparition mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5" data-testid="retour">
          <div className="flex-1 text-sm sm:text-base">
            <p>
              <span className={`font-semibold ${juste ? "text-green-400" : "text-red-400"}`}>{juste ? "Juste. " : "Faux. "}</span>
              <span className="font-semibold">{bon.terme}</span> : {bon.definition}
            </p>
            {!juste && (
              <p className="mt-1.5 text-sm text-sourdine" data-testid="retour-choix">
                Votre choix, <span className="font-semibold text-red-300">{termsParId.get(choisi)!.terme}</span> : {termsParId.get(choisi)!.definition}
              </p>
            )}
          </div>
          <button autoFocus onClick={() => onRepondre(choisi)} className="btn btn-plein w-full shrink-0 px-7 py-3 sm:w-auto">
            Suivant
          </button>
        </div>
      )}

      {zoom && <Visionneuse vues={[{ src: imageSrc(img), rect: img.rectangle, legende: credit }]} onFermer={() => setZoom(false)} />}
    </div>
  );
}

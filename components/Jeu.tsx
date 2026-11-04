"use client";

import { useEffect, useMemo, useState } from "react";
import Figure from "./Figure";
import { CATEGORIES, compatibles, imageSrc, jouables as filtrer, type Image, type Term } from "@/lib/shared";
import { PAR_DEFAUT, lireParametres, type Parametres } from "@/lib/parametres";

const CLE = "leksik:partie";

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

/** Tire les manches en variant le plus possible les termes. */
function creerManches(images: Image[], terms: Term[], nombre: number, p: Parametres): Manche[] {
  const parTerme = new Map<string, Image[]>();
  for (const img of images) parTerme.set(img.termId, [...(parTerme.get(img.termId) ?? []), img]);
  const ids = melanger([...parTerme.keys()]);
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

export default function Jeu({ terms, images }: { terms: Term[]; images: Image[] }) {
  const termsParId = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);
  const imagesParId = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const [partie, setPartie] = useState<Partie | null>(null);
  const [pret, setPret] = useState(false);
  const [params, setParams] = useState<Parametres>(PAR_DEFAUT);
  // Images validées dont le terme existe, filtrées selon les réglages (source, fréquence).
  const jouables = useMemo(() => filtrer(images, terms, params), [images, terms, params]);

  useEffect(() => {
    setParams(lireParametres());
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
  }

  function demarrer(categorie: string) {
    const pool = categorie === "Toutes" ? jouables : jouables.filter((i) => termsParId.get(i.termId)?.categorie === categorie);
    const manches = creerManches(pool, terms, params.imagesParPartie, params);
    if (manches.length) maj({ categorie, manches, reponses: manches.map(() => null) });
  }

  function revoir(p: Partie) {
    const rates = [...new Set(p.manches.filter((m, i) => p.reponses[i] !== m.termId).map((m) => m.termId))];
    // Toutes les images validées de ces termes, même si les réglages ont changé depuis.
    const pool = filtrer(images, terms, { sources: "toutes", frequence: 3 }).filter((i) => rates.includes(i.termId));
    const manches = creerManches(pool, terms, rates.length, params);
    if (manches.length) maj({ categorie: "Revoir mes erreurs", manches, reponses: manches.map(() => null) });
  }

  if (!pret) return null;

  if (!partie) {
    const compte = (cat: string) =>
      cat === "Toutes" ? jouables.length : jouables.filter((i) => termsParId.get(i.termId)?.categorie === cat).length;
    return (
      <div className="mx-auto max-w-xl py-4">
        <h1 className="mb-1 text-2xl font-semibold">Jouer</h1>
        <p className="mb-6 text-neutral-400">Une image, {params.propositions} mots : trouvez le bon. Parties de {params.imagesParPartie} images.</p>
        <div className="grid gap-3">
          {["Toutes", ...CATEGORIES].map((cat) => {
            const n = compte(cat);
            return (
              <button
                key={cat}
                onClick={() => demarrer(cat)}
                disabled={n === 0}
                className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-4 text-left text-lg hover:border-neutral-400 disabled:opacity-40"
              >
                <span>{cat}</span>
                <span className="text-sm text-neutral-400">{n} image{n > 1 ? "s" : ""}</span>
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
    const rates = partie.manches.filter((m, i) => partie.reponses[i] !== m.termId);
    return (
      <div className="mx-auto max-w-3xl py-4">
        <p className="text-sm text-neutral-400">{partie.categorie}</p>
        <h1 className="mb-6 text-3xl font-semibold" data-testid="score">
          Score : {score} / {partie.manches.length}
        </h1>
        {rates.length > 0 ? (
          <>
            <h2 className="mb-3 text-lg font-medium">Mots ratés</h2>
            <ul className="mb-8 grid gap-4 sm:grid-cols-2" data-testid="rates">
              {rates.map((m, i) => {
                const img = imagesParId.get(m.imageId)!;
                const t = termsParId.get(m.termId)!;
                return (
                  <li key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                    <div className="mb-2 text-center">
                      <Figure src={imageSrc(img)} rect={img.rectangle} alt={t.terme} imgClassName="max-h-48" />
                    </div>
                    <p className="font-semibold text-green-400">{t.terme}</p>
                    <p className="text-sm text-neutral-300">{t.definition}</p>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mb-8 text-neutral-300">Aucune erreur, bravo !</p>
        )}
        <div className="flex flex-wrap gap-3">
          {rates.length > 0 && (
            <button onClick={() => revoir(partie)} className="rounded-lg bg-white px-5 py-3 font-medium text-black hover:bg-neutral-200">
              Revoir mes erreurs
            </button>
          )}
          <button onClick={() => maj(null)} className="rounded-lg border border-neutral-600 px-5 py-3 hover:border-neutral-300">
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
      onRepondre={(rep) => {
        const reponses = [...partie.reponses];
        reponses[index] = rep;
        maj({ ...partie, reponses });
      }}
      onQuitter={() => maj(null)}
    />
  );
}

function Manche({
  partie,
  index,
  termsParId,
  imagesParId,
  suivantAuto,
  onRepondre,
  onQuitter,
}: {
  partie: Partie;
  index: number;
  termsParId: Map<string, Term>;
  imagesParId: Map<string, Image>;
  suivantAuto: boolean;
  onRepondre: (termId: string) => void;
  onQuitter: () => void;
}) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const manche = partie.manches[index];
  const img = imagesParId.get(manche.imageId)!;
  const bon = termsParId.get(manche.termId)!;
  const credit = [img.auteur, img.licence].filter(Boolean).join(" · ");

  // Réglage « image suivante automatique » : seulement après une bonne réponse.
  useEffect(() => {
    if (!suivantAuto || choisi !== bon.id) return;
    const t = setTimeout(() => onRepondre(choisi), 1500);
    return () => clearTimeout(t);
  }, [suivantAuto, choisi, bon.id, onRepondre]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center">
      <div className="mb-2 flex w-full items-center justify-between text-sm text-neutral-400">
        <span data-testid="progression">
          {index + 1} / {partie.manches.length} · {partie.categorie}
        </span>
        <button onClick={onQuitter} className="hover:text-white">
          Quitter
        </button>
      </div>
      <Figure src={imageSrc(img)} rect={img.rectangle} alt="Élément à reconnaître" imgClassName="max-h-[56dvh] rounded" />
      <p className="mt-1 w-full text-center text-xs text-neutral-500" data-testid="credit">
        {credit}
        {img.lienSource && (
          <>
            {" · "}
            <a href={img.lienSource} target="_blank" rel="noreferrer" className="underline">
              source
            </a>
          </>
        )}
      </p>
      <div className={`mt-3 grid w-full gap-2 sm:gap-3 ${manche.choix.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}
        data-testid="choix">
        {manche.choix.map((id) => {
          const t = termsParId.get(id)!;
          let style = "border-neutral-700 bg-neutral-900 hover:border-neutral-400";
          if (choisi) {
            if (id === bon.id) style = "border-green-500 bg-green-900/60 text-green-100";
            else if (id === choisi) style = "border-red-500 bg-red-900/60 text-red-100";
            else style = "border-neutral-800 bg-neutral-900 opacity-50";
          }
          return (
            <button
              key={id}
              data-term={id}
              disabled={!!choisi}
              onClick={() => setChoisi(id)}
              className={`min-h-14 rounded-lg border-2 px-3 py-3 text-base sm:text-lg ${style}`}
            >
              {t.terme}
            </button>
          );
        })}
      </div>
      {choisi && (
        <div className="mt-3 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-between" data-testid="retour">
          <p className="text-center text-sm text-neutral-200 sm:text-left">
            <span className={choisi === bon.id ? "font-semibold text-green-400" : "font-semibold text-red-400"}>
              {choisi === bon.id ? "Juste. " : "Faux. "}
            </span>
            <span className="font-semibold">{bon.terme}</span> : {bon.definition}
          </p>
          <button
            autoFocus
            onClick={() => onRepondre(choisi)}
            className="w-full shrink-0 rounded-lg bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200 sm:w-auto"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

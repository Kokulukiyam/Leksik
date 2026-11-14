"use client";

import { useEffect, useMemo, useState } from "react";
import Visionneuse from "./Visionneuse";
import { CATEGORIES, FREQUENCES, imageSrc, normaliser, vignetteSrc, type Image, type Term } from "@/lib/shared";
import { ETATS, etat, lireProgres, type Etat, type Progres } from "@/lib/progres";

const PAQUET = 60;

const PASTILLE: Record<Etat, string> = {
  nouveau: "border-trait text-faible",
  "a-revoir": "border-red-800 text-red-300",
  "en-cours": "border-accent/50 text-accent",
  maitrise: "border-green-800 text-green-400",
};

/** Tous les mots illustrés, avec leur définition et leurs photos : pour chercher un mot ou réviser. */
export default function Lexique({ terms, images }: { terms: Term[]; images: Image[] }) {
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [filtreEtat, setFiltreEtat] = useState("");
  const [limite, setLimite] = useState(PAQUET);
  const [progres, setProgres] = useState<Progres>({});
  const [ouvert, setOuvert] = useState<{ termId: string; depart: number } | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du localStorage au montage
  useEffect(() => setProgres(lireProgres()), []);

  const imagesParTerme = useMemo(() => {
    const m = new Map<string, Image[]>();
    for (const i of images) m.set(i.termId, [...(m.get(i.termId) ?? []), i]);
    return m;
  }, [images]);

  // Seulement les mots illustrés, par ordre alphabétique sans tenir compte de l'article.
  const mots = useMemo(
    () =>
      terms
        .filter((t) => imagesParTerme.has(t.id))
        .map((t) => ({ t, cle: normaliser(t.terme), definition: normaliser(t.definition) }))
        .sort((a, b) => a.cle.localeCompare(b.cle, "fr")),
    [terms, imagesParTerme],
  );

  const n = normaliser(recherche);
  const visibles = mots
    .filter(
      (m) =>
        (!categorie || m.t.categorie === categorie) &&
        (!filtreEtat || etat(progres[m.t.id]) === filtreEtat) &&
        (!n || m.cle.includes(n) || m.definition.includes(n)),
    )
    // Les mots dont le nom correspond passent avant ceux dont seule la définition correspond.
    .sort((a, b) => (n ? Number(!a.cle.includes(n)) - Number(!b.cle.includes(n)) : 0));

  const filtre = (set: (v: string) => void) => (v: string) => {
    set(v);
    setLimite(PAQUET);
  };
  const select = "champ !w-auto !py-2 text-sm";
  const vues = ouvert
    ? (imagesParTerme.get(ouvert.termId) ?? []).map((i) => ({
        src: imageSrc(i),
        rect: i.rectangle,
        legende: [terms.find((t) => t.id === i.termId)?.terme, i.lieu, i.auteur, i.licence].filter(Boolean).join(" · "),
      }))
    : [];

  return (
    <div className="mx-auto max-w-3xl py-2 sm:py-6">
      <h1 className="mb-2 font-serif text-4xl">Lexique</h1>
      <p className="mb-5 text-sourdine">Tous les mots du jeu, avec leur définition et leurs photos.</p>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input
          type="search"
          aria-label="Rechercher un mot ou une définition"
          placeholder="Rechercher un mot ou une définition"
          className="champ col-span-2 !py-2 text-sm sm:!w-72"
          value={recherche}
          onChange={(e) => filtre(setRecherche)(e.target.value)}
        />
        <select aria-label="Catégorie" className={`${select} min-w-0`} value={categorie} onChange={(e) => filtre(setCategorie)(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Progression" className={`${select} min-w-0`} value={filtreEtat} onChange={(e) => filtre(setFiltreEtat)(e.target.value)}>
          <option value="">Toute progression</option>
          {(Object.keys(ETATS) as Etat[]).map((e) => (
            <option key={e} value={e}>
              {ETATS[e]}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-3 text-sm text-faible" data-testid="compte">
        {visibles.length} mot{visibles.length > 1 ? "s" : ""}
      </p>

      <ul className="divide-y divide-trait border-y border-trait">
        {visibles.slice(0, limite).map(({ t }) => {
          const photos = imagesParTerme.get(t.id)!;
          const e = etat(progres[t.id]);
          return (
            <li key={t.id} className="flex gap-3 py-3 sm:gap-4" data-testid="mot" data-id={t.id}>
              <button
                type="button"
                aria-label={`Voir ${photos.length > 1 ? `les ${photos.length} photos` : "la photo"} : ${t.terme}`}
                onClick={() => setOuvert({ termId: t.id, depart: 0 })}
                className="relative h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-surface sm:h-24 sm:w-32"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vignetteSrc(photos[0])} alt="" loading="lazy" className="h-full w-full object-cover" />
                {photos.length > 1 && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 text-[0.7rem] leading-5 text-white">{photos.length}</span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="font-serif text-xl leading-tight" data-testid="terme">{t.terme}</h2>
                  {e !== "nouveau" && (
                    <span className={`rounded-full border px-2 text-[0.7rem] leading-5 ${PASTILLE[e]}`} data-testid="etat">
                      {ETATS[e]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-encre/85">{t.definition}</p>
                <p className="mt-1 text-xs text-faible">
                  {t.categorie}
                  {t.priorite ? ` · ${FREQUENCES[t.priorite]}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {visibles.length === 0 && <p className="py-8 text-center text-sourdine">Aucun mot ne correspond.</p>}
      {visibles.length > limite && (
        <div className="mt-6 text-center">
          <button onClick={() => setLimite(limite + PAQUET)} className="btn px-5 py-3">
            Afficher {Math.min(PAQUET, visibles.length - limite)} mot{visibles.length - limite > 1 ? "s" : ""} de plus
          </button>
        </div>
      )}
      {ouvert && <Visionneuse vues={vues} depart={ouvert.depart} onFermer={() => setOuvert(null)} />}
    </div>
  );
}

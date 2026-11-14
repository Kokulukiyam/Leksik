"use client";

import { useEffect, useMemo, useState } from "react";
import Visionneuse from "./Visionneuse";
import { CATEGORIES, FREQUENCES, imageSrc, normaliser, vignetteSrc, type Image, type Term } from "@/lib/shared";
import { ETATS, etat, lireProgres, type Etat, type Progres } from "@/lib/progres";

const PAQUET = 60;

const ETAT: Record<Etat, string> = {
  nouveau: "text-faible",
  "a-revoir": "text-red-400",
  "en-cours": "text-accent",
  maitrise: "text-green-400",
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
  const vues = ouvert
    ? (imagesParTerme.get(ouvert.termId) ?? []).map((i) => ({
        src: imageSrc(i),
        rect: i.rectangle,
        legende: [terms.find((t) => t.id === i.termId)?.terme, i.lieu, i.auteur, i.licence].filter(Boolean).join(" · "),
      }))
    : [];

  return (
    <div className="py-6 sm:py-10 lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-x-16">
      <div className="lg:sticky lg:top-10 lg:self-start">
        <h1 className="etroit text-5xl leading-[0.92] sm:text-[4rem]">Lexique</h1>
        <p className="mt-3 text-sourdine">Tous les mots du jeu, avec leur définition et leurs photos.</p>
        <div className="mt-6 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
          <input
            type="search"
            aria-label="Rechercher un mot ou une définition"
            placeholder="Rechercher un mot ou une définition"
            className="champ col-span-2 lg:col-span-1"
            value={recherche}
            onChange={(e) => filtre(setRecherche)(e.target.value)}
          />
          <select aria-label="Catégorie" className="champ champ-filtre min-w-0" value={categorie} onChange={(e) => filtre(setCategorie)(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Progression" className="champ champ-filtre min-w-0" value={filtreEtat} onChange={(e) => filtre(setFiltreEtat)(e.target.value)}>
            <option value="">Toute progression</option>
            {(Object.keys(ETATS) as Etat[]).map((e) => (
              <option key={e} value={e}>
                {ETATS[e]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 lg:mt-0">
        <p className="flex items-baseline justify-between border-b-2 border-encre pb-2 text-xs text-sourdine">
          <span data-testid="compte" className="tabular-nums">
            {visibles.length} mot{visibles.length > 1 ? "s" : ""}
          </span>
          <span aria-hidden>{n ? "par pertinence" : "A → Z"}</span>
        </p>
        <ul>
          {visibles.slice(0, limite).map(({ t, cle }, k, liste) => {
            const photos = imagesParTerme.get(t.id)!;
            const e = etat(progres[t.id]);
            // Hors recherche, la liste est alphabétique : une lettrine ouvre chaque lettre, comme dans un dictionnaire.
            const lettre = cle.charAt(0).toUpperCase();
            const lettrine = !n && (k === 0 || liste[k - 1].cle.charAt(0).toUpperCase() !== lettre);
            return (
              <li key={t.id} className="relative flex gap-4 border-b border-trait py-4 sm:gap-6" data-testid="mot" data-id={t.id}>
                <button
                  type="button"
                  aria-label={`Voir ${photos.length > 1 ? `les ${photos.length} photos` : "la photo"} : ${t.terme}`}
                  onClick={() => setOuvert({ termId: t.id, depart: 0 })}
                  className="relative h-[5.5rem] w-[5.5rem] shrink-0 cursor-zoom-in overflow-hidden bg-surface sm:h-28 sm:w-40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vignetteSrc(photos[0])} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {photos.length > 1 && (
                    <span className="absolute bottom-0 right-0 bg-black px-1.5 text-xs leading-5 tabular-nums text-white">{photos.length}</span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="mi-etroit text-[1.375rem] leading-[1.1] sm:text-2xl" data-testid="terme">{t.terme}</h2>
                    {e !== "nouveau" && (
                      <span className={`mi-etroit shrink-0 text-sm ${ETAT[e]}`} data-testid="etat">
                        {ETATS[e]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 max-w-[62ch] text-[0.9375rem] leading-snug text-sourdine">{t.definition}</p>
                  <p className="mt-1.5 text-xs text-faible">
                    {t.categorie}
                    {t.priorite ? ` · ${FREQUENCES[t.priorite]}` : ""}
                  </p>
                </div>
                {lettrine && (
                  <span aria-hidden className="etroit absolute right-full top-3 mr-5 hidden text-[2.5rem] leading-none text-faible xl:block">
                    {lettre}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {visibles.length === 0 && <p className="etroit pt-3 text-3xl">Aucun mot ne correspond.</p>}
        {visibles.length > limite && (
          <button onClick={() => setLimite(limite + PAQUET)} className="btn mt-6 min-h-14 w-full justify-between text-lg">
            Afficher {Math.min(PAQUET, visibles.length - limite)} mot{visibles.length - limite > 1 ? "s" : ""} de plus
            <span aria-hidden className="text-sm font-normal tabular-nums text-sourdine">
              {limite} / {visibles.length}
            </span>
          </button>
        )}
      </div>
      {ouvert && <Visionneuse vues={vues} depart={ouvert.depart} onFermer={() => setOuvert(null)} />}
    </div>
  );
}

"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Poche from "./Poche";
import Vignette from "./Vignette";
import Visionneuse from "./Visionneuse";
import { CATEGORIES, FREQUENCES, imageSrc, normaliser, vignetteSrc, type Image, type Term } from "@/lib/shared";
import { ETATS, etat, lireProgres, type Etat, type Progres } from "@/lib/progres";

const PAQUET = 60;

/** Tous les mots illustrés, avec leur définition et leurs photos : pour chercher un mot ou réviser. */
export default function Lexique({ terms, images }: { terms: Term[]; images: Image[] }) {
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [filtreEtat, setFiltreEtat] = useState("");
  const [limite, setLimite] = useState(PAQUET);
  const [progres, setProgres] = useState<Progres>({});
  const [ouvert, setOuvert] = useState<{ termId: string; depart: number } | null>(null);
  const [cible, setCible] = useState<string | null>(null);

  // Saut à une lettre : une fois ses lignes affichées, on y fait défiler la page.
  useEffect(() => {
    if (!cible) return;
    document.getElementById(`lettre-${cible}`)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la cible est consommée une fois atteinte
    setCible(null);
  }, [cible]);

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
        lien: i.lienSource || undefined,
      }))
    : [];

  // Hors recherche, la liste est alphabétique : chaque lettre a son repère, et un index permet d'y sauter.
  const initiale = (cle: string) => cle.charAt(0).toUpperCase();
  const lettres = n ? [] : [...new Set(visibles.map((m) => initiale(m.cle)))];
  function aller(lettre: string) {
    const k = visibles.findIndex((m) => initiale(m.cle) === lettre);
    if (k < 0) return;
    if (k >= limite) setLimite(Math.ceil((k + 1) / PAQUET) * PAQUET);
    setCible(lettre);
  }

  return (
    <div className="py-5 sm:py-10 lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-x-16">
      <div className="lg:sticky lg:top-10 lg:self-start">
        <h1 className="etroit text-[2rem] leading-none sm:text-[3.75rem] sm:leading-[0.95]">Lexique</h1>
        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:mt-6 lg:grid-cols-1">
          <input
            type="search"
            aria-label="Rechercher un mot ou une définition"
            placeholder="Rechercher un mot ou une définition"
            className="champ col-span-2 lg:col-span-1"
            value={recherche}
            onChange={(e) => filtre(setRecherche)(e.target.value)}
          />
          <select aria-label="Catégorie" className="champ min-w-0" value={categorie} onChange={(e) => filtre(setCategorie)(e.target.value)}>
            <option value="">Catégorie</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Progression" className="champ min-w-0" value={filtreEtat} onChange={(e) => filtre(setFiltreEtat)(e.target.value)}>
            <option value="">Progression</option>
            {(Object.keys(ETATS) as Etat[]).map((e) => (
              <option key={e} value={e}>
                {ETATS[e]}
              </option>
            ))}
          </select>
        </div>
        {lettres.length > 1 && (
          <nav aria-label="Aller à une lettre" className="mi-etroit -mx-4 mt-3 flex overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 lg:mt-6">
            {lettres.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => aller(l)}
                className="h-11 w-9 shrink-0 text-lg text-sourdine transition-colors duration-100 hover:bg-relief hover:text-encre active:bg-accent active:text-black lg:w-[12.5%]"
              >
                {l}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="mt-5 lg:mt-0">
        <p className="tete-tableau flex items-baseline justify-between">
          <span data-testid="compte" className="tabular-nums">
            {visibles.length} mot{visibles.length > 1 ? "s" : ""}
          </span>
          <span aria-hidden>{n ? "par pertinence" : "par ordre alphabétique"}</span>
        </p>
        <ul>
          {visibles.slice(0, limite).map(({ t, cle }, k, liste) => {
            const photos = imagesParTerme.get(t.id)!;
            const e = etat(progres[t.id]);
            const lettre = initiale(cle);
            const repere = !n && (k === 0 || initiale(liste[k - 1].cle) !== lettre);
            return (
              <Fragment key={t.id}>
                {repere && (
                  <li aria-hidden id={`lettre-${lettre}`} className="flex scroll-mt-4 items-center gap-3 pb-1 pt-5">
                    <span className="axe-bulle">{lettre}</span>
                    <span className="axe-trait" />
                  </li>
                )}
                <li className="flex gap-4 border-b border-trait py-4 sm:gap-6" data-testid="mot" data-id={t.id}>
                  <button
                    type="button"
                    aria-label={`Voir ${photos.length > 1 ? `les ${photos.length} photos` : "la photo"} : ${t.terme}`}
                    onClick={() => setOuvert({ termId: t.id, depart: 0 })}
                    className="relative w-28 shrink-0 cursor-zoom-in self-start sm:w-40"
                  >
                    <Vignette src={vignetteSrc(photos[0])} rect={photos[0].rectangle} alt="" />
                    {photos.length > 1 && (
                      <span className="absolute bottom-0 left-0 bg-fond/85 px-1.5 text-xs leading-5 tabular-nums text-encre">{photos.length} photos</span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="mi-etroit -mt-0.5 text-[1.375rem] leading-[1.1] sm:text-2xl" data-testid="terme">{t.terme}</h2>
                    <p className="mt-1.5 max-w-[62ch] text-[0.9375rem] leading-snug text-sourdine">{t.definition}</p>
                    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 text-xs text-faible">
                      <span>
                        {t.categorie}
                        {t.priorite ? ` · ${FREQUENCES[t.priorite]}` : ""}
                      </span>
                      {e !== "nouveau" && (
                        <span className="flex items-baseline gap-1.5 text-sourdine">
                          <Poche etat={e} className="translate-y-px" />
                          <span data-testid="etat">{ETATS[e]}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ul>
        {visibles.length === 0 && <p className="mi-etroit pt-4 text-2xl">Aucun mot ne correspond.</p>}
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

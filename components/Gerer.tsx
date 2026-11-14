"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Figure from "./Figure";
import DessinRect from "./DessinRect";
import { CATEGORIES, imageSrc, normaliser, vignetteSrc, type Image, type Rect, type Term } from "@/lib/shared";

const PAQUET = 60; // cartes affichées à la fois (le contenu compte plus de 1000 images)

const select = "champ champ-filtre min-w-0";

export default function Gerer({ terms, images }: { terms: Term[]; images: Image[] }) {
  const [source, setSource] = useState("");
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState("");
  const [recherche, setRecherche] = useState("");
  const [limite, setLimite] = useState(PAQUET);
  const termsParId = useMemo(() => new Map(terms.map((t) => [t.id, t])), [terms]);

  const visibles = images.filter(
    (i) =>
      (!source || i.source === source) &&
      (!categorie || termsParId.get(i.termId)?.categorie === categorie) &&
      (!statut || i.statut === statut) &&
      (!recherche || normaliser(termsParId.get(i.termId)?.terme ?? i.termId).includes(normaliser(recherche))),
  );
  // Tout changement de filtre repart du premier paquet.
  const filtre = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimite(PAQUET);
  };

  return (
    <div className="py-6 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="etroit text-5xl leading-[0.92] sm:text-[4rem]">Gérer les images</h1>
        <span className="mi-etroit shrink-0 text-xl tabular-nums sm:text-2xl" data-testid="compte">
          {visibles.length} image{visibles.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
        <select aria-label="Source" className={select} value={source} onChange={(e) => filtre(setSource)(e.target.value)}>
          <option value="">Toutes les sources</option>
          <option value="commons">Commons</option>
          <option value="perso">Mes photos</option>
        </select>
        <select aria-label="Catégorie" className={select} value={categorie} onChange={(e) => filtre(setCategorie)(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Statut" className={select} value={statut} onChange={(e) => filtre(setStatut)(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="validée">Validée</option>
          <option value="refusée">Refusée</option>
        </select>
        <input
          type="search"
          aria-label="Rechercher un terme"
          placeholder="Rechercher un terme"
          className={select}
          value={recherche}
          onChange={(e) => filtre(setRecherche)(e.target.value)}
        />
      </div>
      {/* Planche-contact : des cases séparées par des filets, pas des cartes. */}
      <ul className="mt-6 grid border-l border-t-2 border-l-trait border-t-encre sm:grid-cols-2 lg:grid-cols-3">
        {visibles.slice(0, limite).map((img) => (
          <Carte key={img.id} img={img} terms={terms} term={termsParId.get(img.termId)} />
        ))}
      </ul>
      {visibles.length === 0 && <p className="etroit pt-3 text-3xl">Aucune image ne correspond.</p>}
      {visibles.length > limite && (
        <button onClick={() => setLimite(limite + PAQUET)} className="btn mt-6 min-h-14 w-full text-lg">
          Afficher {Math.min(PAQUET, visibles.length - limite)} image{visibles.length - limite > 1 ? "s" : ""} de plus
        </button>
      )}
    </div>
  );
}

function Carte({ img, terms, term }: { img: Image; terms: Term[]; term?: Term }) {
  const router = useRouter();
  const [edition, setEdition] = useState(false);
  const [termId, setTermId] = useState(img.termId);
  const [rect, setRect] = useState<Rect | null>(img.rectangle);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [noteOuverte, setNoteOuverte] = useState(false);

  async function appel(methode: "PATCH" | "DELETE", corps?: object) {
    setOccupe(true);
    setErreur("");
    try {
      const rep = await fetch(`/api/images/${encodeURIComponent(img.id)}`, {
        method: methode,
        headers: corps ? { "Content-Type": "application/json" } : undefined,
        body: corps ? JSON.stringify(corps) : undefined,
      });
      if (!rep.ok) throw new Error((await rep.json()).erreur ?? "Erreur");
      setEdition(false);
      router.refresh();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  const refusee = img.statut === "refusée";

  const action = "mi-etroit min-h-11 flex-1 border-r border-trait px-2 transition-colors duration-100 last:border-r-0 disabled:text-faible";
  const neutre = `${action} hover:bg-relief active:bg-trait`;

  return (
    <li className="flex flex-col border-b border-r border-trait" data-testid="carte" data-id={img.id}>
      <div className={`flex items-center justify-center bg-scene text-center ${edition ? "p-2" : "h-60"}`}>
        {edition ? (
          <DessinRect src={imageSrc(img)} rect={rect} onChange={setRect} imgClassName="max-h-72" />
        ) : (
          <Figure src={vignetteSrc(img)} rect={img.rectangle} alt={term?.terme ?? img.termId} imgClassName={`max-h-60 ${refusee ? "opacity-40 grayscale" : ""}`} />
        )}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        {edition ? (
          <select aria-label="Terme" className={`${select} mb-2`} value={termId} onChange={(e) => setTermId(e.target.value)}>
            {CATEGORIES.map((c) => (
              <optgroup key={c} label={c}>
                {terms
                  .filter((t) => t.categorie === c)
                  .sort((a, b) => a.terme.localeCompare(b.terme, "fr"))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.terme}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <p className="mi-etroit text-[1.375rem] leading-[1.1]" data-testid="terme">{term?.terme ?? `? ${img.termId}`}</p>
        )}
        <p className="mt-1 text-xs text-faible">
          {term?.categorie} · {img.source === "perso" ? "Mes photos" : "Commons"} ·{" "}
          <span className={`mi-etroit ${refusee ? "text-red-400" : "text-green-400"}`} data-testid="statut">{img.statut}</span>
        </p>
        {img.note && (
          <p
            className={`mt-2.5 cursor-pointer text-sm leading-snug text-sourdine hover:text-encre ${noteOuverte ? "" : "line-clamp-3"}`}
            title={noteOuverte ? undefined : "Cliquer pour lire toute la note"}
            onClick={() => setNoteOuverte(!noteOuverte)}
            data-testid="note"
          >
            {img.note}
          </p>
        )}
        <p className="mt-2 text-xs text-faible">
          {[img.lieu, img.auteur, img.licence].filter(Boolean).join(" · ")}
        </p>
        {erreur && <p className="mt-2 text-sm text-red-400">{erreur}</p>}
      </div>
      <div className="mt-auto flex border-t border-trait">
        {edition ? (
          <>
            <button disabled={occupe} onClick={() => appel("PATCH", { termId, rectangle: rect })} className={`${action} bg-accent text-black hover:bg-white disabled:bg-relief`}>
              Enregistrer
            </button>
            <button
              disabled={occupe}
              onClick={() => {
                setEdition(false);
                setTermId(img.termId);
                setRect(img.rectangle);
              }}
              className={neutre}
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              disabled={occupe}
              onClick={() => {
                setTermId(img.termId);
                setRect(img.rectangle);
                setEdition(true);
              }}
              className={neutre}
            >
              Modifier
            </button>
            <button disabled={occupe} onClick={() => appel("PATCH", { statut: refusee ? "validée" : "refusée" })} className={neutre}>
              {refusee ? "Valider" : "Refuser"}
            </button>
            <button
              disabled={occupe}
              onClick={() => {
                if (confirm("Supprimer définitivement cette image ?")) appel("DELETE");
              }}
              className={`${action} text-red-400 hover:bg-red-500 hover:text-white active:bg-red-500 active:text-white`}
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    </li>
  );
}

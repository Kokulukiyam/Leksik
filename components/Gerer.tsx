"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Figure from "./Figure";
import DessinRect from "./DessinRect";
import { CATEGORIES, imageSrc, normaliser, type Image, type Rect, type Term } from "@/lib/shared";

const PAQUET = 60; // cartes affichées à la fois (le contenu compte plus de 1000 images)

const select = "rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm";

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
    <div className="py-2">
      <h1 className="mb-4 text-2xl font-semibold">Gérer les images</h1>
      <div className="mb-5 flex flex-wrap items-center gap-2">
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
          className={`${select} w-48`}
          value={recherche}
          onChange={(e) => filtre(setRecherche)(e.target.value)}
        />
        <span className="text-sm text-neutral-400" data-testid="compte">
          {visibles.length} image{visibles.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.slice(0, limite).map((img) => (
          <Carte key={img.id} img={img} terms={terms} term={termsParId.get(img.termId)} />
        ))}
      </ul>
      {visibles.length > limite && (
        <div className="mt-6 text-center">
          <button onClick={() => setLimite(limite + PAQUET)} className="rounded-lg border border-neutral-600 px-5 py-3 hover:border-neutral-300">
            Afficher {Math.min(PAQUET, visibles.length - limite)} image{visibles.length - limite > 1 ? "s" : ""} de plus
          </button>
        </div>
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

  return (
    <li className={`flex flex-col rounded-lg border bg-neutral-900 p-3 ${refusee ? "border-red-900" : "border-neutral-800"}`} data-testid="carte" data-id={img.id}>
      <div className="mb-2 text-center">
        {edition ? (
          <DessinRect src={imageSrc(img)} rect={rect} onChange={setRect} imgClassName="max-h-72" />
        ) : (
          <Figure src={imageSrc(img)} rect={img.rectangle} alt={term?.terme ?? img.termId} imgClassName={`max-h-56 ${refusee ? "opacity-50" : ""}`} />
        )}
      </div>
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
        <p className="font-semibold" data-testid="terme">{term?.terme ?? `? ${img.termId}`}</p>
      )}
      <p className="text-xs text-neutral-500">
        {term?.categorie} · {img.source === "perso" ? "Mes photos" : "Commons"} ·{" "}
        <span className={refusee ? "text-red-400" : "text-green-400"} data-testid="statut">{img.statut}</span>
      </p>
      {img.note && <p className="mt-1 text-sm text-neutral-300" data-testid="note">{img.note}</p>}
      <p className="mt-1 text-xs text-neutral-500">
        {[img.lieu, img.auteur, img.licence].filter(Boolean).join(" · ")}
      </p>
      {erreur && <p className="mt-1 text-sm text-red-400">{erreur}</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-3 text-sm">
        {edition ? (
          <>
            <button disabled={occupe} onClick={() => appel("PATCH", { termId, rectangle: rect })} className="rounded bg-white px-3 py-1.5 font-medium text-black">
              Enregistrer
            </button>
            <button
              disabled={occupe}
              onClick={() => {
                setEdition(false);
                setTermId(img.termId);
                setRect(img.rectangle);
              }}
              className="rounded border border-neutral-600 px-3 py-1.5"
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
              className="rounded border border-neutral-600 px-3 py-1.5 hover:border-neutral-300"
            >
              Modifier
            </button>
            <button
              disabled={occupe}
              onClick={() => appel("PATCH", { statut: refusee ? "validée" : "refusée" })}
              className="rounded border border-neutral-600 px-3 py-1.5 hover:border-neutral-300"
            >
              {refusee ? "Valider" : "Refuser"}
            </button>
            <button
              disabled={occupe}
              onClick={() => {
                if (confirm("Supprimer définitivement cette image ?")) appel("DELETE");
              }}
              className="rounded border border-red-800 px-3 py-1.5 text-red-300 hover:border-red-500"
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    </li>
  );
}

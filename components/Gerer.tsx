"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Nombre from "./Nombre";
import Vignette from "./Vignette";
import DessinRect, { AideRect } from "./DessinRect";
import { CATEGORIES, imageSrc, normaliser, vignetteSrc, type Image, type Rect, type Term } from "@/lib/shared";

const PAQUET = 60; // cartes affichées à la fois (le contenu compte plus de 1000 images)

const select = "champ min-w-0";

// Ligne du tableau sur ordinateur : image, terme, lieu et crédit, actions.
const LIGNE = "lg:grid lg:grid-cols-[10rem_minmax(0,5fr)_minmax(0,5fr)_16rem] lg:gap-x-6";

export default function Gerer({ terms, images }: { terms: Term[]; images: Image[] }) {
  const [source, setSource] = useState("");
  const [categorie, setCategorie] = useState("");
  const [statut, setStatut] = useState("");
  const [recherche, setRecherche] = useState("");
  const [limite, setLimite] = useState(PAQUET);
  // Une seule fiche en modification à la fois ; les intitulés de colonnes s'effacent pendant ce temps.
  const [enEdition, setEnEdition] = useState<string | null>(null);
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
    <div className="py-5 sm:py-10">
      <h1 className="etroit text-[2rem] leading-none sm:text-[3.75rem] sm:leading-[0.95]">Gérer les images</h1>
      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:mt-6 lg:grid-cols-4">
        <select aria-label="Catégorie" className={`${select} col-span-2 lg:col-span-1`} value={categorie} onChange={(e) => filtre(setCategorie)(e.target.value)}>
          <option value="">Catégorie</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Source" className={select} value={source} onChange={(e) => filtre(setSource)(e.target.value)}>
          <option value="">Source</option>
          <option value="commons">Commons</option>
          <option value="perso">Mes photos</option>
        </select>
        <select aria-label="Statut" className={select} value={statut} onChange={(e) => filtre(setStatut)(e.target.value)}>
          <option value="">Statut</option>
          <option value="validée">Validée</option>
          <option value="refusée">Refusée</option>
        </select>
        <input
          type="search"
          aria-label="Rechercher un terme"
          placeholder="Rechercher un terme"
          className={`${select} col-span-2 lg:col-span-1`}
          value={recherche}
          onChange={(e) => filtre(setRecherche)(e.target.value)}
        />
      </div>

      <div className={`${LIGNE} tete-tableau mt-7`}>
        <span className="tabular-nums" data-testid="compte">
          <Nombre n={visibles.length} /> image{visibles.length > 1 ? "s" : ""}
        </span>
        {!enEdition && (
          <>
            <span aria-hidden className="hidden lg:block">Terme</span>
            <span aria-hidden className="hidden lg:block">Lieu, auteur, licence</span>
          </>
        )}
      </div>
      <ul>
        {visibles.slice(0, limite).map((img) => (
          <Carte
            key={img.id}
            img={img}
            terms={terms}
            term={termsParId.get(img.termId)}
            edition={enEdition === img.id}
            setEdition={(oui) => setEnEdition(oui ? img.id : null)}
          />
        ))}
      </ul>
      {visibles.length === 0 && <p className="mi-etroit pt-4 text-2xl">Aucune image ne correspond.</p>}
      {visibles.length > limite && (
        <button onClick={() => setLimite(limite + PAQUET)} className="btn mt-6 min-h-14 w-full justify-start text-lg">
          Afficher {Math.min(PAQUET, visibles.length - limite)} image{visibles.length - limite > 1 ? "s" : ""} de plus
        </button>
      )}
    </div>
  );
}

/** Note de vérification : « Vérification : … Contre-vérification : … », rendue en deux paragraphes sans changer un caractère. */
function Note({ note }: { note: string }) {
  const m = note.match(/^(Vérification)(\s*:\s*)([\s\S]*?)(\s*)(Contre-vérification)(\s*:\s*)([\s\S]*)$/);
  const titre = "mi-etroit block text-encre";
  // Les deux-points et l'espace entre les paragraphes restent dans le texte, mais ne s'affichent pas.
  const cache = "sr-only";
  return (
    <div className="max-w-[60ch] pb-2 text-sm leading-snug text-sourdine lg:pt-2" data-testid="note">
      {m ? (
        <>
          <span className="block">
            <span className={titre}>{m[1]}</span>
            <span className={cache}>{m[2]}</span>
            {m[3]}
          </span>
          <span className={cache}>{m[4]}</span>
          <span className="mt-2.5 block">
            <span className={titre}>{m[5]}</span>
            <span className={cache}>{m[6]}</span>
            {m[7]}
          </span>
        </>
      ) : (
        note
      )}
    </div>
  );
}

function Carte({ img, terms, term, edition, setEdition }: { img: Image; terms: Term[]; term?: Term; edition: boolean; setEdition: (oui: boolean) => void }) {
  const router = useRouter();
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
  // Lieu et auteur peuvent passer à la ligne ; la licence, jamais.
  const credit = (
    <>
      {[img.lieu, img.auteur].filter(Boolean).join(" · ")}
      {(img.lieu || img.auteur) && img.licence ? " · " : ""}
      <span className="whitespace-nowrap">{img.licence}</span>
    </>
  );

  // Modification : un panneau à part. La photo entière pour redessiner le cadre, et juste à côté le rappel de la fiche,
  // le choix du terme et les deux boutons.
  if (edition)
    return (
      <li className="grid scroll-mb-20 gap-x-10 gap-y-5 border-b border-trait py-6 lg:grid-cols-[auto_minmax(0,24rem)] lg:justify-start" data-testid="carte" data-id={img.id}>
        <DessinRect
          src={imageSrc(img)}
          rect={rect}
          onChange={setRect}
          imgClassName="h-auto w-full lg:w-auto lg:max-w-full lg:max-h-[32rem]"
          zoneClassName="block lg:inline-block lg:max-w-full"
          aide={false}
        />
        <div>
          <p className="text-xs text-sourdine">Modifier la fiche</p>
          <p className="mi-etroit mt-1 text-2xl leading-tight">{term?.terme ?? `? ${img.termId}`}</p>
          <p className="mt-1.5 text-sm leading-snug text-sourdine">{credit}</p>
          <label className="etiquette mt-5" htmlFor={`terme-${img.id}`}>Terme</label>
          <select id={`terme-${img.id}`} className={select} value={termId} onChange={(e) => setTermId(e.target.value)}>
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
          <AideRect rect={rect} onChange={setRect} className="mt-3" />
          {erreur && <p className="mt-2 text-sm text-red-500">{erreur}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button disabled={occupe} onClick={() => appel("PATCH", { termId, rectangle: rect })} className="btn btn-plein justify-start">
              Enregistrer
            </button>
            <button
              disabled={occupe}
              onClick={() => {
                setEdition(false);
                setTermId(img.termId);
                setRect(img.rectangle);
              }}
              className="btn justify-start"
            >
              Annuler
            </button>
          </div>
        </div>
      </li>
    );

  const action = "lien min-h-11 disabled:no-underline";
  return (
    <li className={`${LIGNE} grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 border-b border-trait pb-2 pt-5 lg:py-4`} data-testid="carte" data-id={img.id}>
      <Vignette src={vignetteSrc(img)} rect={img.rectangle} alt={term?.terme ?? img.termId} imgClassName={refusee ? "opacity-40 grayscale" : ""} />
      <div className="min-w-0">
        <p className="mi-etroit -mt-0.5 text-[1.375rem] leading-[1.1]" data-testid="terme">{term?.terme ?? `? ${img.termId}`}</p>
        <p className="mt-1.5 text-sm text-sourdine">
          {term?.categorie}
          <span className="text-faible"> · {img.source === "perso" ? "Mes photos" : "Commons"}</span>
        </p>
        <p className={`mt-1 text-sm ${refusee ? "text-red-500" : "text-green-500"}`} data-testid="statut">{img.statut}</p>
      </div>
      <div className="col-span-2 mt-3 min-w-0 text-sm leading-snug text-sourdine lg:col-span-1 lg:mt-0">
        <p>{credit}</p>
        {img.note && (
          <details className="group">
            <summary className="lien inline-flex min-h-11 items-center lg:mt-1.5 lg:min-h-0">
              <span className="group-open:hidden">Voir la vérification</span>
              <span className="hidden group-open:inline">Masquer la vérification</span>
            </summary>
            <Note note={img.note} />
          </details>
        )}
        {erreur && <p className="mt-1 text-red-500">{erreur}</p>}
      </div>
      {/* Actions rares, donc discrètes : des liens. « Supprimer » est seul à droite, sur la marge. */}
      <div className="col-span-2 flex gap-x-6 lg:col-span-1 lg:-mt-2.5 lg:justify-end">
        <button
          disabled={occupe}
          onClick={() => {
            setTermId(img.termId);
            setRect(img.rectangle);
            setEdition(true);
          }}
          className={action}
        >
          Modifier
        </button>
        <button disabled={occupe} onClick={() => appel("PATCH", { statut: refusee ? "validée" : "refusée" })} className={action}>
          {refusee ? "Valider" : "Refuser"}
        </button>
        <button
          disabled={occupe}
          onClick={() => {
            if (confirm("Supprimer définitivement cette image ?")) appel("DELETE");
          }}
          className="lien-danger ml-auto min-h-11 lg:ml-4"
        >
          Supprimer
        </button>
      </div>
    </li>
  );
}

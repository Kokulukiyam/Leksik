"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DessinRect from "./DessinRect";
import { CATEGORIES, normaliser, termeIdentique, termeProche, type Rect, type Term } from "@/lib/shared";

const champ = "champ";

export default function Ajouter({ terms }: { terms: Term[] }) {
  const router = useRouter();
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [saisie, setSaisie] = useState("");
  const [focus, setFocus] = useState(false);
  const [definition, setDefinition] = useState("");
  const [categorie, setCategorie] = useState("");
  const [lieu, setLieu] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [cleFichier, setCleFichier] = useState(0);
  const [survol, setSurvol] = useState(false);

  useEffect(() => {
    if (!fichier) return;
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  const existant = termeIdentique(saisie, terms);
  const proche = existant ? undefined : termeProche(saisie, terms);
  const nouveau = saisie.trim() !== "" && !existant;

  const suggestions = useMemo(() => {
    const n = normaliser(saisie);
    if (!n) return [];
    return terms
      .filter((t) => normaliser(t.terme).includes(n))
      .sort((a, b) => Number(!normaliser(a.terme).startsWith(n)) - Number(!normaliser(b.terme).startsWith(n)) || a.terme.localeCompare(b.terme, "fr"))
      .slice(0, 8);
  }, [saisie, terms]);

  const pret = fichier && saisie.trim() && (existant || (definition.trim() && categorie));

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!pret || envoi) return;
    setEnvoi(true);
    setMessage(null);
    const form = new FormData();
    form.append("fichier", fichier);
    if (existant) form.append("termId", existant.id);
    else {
      form.append("terme", saisie.trim());
      form.append("definition", definition.trim());
      form.append("categorie", categorie);
    }
    if (rect) form.append("rectangle", JSON.stringify(rect));
    form.append("lieu", lieu);
    try {
      const rep = await fetch("/api/images", { method: "POST", body: form });
      const data = await rep.json();
      if (!rep.ok) throw new Error(data.erreur ?? "Erreur inconnue.");
      setMessage({ ok: true, texte: `Image ajoutée pour « ${existant?.terme ?? saisie.trim()} ».` });
      setFichier(null);
      setApercu(null);
      setRect(null);
      setSaisie("");
      setDefinition("");
      setCategorie("");
      setLieu("");
      setCleFichier((k) => k + 1);
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, texte: (err as Error).message });
    } finally {
      setEnvoi(false);
    }
  }

  function choisirFichier(f: File | null) {
    setFichier(f);
    setRect(null);
    setMessage(null);
  }

  const coin = "absolute h-5 w-5 border-accent transition-all duration-100";
  const ecart = survol ? "0.5rem" : "0.875rem";

  return (
    <form onSubmit={envoyer} className="py-6 sm:py-10">
      <h1 className="etroit text-5xl leading-[0.92] sm:text-[4rem]">Ajouter une image</h1>

      <div className="mt-6 grid gap-x-16 gap-y-6 border-t-2 border-encre pt-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <label className="etiquette" htmlFor="photo">Photo</label>
          <input
            key={cleFichier}
            id="photo"
            type="file"
            accept="image/*"
            onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
            className="peer sr-only"
          />
          {apercu ? (
            <>
              <div className="bg-scene p-2">
                <DessinRect src={apercu} rect={rect} onChange={setRect} />
              </div>
              <p className="mt-3 flex items-baseline justify-between gap-4 border-t border-trait pt-3 text-sm text-faible">
                <span className="truncate">{fichier?.name}</span>
                <label htmlFor="photo" className="shrink-0 text-encre underline decoration-trait-fort underline-offset-4 hover:decoration-encre">
                  Changer de photo
                </label>
              </p>
            </>
          ) : (
            // Zone de dépôt : quatre repères d'angle, comme un cadre en attente de son image.
            <label
              htmlFor="photo"
              data-testid="depot"
              onDragOver={(e) => {
                e.preventDefault();
                setSurvol(true);
              }}
              onDragLeave={() => setSurvol(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSurvol(false);
                const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
                if (f) choisirFichier(f);
              }}
              onMouseEnter={() => setSurvol(true)}
              onMouseLeave={() => setSurvol(false)}
              className={`relative flex min-h-56 flex-col justify-end p-7 transition-colors duration-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent lg:min-h-[26rem] ${survol ? "bg-relief" : "bg-surface"}`}
            >
              <span aria-hidden className={`${coin} border-l-2 border-t-2`} style={{ left: ecart, top: ecart }} />
              <span aria-hidden className={`${coin} border-r-2 border-t-2`} style={{ right: ecart, top: ecart }} />
              <span aria-hidden className={`${coin} border-b-2 border-l-2`} style={{ left: ecart, bottom: ecart }} />
              <span aria-hidden className={`${coin} border-b-2 border-r-2`} style={{ right: ecart, bottom: ecart }} />
              <span className="etroit text-3xl leading-none sm:text-[2.5rem]">Choisir une photo</span>
              <span className="mt-2 text-sm text-sourdine">
                <span className="hidden lg:inline">ou la déposer ici. </span>Vous pourrez ensuite encadrer l’élément à nommer.
              </span>
            </label>
          )}
        </div>

        <div className="grid content-start gap-5">
          <div className="relative">
            <label className="etiquette" htmlFor="objet">Objet</label>
            <input
              id="objet"
              className={champ}
              value={saisie}
              autoComplete="off"
              placeholder="ex. l’allège"
              onChange={(e) => setSaisie(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setTimeout(() => setFocus(false), 150)}
            />
            {focus && suggestions.length > 0 && !existant && (
              <ul className="absolute z-10 w-full border border-t-0 border-trait-fort bg-relief" data-testid="suggestions">
                {suggestions.map((t) => (
                  <li key={t.id} className="border-t border-trait first:border-t-0">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setSaisie(t.terme)}
                      className="flex min-h-11 w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left hover:bg-accent hover:text-black [&:hover>span]:text-black"
                    >
                      <span className="mi-etroit text-lg leading-tight">{t.terme}</span>
                      <span className="text-right text-xs text-faible">{t.categorie}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {existant && (
              <p className="mt-2 text-sm text-green-400" data-testid="terme-existant">
                Terme existant&nbsp;: {existant.terme} ({existant.categorie})
              </p>
            )}
            {proche && (
              <p className="mt-2 text-sm text-sourdine" data-testid="terme-proche">
                Vouliez-vous dire{" "}
                <button type="button" onClick={() => setSaisie(proche.terme)} className="mi-etroit text-base text-accent underline underline-offset-4">
                  {proche.terme}
                </button>
                &nbsp;?
              </p>
            )}
          </div>

          {nouveau && (
            <div className="grid gap-5" data-testid="nouveau-terme">
              <p className="text-sm leading-snug text-sourdine">
                <span className="mi-etroit text-accent">Nouveau terme.</span> Indiquez sa définition et sa catégorie.
              </p>
              <div>
                <label className="etiquette" htmlFor="definition">Définition</label>
                <textarea id="definition" rows={3} className={champ} value={definition} onChange={(e) => setDefinition(e.target.value)} />
              </div>
              <div>
                <label className="etiquette" htmlFor="categorie">Catégorie</label>
                <select id="categorie" className={champ} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  <option value="">Choisir…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="etiquette" htmlFor="lieu">Lieu <span className="text-faible">(facultatif)</span></label>
            <input id="lieu" className={champ} value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="ex. Plateau, Dakar" />
          </div>

          <button type="submit" disabled={!pret || envoi} className="btn btn-plein mt-1 min-h-14 justify-between text-lg">
            {envoi ? "Ajout…" : "Ajouter"}
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <path d="M12 4v16M4 12h16" />
            </svg>
          </button>

          {message && (
            <p role="status" className={`text-sm ${message.ok ? "text-green-400" : "text-red-400"}`}>
              {message.texte} {message.ok && <Link href="/gerer" className="text-encre underline underline-offset-4">Voir dans Gérer</Link>}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

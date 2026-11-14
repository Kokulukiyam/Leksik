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

  return (
    <form onSubmit={envoyer} className="mx-auto grid max-w-2xl gap-5 py-2 sm:py-6">
      <h1 className="font-serif text-4xl">Ajouter une image</h1>

      <div>
        <label className="mb-2 block font-medium" htmlFor="photo">Photo</label>
        <input
          key={cleFichier}
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            setFichier(e.target.files?.[0] ?? null);
            setRect(null);
            setMessage(null);
          }}
          className="block w-full cursor-pointer rounded-xl border border-dashed border-trait bg-surface p-3 text-sm text-sourdine transition-colors file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-encre file:px-4 file:py-2 file:font-medium file:text-fond hover:border-sourdine"
        />
        {apercu && (
          <div className="mt-3">
            <DessinRect src={apercu} rect={rect} onChange={setRect} />
          </div>
        )}
      </div>

      <div className="relative">
        <label className="mb-2 block font-medium" htmlFor="objet">Objet</label>
        <input
          id="objet"
          className={champ}
          value={saisie}
          autoComplete="off"
          placeholder="ex. l'allège"
          onChange={(e) => setSaisie(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
        />
        {focus && suggestions.length > 0 && !existant && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-trait bg-relief shadow-xl" data-testid="suggestions">
            {suggestions.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSaisie(t.terme)}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left hover:bg-trait"
                >
                  <span>{t.terme}</span>
                  <span className="text-right text-xs text-faible">{t.categorie}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {existant && (
          <p className="mt-2 text-sm text-green-400" data-testid="terme-existant">
            Terme existant : {existant.terme} ({existant.categorie})
          </p>
        )}
        {proche && (
          <p className="mt-2 text-sm text-accent" data-testid="terme-proche">
            Vouliez-vous dire{" "}
            <button type="button" onClick={() => setSaisie(proche.terme)} className="font-semibold underline">
              {proche.terme}
            </button>{" "}
            ?
          </p>
        )}
      </div>

      {nouveau && (
        <div className="panneau grid gap-4 p-4" data-testid="nouveau-terme">
          <p className="text-sm text-sourdine">Nouveau terme : indiquez sa définition et sa catégorie.</p>
          <div>
            <label className="mb-2 block font-medium" htmlFor="definition">Définition</label>
            <textarea id="definition" rows={2} className={champ} value={definition} onChange={(e) => setDefinition(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block font-medium" htmlFor="categorie">Catégorie</label>
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
        <label className="mb-2 block font-medium" htmlFor="lieu">Lieu <span className="font-normal text-faible">(facultatif)</span></label>
        <input id="lieu" className={champ} value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="ex. Plateau, Dakar" />
      </div>

      <button
        type="submit"
        disabled={!pret || envoi}
        className="btn btn-plein px-6 py-3 text-lg"
      >
        {envoi ? "Ajout…" : "Ajouter"}
      </button>

      {message && (
        <p role="status" className={message.ok ? "text-green-400" : "text-red-400"}>
          {message.texte} {message.ok && <Link href="/gerer" className="underline">Voir dans Gérer</Link>}
        </p>
      )}
    </form>
  );
}

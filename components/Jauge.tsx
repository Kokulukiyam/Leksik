import type { Etat } from "@/lib/progres";

/**
 * Échelle de la progression : maîtrisés (plein), en cours (hachuré), à revoir (rouge), le reste jamais vu (vide).
 * `fine` : petite barre des lignes de tableau, où une hachure serait illisible (en cours = vert atténué).
 */
export default function Jauge({ bilan, fine = false, className = "h-2.5" }: { bilan: Record<Etat, number> & { total: number }; fine?: boolean; className?: string }) {
  const part = (n: number) => `${bilan.total ? (n / bilan.total) * 100 : 0}%`;
  return (
    <div className={`flex bg-relief ${className}`} aria-hidden>
      <div className="poche-maitrise" style={{ width: part(bilan.maitrise) }} />
      <div className={fine ? "poche-en-cours-simple" : "poche-en-cours"} style={{ width: part(bilan["en-cours"]) }} />
      <div className="poche-a-revoir" style={{ width: part(bilan["a-revoir"]) }} />
    </div>
  );
}

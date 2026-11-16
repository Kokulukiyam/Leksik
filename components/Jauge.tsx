import type { Etat } from "@/lib/progres";

/** Échelle de la progression : maîtrisés (plein), en cours (hachuré), à revoir (rouge), le reste jamais vu (vide). Même code partout. */
export default function Jauge({ bilan, className = "h-3" }: { bilan: Record<Etat, number> & { total: number }; className?: string }) {
  const part = (n: number) => `${bilan.total ? (n / bilan.total) * 100 : 0}%`;
  return (
    <div className={`flex bg-relief ${className}`} aria-hidden>
      <div className="poche-maitrise" style={{ width: part(bilan.maitrise) }} />
      <div className="poche-en-cours" style={{ width: part(bilan["en-cours"]) }} />
      <div className="poche-a-revoir" style={{ width: part(bilan["a-revoir"]) }} />
    </div>
  );
}

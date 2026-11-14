import type { Etat } from "@/lib/progres";

/** Échelle graphique de la progression : maîtrisés (vert), en cours (jaune), à revoir (rouge), le reste jamais vu. */
export default function Jauge({ bilan, className = "" }: { bilan: Record<Etat, number> & { total: number }; className?: string }) {
  const part = (n: number) => `${bilan.total ? (n / bilan.total) * 100 : 0}%`;
  return (
    <div className={`flex h-2 gap-px bg-trait ${className}`} aria-hidden>
      <div className="bg-green-500" style={{ width: part(bilan.maitrise) }} />
      <div className="bg-accent" style={{ width: part(bilan["en-cours"]) }} />
      <div className="bg-red-500" style={{ width: part(bilan["a-revoir"]) }} />
    </div>
  );
}

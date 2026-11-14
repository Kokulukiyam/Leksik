import type { Etat } from "@/lib/progres";

/** Barre de progression : maîtrisés (vert), en cours (ocre), à revoir (rouge), le reste jamais vu. */
export default function Jauge({ bilan, className = "" }: { bilan: Record<Etat, number> & { total: number }; className?: string }) {
  const part = (n: number) => `${bilan.total ? (n / bilan.total) * 100 : 0}%`;
  return (
    <div className={`flex h-1.5 overflow-hidden rounded-full bg-relief ${className}`} aria-hidden>
      <div className="bg-green-500" style={{ width: part(bilan.maitrise) }} />
      <div className="bg-accent" style={{ width: part(bilan["en-cours"]) }} />
      <div className="bg-red-500" style={{ width: part(bilan["a-revoir"]) }} />
    </div>
  );
}

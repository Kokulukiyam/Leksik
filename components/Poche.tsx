import type { Etat } from "@/lib/progres";

/** Carré de légende d'un état : plein (maîtrisé, à revoir), hachuré (en cours), vide (jamais vu). */
export default function Poche({ etat, className = "" }: { etat: Etat; className?: string }) {
  return <span aria-hidden className={`inline-block h-[0.6875rem] w-[0.6875rem] shrink-0 poche-${etat} ${className}`} />;
}

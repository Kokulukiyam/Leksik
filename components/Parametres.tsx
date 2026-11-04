"use client";

import { useEffect, useState } from "react";
import { CHOIX, PAR_DEFAUT, ecrireParametres, lireParametres, type Parametres as P } from "@/lib/parametres";
import { jouables } from "@/lib/shared";
import type { Image, Term } from "@/lib/shared";

function Groupe<T extends string | number | boolean>({
  titre,
  aide,
  nom,
  valeur,
  options,
  onChange,
}: {
  titre: string;
  aide?: string;
  nom: string;
  valeur: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mb-6" data-testid={`param-${nom}`}>
      <legend className="mb-1 font-medium">{titre}</legend>
      {aide && <p className="mb-2 text-sm text-neutral-400">{aide}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={o.v === valeur}
            onClick={() => onChange(o.v)}
            className={`rounded-lg border-2 px-4 py-2 ${
              o.v === valeur ? "border-white bg-white font-medium text-black" : "border-neutral-700 bg-neutral-900 hover:border-neutral-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function Parametres({ terms, images }: { terms: Term[]; images: Image[] }) {
  const [p, setP] = useState<P | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du localStorage au montage
  useEffect(() => setP(lireParametres()), []);
  if (!p) return null;

  function maj(modif: Partial<P>) {
    const n = { ...p!, ...modif };
    setP(n);
    ecrireParametres(n);
  }

  const n = jouables(images, terms, p).length;

  return (
    <div className="mx-auto max-w-xl py-4">
      <h1 className="mb-1 text-2xl font-semibold">Paramètres</h1>
      <p className="mb-6 text-neutral-400">Enregistrés dans ce navigateur, appliqués à la prochaine partie.</p>

      <Groupe
        titre="Images par partie"
        nom="images"
        valeur={p.imagesParPartie}
        options={CHOIX.imagesParPartie.map((v) => ({ v, label: String(v) }))}
        onChange={(v) => maj({ imagesParPartie: v })}
      />
      <Groupe
        titre="Mots proposés par image"
        nom="propositions"
        valeur={p.propositions}
        options={CHOIX.propositions.map((v) => ({ v, label: String(v) }))}
        onChange={(v) => maj({ propositions: v })}
      />
      <Groupe
        titre="Termes joués"
        aide="Selon la fréquence à laquelle on les croise sur un chantier. Mes propres termes sont toujours joués."
        nom="frequence"
        valeur={p.frequence}
        options={[
          { v: 1 as const, label: "Les plus courants" },
          { v: 2 as const, label: "Courants et fréquents" },
          { v: 3 as const, label: "Tous" },
        ]}
        onChange={(v) => maj({ frequence: v })}
      />
      <Groupe
        titre="Images jouées"
        nom="sources"
        valeur={p.sources}
        options={[
          { v: "toutes" as const, label: "Toutes" },
          { v: "commons" as const, label: "Commons" },
          { v: "perso" as const, label: "Mes photos" },
        ]}
        onChange={(v) => maj({ sources: v })}
      />
      <Groupe
        titre="Mauvaises réponses"
        aide="Tirées de la même catégorie que la bonne réponse (plus difficile), ou de toutes les catégories."
        nom="mauvaises"
        valeur={p.mauvaisesReponses}
        options={[
          { v: "categorie" as const, label: "Même catégorie" },
          { v: "toutes" as const, label: "Toutes catégories" },
        ]}
        onChange={(v) => maj({ mauvaisesReponses: v })}
      />
      <Groupe
        titre="Après une bonne réponse"
        nom="suivant"
        valeur={p.suivantAuto}
        options={[
          { v: false, label: "J'appuie sur « Suivant »" },
          { v: true, label: "Image suivante automatique" },
        ]}
        onChange={(v) => maj({ suivantAuto: v })}
      />

      <p className="mb-4 text-sm text-neutral-300" data-testid="param-compte">
        Avec ces réglages : {n} image{n > 1 ? "s" : ""} jouable{n > 1 ? "s" : ""}.
      </p>
      <button
        type="button"
        onClick={() => maj(PAR_DEFAUT)}
        className="rounded-lg border border-neutral-600 px-5 py-3 hover:border-neutral-300"
      >
        Réglages par défaut
      </button>
    </div>
  );
}

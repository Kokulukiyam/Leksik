"use client";

import { useEffect, useState } from "react";
import { CHOIX, PAR_DEFAUT, ecrireParametres, lireParametres, type Parametres as P } from "@/lib/parametres";
import { jouables } from "@/lib/shared";
import { bilan, effacerProgres, lireProgres, type Progres } from "@/lib/progres";
import Jauge from "./Jauge";
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
    <div role="group" aria-label={titre} className="border-t border-trait py-5" data-testid={`param-${nom}`}>
      <p className="mb-1 font-medium">{titre}</p>
      {aide && <p className="mb-2 text-sm text-sourdine">{aide}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={o.v === valeur}
            onClick={() => onChange(o.v)}
            className={`rounded-lg border px-4 py-2 transition-colors ${
              o.v === valeur ? "border-encre bg-encre font-medium text-fond" : "border-trait bg-surface hover:border-sourdine"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Parametres({ terms, images }: { terms: Term[]; images: Image[] }) {
  const [p, setP] = useState<P | null>(null);
  const [progres, setProgres] = useState<Progres>({});

  // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du localStorage au montage
  useEffect(() => {
    setP(lireParametres());
    setProgres(lireProgres());
  }, []);
  if (!p) return null;

  function maj(modif: Partial<P>) {
    const n = { ...p!, ...modif };
    setP(n);
    ecrireParametres(n);
  }

  const n = jouables(images, terms, p).length;
  const suivi = bilan(new Set(jouables(images, terms, { sources: "toutes", frequence: 3 }).map((i) => i.termId)), progres);
  const vus = suivi.total - suivi.nouveau;

  return (
    <div className="mx-auto max-w-xl py-2 sm:py-6">
      <h1 className="mb-2 font-serif text-4xl">Paramètres</h1>
      <p className="mb-6 text-sourdine">Enregistrés dans ce navigateur, appliqués à la prochaine partie.</p>

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
        titre="Tirage des images"
        aide="« Mots à apprendre » fait revenir les mots ratés et passe les mots maîtrisés moins souvent."
        nom="tirage"
        valeur={p.tirage}
        options={[
          { v: "adapte" as const, label: "Mots à apprendre d'abord" },
          { v: "hasard" as const, label: "Au hasard" },
        ]}
        onChange={(v) => maj({ tirage: v })}
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-trait py-5">
        <p className="text-sm text-encre/85" data-testid="param-compte">
          Avec ces réglages : {n} image{n > 1 ? "s" : ""} jouable{n > 1 ? "s" : ""}.
        </p>
        <button type="button" onClick={() => maj(PAR_DEFAUT)} className="btn">
          Réglages par défaut
        </button>
      </div>

      <section className="border-t border-trait py-5" data-testid="param-progression">
        <h2 className="mb-1 font-medium">Ma progression</h2>
        <p className="mb-3 text-sm text-sourdine">
          {vus} mot{vus > 1 ? "s" : ""} vu{vus > 1 ? "s" : ""} sur {suivi.total}, dont {suivi.maitrise} maîtrisé{suivi.maitrise > 1 ? "s" : ""} (deux bonnes
          réponses d&apos;affilée) et {suivi["a-revoir"]} à revoir.
        </p>
        <Jauge bilan={suivi} className="mb-4" />
        <button
          type="button"
          disabled={vus === 0}
          onClick={() => {
            if (!confirm("Effacer toute ma progression ?")) return;
            effacerProgres();
            setProgres({});
          }}
          className="btn btn-danger"
        >
          Effacer ma progression
        </button>
      </section>
    </div>
  );
}

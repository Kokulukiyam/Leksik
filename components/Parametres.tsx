"use client";

import { useEffect, useState } from "react";
import { CHOIX, PAR_DEFAUT, ecrireParametres, lireParametres, type Parametres as P } from "@/lib/parametres";
import { jouables } from "@/lib/shared";
import { bilan, effacerProgres, lireProgres, type Progres } from "@/lib/progres";
import Jauge from "./Jauge";
import Nombre from "./Nombre";
import type { Image, Term } from "@/lib/shared";

const RANGEE = "border-b border-trait py-5 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-16";

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
  // Deux options, ou des libellés courts : côte à côte. Trois libellés longs : empilés sur téléphone.
  const cote = options.length === 2 || options.every((o) => o.label.length <= 10);
  return (
    <div role="group" aria-label={titre} className={RANGEE} data-testid={`param-${nom}`}>
      <div>
        <p className="mi-etroit text-xl leading-tight">{titre}</p>
        {aide && <p className="mt-1.5 max-w-[46ch] text-sm leading-snug text-sourdine">{aide}</p>}
      </div>
      <div className={`mt-3 grid auto-cols-fr lg:mt-0 lg:self-start ${cote ? "grid-flow-col" : "sm:grid-flow-col"}`}>
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            aria-pressed={o.v === valeur}
            onClick={() => onChange(o.v)}
            className={`mi-etroit relative min-h-12 border px-3 py-2 text-left leading-tight transition-colors duration-100 ${cote ? "-ml-px first:ml-0" : "-mt-px first:mt-0 sm:-ml-px sm:mt-0 sm:first:ml-0"} ${
              o.v === valeur ? "z-[1] border-encre bg-encre text-fond" : "border-trait-fort text-sourdine hover:bg-relief hover:text-encre"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 sm:mt-10">
      <h2 className="tete-tableau">{titre}</h2>
      {children}
    </section>
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
    <div className="py-5 sm:py-10">
      <h1 className="etroit text-[2rem] leading-none sm:text-[3.75rem] sm:leading-[0.95]">Paramètres</h1>
      <p className="mt-2 text-sm text-sourdine sm:mt-3 sm:text-base">Enregistrés dans ce navigateur, appliqués à la prochaine partie.</p>

      <Section titre="La partie">
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
          titre="Après une bonne réponse"
          nom="suivant"
          valeur={p.suivantAuto}
          options={[
            { v: false, label: "J’appuie sur «\u00a0Suivant\u00a0»" },
            { v: true, label: "Image suivante automatique" },
          ]}
          onChange={(v) => maj({ suivantAuto: v })}
        />
      </Section>

      <Section titre="Les mots et les images">
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
        <div className={`${RANGEE} items-center`}>
          <p data-testid="param-compte">
            Avec ces réglages&nbsp;:{" "}
            <span className="mi-etroit text-xl tabular-nums">
              <Nombre n={n} /> image{n > 1 ? "s" : ""} jouable{n > 1 ? "s" : ""}
            </span>
            .
          </p>
        </div>
      </Section>

      <Section titre="Le tirage">
        <Groupe
          titre="Tirage des images"
          aide="«\u00a0Mots à apprendre\u00a0» fait revenir les mots ratés et passe les mots maîtrisés moins souvent."
          nom="tirage"
          valeur={p.tirage}
          options={[
            { v: "adapte" as const, label: "Mots à apprendre d’abord" },
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
      </Section>

      <Section titre="Remise à zéro">
        <div className={`${RANGEE} items-center`}>
          <p className="mi-etroit text-xl leading-tight">Mes réglages</p>
          <div className="mt-3 lg:mt-0">
            <button type="button" onClick={() => maj(PAR_DEFAUT)} className="btn w-full justify-start sm:w-auto">
              Réglages par défaut
            </button>
          </div>
        </div>
        <div className={RANGEE} data-testid="param-progression">
          <div>
            <p className="mi-etroit text-xl leading-tight">Ma progression</p>
            <p className="mt-1.5 max-w-[46ch] text-sm leading-snug text-sourdine">
              {vus} mot{vus > 1 ? "s" : ""} vu{vus > 1 ? "s" : ""} sur {suivi.total}, dont {suivi.maitrise} maîtrisé{suivi.maitrise > 1 ? "s" : ""} (deux bonnes
              réponses d’affilée) et {suivi["a-revoir"]} à revoir.
            </p>
          </div>
          <div className="mt-3 lg:mt-0">
            <Jauge bilan={suivi} className="mb-3 h-3" />
            <button
              type="button"
              disabled={vus === 0}
              onClick={() => {
                if (!confirm("Effacer toute ma progression ?")) return;
                effacerProgres();
                setProgres({});
              }}
              className="btn btn-danger w-full justify-start sm:w-auto"
            >
              Effacer ma progression
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

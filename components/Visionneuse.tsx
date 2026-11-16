"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Figure from "./Figure";
import type { Rect } from "@/lib/shared";

export type Vue = { src: string; rect: Rect | null; legende?: string; licence?: string; lien?: string };

const ZOOM = 2.5;

/**
 * Image en plein écran. À l'ouverture la photo est entière, ajustée à l'écran, avec son cadre entier.
 * Un toucher sur la photo (ou « Agrandir ») l'agrandit, centrée sur l'élément encadré ; on la fait alors défiler.
 * Agrandie, la photo n'a plus de cadre : on regarde le détail lui-même.
 * Les commandes sont des mots dans la barre du bas, jamais sur la photo. Échap, « Fermer » ou un clic à côté ferment.
 */
export default function Visionneuse({ vues, depart = 0, onFermer }: { vues: Vue[]; depart?: number; onFermer: () => void }) {
  const [i, setI] = useState(depart);
  const vue = vues[i];
  const plusieurs = vues.length > 1;
  const zone = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ l: 0, h: 0 });
  const [format, setFormat] = useState<{ src: string; a: number } | null>(null);
  const [agrandie, setAgrandie] = useState(false);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
      else if (e.key === "ArrowRight") aller(1);
      else if (e.key === "ArrowLeft") aller(-1);
    };
    window.addEventListener("keydown", touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = avant;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `aller` ne dépend que de vues.length
  }, [onFermer, vues.length]);

  // Place disponible pour la photo (mise à jour si l'écran tourne ou change de taille).
  useLayoutEffect(() => {
    const z = zone.current;
    if (!z) return;
    const mesurer = () => setPlace((p) => (p.l === z.clientWidth && p.h === z.clientHeight ? p : { l: z.clientWidth, h: z.clientHeight }));
    mesurer();
    const o = new ResizeObserver(mesurer);
    o.observe(z);
    return () => o.disconnect();
  }, []);

  function aller(pas: number) {
    setAgrandie(false);
    setI((k) => (k + pas + vues.length) % vues.length);
  }

  // Largeur de la photo : ajustée à la place disponible (marge comprise), ou agrandie.
  const marge = place.l < 640 ? 12 : 24;
  const a = format?.src === vue.src ? format.a : null;
  const ajustee = a && place.l ? Math.max(1, Math.min(place.l - 2 * marge, (place.h - 2 * marge) * a)) : null;
  const largeur = ajustee ? Math.round(ajustee * (agrandie ? ZOOM : 1)) : null;

  // En agrandissant, on amène le centre du cadre (ou de la photo) au centre de l'écran.
  useLayoutEffect(() => {
    const z = zone.current;
    if (!z || !agrandie || !largeur || !a) return;
    const cx = vue.rect ? vue.rect.x + vue.rect.largeur / 2 : 0.5;
    const cy = vue.rect ? vue.rect.y + vue.rect.hauteur / 2 : 0.5;
    z.scrollLeft = marge + cx * largeur - z.clientWidth / 2;
    z.scrollTop = marge + (cy * largeur) / a - z.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement au changement d'échelle
  }, [agrandie, vue.src]);

  // Même dessin que le reste de l'app : des mots soulignés et la flèche des boutons. Cibles de 48 px.
  const bouton = "flex h-12 shrink-0 items-center justify-center text-encre transition-colors duration-100 hover:bg-relief";
  const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square" as const };

  return (
    <div role="dialog" aria-modal="true" aria-label="Image agrandie" data-testid="visionneuse" className="fixed inset-0 z-50 flex flex-col bg-fond">
      <div
        ref={zone}
        className={`flex min-h-0 flex-1 overscroll-contain ${agrandie ? "overflow-auto" : "overflow-hidden"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) onFermer();
        }}
      >
        <div
          className={`m-auto shrink-0 ${agrandie ? "[&>div]:cursor-zoom-out" : ""}`}
          style={{ padding: marge }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onFermer();
          }}
        >
          <Figure
            key={vue.src}
            src={vue.src}
            rect={agrandie ? null : vue.rect}
            alt=""
            imgClassName="h-auto max-w-none"
            imgStyle={largeur ? { width: largeur } : { maxWidth: Math.max(1, place.l - 2 * marge), maxHeight: Math.max(1, place.h - 2 * marge), visibility: place.l ? undefined : "hidden" }}
            onLoad={(img) => setFormat((f) => (f?.src === vue.src ? f : { src: vue.src, a: img.naturalWidth / img.naturalHeight }))}
            onClick={() => setAgrandie((z) => !z)}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 border-t border-trait px-4 pb-[env(safe-area-inset-bottom)] sm:px-6">
        <p className="min-w-0 py-3.5 text-sm leading-snug text-sourdine">
          {vue.legende}
          {vue.legende && (vue.licence || vue.lien) ? " · " : ""}
          {/* La licence et sa source ne se séparent pas. */}
          <span className="whitespace-nowrap">
            {vue.licence}
            {vue.lien && (
              <>
                {vue.licence && " · "}
                <a href={vue.lien} target="_blank" rel="noreferrer" className="lien">
                  source
                </a>
              </>
            )}
          </span>
        </p>
        <div className="mi-etroit -mx-3 ml-auto flex items-center">
          {plusieurs && (
            <>
              <button type="button" aria-label="Image précédente" className={`${bouton} w-12`} onClick={() => aller(-1)}>
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" {...trait}>
                  <path d="M20 12H4M11 5l-7 7 7 7" />
                </svg>
              </button>
              <span className="min-w-12 text-center tabular-nums">{`${i + 1} / ${vues.length}`}</span>
              <button type="button" aria-label="Image suivante" className={`${bouton} mr-3 w-12`} onClick={() => aller(1)}>
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" {...trait}>
                  <path d="M4 12h16M13 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          <button type="button" aria-pressed={agrandie} className={`${bouton} px-3`} onClick={() => setAgrandie(!agrandie)}>
            <span className="lien">{agrandie ? "Réduire" : "Agrandir"}</span>
          </button>
          <button type="button" className={`${bouton} px-3`} onClick={onFermer}>
            <span className="lien">Fermer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

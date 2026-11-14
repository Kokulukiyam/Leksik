"use client";

import { useEffect, useRef, useState } from "react";
import Figure from "./Figure";
import type { Rect } from "@/lib/shared";

export type Vue = { src: string; rect: Rect | null; legende?: string; lien?: string };

/**
 * Image en plein écran ; flèches (ou ← →) s'il y en a plusieurs, Échap ou un clic pour fermer.
 * Sur téléphone, la photo prend toute la hauteur et défile en largeur : on ouvre centré sur le cadre jaune.
 */
export default function Visionneuse({ vues, depart = 0, onFermer }: { vues: Vue[]; depart?: number; onFermer: () => void }) {
  const [i, setI] = useState(depart);
  const vue = vues[i];
  const plusieurs = vues.length > 1;
  const zone = useRef<HTMLDivElement>(null);
  const centree = useRef("");
  const [deborde, setDeborde] = useState(false);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
      else if (e.key === "ArrowRight") setI((k) => (k + 1) % vues.length);
      else if (e.key === "ArrowLeft") setI((k) => (k - 1 + vues.length) % vues.length);
    };
    window.addEventListener("keydown", touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = avant;
    };
  }, [onFermer, vues.length]);

  // Une fois la photo chargée : si elle dépasse en largeur, on la fait défiler jusqu'au centre du cadre.
  function centrer(img: HTMLImageElement) {
    const z = zone.current;
    if (!z || centree.current === vue.src) return;
    centree.current = vue.src;
    const cx = vue.rect ? vue.rect.x + vue.rect.largeur / 2 : 0.5;
    z.scrollLeft = img.offsetLeft + cx * img.offsetWidth - z.clientWidth / 2;
    setDeborde(z.scrollWidth > z.clientWidth + 1);
  }

  const bouton = "absolute flex h-12 w-12 items-center justify-center bg-fond/80 text-encre transition-colors duration-100 hover:bg-accent hover:text-black";
  const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square" as const };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image agrandie"
      data-testid="visionneuse"
      className="fixed inset-0 z-50 flex cursor-zoom-out flex-col bg-fond"
      onClick={onFermer}
    >
      <div ref={zone} className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-contain px-3 py-3 sm:px-6 sm:py-5">
        <div className="m-auto shrink-0">
          <Figure
            key={vue.src}
            src={vue.src}
            rect={vue.rect}
            alt=""
            imgClassName="h-[calc(100dvh-5.5rem)] w-auto max-w-none sm:h-auto sm:max-h-[calc(100dvh-6.5rem)] sm:max-w-[calc(100vw-3rem)]"
            onLoad={centrer}
          />
        </div>
      </div>
      <p className="flex h-14 shrink-0 items-center gap-4 border-t border-trait px-4 text-xs text-sourdine sm:px-6">
        {plusieurs && <span className="mi-etroit shrink-0 text-base tabular-nums text-encre">{`${i + 1} / ${vues.length}`}</span>}
        <span className="min-w-0 truncate">
          {vue.legende}
          {deborde && <span className="block truncate text-faible">Faire glisser pour voir toute la photo</span>}
        </span>
        {vue.lien && (
          <a
            href={vue.lien}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="lien -my-3 ml-auto shrink-0 cursor-pointer py-3 text-sm"
          >
            source
          </a>
        )}
      </p>
      <button type="button" aria-label="Fermer" className={`${bouton} right-0 top-0`}>
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" {...trait}>
          <path d="M4 4l16 16M20 4L4 20" />
        </svg>
      </button>
      {plusieurs && (
        <>
          <button
            type="button"
            aria-label="Image précédente"
            className={`${bouton} left-0 top-[calc(50%-1.75rem)] -translate-y-1/2`}
            onClick={(e) => {
              e.stopPropagation();
              setI((i - 1 + vues.length) % vues.length);
            }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" {...trait}>
              <path d="M15 4l-8 8 8 8" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            className={`${bouton} right-0 top-[calc(50%-1.75rem)] -translate-y-1/2`}
            onClick={(e) => {
              e.stopPropagation();
              setI((i + 1) % vues.length);
            }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" {...trait}>
              <path d="M9 4l8 8-8 8" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

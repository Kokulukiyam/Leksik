"use client";

import { useEffect, useState } from "react";
import Figure from "./Figure";
import type { Rect } from "@/lib/shared";

export type Vue = { src: string; rect: Rect | null; legende?: string };

/** Image en plein écran ; flèches (ou ← →) s'il y en a plusieurs, Échap ou un clic pour fermer. */
export default function Visionneuse({ vues, depart = 0, onFermer }: { vues: Vue[]; depart?: number; onFermer: () => void }) {
  const [i, setI] = useState(depart);
  const vue = vues[i];
  const plusieurs = vues.length > 1;

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

  const bouton = "absolute flex h-12 w-12 items-center justify-center bg-black/70 text-white transition-colors duration-100 hover:bg-accent hover:text-black";
  const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square" as const };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image agrandie"
      data-testid="visionneuse"
      className="fixed inset-0 z-50 flex cursor-zoom-out flex-col bg-scene"
      onClick={onFermer}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Figure key={vue.src} src={vue.src} rect={vue.rect} alt="" imgClassName="max-h-[calc(100dvh-3rem)]" />
      </div>
      <p className="flex h-12 shrink-0 items-center gap-4 border-t border-trait px-4 text-xs text-sourdine sm:px-6">
        {plusieurs && <span className="mi-etroit text-base tabular-nums text-encre">{`${i + 1} / ${vues.length}`}</span>}
        <span className="truncate">{vue.legende}</span>
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
            className={`${bouton} left-0 top-1/2 -translate-y-1/2`}
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
            className={`${bouton} right-0 top-1/2 -translate-y-1/2`}
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

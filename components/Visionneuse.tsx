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

  const fleche = "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-2xl text-white hover:bg-black/90";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image agrandie"
      data-testid="visionneuse"
      className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center bg-black/95 p-2"
      onClick={onFermer}
    >
      <Figure key={vue.src} src={vue.src} rect={vue.rect} alt="" imgClassName="max-h-[88dvh]" />
      <p className="mt-2 px-10 text-center text-xs text-sourdine">
        {plusieurs && `${i + 1} / ${vues.length}`}
        {plusieurs && vue.legende && " · "}
        {vue.legende}
      </p>
      <button type="button" aria-label="Fermer" className="absolute right-2 top-2 rounded-full bg-black/60 px-3.5 py-2 text-xl text-white hover:bg-black/90">
        ×
      </button>
      {plusieurs && (
        <>
          <button
            type="button"
            aria-label="Image précédente"
            className={`${fleche} left-2`}
            onClick={(e) => {
              e.stopPropagation();
              setI((i - 1 + vues.length) % vues.length);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            className={`${fleche} right-2`}
            onClick={(e) => {
              e.stopPropagation();
              setI((i + 1) % vues.length);
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

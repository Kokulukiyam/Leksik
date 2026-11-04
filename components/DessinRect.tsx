"use client";

import { useRef, useState } from "react";
import type { Rect } from "@/lib/shared";

/** Image sur laquelle on dessine un rectangle en glissant (souris ou doigt). */
export default function DessinRect({
  src,
  rect,
  onChange,
  imgClassName = "max-h-[60dvh]",
}: {
  src: string;
  rect: Rect | null;
  onChange: (r: Rect | null) => void;
  imgClassName?: string;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const [enCours, setEnCours] = useState<Rect | null>(null);

  function point(e: React.PointerEvent) {
    const b = zone.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp((e.clientX - b.left) / b.width), y: clamp((e.clientY - b.top) / b.height) };
  }

  function versRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
    const r = (v: number) => Math.round(v * 1000) / 1000;
    return { x: r(Math.min(a.x, b.x)), y: r(Math.min(a.y, b.y)), largeur: r(Math.abs(a.x - b.x)), hauteur: r(Math.abs(a.y - b.y)) };
  }

  const affiche = enCours ?? rect;

  return (
    <div>
      <div
        ref={zone}
        data-testid="zone-rect"
        className="relative inline-block max-w-full cursor-crosshair touch-none select-none align-top"
        onPointerDown={(e) => {
          e.preventDefault();
          zone.current!.setPointerCapture(e.pointerId);
          depart.current = point(e);
          setEnCours(versRect(depart.current, depart.current));
        }}
        onPointerMove={(e) => {
          if (depart.current) setEnCours(versRect(depart.current, point(e)));
        }}
        onPointerUp={(e) => {
          if (!depart.current) return;
          const r = versRect(depart.current, point(e));
          depart.current = null;
          setEnCours(null);
          // Un simple clic (rectangle minuscule) ne remplace pas le rectangle existant.
          if (r.largeur > 0.02 && r.hauteur > 0.02) onChange(r);
        }}
        onPointerCancel={() => {
          depart.current = null;
          setEnCours(null);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className={`block h-auto w-auto max-w-full ${imgClassName}`} />
        {affiche && (
          <div
            className="cadre"
            data-testid="cadre"
            style={{
              left: `${affiche.x * 100}%`,
              top: `${affiche.y * 100}%`,
              width: `${affiche.largeur * 100}%`,
              height: `${affiche.hauteur * 100}%`,
            }}
          />
        )}
      </div>
      <div className="mt-1 flex items-center gap-3 text-sm text-neutral-400">
        <span>Glissez sur l&apos;image pour encadrer l&apos;élément (facultatif).</span>
        {rect && (
          <button type="button" onClick={() => onChange(null)} className="text-neutral-200 underline">
            Effacer le rectangle
          </button>
        )}
      </div>
    </div>
  );
}

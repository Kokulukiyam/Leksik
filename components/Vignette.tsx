"use client";

import { useCallback, useState } from "react";
import type { Rect } from "@/lib/shared";

const FORMAT = 4 / 3;
const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Vignette au format 4:3, la même partout (accueil, fin de partie, Gérer, Lexique) : la photo remplit toujours le cadre,
 * recadrée autour du rectangle d'annotation s'il existe. Le cadre jaune est replacé dans le recadrage ;
 * s'il déborde (élément plus large que la vignette), il est ramené au bord de la vignette.
 * `grande` : cadre en graisse « plein format ». `rappel` : ligne de rappel du cadre vers la légende placée dessous.
 */
export default function Vignette({
  src,
  rect,
  alt,
  className = "",
  imgClassName = "",
  grande = false,
  rappel = false,
}: {
  src: string;
  rect: Rect | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  grande?: boolean;
  rappel?: boolean;
}) {
  // Proportions de la photo, connues une fois chargée.
  const [a, setA] = useState<number | null>(null);
  const mesurer = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) setA(img.naturalWidth / img.naturalHeight);
  }, []);

  // Unités : hauteur de la vignette = 1, largeur = FORMAT. La photo couvre la vignette (l × h), décalée de (dx, dy).
  let place: React.CSSProperties = { left: 0, top: 0, width: "100%", height: "100%" };
  let cadre: React.CSSProperties = { visibility: "hidden" };
  let gauche = 0;
  let bas = 0;
  if (a) {
    const h = Math.max(1, FORMAT / a);
    const l = h * a;
    const cx = rect ? rect.x + rect.largeur / 2 : 0.5;
    const cy = rect ? rect.y + rect.hauteur / 2 : 0.5;
    const dx = borner(cx * l - FORMAT / 2, 0, l - FORMAT);
    const dy = borner(cy * h - 0.5, 0, h - 1);
    place = { left: `${(-dx / FORMAT) * 100}%`, top: `${-dy * 100}%`, width: `${(l / FORMAT) * 100}%`, height: `${h * 100}%` };
    if (rect) {
      const marge = 0.025;
      const g = borner(rect.x * l - dx, marge, FORMAT - marge);
      const d = borner((rect.x + rect.largeur) * l - dx, marge, FORMAT - marge);
      const ht = borner(rect.y * h - dy, marge, 1 - marge);
      const bs = borner((rect.y + rect.hauteur) * h - dy, marge, 1 - marge);
      cadre = { left: `${(g / FORMAT) * 100}%`, top: `${ht * 100}%`, width: `${((d - g) / FORMAT) * 100}%`, height: `${(bs - ht) * 100}%` };
      gauche = (g / FORMAT) * 100;
      bas = bs * 100;
    }
  }

  return (
    <span className={`relative block aspect-[4/3] bg-surface ${className}`}>
      <span className="absolute inset-0 block overflow-hidden">
        <span className="absolute block" style={place}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={mesurer}
            onLoad={(e) => mesurer(e.currentTarget)}
            src={src}
            alt={alt}
            loading="lazy"
            className={`block h-full w-full ${a ? "" : "object-cover"} ${imgClassName}`}
          />
        </span>
      </span>
      {rect && <span className={`cadre block ${grande ? "" : "cadre-vignette"}`} data-testid="cadre" style={cadre} />}
      {/* Du bas du cadre, la ligne descend sous la photo puis revient à la marge, où commence la légende. */}
      {rappel && rect && a && (
        <>
          <span aria-hidden className="rappel block w-0.5" style={{ left: `calc(${gauche}% + 0.75rem)`, top: `calc(${bas}% + 2px)`, bottom: "-0.75rem" }} />
          <span aria-hidden className="rappel block h-0.5" style={{ left: "0.3125rem", right: `calc(${100 - gauche}% - 0.75rem - 2px)`, bottom: "-0.75rem" }} />
          <span aria-hidden className="rappel block w-0.5" style={{ left: "0.3125rem", top: "calc(100% + 0.75rem)", height: "0.75rem" }} />
        </>
      )}
    </span>
  );
}

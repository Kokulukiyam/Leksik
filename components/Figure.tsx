import type { Rect } from "@/lib/shared";

/** Image avec son rectangle de mise en évidence éventuel. `onClick` : l'image s'agrandit au clic. */
export default function Figure({
  src,
  rect,
  alt,
  imgClassName = "",
  onClick,
}: {
  src: string;
  rect: Rect | null;
  alt: string;
  imgClassName?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`relative inline-block max-w-full align-top ${onClick ? "cursor-zoom-in" : ""}`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className={`block h-auto w-auto max-w-full ${imgClassName}`} />
      {rect && (
        <div
          className="cadre"
          data-testid="cadre"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.largeur * 100}%`,
            height: `${rect.hauteur * 100}%`,
          }}
        />
      )}
    </div>
  );
}

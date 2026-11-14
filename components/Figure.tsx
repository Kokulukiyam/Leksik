import type { Rect } from "@/lib/shared";

/** Image entière avec son rectangle de mise en évidence éventuel. `onClick` : l'image s'agrandit au clic. */
export default function Figure({
  src,
  rect,
  alt,
  imgClassName = "h-auto w-auto max-w-full",
  onClick,
  onLoad,
}: {
  src: string;
  rect: Rect | null;
  alt: string;
  imgClassName?: string;
  onClick?: () => void;
  onLoad?: (img: HTMLImageElement) => void;
}) {
  return (
    <div className={`relative inline-block align-top ${onClick ? "cursor-zoom-in" : ""}`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) onLoad?.(img);
        }}
        onLoad={(e) => onLoad?.(e.currentTarget)}
        src={src}
        alt={alt}
        className={`block ${imgClassName}`}
      />
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

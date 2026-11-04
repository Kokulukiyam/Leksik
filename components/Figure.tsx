import type { Rect } from "@/lib/shared";

/** Image avec son rectangle de mise en évidence éventuel. */
export default function Figure({
  src,
  rect,
  alt,
  imgClassName = "",
  onError,
}: {
  src: string;
  rect: Rect | null;
  alt: string;
  imgClassName?: string;
  onError?: () => void;
}) {
  return (
    <div className="relative inline-block max-w-full align-top">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className={`block h-auto w-auto max-w-full ${imgClassName}`} onError={onError} />
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

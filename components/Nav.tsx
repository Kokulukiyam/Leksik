"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", nom: "Jouer" },
  { href: "/lexique", nom: "Lexique" },
  { href: "/ajouter", nom: "Ajouter" },
  { href: "/gerer", nom: "Gérer" },
  { href: "/parametres", nom: "Paramètres" },
];

/**
 * Ordinateur : logo et liens dans le bandeau. Téléphone : le bandeau ne garde que le logo,
 * les cinq liens passent en onglets en bas d'écran (cibles de 56 px). Masqué pendant une manche sur téléphone.
 */
export default function Nav() {
  const chemin = usePathname();
  return (
    <header className="entete border-b border-trait">
      <div className="mx-auto flex h-11 max-w-[76rem] items-stretch px-4 sm:h-14 sm:px-6">
        <Link href="/" className="etroit mr-auto flex items-center text-[1.375rem] [word-spacing:0] sm:text-2xl">
          Le
          <span className="mx-[2px] border-2 border-accent px-[1.5px] leading-[1.1]">ks</span>
          ik
        </Link>
        <nav className="mi-etroit z-40 flex max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:border-t max-sm:border-trait max-sm:bg-fond max-sm:pb-[env(safe-area-inset-bottom)] sm:-mr-3">
          {LIENS.map((l) => {
            const actif = chemin === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`relative flex items-center justify-center transition-colors duration-100 after:absolute after:h-[3px] max-sm:h-14 max-sm:flex-auto max-sm:px-2 max-sm:text-[0.9375rem] max-sm:after:inset-x-0 max-sm:after:-top-px sm:px-3 sm:after:inset-x-3 sm:after:-bottom-px ${
                  actif ? "text-encre after:bg-accent" : "text-sourdine hover:text-encre"
                }`}
              >
                {l.nom}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

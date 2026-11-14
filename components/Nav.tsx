"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", nom: "Jouer" },
  { href: "/lexique", nom: "Lexique" },
  { href: "/ajouter", nom: "Ajouter" },
  { href: "/gerer", nom: "Gérer" },
];

export default function Nav() {
  const chemin = usePathname();
  // Page active : texte clair et filet jaune posé sur le filet du bandeau.
  const classe = (href: string) =>
    `relative flex h-full items-center px-[0.4rem] transition-colors duration-100 sm:px-3 ${
      chemin === href
        ? "text-encre after:absolute after:inset-x-[0.4rem] after:-bottom-px after:h-[3px] after:bg-accent sm:after:inset-x-3"
        : "text-sourdine hover:text-encre"
    }`;
  return (
    <header className="border-b border-trait">
      <nav className="mi-etroit mx-auto flex h-12 max-w-[76rem] items-stretch px-4 text-[0.9375rem] sm:h-14 sm:px-6 sm:text-base">
        <Link href="/" className="etroit mr-auto flex items-center text-[1.375rem] text-encre sm:text-2xl">
          Le
          <span className="mx-[2px] border-2 border-accent px-[1.5px] leading-[1.1]">ks</span>
          ik
        </Link>
        {LIENS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={chemin === l.href ? "page" : undefined} className={classe(l.href)}>
            {l.nom}
          </Link>
        ))}
        <Link
          href="/parametres"
          aria-label="Paramètres"
          aria-current={chemin === "/parametres" ? "page" : undefined}
          className={`${classe("/parametres")} -mr-[0.4rem] sm:-mr-3`}
        >
          <span className="hidden sm:inline">Paramètres</span>
          <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 7h10M17 7h4M3 17h4M11 17h10" />
            <path d="M13 4.5h4v5h-4zM7 14.5h4v5H7z" />
          </svg>
        </Link>
      </nav>
    </header>
  );
}

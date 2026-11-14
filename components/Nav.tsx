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
  const classe = (href: string) =>
    `border-b-2 py-1 transition-colors ${chemin === href ? "border-accent text-encre" : "border-transparent text-sourdine hover:text-encre"}`;
  return (
    <header className="border-b border-trait">
      <nav className="mx-auto flex max-w-5xl items-center gap-3.5 px-4 py-2.5 text-sm sm:gap-6">
        <Link href="/" className="mr-auto flex items-center gap-2 font-serif text-xl tracking-wide text-encre">
          <span aria-hidden className="hidden h-4 w-3 rounded-[2px] border-2 border-[#ffd60a] min-[400px]:block" />
          Leksik
        </Link>
        {LIENS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={chemin === l.href ? "page" : undefined} className={classe(l.href)}>
            {l.nom}
          </Link>
        ))}
        <Link href="/parametres" aria-label="Paramètres" aria-current={chemin === "/parametres" ? "page" : undefined} className={classe("/parametres")}>
          <span className="hidden sm:inline">Paramètres</span>
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="17" r="2" />
          </svg>
        </Link>
      </nav>
    </header>
  );
}

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leksik",
  description: "Vocabulaire architectural en images",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-neutral-800">
          <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 sm:gap-5 py-3 text-sm">
            <Link href="/" className="mr-auto text-lg font-semibold tracking-wide text-white">
              Leksik
            </Link>
            <Link href="/" className="text-neutral-300 hover:text-white">Jouer</Link>
            <Link href="/ajouter" className="text-neutral-300 hover:text-white">Ajouter</Link>
            <Link href="/gerer" className="text-neutral-300 hover:text-white">Gérer</Link>
            <Link href="/parametres" className="text-neutral-300 hover:text-white">Paramètres</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
      </body>
    </html>
  );
}

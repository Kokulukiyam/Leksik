import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leksik",
  description: "Vocabulaire architectural en images",
  appleWebApp: { capable: true, title: "Leksik", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#100f0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
      </body>
    </html>
  );
}

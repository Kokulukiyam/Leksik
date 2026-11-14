import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leksik",
  description: "Vocabulaire architectural en images",
  appleWebApp: { capable: true, title: "Leksik", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0f10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <Nav />
        <main className="mx-auto max-w-[76rem] px-4 sm:px-6">{children}</main>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

// Permet d'ajouter Leksik à l'écran d'accueil du téléphone (plein écran, sans barre d'adresse).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leksik",
    short_name: "Leksik",
    description: "Vocabulaire architectural en images",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#100f0d",
    theme_color: "#100f0d",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

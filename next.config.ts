import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'accès au serveur de dev depuis un téléphone sur le réseau local.
  agentRules: false,
  devIndicators: false,
  // Racine explicite : un package-lock.json dans un dossier parent ne doit pas être pris pour la racine.
  turbopack: { root: path.resolve(".") },
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;

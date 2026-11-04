// Affiche l'adresse à ouvrir sur le téléphone (même wifi) avant de lancer le serveur de dev.
import os from "node:os";

const ips = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);
for (const ip of ips) console.log(`  Sur le téléphone : http://${ip}:3000`);

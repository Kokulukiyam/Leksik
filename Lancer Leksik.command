#!/bin/zsh
# Leksik — double-cliquer sur ce fichier dans le Finder pour lancer l'app et l'ouvrir dans le navigateur.
# Fermer cette fenêtre du Terminal (ou Ctrl+C) arrête l'app.

cd "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.npm-global/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"

ADRESSE="http://localhost:3000"
ouvrir() { [ -z "$LEKSIK_NO_OPEN" ] && open "$ADRESSE"; }

echo "Leksik"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js est introuvable. Installe-le depuis https://nodejs.org (version 20 ou plus), puis relance."
  read -k1 "?Appuie sur une touche pour fermer."
  exit 1
fi

# Déjà lancé (autre fenêtre) : on ouvre simplement le navigateur.
if curl -s -o /dev/null "$ADRESSE"; then
  echo "Leksik tourne déjà : ouverture de $ADRESSE"
  ouvrir
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Première utilisation : installation (une minute environ)…"
  npm install || { read -k1 "?Échec de l'installation. Appuie sur une touche pour fermer."; exit 1; }
fi

npm run dev &
SERVEUR=$!
# À la fermeture : arrêter le serveur et ses sous-processus (même groupe de processus).
trap 'trap - EXIT INT TERM HUP; kill 0 2>/dev/null' EXIT INT TERM HUP

# Attendre que le serveur réponde (et que la page soit compilée), puis ouvrir le navigateur.
for i in {1..60}; do
  if curl -s -o /dev/null "$ADRESSE"; then
    echo
    echo "Leksik est prêt : $ADRESSE"
    echo "Pour arrêter : fermer cette fenêtre (ou Ctrl+C)."
    ouvrir
    break
  fi
  sleep 1
done

wait $SERVEUR

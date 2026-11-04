# Leksik

Petit jeu pour enrichir son vocabulaire architectural en français à partir de photos réelles :
une image, quatre mots, un seul est le bon.

L'app tourne uniquement en local. Il n'y a ni base de données ni compte : le contenu est dans
`data/terms.json` et `data/images.json`, les images dans `public/images/`.

## Lancer l'app

Il faut [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install      # la première fois seulement
npm run dev
```

Puis ouvrir <http://localhost:3000> dans le navigateur.

## Sur le téléphone

Le téléphone doit être sur le même wifi que l'ordinateur.

1. Au lancement, `npm run dev` affiche l'adresse à utiliser, par exemple :
   `Sur le téléphone : http://192.168.1.20:3000`.
   (Sinon, trouver l'adresse IP locale de l'ordinateur : `ipconfig getifaddr en0` sur macOS,
   `ipconfig` sur Windows, ligne « Adresse IPv4 ».)
2. Ouvrir cette adresse dans le navigateur du téléphone.

Si la page ne s'ouvre pas, vérifier que le pare-feu de l'ordinateur autorise Node.js sur le réseau privé.

## Les trois pages

- **Jouer** (`/`) : choisir une catégorie (ou « Toutes ») ; partie de 10 images. Après chaque réponse,
  le bon mot s'affiche en vert, une mauvaise réponse en rouge, avec la définition. En fin de partie :
  score, mots ratés et bouton « Revoir mes erreurs ».
- **Ajouter** (`/ajouter`) : ajouter une de mes photos.
- **Gérer** (`/gerer`) : toutes les images avec filtres (source, catégorie, statut) ; modifier le terme
  ou le rectangle, refuser, supprimer.

## Ajouter une image

1. Ouvrir **Ajouter**.
2. Choisir une photo sur l'ordinateur, ou la prendre avec l'appareil photo depuis le téléphone.
3. Facultatif : glisser sur la photo pour encadrer l'élément (utile quand la photo montre plusieurs choses).
4. Taper le nom de l'objet dans **Objet**. Les termes existants sont proposés ; en cas de faute de frappe
   ou d'accent manquant, Leksik propose le terme existant le plus proche. Pour un nouveau terme, avec son
   article (ex. « l'allège »), indiquer sa définition et sa catégorie.
5. Facultatif : le **Lieu**.
6. **Ajouter**. La photo est réduite (1600 px de large au maximum, format WebP), enregistrée dans
   `public/images/perso/` et entre directement dans le jeu.

## Contenu de départ

Les images de départ viennent de Wikimedia Commons ; leur auteur et leur licence sont affichés sous chaque image.
Chacune a été contrôlée deux fois (voir `VERIFICATION.md`).

Pour rechercher de nouvelles candidates (les fichiers vont dans `tmp/commons/`, qui n'est pas versionné) :

```bash
node scripts/commons.mjs              # tous les termes de scripts/termes-candidats.json
node scripts/commons.mjs linteau      # un seul terme
node scripts/commons.mjs --suite banco  # seconde recherche (champ requetes2), ajoute 07.jpg, 08.jpg…
```

Derrière un proxy HTTP, préfixer la commande par `NODE_USE_ENV_PROXY=1`. Après vérification,
`node scripts/integrer.mjs` copie les images retenues et régénère les fichiers JSON et `VERIFICATION.md`.

## Test de bout en bout

`tests/e2e.mjs` joue des parties complètes, ajoute et gère des images avec Playwright, en largeur
téléphone (390 px) et ordinateur (1280 px). Il remet les données en état à la fin.

```bash
npx playwright install chromium          # la première fois seulement
npm run dev > tmp/e2e-server.log 2>&1    # dans un premier terminal
npm run e2e                              # dans un second terminal
```

## Organisation du code

- `app/` : les trois pages et les routes API (`app/api/images`).
- `components/` : jeu, formulaire d'ajout, gestion, dessin du rectangle.
- `lib/data.ts` : seul module qui lit et écrit les données. Pour passer plus tard à Supabase, c'est le seul fichier à réécrire.
- `lib/shared.ts` : types et fonctions communes (normalisation, recherche de terme proche).
- `scripts/` : recherche sur Commons, outils de vérification, intégration.

Les choix faits pendant le développement sont notés dans `DECISIONS.md`.

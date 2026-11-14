# Leksik

Petit jeu pour enrichir son vocabulaire architectural en français à partir de photos réelles :
une image, quatre mots, un seul est le bon. Leksik retient les mots ratés et les fait revenir.

L'app tourne uniquement en local. Il n'y a ni base de données ni compte : le contenu est dans
`data/terms.json` et `data/images.json`, les images dans `public/images/`.

## Lancer l'app

Il faut [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install      # la première fois seulement
npm run dev
```

Puis ouvrir <http://localhost:3000> dans le navigateur.

**Plus simple, sur Mac :** double-cliquer sur `Lancer Leksik.command`. Il installe ce qu'il faut la première fois,
lance l'app et ouvre le jeu dans le navigateur. Fermer la fenêtre du Terminal arrête l'app.
On peut le glisser dans le Dock (à droite du séparateur) pour l'avoir sous la main.

## Sur le téléphone

Le téléphone doit être sur le même wifi que l'ordinateur.

1. Au lancement, `npm run dev` affiche l'adresse à utiliser, par exemple :
   `Sur le téléphone : http://192.168.1.20:3000`.
   (Sinon, trouver l'adresse IP locale de l'ordinateur : `ipconfig getifaddr en0` sur macOS,
   `ipconfig` sur Windows, ligne « Adresse IPv4 ».)
2. Ouvrir cette adresse dans le navigateur du téléphone.

Si la page ne s'ouvre pas, vérifier que le pare-feu de l'ordinateur autorise Node.js sur le réseau privé.

Pour retrouver Leksik comme une app : menu Partager puis « Sur l'écran d'accueil » (iPhone), ou menu ⋮ puis
« Ajouter à l'écran d'accueil » (Android).

## Les pages

- **Jouer** (`/`) : choisir une catégorie (ou « Toutes ») ; partie de 10 images. Après chaque réponse,
  le bon mot s'affiche en vert, une mauvaise réponse en rouge, avec la définition (et celle du mot choisi
  par erreur). En fin de partie : score, mots ratés et bouton « Revoir mes erreurs ».
  Un clic sur l'image l'agrandit. Au clavier : `1` à `6` pour répondre, `Entrée` ou `→` pour continuer.
  L'accueil montre ma progression (un mot est « maîtrisé » après deux bonnes réponses d'affilée) et, s'il y en a,
  le bouton « Réviser mes mots ratés ». Les mots ratés reviennent dans les parties suivantes et les mots
  maîtrisés passent moins souvent.
- **Lexique** (`/lexique`) : tous les mots du jeu par ordre alphabétique, avec définition et photos ;
  recherche dans les mots et les définitions, filtres par catégorie et par progression.
- **Ajouter** (`/ajouter`) : ajouter une de mes photos.
- **Gérer** (`/gerer`) : toutes les images avec filtres (source, catégorie, statut) ; modifier le terme
  ou le rectangle, refuser, supprimer. Recherche par terme ; les images s'affichent par paquets de 60.
  Un clic sur une note de vérification l'affiche en entier.
- **Paramètres** (`/parametres`) : nombre d'images par partie (10 par défaut), nombre de mots proposés
  (4 par défaut), termes joués selon leur fréquence sur un chantier (les plus courants, courants et fréquents,
  tous), images jouées (Commons, mes photos ou toutes), tirage (mots à apprendre d'abord, ou au hasard),
  mauvaises réponses de la même catégorie ou de toutes, passage automatique à l'image suivante après une bonne
  réponse. On y efface aussi sa progression. Réglages et progression restent dans le navigateur
  (ils sont donc propres à chaque appareil).

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
node scripts/commons.mjs --suite --categories banco  # seconde recherche dans les catégories Commons
```

Derrière un proxy HTTP, préfixer la commande par `NODE_USE_ENV_PROXY=1`. Après vérification,
`node scripts/integrer.mjs` copie les images retenues et régénère les fichiers JSON et `VERIFICATION.md`.

### Les termes

Environ 1000 termes, classés en 13 catégories et par fréquence sur un chantier (priorité 1 à 3), sont dans
`scripts/termes-candidats.json` ; seuls ceux qui ont au moins une image doublement vérifiée entrent dans le jeu (environ 500 termes et plus de 1000 images).
Deux termes qu'une même photo pourrait illustrer (ex. « la fenêtre » et « la fenêtre à soufflet ») sont déclarés
`incompatibles` et ne sont jamais proposés ensemble. Suivi de la chaîne : `python3 scripts/avancement.py`.

## Test de bout en bout

`tests/e2e.mjs` joue des parties complètes, vérifie la progression et le lexique, ajoute et gère des images avec Playwright, en largeur
téléphone (390 px) et ordinateur (1280 px). Il remet les données en état à la fin.

```bash
npx playwright install chromium          # la première fois seulement
npm run dev > tmp/e2e-server.log 2>&1    # dans un premier terminal
npm run e2e                              # dans un second terminal
```

## Organisation du code

- `app/` : les cinq pages (Jouer, Lexique, Ajouter, Gérer, Paramètres), les routes API (`app/api/images`) et
  les vignettes (`app/vignettes`, images réduites à 640 px fabriquées à la demande pour les listes).
- `components/` : jeu, lexique, formulaire d’ajout, gestion, paramètres, dessin du rectangle, image agrandie.
- `app/globals.css` : couleurs et polices (bloc `@theme`), boutons et champs communs.
- `lib/data.ts` : seul module qui lit et écrit les données. Pour passer plus tard à Supabase, c'est le seul fichier à réécrire.
- `lib/shared.ts` : types et fonctions communes (normalisation, recherche de terme proche, termes compatibles) ; `lib/parametres.ts` : réglages du joueur ; `lib/progres.ts` : progression par mot.
- `scripts/` : recherche sur Commons, outils de vérification, intégration.

Les choix faits pendant le développement sont notés dans `DECISIONS.md`.

# Leksik — jeu de vocabulaire architectural en français — spécification pour Claude Code

## Mode de travail

Développe Leksik entièrement, du début à la fin, en autonomie. Ne me demande aucune validation en cours de route : pas de plan à approuver, pas de question intermédiaire. Quand un choix n'est pas précisé ici, prends la décision la plus simple et la plus raisonnable, et note-la en une ligne dans `DECISIONS.md`.

Utilise des sous-agents pour contrôler le travail, comme décrit dans la section « Contrôle par agents ». Un agent qui contrôle ne doit pas être celui qui a produit le travail contrôlé. Corrige tout ce que les agents de contrôle relèvent, puis fais-les repasser jusqu'à ce qu'il n'y ait plus de problème.

Tu ne t'arrêtes que lorsque l'app est complète, testée de bout en bout et que tous les contrôles passent. À la fin, tu me donnes un rapport court (voir « Livraison »).

## Le produit

Le produit s'appelle **Leksik**. Utilise ce nom pour le titre de l'app, le nom du projet (`leksik`) et l'en-tête des pages.

Je suis architecte à Dakar. Leksik est une petite app web, en français, pour développer mon vocabulaire architectural à partir d'images réelles. Elle tourne uniquement en local sur mon ordinateur et je l'utilise dans le navigateur. Pas de mise en ligne, pas de base de données, pas de connexion.

Le principe est volontairement basique : une image s'affiche avec 4 mots en dessous. Un seul correspond à l'élément montré. Je clique sur un mot, le jeu me dit si c'est juste, et on passe à l'image suivante. Pas d'autres modes de jeu.

Je peux aussi ajouter mes propres photos depuis l'interface, en indiquant le nom de l'objet.

Garde tout le plus simple possible : le moins de pages, de dépendances et de configuration possible.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, lancé en local avec `npm run dev`.
- Contenu dans deux fichiers JSON du repo : `data/terms.json` et `data/images.json`.
- Images dans `public/images/commons/` et `public/images/perso/`.
- Les pages d'ajout et de gestion écrivent directement dans ces fichiers via des routes API Next.js. Pas d'authentification, l'app n'est utilisée que par moi en local.
- Score et erreurs de la partie gardés dans le navigateur (localStorage, avec try/catch).
- Accès aux données regroupé dans un seul module, pour pouvoir passer plus tard à Supabase et mettre l'app en ligne sans réécrire les pages. Ne prépare rien d'autre pour ça.
- Serveur de dev accessible depuis mon téléphone sur le même wifi.

## Données

- `terms.json` : id, terme (avec article, ex. « l'allège »), définition (une phrase, langage clair), catégorie.
- `images.json` : id, termId, fichier, rectangle optionnel (x, y, largeur, hauteur en valeurs relatives 0–1), lieu, source (`commons` ou `perso`), auteur, licence, lien source, statut (`validée` / `refusée`), note.

Catégories : Façade et ouvertures, Toitures, Structure, Ornement, Matériaux et revêtements, Afrique de l'Ouest.

## Pages (trois seulement)

### `/` — Jouer
- Choix de la catégorie (ou « Toutes »), puis partie de 10 images tirées au hasard parmi les images `validée`.
- L'image occupe la majeure partie de l'écran. Si elle a un rectangle, il est dessiné par-dessus pour indiquer l'élément sans ambiguïté.
- 4 boutons de réponse larges sous l'image. Les 3 mauvaises réponses sont tirées de la même catégorie, pour être plausibles.
- Après ma réponse : bon mot en vert, mon mauvais choix éventuel en rouge, la définition en une ligne, bouton « Suivant ».
- Crédit de l'image (auteur, licence) en petit sous l'image.
- Fin de partie : score, liste des mots ratés avec leur image et leur définition, bouton « Revoir mes erreurs » qui relance une partie avec seulement ces termes.

### `/ajouter` — Ajouter une image
- Je choisis une photo sur mon ordinateur (ou je la prends avec l'appareil photo si j'ouvre la page sur mon téléphone).
- Redimensionnement à l'enregistrement (largeur max 1600 px, WebP).
- Champ « Objet » avec autocomplétion sur les termes existants. Si je tape un terme proche d'un existant (accent manquant, faute de frappe), proposer l'existant. Si c'est un nouveau terme, demander la définition et la catégorie.
- Rectangle optionnel : je le dessine en glissant sur l'image.
- Champ « Lieu » optionnel.
- Bouton « Ajouter ». Mes images entrent directement avec le statut `validée`, source `perso`, et moi comme auteur.

### `/gerer` — Gérer
- Toutes les images en grille, avec filtres : source (Commons / mes photos), catégorie, statut.
- Chaque image montre son rectangle, son terme et la note de vérification.
- Actions : modifier le terme ou le rectangle, passer en `refusée`, supprimer.

## Contenu de départ : images Wikimedia Commons

- Pas d'images générées par IA, sous aucune forme.
- Prépare environ 60 termes répartis dans les catégories, avec des définitions exactes et sobres. En cas de doute sur un terme, laisse-le de côté.
- Écris un script (Node) qui cherche des images candidates sur Wikimedia Commons via son API pour chaque terme et les télécharge dans un dossier temporaire avec leurs métadonnées (titre, description, catégories Commons, auteur, licence, lien).
- Une image doit montrer l'élément de façon claire et dominante, ou permettre de l'encadrer sans ambiguïté. Sinon elle est rejetée.

### Première vérification de chaque image

Pour chaque image candidate :
1. Ouvre l'image et regarde-la réellement, ne te fie pas seulement au titre ou au nom du fichier.
2. Décris en une phrase ce que tu vois.
3. Compare avec la définition du terme et les métadonnées Commons.
4. Vérifie les confusions fréquentes : trumeau / meneau, piédroit / chambranle, corniche / bandeau, acrotère / garde-corps, allège / appui, console / corbeau, arc / voûte. Si l'image pourrait illustrer un terme voisin, rejette-la ou place un rectangle qui lève le doute.
5. Si tu places un rectangle, rouvre l'image avec le rectangle dessiné pour contrôler qu'il est sur le bon élément.
6. Verdict `validée` ou `rejetée`, avec une note.

Vise 2 images validées par terme. Si un terme n'en a aucune, ne l'ajoute pas.

## Contrôle par agents

Lance ces agents une fois le travail correspondant terminé. Chacun reçoit uniquement ce dont il a besoin pour contrôler, pas le raisonnement qui a mené au résultat.

**Agent de contre-vérification des images.** Pour chaque image `validée`, il reçoit seulement l'image (avec son rectangle dessiné s'il y en a un), le terme et sa définition, sans la note de la première vérification. Il décide indépendamment si l'image illustre bien ce terme, sans ambiguïté avec un terme voisin. Toute image sur laquelle il n'est pas d'accord passe en `rejetée`, avec sa raison en note. Le contenu final ne garde que les images validées par les deux vérifications.

**Agent de relecture du contenu.** Il relit `terms.json` : exactitude technique des définitions, bon article et bon genre, catégorie cohérente, absence de doublons ou de quasi-doublons. Il vérifie aussi que chaque catégorie contient assez de termes pour fournir 3 mauvaises réponses plausibles. Il corrige ou signale chaque problème.

**Agent de test de bout en bout.** Il lance l'app et la teste comme un utilisateur, avec Playwright, en largeur téléphone (390 px) et en largeur ordinateur :
- une partie complète dans « Toutes » et dans chaque catégorie, réponses justes et fausses, écran de fin, « Revoir mes erreurs » ;
- vérifier qu'aucune image cassée ni aucune image `refusée` n'apparaît en partie, que les 4 mots proposés sont distincts et que la bonne réponse figure toujours parmi eux ;
- `/ajouter` : ajout d'une image de test avec un terme existant, puis avec un nouveau terme, avec et sans rectangle, et vérification que les fichiers JSON et le dossier `public/images/perso/` sont bien mis à jour ;
- `/gerer` : filtres, modification d'un terme et d'un rectangle, passage en `refusée`, suppression ;
- aucune erreur dans la console du navigateur ni dans le terminal.

Il supprime les données de test à la fin. Corrige chaque bug trouvé et relance le test complet jusqu'à ce qu'il passe sans erreur.

## Design

- Sobre, lisible, centré sur l'image, mode sombre.
- Rectangle de mise en évidence net, visible sur photo claire comme sombre.
- Confortable aussi bien sur ordinateur que sur téléphone.

## Ordre de travail

1. Structure de l'app, données de test, page `/`.
2. Pages `/ajouter` et `/gerer`.
3. Termes, script Commons, première vérification des images, intégration au jeu.
4. Agents de contre-vérification des images et de relecture du contenu, corrections.
5. Agent de test de bout en bout, corrections jusqu'à ce que tout passe.
6. README et rapport final.

## Livraison

- `README.md` : comment lancer l'app, l'adresse à ouvrir sur mon téléphone, comment ajouter une image.
- `VERIFICATION.md` : pour chaque terme, les images retenues et rejetées, avec les verdicts des deux vérifications et leurs raisons.
- `DECISIONS.md` : les choix que tu as faits toi-même.
- Un rapport final court dans le terminal : nombre de termes et d'images par catégorie, termes abandonnés faute d'image fiable, résultat du dernier test de bout en bout.

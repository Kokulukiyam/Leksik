# État d'avancement de Leksik

Dernière mise à jour : 4 novembre 2026, 20 h (UTC). Branche : `claude/leksik`.

Ordre de travail de `SPEC.md` :

| Étape | État |
|---|---|
| 1. Structure, données de test, page `/` | ✅ fait |
| 2. Pages `/ajouter` et `/gerer` | ✅ fait (testé à la main par captures, pas encore par l'agent de test) |
| 3. Termes, script Commons, première vérification, intégration | 🟡 en cours (voir ci-dessous) |
| 4. Contre-vérification des images + relecture du contenu | 🟡 contre-vérif faite pour 4 catégories sur 6 ; relecture du contenu à faire |
| 5. Agent de test de bout en bout + corrections | ⬜ à faire |
| 6. README et rapport final | 🟡 README écrit (à relire à la fin), rapport final à faire |

## Étape 3–4 en détail

69 termes proposés dans `scripts/termes-candidats.json`.

- **Téléchargement des candidates** (`scripts/commons.mjs`) : fait pour les catégories Façade, Toitures, Structure,
  Ornement et une partie de Matériaux. Restent : tuile → pisé (Matériaux) et toute la catégorie Afrique de l'Ouest.
  Relancer simplement `node scripts/commons.mjs` : il saute les termes qui ont déjà un `meta.json`.
- **Première vérification** (`tmp/verif/premiere/`) : faite pour Façade, Toitures, Structure, Ornement, et pour
  brique, parpaing, pierre-de-taille, moellon, beton-brut. Restent : tuile, ardoise, tole-ondulee, carreau-de-ciment,
  bardage, pise, et les 6 termes d'Afrique de l'Ouest.
- **Contre-vérification** (`tmp/verif/contre/`) : faite pour Façade (29/30 accords), Toitures (11/13), Structure (16/17),
  Ornement (19/22). Restent : Matériaux et Afrique de l'Ouest.
- **Seconde recherche** (`node scripts/commons.mjs --suite`, requêtes `requetes2` déjà écrites) pour les termes sans
  image ou avec une seule : piedroit, chambranle, balcon, acrotere, croupe, souche-de-cheminee, corbeau, console,
  bandeau, modillon, gouttiere, brise-soleil, colonne, arc-boutant, contrefort, voute, corniche, pilastre,
  lanterneau, chaume, gargouille, frise, pinacle. À lancer quand le téléchargement principal est fini, puis
  première vérification des nouvelles candidates (07.jpg et suivantes, en AJOUTANT des entrées au JSON existant
  du terme), puis contre-vérification de celles validées (lot séparé, nouveau fichier dans `tmp/verif/contre/`).
- **Intégration** : `node scripts/integrer.mjs` a déjà été lancé. 44 termes et 75 images sont dans le jeu
  (`data/`, `public/images/commons/`). À relancer après chaque nouvelle contre-vérification.

## Comment lancer les agents (prompts utilisés)

Première vérification (un agent par lot de 5–6 termes) :
> Tu fais la première vérification d'images candidates pour l'app Leksik (repo <chemin>). Lis d'abord les consignes
> complètes dans scripts/verif/consignes-premiere.md et suis-les à la lettre. Termes qui te sont confiés : <ids>.
> Regarde réellement chaque image (outil Read sur les fichiers produits par scripts/verif/outils.py). Écris un fichier
> tmp/verif/premiere/<termId>.json par terme. Ne modifie aucun autre fichier.

Contre-vérification (un agent neuf par catégorie, après `python3 scripts/verif/preparer_contre.py <ids>`) :
> Tu es l'agent de contre-vérification indépendante des images de l'app Leksik. Lis les consignes dans
> scripts/verif/consignes-contre.md. Lot : tmp/verif/contre-lots/<cat>.json. Sortie : tmp/verif/contre/<cat>.json.
> Ne consulte que le lot et les images qu'il désigne (pas tmp/verif/premiere/ ni les meta.json). Ne modifie aucun autre fichier.

Attention : `preparer_contre.py` refait le lot de TOUTES les images validées des termes donnés. Pour un lot
complémentaire (seconde recherche), lui passer uniquement les termes concernés puis renommer le lot et la sortie
(ex. `facade-2.json`) pour ne pas écraser les résultats existants ; les clés déjà contrôlées peuvent être retirées du lot.

## Reste à faire ensuite

1. Agent de relecture du contenu (`data/terms.json`) : exactitude des définitions, article et genre, catégorie,
   doublons, au moins 4 termes par catégorie (3 mauvaises réponses plausibles). Corriger, puis le refaire passer.
   Les corrections de définitions doivent aussi être reportées dans `scripts/termes-candidats.json`.
2. Agent de test de bout en bout (Playwright, 390 px et ordinateur) selon la section « Contrôle par agents » de
   `SPEC.md` ; corriger chaque bug et relancer jusqu'à zéro erreur ; supprimer les données de test.
3. Mettre à jour `README.md`, `DECISIONS.md`, vérifier `VERIFICATION.md`, rapport final.

## Notes

- Les images candidates (`tmp/commons/*/NN.jpg`) ne sont pas versionnées ; `scripts/integrer.mjs` les retélécharge
  depuis Commons au besoin. Les images retenues sont, elles, dans `public/images/commons/`.
- `data/` est régénéré par `scripts/integrer.mjs` ; les modifications faites depuis `/gerer` sur des images
  existantes sont conservées, et les photos perso aussi.

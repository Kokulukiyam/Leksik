# État d'avancement de Leksik

Dernière mise à jour : 4 novembre 2026, 21 h (UTC). Branche : `claude/leksik`.

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

69 termes proposés dans `scripts/termes-candidats.json` (source de vérité des termes : `integrer.mjs` en reprend
terme, définition et catégorie).

- **Téléchargement principal** : ✅ terminé pour les 69 termes.
- **Première vérification** (`tmp/verif/premiere/`) : ✅ faite pour les 63 termes hors Afrique de l'Ouest ;
  Afrique de l'Ouest en cours (si `tmp/verif/premiere/banco.json` etc. manquent, la refaire).
- **Contre-vérification** (`tmp/verif/contre/`) : ✅ Façade, Toitures, Structure, Ornement, Matériaux.
  Reste : Afrique de l'Ouest.
- **Intégration** : 52 termes, 90 images dans le jeu (avant Afrique de l'Ouest et seconde recherche).
- **Seconde recherche** (`node scripts/commons.mjs --suite`, log `tmp/commons-suite.log`) : en cours pour les
  termes qui ont un champ `requetes2` (sans image ou avec une seule). Si elle a été interrompue, la relancer telle
  quelle : les termes déjà traités (`"suite": true` dans leur `meta.json`) sont sautés.
  Ensuite : première vérification des candidates 07+ (en AJOUTANT les entrées au JSON du terme), puis
  contre-vérification des nouvelles validées (lot séparé, ex. `tmp/verif/contre/suite-*.json`), puis `integrer.mjs`.
- **Relecture du contenu** : agent lancé sur `scripts/termes-candidats.json` (compte rendu prévu dans
  `tmp/verif/relecture.md`). À refaire passer après corrections, puis relancer `integrer.mjs`.

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

# Première vérification des images candidates (Leksik)

Leksik est un jeu de vocabulaire architectural en français pour un architecte : une photo réelle s'affiche
(avec éventuellement un rectangle jaune qui encadre l'élément), et le joueur choisit le bon terme parmi 4
termes de la même catégorie. Une image ne doit laisser AUCUN doute sur le terme qu'elle illustre.

Pour chaque terme qui t'est confié, les candidates sont dans `tmp/commons/<termId>/` :
`NN.jpg` (photos téléchargées depuis Wikimedia Commons) et `meta.json` (le terme avec sa définition, et pour
chaque candidate : titre, description, catégories Commons, auteur, licence, lien).

## Outils (depuis la racine du projet)

- `python3 scripts/verif/outils.py voisins <termId>` : le terme, sa définition et les autres termes de sa catégorie
  (les mauvaises réponses possibles : l'image ne doit pouvoir illustrer aucun d'eux). Les termes « incompatibles »
  ne sont jamais proposés avec le terme : une photo d'échafaudage tubulaire est donc valable pour « l'échafaudage »
  même si « l'échafaudage en bois » existe, s'ils sont incompatibles. Un terme générique se valide avec une photo
  typique et claire de l'objet.
- `python3 scripts/verif/outils.py planche <termId>` → `tmp/verif/<termId>-planche.jpg` : vue d'ensemble numérotée.
- `python3 scripts/verif/outils.py grille <termId> <NN>` → `tmp/verif/<termId>-<NN>-grille.jpg` : l'image seule,
  avec une grille cyan tous les 10 % pour repérer les coordonnées.
- `python3 scripts/verif/outils.py cadre <termId> <NN> <x> <y> <largeur> <hauteur>` → `tmp/verif/<termId>-<NN>-cadre.jpg` :
  l'image avec le rectangle dessiné tel qu'il apparaîtra dans le jeu (valeurs relatives 0–1, origine en haut à gauche).

Ouvre les fichiers produits avec l'outil Read pour les regarder.

## Procédure, pour chaque candidate

1. Regarde réellement l'image (planche pour la vue d'ensemble, puis l'image seule via `grille` pour toute
   candidate que tu envisages de valider). Ne te fie pas au titre ni au nom de fichier.
2. Décris en une phrase ce que tu vois.
3. Compare avec la définition du terme et les métadonnées Commons (titre, description, catégories).
4. Vérifie les confusions fréquentes : trumeau / meneau, piédroit / chambranle, corniche / bandeau,
   acrotère / garde-corps, allège / appui, console / corbeau, arc / voûte (et plus généralement tout terme voisin :
   colonne / pilastre, contrefort / arc-boutant, pinacle / flèche, modillon / console, fronton / tympan, etc.).
   Si l'image pourrait illustrer un terme voisin, rejette-la ou place un rectangle qui lève le doute.
5. Si tu places un rectangle, produis la vue `cadre` et regarde-la pour contrôler qu'il est bien sur le bon élément
   et qu'il l'encadre de près ; corrige et revérifie si besoin.
6. Verdict `validée` ou `rejetée`, avec une note courte en français.

## Critères

- Photo réelle uniquement (rejeter dessins, plans, gravures, peintures, maquettes, rendus 3D, images retouchées ou générées par IA).
- L'élément doit être montré de façon claire et dominante, ou pouvoir être encadré sans ambiguïté.
  Un rectangle est nécessaire dès que l'image montre d'autres éléments qui pourraient être la réponse.
- Rejeter : élément trop petit, flou, caché, mal éclairé ; image où le terme n'est qu'une hypothèse ;
  texte ou panneau visible qui donne la réponse ; photo trop peu lisible sur un téléphone.
- Vise 2 images validées par terme, au maximum 6 (choisis les meilleures, sans quasi-doublon). Si aucune candidate n'est fiable,
  n'en valide aucune : c'est un résultat normal et acceptable. Mieux vaut rejeter que valider un doute.
- Sois exigeant et précis sur le sens technique en français (un architecte jouera).

## Résultat

Écris, pour chaque terme, `tmp/verif/premiere/<termId>.json` :

```json
{
  "termId": "linteau",
  "candidats": [
    {
      "fichier": "01.jpg",
      "vu": "Une phrase décrivant ce que montre la photo.",
      "verdict": "validée",
      "rectangle": { "x": 0.31, "y": 0.22, "largeur": 0.40, "hauteur": 0.08 },
      "lieu": "Tournai, Belgique",
      "note": "Raison courte du verdict."
    }
  ]
}
```

- Une entrée pour CHAQUE candidate du dossier, validée ou rejetée.
- `rectangle` : `null` si l'élément occupe clairement l'image entière ou si l'image est rejetée.
- `lieu` : facultatif, d'après le titre ou la description Commons (ville, pays), sinon `""`.
- Ne modifie aucun autre fichier du projet.

## Fichiers temporaires

Plusieurs agents travaillent en même temps : si tu écris des scripts ou fichiers temporaires, mets-les dans un dossier
à toi, `tmp/verif/agents/<nom-de-ton-lot>/` (jamais dans un dossier partagé ni sous un nom générique). Écris chaque
`tmp/verif/premiere/<id>.json` dès qu'un terme est fini, et vérifie à la fin qu'ils existent tous.

## Termes déjà vérifiés (nouvelle recherche)

Si `tmp/verif/premiere/<termId>.json` existe déjà, le terme a été vérifié lors d'une recherche précédente et de
nouvelles candidates ont été ajoutées à la suite dans `meta.json` :

- Ne juge que les candidates de `meta.json` absentes de ce fichier. Les anciennes photos ne sont souvent plus sur le
  disque : c'est normal, ne les cherche pas.
- Garde toutes les entrées existantes telles quelles et ajoute les nouvelles à la fin du tableau `candidats`.
- Les images déjà dans le jeu sont `public/images/commons/<termId>-<NN>.webp` : regarde-les, n'en valide pas de
  quasi-doublon, et compte-les dans le maximum de 6 images validées par terme.

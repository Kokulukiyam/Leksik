# Leksik — direction artistique

## Idée directrice : la nomenclature

Sur un plan d'architecte, chaque élément porte un repère et la nomenclature, en marge, dit comment il s'appelle.
Leksik fait la même chose avec des photos : un cadre jaune désigne l'élément, une liste donne les noms.
Toute l'interface est donc traitée comme la marge d'une planche : des tableaux numérotés, des filets, des chiffres alignés,
une seule couleur de repérage. Rien n'est « décoré » ; ce qui structure, ce sont l'échelle typographique et les filets.

## Typographie

Une seule famille, **Archivo** (Omnibus-Type, licence OFL 1.1), embarquée en local (`@fontsource-variable/archivo`, axes graisse et largeur).
On joue sur la largeur plutôt que sur un second caractère :

- `.etroit` (largeur 68 %, graisse 800) : titres, chiffres, verdicts. Toujours en bas de casse, interlignage serré.
- `.mi-etroit` (largeur 86 %, graisse 600) : les mots du lexique, les réponses, les boutons.
- largeur normale, graisse 400 : définitions et texte courant.

Échelle : 12 · 14 · 16 · 20 · 30 · 48 px, plus un corps d'affiche (score, phrase d'accueil). Chiffres tabulaires partout où ils s'alignent.
Typographie française : espaces insécables avant « : », « ? », « ! » ; apostrophes courbes dans les textes de l'interface
(les termes viennent des données et ne sont pas retouchés).

## Palette

| Jeton | Valeur | Emploi |
| --- | --- | --- |
| `fond` | `#0e0f10` | page (noir neutre : ne teinte pas les photos) |
| `scene` | `#050506` | derrière les photos |
| `surface` / `relief` | `#17191b` / `#222528` | champs, réponses, survols |
| `trait` / `trait-fort` | `#2c3034` / `#4b5056` | filets, contours des commandes |
| `encre` / `sourdine` / `faible` | `#f4f4f1` / `#a9adb1` / `#7d8287` | trois niveaux de texte, pas plus |
| `accent` | `#ffd60a` | le jaune du cadre : repère, action principale, page active, focus |

Vert et rouge sont réservés au verdict (bonne réponse en aplat vert, mauvaise en aplat rouge) et à l'état d'un mot.
Le jaune n'est jamais décoratif.

## Grille

- Conteneur de 76 rem, marges de 16 px (téléphone) ou 24 px.
- Sur ordinateur, deux colonnes 5/12 + 7/12 : à gauche ce qui situe (titre, chiffres, actions), à droite la liste.
  Le jeu inverse le rapport : la photo prend toute la place, les réponses tiennent dans une marge de 23 rem.
- Tout est aligné à gauche. Un filet épais (2 px, encre) ouvre un tableau, des filets fins (1 px) séparent ses lignes.

## Composants

- **Arêtes vives** : aucun arrondi, aucune ombre, aucun dégradé.
- **Bouton principal** : aplat jaune, texte noir. **Bouton secondaire** : contour `trait-fort`, survol en `relief`.
  **Destructif** : texte rouge, aplat rouge au survol. Hauteur minimale 44 px.
- **Réponses** : grandes tuiles `relief`, texte à gauche, chiffre du raccourci clavier en marge (souris seulement).
  Après réponse : la bonne en aplat vert, le mauvais choix en aplat rouge, les autres s'effacent sans bouger.
- **Champs et listes déroulantes** : fond `surface`, filet bas de 2 px qui passe au jaune au focus ; chevron dessiné.
- **Segments (Paramètres)** : cases jointives ; la case choisie est en aplat clair.
- **Listes** (catégories, lexique, mots ratés) : lignes de tableau, jamais de cartes.
- **Gérer** : planche-contact, cases séparées par des filets, barre d'actions en pied de case.
- **Progression** : une « échelle graphique » (barre segmentée, à angles droits) ; ailleurs, des chiffres.
- **Focus clavier** : contour jaune de 2 px, décalé de 2 px.

## Ce qu'on s'interdit

Cartes arrondies, pastilles, puces de légende, surtitres en capitales espacées, serif « élégante », ombres, flous, dégradés,
icônes décoratives, emojis, texte centré, animations autres qu'un fondu de 150 ms.

# Leksik — direction artistique

## Idée directrice : la nomenclature

Sur un plan d’architecte, chaque élément porte un repère et la nomenclature, en marge, dit comment il s’appelle.
Leksik fait la même chose avec des photos : un cadre jaune désigne l’élément, une liste donne les noms.
L’interface est traitée comme la marge d’une planche : des tableaux, des filets, des chiffres alignés, une seule couleur de repérage.
Trois conventions du dessin d’architecte y ont un emploi précis (et aucun autre) :

- **Le poché** (légende des matériaux) code la progression par la forme : plein = maîtrisé, hachuré = en cours, vide = jamais vu,
  plein rouge = à revoir. On le retrouve dans les jauges, les légendes et le lexique ; la couleur ne fait que confirmer.
- **Le repère d’axe** (bulle + trait mixte) marque chaque lettre du lexique ; l’index des lettres y conduit.
- **Le trait interrompu** (élément projeté, à venir) dessine la zone où déposer une photo.

## Typographie

Une seule famille, **Archivo** (Omnibus-Type, licence OFL 1.1), embarquée en local (`@fontsource-variable/archivo`, axes graisse et largeur).

- `.etroit` (largeur 72 %, graisse 800, espace-mot élargi de 0,1 em) : titres de page et score final, rien d’autre.
- `.mi-etroit` (largeur 86 %, graisse 600) : les mots du lexique, les réponses, les boutons, les chiffres clés.
- largeur normale, graisse 400 : définitions, texte courant, valeurs des champs (la même partout).

Échelle : 12 · 14 · 16 · 20 · 24 px ; titres de page 32 px (téléphone) et 60 px (ordinateur) ; un seul corps d’affiche, le score de fin.
Chiffres tabulaires dans les tableaux ; milliers séparés par une espace fine (composant `Nombre`, sans changer le texte).
Typographie française : apostrophes courbes, guillemets « » avec espaces insécables, espace insécable avant « : » et « ? ».
Voix : « je / mes » pour ce qui m’appartient (mes mots ratés, ma réponse, ma progression), infinitif ou « vous » pour les consignes.

## Palette

| Jeton | Valeur | Emploi |
| --- | --- | --- |
| `fond` | `#0e0f10` | page, image agrandie (noir neutre : ne teinte pas les photos) |
| `surface` / `relief` | `#17191b` / `#222528` | scène de la photo, champs, réponses, survols |
| `trait` / `trait-fort` | `#2c3034` / `#4b5056` | filets, contours des commandes |
| `encre` / `sourdine` / `faible` | `#f4f4f1` / `#a9adb1` / `#7d8287` | trois niveaux de texte, pas plus |
| `accent` | `#ffd60a` | le jaune du cadre : repère, action principale, page active, focus. Jamais un état. |
| `green-500` / `red-500` | `#49b170` / `#e5533d` | un seul vert, un seul rouge, rabattus : verdict, états, action destructrice |

Aucun noir pur : la scène d’une photo est en `surface`, à peine plus claire que la page.

## Grille et filets

- Conteneur de 76 rem, marges de 16 px (téléphone) ou 24 px.
- Ordinateur : deux colonnes 5/12 + 7/12 (ce qui situe à gauche, la liste à droite). Le jeu inverse le rapport :
  la photo prend la place, les réponses tiennent dans une marge de 23 rem et « Suivant » est aligné sur le bas de la photo.
- Tout est aligné à gauche, libellés de boutons compris.
- **Filet épais** (2 px, encre) : il ouvre un tableau, juste sous ses intitulés de colonnes (`.tete-tableau`). C’est son seul emploi.
  **Filet fin** (1 px) : il sépare les lignes.

## Composants

- **Arêtes vives** : aucun arrondi (sauf la bulle d’axe), aucune ombre.
- **Bouton principal** : aplat jaune, texte noir. **Secondaire** : contour, survol en `relief`. **Destructif** : texte rouge, à l’écart des autres.
  **Désactivé** : contour et texte atténués, jamais d’aplat — partout pareil. Hauteur 48 px, 56 px pour l’action de l’écran.
- **Réponses** : tuiles `relief`, texte à gauche, chiffre du raccourci clavier en marge (souris seulement).
  Après réponse : la bonne en aplat vert, le mauvais choix en aplat rouge, les autres s’effacent sans bouger.
- **Verdict** : il se lit comme la légende de la photo. Sur téléphone il s’insère entre la photo et les réponses (qui ne bougent pas) ;
  « Suivant » est toujours présent en bas, désactivé tant qu’on n’a pas répondu.
- **Vignette** (`Vignette`) : 4:3, plein cadre, recadrée autour du rectangle d’annotation ; la même en fin de partie, dans Gérer et dans le Lexique.
- **Champs et listes déroulantes** : fond `surface`, filet bas de 2 px qui passe au jaune au focus ; chevron dessiné, texte tronqué proprement.
- **Segments (Paramètres)** : cases jointives, la case choisie en aplat clair.
- **Navigation** : liens dans le bandeau sur ordinateur ; cinq onglets en bas d’écran sur téléphone ; rien pendant une manche sur téléphone.
- **Focus clavier** : contour jaune de 2 px, décalé de 2 px.

## Ce qu’on s’interdit

Cartes arrondies, pastilles, surtitres en capitales espacées, serif « élégante », ombres, flous, noir pur, numérotation décorative,
chiffres géants hors du score, icônes décoratives, emojis, texte centré, sous-titres qui redisent le titre,
animations autres qu’un fondu de 150 ms.

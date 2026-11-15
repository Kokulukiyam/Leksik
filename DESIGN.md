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
- **Le cartouche** : en jeu, le verdict s’inscrit dans la scène de la photo comme le cartouche d’une planche, sur le bord opposé au cadre jaune.

Deux écrans montrent le principe au lieu de le dire : l’accueil ouvre sur une photo du jeu, son cadre et son nom en légende
(tirée au hasard à chaque visite) ; la fin de partie se termine par la planche des mots trouvés.

## Typographie

Une seule famille, **Archivo** (Omnibus-Type, licence OFL 1.1), embarquée en local (`@fontsource-variable/archivo`, axes graisse et largeur).

- `.etroit` (largeur 72 %, graisse 800, espace-mot élargi de 0,1 em) : titres de page et score final, rien d’autre.
- `.mi-etroit` (largeur 86 %, graisse 600) : les mots du lexique, les réponses, les boutons, les chiffres clés.
- largeur normale, graisse 400 : définitions, texte courant, valeurs des champs (la même partout).

Échelle : 12 · 14 · 16 · 20 · 24 px ; titres de page 32 px (téléphone) et 60 px (ordinateur) ; un seul corps d’affiche, le score de fin.
Chiffres tabulaires dans les tableaux ; milliers séparés par une espace fine (composant `Nombre`, sans changer le texte).
Typographie française : apostrophes courbes, guillemets « » avec espaces insécables, espace insécable avant « : » et « ? ».
Voix : « je / mes » pour ce qui m’appartient (mes mots ratés, ma réponse, mes réglages, ma progression), « vous » pour les consignes
(trouvez, glissez, touchez), infinitif pour les boutons et les options. Aucune phrase à la première personne avec un verbe.
Aucune licence n’est jamais coupée ni tronquée (insécable) ; c’est l’auteur qui s’abrège si la place manque.

## Palette

| Jeton | Valeur | Emploi |
| --- | --- | --- |
| `fond` | `#0e0f10` | page, image agrandie (noir neutre : ne teinte pas les photos) |
| `surface` / `relief` | `#17191b` / `#222528` | réponses, survols, fond des vignettes en attente |
| `trait` / `trait-fort` | `#2c3034` / `#4b5056` | filets, contours des commandes |
| `encre` / `sourdine` / `faible` | `#f4f4f1` / `#a9adb1` / `#7d8287` | trois niveaux de texte, pas plus |
| `accent` | `#ffd60a` | le jaune du cadre : repère, action principale, page active, focus. Jamais un état. |
| `green-500` / `red-500` | `#49b170` / `#e5533d` | un seul vert, un seul rouge, rabattus : verdict, états, action destructrice |

Aucun noir pur, aucune « boîte » autour d’une photo : la scène du jeu et l’image agrandie ont exactement la couleur de la page.

## Grille et filets

- Conteneur de 76 rem, marges de 16 px (téléphone) ou 24 px.
- Ordinateur : deux colonnes 5/12 + 7/12 (ce qui situe à gauche, la liste à droite), équilibrées en hauteur ou collantes.
- Tout est aligné à gauche, libellés de boutons compris.
- **Filet épais** (2 px, encre) : il ouvre la liste principale d’un écran, juste sous ses intitulés (`.tete-tableau`), une seule fois par écran.
  Les sections suivantes s’ouvrent par un titre (Paramètres, « Mots trouvés »). **Filet fin** (1 px) : il sépare les lignes.

## Le jeu : une règle pour tous les formats

Pendant une manche, rien ne bouge : la scène a une taille fixée par la mise en page, la photo y est entière, les réponses restent à leur place.
L’emplacement du bas porte la consigne avant la réponse, puis « Suivant » (qui n’existe pas avant). Le verdict vient en cartouche dans la scène.
Téléphone : une colonne à la hauteur de l’écran, sans navigation. À partir de 768 px : photo à gauche, réponses et « Suivant » groupés à droite.

## Composants

- **Arêtes vives** : aucun arrondi (sauf la bulle d’axe), aucune ombre.
- **Bouton principal** : aplat jaune, texte noir. **Secondaire** : contour, survol en `relief`.
  **Inactif** : ni contour ni aplat, une hachure légère et un texte éteint — ne peut pas être pris pour un secondaire.
  **Action rare ou destructrice** : un lien souligné, rouge pour supprimer ou effacer (`.lien-danger`), calé sur la marge. Jamais de bouton rouge.
- **Réponses** : tuiles `relief`, texte à gauche, chiffre du raccourci clavier en marge (souris seulement).
  Après réponse : la bonne en aplat vert, le mauvais choix en aplat rouge, les autres s’effacent sans bouger.
- **Verdict** : « Juste. » ou « Faux. » sur sa ligne, puis le terme juste sur la sienne, sa définition, et « Ma réponse » à part.
- **Vignette** (`Vignette`) : 4:3, plein cadre, recadrée autour du rectangle d’annotation ; la même à l’accueil, en fin de partie, dans Gérer et le Lexique.
- **Image agrandie** : photo entière à l’ouverture ; un toucher l’agrandit, centrée sur le cadre. Commandes dans la barre du bas, jamais sur la photo.
- **Champs et listes déroulantes** : un cadre fin sur le fond de la page, comme une case de tableau ; le cadre passe au jaune au focus ;
  petit triangle plein pour les listes. Une valeur n’est jamais tronquée sur téléphone (filtres en pleine largeur).
- **Segments (Paramètres)** : cases jointives, la case choisie en aplat clair.
- **Jauges** : poché hachuré pour « en cours » dans les grandes ; dans les lignes de tableau (6 px), un vert atténué, sans hachure.
- **Navigation** : liens dans le bandeau sur ordinateur ; cinq onglets en bas d’écran sur téléphone ; le repère jaune a la largeur du mot.
- **Focus clavier** : contour jaune de 2 px, décalé de 2 px ; rentré dans les lignes de tableau pour ne pas mordre sur les filets.

## Ce qu’on s’interdit

Cartes arrondies, pastilles, surtitres en capitales espacées, serif « élégante », ombres, flous, noir pur, numérotation décorative,
chiffres géants hors du score, icônes décoratives, emojis, texte centré, sous-titres qui redisent le titre,
animations autres qu’un fondu de 150 ms.

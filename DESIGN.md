# Leksik — direction artistique

## Idée directrice : la nomenclature

Sur un plan d’architecte, chaque élément porte un repère et la nomenclature, en marge, dit comment il s’appelle.
Leksik fait la même chose avec des photos : un cadre jaune désigne l’élément, une liste donne les noms.
L’interface est traitée comme la marge d’une planche : des tableaux, des filets, des chiffres alignés, une seule couleur de repérage.
Trois conventions du dessin d’architecte y ont un emploi précis (et aucun autre) :

- **Le poché** (légende des matériaux) code la progression par la forme : plein = maîtrisé, hachuré = en cours, vide = jamais vu,
  plein rouge = à revoir. On le retrouve dans les jauges, les légendes et le lexique ; la couleur ne fait que confirmer.
- **Le repère d’axe** (bulle + trait mixte) marque chaque lettre du lexique ; l’index des lettres y conduit.
- **Le trait interrompu** (ce qui n’est pas encore là) dessine la zone où déposer une photo et le contour d’un bouton inactif.
- **La ligne de rappel** relie, à l’accueil, le cadre jaune d’une photo du jeu à son nom en légende : le principe du jeu, montré.
- **Le cartouche** : le bilan de fin de partie est dressé en cases étiquetées (résultat, partie, appréciation, manches dans l’ordre),
  comme le cartouche d’une planche. C’est le seul écran traité ainsi.

La hachure ne veut dire qu’une chose : « en cours ». Elle ne sert à rien d’autre.

## Typographie

Une seule famille, **Archivo** (Omnibus-Type, licence OFL 1.1), embarquée en local (`@fontsource-variable/archivo`, axes graisse et largeur).

- `.etroit` (largeur 76 %, graisse 700, espace-mot élargi de 0,1 em) : titres de page, titres de section et score final.
  Le très grand corps est réservé au score de fin ; les titres de page font 32 px (téléphone) et 44 px (ordinateur).
- `.mi-etroit` (largeur 86 %, graisse 600) : les mots du lexique, les réponses, les boutons, les chiffres clés.
- largeur normale, graisse 400 : définitions, texte courant, valeurs des champs (la même partout).

Échelle : 12 · 14 · 16 · 20 · 24 px ; un seul corps d’affiche, le score de fin.
Chiffres tabulaires dans les tableaux ; milliers séparés par une espace fine (composant `Nombre`, sans changer le texte).
Typographie française : apostrophes courbes, guillemets « » avec espaces insécables, espace insécable avant « : » et « ? ».
Voix : « je / mes » pour ce qui m’appartient (mes mots ratés, ma réponse, mes réglages, ma progression), « vous » pour les consignes
(trouvez, glissez, touchez), infinitif pour les boutons et les options. Aucune phrase à la première personne avec un verbe.
Aucune licence n’est jamais coupée ni tronquée (insécable) ; c’est l’auteur qui s’abrège si la place manque.

## Palette

| Jeton | Valeur | Emploi |
| --- | --- | --- |
| `fond` | `#101010` | page, scène du jeu, image agrandie : anthracite neutre, ni bleuté ni crème |
| `surface` / `relief` | `#191918` / `#242423` | réponses, survols, fond des vignettes en attente |
| `trait` / `trait-fort` | `#30302e` / `#555551` | filets, contours des commandes |
| `encre` / `sourdine` / `faible` | `#f2f2ee` / `#adaca7` / `#85847f` | trois niveaux de texte (gris béton), contrastes ≥ 4,9:1 sur le fond |
| `accent` | `#ffd60a` | le jaune du cadre : repère, action principale (toujours jaune, assombri au survol), page active, focus |
| `green-500` / `red-500` | `#49b170` / `#e5533d` | un seul vert, un seul rouge, rabattus : verdict, états, action destructrice |

Aucun noir pur, aucune « boîte » autour d’une photo : la scène du jeu et l’image agrandie ont exactement la couleur de la page.

## Grille et filets

- Conteneur de 76 rem, marges de 16 px (téléphone) ou 24 px.
- Ordinateur : deux colonnes 5/12 + 7/12 (ce qui situe à gauche, la liste à droite), équilibrées en hauteur ou collantes.
- Tout est aligné à gauche, libellés de boutons compris.
- **Filet épais** (2 px, encre) : il ouvre la liste principale d’un écran, juste sous ses intitulés (`.tete-tableau`), une seule fois par écran.
  Les sections de même rang ont le même titre (Paramètres ; « Mots ratés » et « Mots trouvés »), sans filet épais. **Filet fin** (1 px) : il sépare les lignes.

## Le jeu : une règle par format, tenue dans tous les cas

La photo n’est jamais rognée ni recouverte : elle reste entière, avec son cadre. Les réponses ne bougent pas entre la question et le verdict.
Le verdict a un seul emplacement par format, le même pour juste ou faux et pour 2, 3, 4 ou 6 mots ; il prend la place de l’énoncé
(« Comment s’appelle l’élément encadré ? »). « Suivant » n’existe qu’après la réponse, à une place réservée.

- **Téléphone** : énoncé puis verdict en tête ; la photo, calée sur les réponses avec son crédit, rétrécit entière si le verdict est long ;
  réponses en grille ; « Suivant » en bas. Pas de navigation pendant la manche.
- **Tablette en hauteur** (640 à 1023 px) : photo en haut, crédit dessous, réponses en grille, puis verdict à gauche et « Suivant » à droite.
- **Écran large** (≥ 1024 px) : photo calée à gauche, crédit puis verdict dessous ; réponses et « Suivant » dans la marge de droite.

Le cadre jaune a deux graisses : plein format (jeu, image agrandie, photo d’accueil, dessin du cadre) et vignette (listes).
Le survol d’une réponse éclaircit la tuile ; le contour jaune est réservé au focus clavier.

## Composants

- **Arêtes vives** : aucun arrondi (sauf la bulle d’axe), aucune ombre.
- **Bouton principal** : aplat jaune, texte noir. **Secondaire** : contour, survol en `relief`.
  **Inactif** : contour en trait interrompu, texte éteint, pas d’aplat — ne peut pas être pris pour un secondaire, ni pour une progression.
  **Action rare ou destructrice** : un lien souligné, rouge pour supprimer ou effacer (`.lien-danger`), calé sur la marge. Jamais de bouton rouge.
- **Réponses** : tuiles `relief`, texte à gauche, chiffre du raccourci clavier en marge (souris seulement).
  Après réponse : la bonne en aplat vert, le mauvais choix en aplat rouge, les autres s’effacent sans bouger.
- **Verdict** : « Juste. » ou « Faux. » sur sa ligne, puis le terme juste sur la sienne, sa définition, et « Ma réponse » à part.
- **Vignette** (`Vignette`) : 4:3, plein cadre, recadrée autour du rectangle d’annotation ; la même à l’accueil, en fin de partie, dans Gérer et le Lexique.
- **Image agrandie** : photo entière à l’ouverture ; un toucher l’agrandit, centrée sur l’élément (sans cadre : on regarde le détail).
  Commandes en mots (« Agrandir », « Fermer ») et flèches de l’app dans la barre du bas, jamais sur la photo.
- **Champs et listes déroulantes** : un cadre fin sur le fond de la page, comme une case de tableau ; le cadre passe au jaune au focus ;
  petit triangle plein pour les listes ; libellé gris tant qu’aucune valeur n’est choisie. Une valeur n’est jamais tronquée sur téléphone (filtres en pleine largeur).
- **Segments (Paramètres)** : cases jointives, la case choisie en aplat clair.
- **Jauges** : même poché partout (plein, hachuré, rouge), 8 px dans les lignes de tableau, 12 px ailleurs.
- **Légendes de progression** : toujours dans l’ordre maîtrisé, en cours, à revoir, jamais vu.
- **Navigation** : liens dans le bandeau sur ordinateur ; cinq onglets en bas d’écran sur téléphone ; le repère jaune a la largeur du mot.
- **Focus clavier** : contour jaune de 2 px, décalé de 2 px ; rentré dans les lignes de tableau pour ne pas mordre sur les filets.

## Ce qu’on s’interdit

Cartes arrondies, pastilles, surtitres en capitales espacées, serif « élégante », ombres, flous, noir pur, numérotation décorative,
chiffres géants hors du score, icônes décoratives, emojis, texte centré, sous-titres qui redisent le titre,
animations autres qu’un fondu de 150 ms.

# Relecture du contenu : scripts/termes-candidats.json

Fichier modifié : `scripts/termes-candidats.json`, champs `definition` et `categorie` seulement. Aucun `terme`, `id` ni `requetes` n'a été touché. `data/terms.json` n'a pas été modifié : il faut relancer `scripts/integrer.mjs` pour y reporter les corrections.

## Corrections (18)

| id | avant | après | raison |
|---|---|---|---|
| appui-de-fenetre | Partie horizontale qui forme le bas d'une fenêtre, souvent en saillie pour rejeter l'eau de pluie. | Tablette horizontale qui termine le bas d'une baie au-dessus de l'allège, souvent saillante et inclinée pour rejeter l'eau de pluie. | Distinguer l'appui de l'allège. |
| meneau | … qui divise une fenêtre en plusieurs parties. | … qui divise une **même** fenêtre en plusieurs parties. | Distinguer le meneau du trumeau (le trumeau est le mur entre deux baies). |
| tympan | Surface … comprise entre le linteau et l'arc qui surmontent une porte. | Surface, souvent sculptée, enclose entre le linteau et l'arc d'un portail, ou entre les corniches d'un fronton. | Ajout du sens « champ du fronton », pour distinguer le tympan du fronton. |
| imposte | Partie vitrée, fixe ou ouvrante, située au-dessus d'une porte ou d'une fenêtre. | Partie haute, fixe ou ouvrante et souvent vitrée, d'une porte ou d'une fenêtre, séparée du reste par une traverse. | Une imposte n'est pas toujours vitrée, et c'est la traverse qui la sépare du reste. |
| moucharabieh | Grillage de bois tourné à motifs, placé devant une fenêtre… | Treillis de bois tourné, souvent en saillie devant une fenêtre, qui permet de voir sans être vu, typique de l'architecture arabe. | Plus exact (dispositif en saillie) et mieux distingué du claustra. |
| acrotere | Muret qui borde une toiture-terrasse et en dépasse le niveau. | Muret en rive d'une toiture-terrasse, qui en dépasse le niveau et contre lequel se relève l'étanchéité. | Distinguer l'acrotère du garde-corps : sa fonction est d'abord l'étanchéité. |
| colonne | Support vertical de section circulaire… | Support vertical **isolé**, de section circulaire… | Distinguer la colonne du pilastre. |
| voute | … comme un plafond en forme d'arc. | Ouvrage de maçonnerie cintré qui couvre un espace, comme un arc prolongé dans la profondeur. | Comparaison plus juste, qui distingue la voûte de l'arc. |
| coupole | Voûte hémisphérique ou ovoïde couvrant un espace, vue de l'intérieur. | Voûte en demi-sphère ou en calotte, élevée sur un plan circulaire, carré ou polygonal ; le mot désigne surtout sa face intérieure, l'extérieur étant le dôme. | « vue de l'intérieur » était ambigu, d'où la mention de la nuance coupole/dôme. |
| pilotis | Ensemble de poteaux qui portent un bâtiment au-dessus du sol en laissant le rez-de-chaussée libre. | Ensemble de pieux ou de poteaux qui portent une construction au-dessus du sol ou de l'eau, en laissant libre le niveau inférieur. | Couvre aussi le sens premier (pieux, construction sur l'eau), pas seulement le sens corbuséen. |
| fronton | Couronnement triangulaire ou cintré qui surmonte… | Couronnement triangulaire ou cintré, **bordé de corniches**, qui surmonte… | Distinguer le fronton du pignon et du tympan. |
| bandeau | … lisse ou moulurée… | … lisse ou **simplement** moulurée… | Distinguer le bandeau de la frise. |
| frise | Bande décorative horizontale, sculptée ou peinte, qui court le long d'un mur. | Bande horizontale ornée de motifs répétés ou de figures, sculptée ou peinte, qui court le long d'un mur ou entre l'architrave et la corniche d'un entablement. | Distinguer la frise du bandeau et ajouter le sens classique. |
| beton-brut | … avec la trace des planches. | … dont il garde l'empreinte. | Le coffrage n'est pas toujours en planches (banches métalliques). |
| ardoise | Pierre fendue en plaques minces… | Roche schisteuse fendue en plaques minces… | Plus exact. |
| pise | Mur en terre crue compactée… | Terre crue compactée par couches successives dans un coffrage pour former des murs massifs. | Le pisé est un matériau ou une technique, pas un mur. Cela aligne aussi la définition sur sa catégorie. |
| toron | Pièce de bois fichée dans les murs des mosquées soudano-sahéliennes… | Pièce de bois de rônier fichée en saillie dans les murs en banco des mosquées soudano-sahéliennes, qui sert d'appui lors du recrépissage. | Précisions : le bois (rônier), la saillie, le banco. |
| chaume (catégorie) | Toitures | Matériaux et revêtements | Par cohérence avec tuile, ardoise et tôle ondulée, qui sont des matériaux de couverture classés dans « Matériaux ». |

Articles, genres et orthographe vérifiés, rien à corriger :
- le claustra, le pilotis, l'oriel (masc.), l'imposte (fém.), l'acrotère (masc.), l'œil-de-bœuf, le brise-soleil, le shed, la cariatide (« caryatide » est aussi admis), le piédroit (« pied-droit » est aussi admis), la clé de voûte, le faîtage.
- le toguna : l'usage masculin est attesté (le360.ma, Vikidia), « la toguna » se rencontre aussi. Je l'ai gardé au masculin.

## Problèmes signalés, non corrigés

1. **Nombre de termes** : le fichier en contient 70, pas 69 (ETAT.md indique 69). Il n'y a pas d'id en double.
2. **Catégorie « Afrique de l'Ouest » absente du jeu** : 6 candidats, mais aucun dans `data/terms.json`. Tant qu'au moins 4 de ces termes ne sont pas illustrés, la catégorie ne peut pas fournir 3 mauvaises réponses. Les autres catégories illustrées ont toutes au moins 4 termes : Façade 15, Ornement 12, Structure 10, Matériaux 8, Toitures 7. Après régénération avec le chaume déplacé, Toitures passera à 6 et Matériaux à 9.
3. **Rapports partie/tout ou générique/spécifique dans une même catégorie** : une photo du terme peut montrer aussi le distracteur, ou en être un cas particulier. À surveiller au cadrage des photos, ou à exclure comme paires de distracteurs.
   - Structure : coupole/voûte (une coupole est une voûte) ; arc-boutant/arc ; clé de voûte/arc ou voûte.
   - Ornement : modillon/corniche ; chapiteau/pilastre.
   - Afrique de l'Ouest : **case à impluvium/case** (la case à impluvium est une case). C'est le cas le plus gênant. Je propose de restreindre le terme générique, par exemple « la case ronde », ou d'interdire cette paire. Grenier dogon/case sont aussi visuellement proches (banco et toit conique de paille).
4. **Confusions visuelles possibles en Façade** : claustra, brise-soleil, moucharabieh et persienne sont tous des dispositifs ajourés. Les définitions les distinguent, mais à Dakar beaucoup de claustras font office de brise-soleil. Il faut des photos sans ambiguïté.
5. **Termes de catégories voisines, sans conflit dans le jeu** (les distracteurs viennent de la même catégorie) : corbeau (Structure) / console et modillon (Ornement) ; flèche (Toitures) / pinacle (Ornement) ; œil-de-bœuf (Façade) / rosace (Ornement) ; fronton (Ornement) / tympan (Façade) ; banco (Afrique) / pisé (Matériaux). Les classements sont défendables, je n'ai rien changé.
6. **Aucun terme à retirer.**

## Relecture des 10 termes de la seconde recherche (4 nov. 2026)

Termes relus : piedroit, balcon, acrotere, souche-de-cheminee, corbeau, bandeau, tole-ondulee, bardage, pise, banco.
Fichiers modifiés : `scripts/termes-candidats.json` et `data/terms.json` (même texte, définition du banco seulement) ; `lib/shared.ts` (liste `INCOMPATIBLES`).

### Correction de définition (1)

| id | avant | après | raison |
|---|---|---|---|
| banco | Terre argileuse mêlée de paille, moulée en briques ou appliquée en enduit dans la construction traditionnelle. | Terre crue argileuse, souvent mêlée de paille, moulée en briques, modelée en murs ou appliquée en enduit dans la construction traditionnelle ouest-africaine. | La paille n'est pas systématique (balle de riz, fibres, ou rien). Le banco est aussi modelé en murs massifs, pas seulement moulé ou enduit. « Crue » le distingue de la brique cuite. |

Les 9 autres définitions sont exactes et claires. Articles et genres vérifiés : le piédroit (« pied-droit » admis), le balcon, l'acrotère (masc.), la souche de cheminée, le corbeau, le bandeau, la tôle ondulée, le bardage, le pisé, le banco. Les catégories sont cohérentes. L'acrotère et la souche sont classés en Toitures, la tôle ondulée en Matériaux avec tuile et ardoise, le corbeau en Structure (il porte une charge), le banco en Afrique de l'Ouest. Aucun doublon d'id ni de terme. Les quasi-doublons sont traités par les paires ci-dessous.

### Paires ajoutées à `INCOMPATIBLES` (9)

| paire | raison |
|---|---|
| balcon / garde-corps | Le garde-corps fait partie du balcon (c'est dans la définition). Toute photo de balcon le montre. |
| balcon / balustre | Beaucoup de balcons sont fermés par une balustrade (c'est le cas de balcon-11). Paire entre deux catégories, elle ne joue qu'en complément. |
| piedroit / trumeau | Le pan de mur entre deux baies est aussi le piédroit de chacune, et le pilier central d'un portail en est le piédroit commun. |
| acrotere / garde-corps | Un acrotère maçonné en rive de terrasse a l'aspect d'un garde-corps plein, et sert souvent de garde-corps. |
| corbeau / modillon | Le modillon est une petite console sous corniche, le corbeau une console porteuse. Sur une photo, la différence tient à l'échelle et à l'usage, ce qui ne se voit pas forcément. |
| bandeau / corniche | Une corniche peu saillante et peu moulurée se confond avec un bandeau, et les deux apparaissent souvent sur la même façade. |
| tole-ondulee / bardage | La tôle ondulée sert couramment de bardage (c'est dans sa définition). |
| pise / banco | Les deux sont des murs en terre crue. Une photo ne permet pas de les départager de façon fiable. |
| banco / grenier-dogon | Le grenier dogon est un bâtiment en banco (c'est dans sa définition), et banco-12 montre des greniers à l'arrière-plan. |

### Paires envisagées, non retenues

- **pisé / béton brut** : les deux portent la trace du coffrage, mais la couleur et la texture (terre litée contre ciment gris) les distinguent nettement.
- **piédroit / jambage** : « jambage » n'est pas un terme du jeu.
- **piédroit / linteau** : l'un est vertical, l'autre horizontal. Le rectangle les sépare.
- **acrotère / corniche** : ils sont souvent voisins, mais le rectangle les sépare.
- **bandeau / frise** : les définitions les opposent (lisse contre ornée), et les images retenues sont sans ambiguïté.
- **banco / toron** : les torons sont fichés dans du banco, mais les rectangles des images de toron cadrent les pièces de bois. Ajouter cette paire ne laisserait au banco que 2 mauvaises réponses dans sa catégorie.
- **corbeau / toron** : le toron est en saillie, mais il ne porte rien, et son contexte (mosquée en banco) est très reconnaissable.

### Nombre de mauvaises réponses possibles par catégorie

Calculé après application de toutes les paires, avec les mauvaises réponses prises dans la même catégorie. Tous les termes ont une image validée.
- Façade 17, Ornement 13, Matériaux 12, Structure 11, Toitures 8 : chaque terme garde au moins 10 mauvaises réponses possibles en Façade, Ornement et Matériaux, et au moins 7 en Toitures.
- Afrique de l'Ouest (5 termes) : banco et grenier dogon en gardent 3 chacun (toron, toguna, case à impluvium et leur autre terme), les trois autres termes 4. C'est juste suffisant : un nouvel incompatible dans cette catégorie forcerait à prendre une mauvaise réponse dans une autre catégorie (`Jeu.tsx` le fait déjà).

### Signalé, non corrigé

- La paire `["case-a-impluvium", "case"]` vise un id `case` qui n'existe plus dans `data/terms.json`. Elle est sans effet, je l'ai laissée telle quelle.

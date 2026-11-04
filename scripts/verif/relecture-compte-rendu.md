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

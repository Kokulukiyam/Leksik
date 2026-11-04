# Rédaction de termes pour Leksik

Leksik est un jeu de vocabulaire architectural et de construction en français, pour un architecte qui exerce
à Dakar. Une photo réelle (Wikimedia Commons) s'affiche, avec parfois un rectangle qui désigne l'élément, et
il choisit le bon terme parmi 4 termes de la même catégorie.

Objectif global : environ 1000 termes, ceux qu'un architecte a le plus de chances de croiser sur un chantier ou
dans la construction (en priorité au Sénégal et en Afrique de l'Ouest, mais aussi le vocabulaire courant en France).
Termes génériques ET termes précis (ex. « la fenêtre » et « la fenêtre à soufflet », « le carrelage » et
« le carreau de grès cérame »).

## Règles

- Uniquement des choses **visibles et photographiables** sans ambiguïté : un objet, un élément, un matériau, un outil,
  un engin. Pas de notion abstraite, de calcul, de document, d'acteur ou de procédure (pas « la descente de charges »,
  « le maître d'œuvre », « le DTU »). Une action n'est admise que si elle se voit (ex. « le coffrage » est l'objet).
- Le terme en français correct, **avec son article** (« l'allège », « le parpaing », « la crémone ») ; minuscules
  sauf nom propre. Le terme d'usage le plus courant sur un chantier francophone ; un régionalisme ouest-africain
  courant est bienvenu dans la catégorie « Afrique de l'Ouest » ou quand c'est LE mot utilisé (« l'agglo » existe
  à côté du « parpaing » : dans ce cas garder un seul des deux et citer l'autre dans la définition).
- **Définition** : une phrase, langage clair, exacte et sobre, qui permet de reconnaître l'élément sur une photo.
  En cas de doute sur un terme ou sa définition, laisse-le de côté.
- **Priorité** : 1 = vu presque à chaque chantier ou visite (poteau, parpaing, ferraillage, carrelage, robinet) ;
  2 = fréquent ; 3 = plus rare ou spécialisé. Environ un tiers de chaque.
- **Requêtes** : 3 requêtes de recherche Wikimedia Commons (fichiers), de la plus précise à la plus large ; au moins
  une en anglais (Commons est surtout indexé en anglais) ; tu peux utiliser `incategory:"Nom de catégorie Commons"`
  si tu es sûr qu'elle existe. N'interroge PAS Commons toi-même (débit très limité, réservé au script).
  Requêtes qui visent des PHOTOS de l'élément réel, bien visible (pas de schémas).
- **Incompatibles** : ids des autres termes (de toute la liste, existants compris) qu'une photo de ce terme pourrait
  aussi légitimement illustrer, ou qui se voient forcément sur la même photo : le générique d'un terme précis
  (« fenetre-a-soufflet » → « fenetre »), les quasi-synonymes, les éléments toujours ensemble. Ces paires ne
  seront jamais proposées ensemble. Une relation suffit dans un sens.
- **id** : le terme sans article, sans accents, en minuscules, mots séparés par des tirets (« l'allège » → `allege`,
  « le béton armé » → `beton-arme`). Unique dans toute la liste.
- Pas de doublon ni de quasi-doublon avec les termes existants (`scripts/termes-candidats.json`) ni avec les autres
  catégories : respecte le périmètre de ta catégorie décrit ci-dessous ; à la frontière, place le terme là où un
  architecte le chercherait.

## Catégories (périmètres)

- **Façade et ouvertures** : composition de façade, baies et leurs parties, protections solaires, balcons, garde-corps
  extérieurs, éléments de façade (pas les types de menuiseries ni la quincaillerie).
- **Toitures** : formes de toit, charpente de toit, couvertures, zinguerie, évacuation des eaux pluviales, étanchéité
  de toiture-terrasse, lucarnes, cheminées.
- **Structure** : éléments porteurs et systèmes constructifs vus finis : poteau, poutre, dalle, voile, arc, voûte,
  portique, ferme métallique, contreventement, assemblages métalliques, joint de dilatation.
- **Gros œuvre et maçonnerie** : fondations, terrassement visible, béton armé en cours d'exécution (armatures,
  ferraillage, attentes, chaînages, enrobage, cales), maçonnerie (blocs, appareillages, joints, linteaux coulés),
  dallage, hérisson, chape de béton.
- **Matériaux et revêtements** : matériaux de construction et revêtements extérieurs (pierres, bétons, briques,
  bois, métaux, verre, enduits extérieurs), leurs aspects et finitions.
- **Menuiserie et serrurerie** : types de portes, fenêtres, volets, portails métalliques et grilles, et leur
  quincaillerie (paumelle, crémone, serrure, gâche, poignée, ferme-porte…), profils et vitrages.
- **Second œuvre et finitions** : cloisons, doublages, faux plafonds, sols intérieurs (carrelage, parquet, résine…),
  faïence, plinthes, peinture et enduits intérieurs, étanchéité de pièces humides, joints.
- **Réseaux et équipements** : plomberie et sanitaires, évacuations, électricité (tableau, gaine, prise, luminaires…),
  climatisation et ventilation, eau chaude, sécurité incendie, ascenseur, solaire.
- **Escaliers et circulations** : types d'escaliers et leurs parties, rampes, mains courantes, paliers, ascenseurs
  vus comme circulation (non : la machinerie est dans Réseaux).
- **Chantier et outillage** : installation de chantier, échafaudages, étaiement, coffrages et banches, engins,
  matériel de levage, outils du maçon, du ferrailleur, du charpentier, du carreleur, du plombier, équipements
  de protection, mesure et implantation.
- **Extérieurs et voirie** : VRD, clôtures, portails maçonnés, murs de soutènement, voirie (bordure, caniveau,
  pavé, regard), assainissement visible, aménagements extérieurs, piscine.
- **Ornement** : décor architectural (moulures, frises, sculptures, éléments classiques et gothiques, claustras
  décoratifs).
- **Afrique de l'Ouest** : architecture et construction traditionnelles ou typiques d'Afrique de l'Ouest
  (terre, paille, éléments soudano-sahéliens, habitat traditionnel, éléments urbains typiques de Dakar).

## Sortie

Un tableau JSON dans le fichier indiqué, une entrée par terme :

```json
{
  "id": "fenetre-a-soufflet",
  "terme": "la fenêtre à soufflet",
  "categorie": "Menuiserie et serrurerie",
  "definition": "Fenêtre dont le vantail pivote autour de son côté bas et s'ouvre vers l'intérieur par le haut.",
  "priorite": 2,
  "requetes": ["hopper window", "fenêtre à soufflet", "bottom hung window open"],
  "incompatibles": ["fenetre"]
}
```

Vérifie avant de finir : JSON valide, ids uniques (et absents de `scripts/termes-candidats.json`), catégorie
exactement écrite comme ci-dessus, chaque id cité dans `incompatibles` existe (dans ta liste, les existants, ou la
liste des noms prévus dans les autres catégories qu'on t'a éventuellement donnée — sinon retire-le).

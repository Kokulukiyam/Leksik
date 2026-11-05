# Contre-vérification indépendante des images (Leksik)

Leksik est un jeu de vocabulaire architectural en français pour un architecte : une photo réelle s'affiche
(avec éventuellement un rectangle jaune bordé de noir qui désigne l'élément), et le joueur choisit le bon
terme parmi 4 termes de la même catégorie. L'image doit illustrer le terme SANS AMBIGUÏTÉ.

Tu reçois un lot JSON : pour chaque image, `cle`, `image` (chemin du fichier, rectangle déjà dessiné s'il y en a un),
`terme`, `definition`, et `autres_termes_de_la_categorie` (les mauvaises réponses possibles).

Pour chaque image :

1. Ouvre-la avec l'outil Read et regarde-la réellement.
2. Décide, indépendamment, si elle illustre bien ce terme selon sa définition :
   - c'est une photo réelle (pas un dessin, une peinture, un rendu, une image générée) ;
   - l'élément est clairement visible et dominant, ou exactement désigné par le rectangle ;
   - s'il y a un rectangle, il est bien placé sur l'élément et le cadre de près, sans englober un élément voisin
     qui pourrait être pris pour la réponse ;
   - aucun terme voisin ne pourrait raisonnablement être la bonne réponse (pense en particulier à
     trumeau / meneau, piédroit / chambranle, corniche / bandeau, acrotère / garde-corps, allège / appui,
     console / corbeau, arc / voûte, colonne / pilastre, contrefort / arc-boutant, pinacle / flèche,
     modillon / console, fronton / tympan, et aux autres termes de la catégorie fournis) ;
   - l'élément est lisible sur un écran de téléphone.
3. En cas de doute, tu n'es pas d'accord. Sois exigeant : un architecte jouera.

Écris le résultat dans le fichier de sortie indiqué, un tableau JSON :

```json
[
  { "cle": "linteau/02", "accord": true, "raison": "Phrase courte en français : ce que montre l'image et pourquoi le terme est (ou n'est pas) juste." }
]
```

Une entrée pour chaque image du lot. Ne modifie aucun autre fichier.

Fichiers temporaires éventuels : dans `tmp/verif/agents/<nom-de-ton-lot>/` uniquement (d'autres agents travaillent en même temps).

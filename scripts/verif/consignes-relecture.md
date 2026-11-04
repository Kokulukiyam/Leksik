# Relecture des termes de Leksik

Leksik : jeu de vocabulaire architectural et de construction en français pour un architecte à Dakar. Une photo
réelle, 4 termes de la même catégorie, un seul est juste. Les termes sont dans `scripts/termes-candidats.json`
(champs : id, terme, categorie, definition, priorite, requetes, incompatibles). La liste complète, une ligne par
terme, est dans `scripts/termes/relecture/tous-les-termes.txt`. Règles de rédaction : `scripts/verif/consignes-termes.md`.

Pour chaque terme de tes catégories, vérifie :
1. **Exactitude technique** de la définition (une phrase, claire, qui permet de reconnaître l'élément sur une photo).
2. **Terme** : bon mot français, bon article et bon genre, orthographe.
3. **Catégorie** cohérente (périmètres dans `consignes-termes.md`).
4. **Doublons et quasi-doublons**, y compris avec les autres catégories (synonymes, même objet sous deux noms) :
   garde le meilleur, supprime l'autre.
5. **Photographiable** : si une photo ne peut pas montrer l'élément sans ambiguïté (notion, défaut invisible,
   élément caché, différence invisible à l'œil entre deux variantes), supprime le terme.
6. **Priorité** 1/2/3 (1 = vu presque à chaque chantier ou visite à Dakar, 3 = rare). Les termes sans priorité
   (les 70 premiers) doivent en recevoir une.
7. **Incompatibles** : paires qu'une même photo pourrait illustrer (générique / précis, quasi-synonymes, éléments
   toujours visibles ensemble). Ajoute celles qui manquent, retire celles qui sont fausses.
8. Chaque catégorie doit garder assez de termes compatibles pour 3 mauvaises réponses plausibles.

En cas de doute sur un terme ou sa définition, supprime-le ou corrige-le : un architecte jouera.

## Sortie

N'écris que le fichier de sortie indiqué (un tableau JSON) ; ne modifie pas `termes-candidats.json`.

```json
[
  { "id": "allege", "action": "modifier", "definition": "…", "priorite": 2, "raison": "…" },
  { "id": "fenetre-a-soufflet", "action": "modifier", "incompatibles_ajout": ["fenetre"], "incompatibles_retrait": [], "raison": "…" },
  { "id": "xxx", "action": "supprimer", "raison": "doublon de yyy" }
]
```

`modifier` accepte : terme, definition, categorie, priorite, incompatibles_ajout, incompatibles_retrait (ids).
Ne mets que ce qui change. Termine par une entrée `{ "id": "_bilan", "action": "bilan", "raison": "…" }` qui
résume en quelques phrases ce que tu as corrigé et ce qui reste douteux.

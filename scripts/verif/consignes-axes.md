# Incompatibles « à critères croisés » (Leksik)

Dans Leksik, une photo s'affiche avec 4 termes de la même catégorie ; un seul doit être juste. Deux termes déclarés
`incompatibles` ne sont jamais proposés ensemble. Liste complète des termes, avec leurs incompatibles actuels :
`scripts/termes/relecture/tous-les-termes.txt`.

Problème à corriger : beaucoup de termes d'une même catégorie classent les objets selon des CRITÈRES DIFFÉRENTS
(fonction, forme, matériau, mode d'ouverture, position, partie / tout). Une même photo peut alors illustrer
correctement deux termes à la fois. Exemples :
- « la porte d'entrée » (fonction) / « la porte vitrée » / « la porte métallique » (matériau) / « la porte à panneaux »
  (construction) / « la porte à deux vantaux » (nombre de vantaux) : toutes ces paires sont à déclarer incompatibles ;
- « l'escalier droit » (forme) / « l'escalier en béton » (matériau) ;
- « le joint de maçonnerie » / « le lit de mortier » ; « le ferraillage » / « le ferraillage de dalle » (générique / précis) ;
- un tout et sa partie toujours visible (« la fenêtre » / « le vitrage »).

Pour chaque catégorie qui t'est confiée, repère TOUTES les paires de termes qu'une même photo réaliste pourrait
illustrer correctement, et qui ne sont pas encore incompatibles. N'ajoute pas de paire entre termes clairement
distincts à l'œil (sinon la catégorie n'aurait plus de mauvaises réponses). Vérifie qu'il reste au moins 3 termes
compatibles pour chaque terme.

Sortie (ne modifie rien d'autre) : tableau JSON
`[{ "id": "porte-d-entree", "action": "modifier", "incompatibles_ajout": ["porte-vitree", "porte-metallique"], "raison": "critères croisés" }, …]`
terminé par `{ "id": "_bilan", "action": "bilan", "raison": "…" }`. Les ids doivent exister.

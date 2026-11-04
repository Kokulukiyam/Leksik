# État d'avancement de Leksik — À LIRE POUR REPRENDRE

Dernière mise à jour : 4 novembre 2026, ~21 h 30 UTC. Branche `claude/leksik`, poussée sur GitHub.

## Où on en est — TERMINÉ (4 nov. 2026)

- **App** : `npm install && npm run dev`, puis http://localhost:3000. Pages Jouer, Ajouter, Gérer faites.
- **Contenu** : 66 termes, 110 images Commons validées par les deux vérifications.
  Façade 17/32 · Toitures 8/14 · Matériaux 12/19 · Structure 11/17 · Ornement 13/20 · Afrique de l'Ouest 5/8 (termes/images).
- **Seconde recherche** faite pour les termes abandonnés : 10 termes récupérés (piédroit, balcon, acrotère, souche de cheminée,
  corbeau, bandeau, tôle ondulée, bardage, pisé, banco). Contre-vérification : `tmp/verif/contre/suite-1.json` (14/16 confirmées).
- **Relecture** : complète, plus les 10 nouveaux termes (définition du banco corrigée, 9 paires `INCOMPATIBLES` ajoutées).
- **Termes abandonnés** : le chambranle, la croupe, la console, la case ronde.
- **Test de bout en bout** (`npm run e2e`, voir README) : 3987 vérifications réussies, 0 échouée, sur le contenu final.

## Pistes facultatives

- Les 4 termes abandonnés : nouvelles requêtes dans `requetes2` puis `--refaire`/`--suite` (attention à la numérotation),
  ou mes propres photos via Ajouter.
- La paire `["case-a-impluvium", "case"]` de `INCOMPATIBLES` vise un terme absent : sans effet, gardée au cas où la case ronde revienne.

## Rappels

- `scripts/termes-candidats.json` fait foi pour les termes ; `node scripts/integrer.mjs` régénère `data/`, `public/images/commons/` et `VERIFICATION.md`.
- Ne pas lancer `integrer.mjs` pendant le test de bout en bout : les deux écrivent dans `data/`.
- Les photos candidates `tmp/commons/*/NN.jpg` ne sont pas versionnées, seuls les `meta.json` le sont.
  Pour revérifier un terme, retélécharger chaque `url` de son `meta.json` vers son `fichier`.

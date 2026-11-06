# État d'avancement de Leksik — À LIRE POUR REPRENDRE

Dernière mise à jour : 4 novembre 2026. Branche `claude/leksik`.

## Version 1 : terminée

66 termes, 110 images doublement vérifiées, test de bout en bout OK, lancement par double-clic (`Lancer Leksik.command`).

## Version 2 : TERMINÉE (6 nov. 2026)

- **Contenu** : 982 termes candidats (13 catégories, priorité 1–3), **471 termes et 797 images** doublement vérifiées
  dans le jeu. Les autres termes n'ont pas d'image fiable sur Commons (rapport détaillé : `VERIFICATION.md`).
- **Code** : page Paramètres, incompatibles dans les données, Gérer paginé avec recherche, 13 catégories.
- **Test de bout en bout** : 10 791 vérifications, 0 échouée (390 et 1280 px).
- Chaîne : recherche Commons (catégories vérifiées, puis plein texte), 1re vérification (agents Sonnet, lots
  p-001 à p-092), contre-vérification (lots v2-001 à v2-023), `integrer.mjs`. Outils : `scripts/avancement.py`.

## Pour aller vers 1000 images (non fait)

- Troisième recherche (`--suite --categories`, 6 candidates de plus) pour les termes de priorité 1 et 2 qui ont
  0 ou 1 image ; puis 1re vérification (plafond 6 par terme) et contre-vérification.
- Ou ajouter mes propres photos de chantier via Ajouter.

## Rappels

- `scripts/termes-candidats.json` fait foi pour les termes ; `node scripts/integrer.mjs` régénère `data/`,
  `public/images/commons/` et `VERIFICATION.md`.
- Ne pas lancer `integrer.mjs` pendant le test de bout en bout : les deux écrivent dans `data/`.
- Les photos candidates `tmp/commons/*/NN.jpg` ne sont pas versionnées, seuls les `meta.json` le sont.
  Pour revérifier un terme, retélécharger chaque `url` de son `meta.json` vers son `fichier`.
- L'API Commons bloque après une dizaine de requêtes rapprochées (429) : ne jamais l'interroger en parallèle du script.

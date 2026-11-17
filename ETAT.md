# État d'avancement de Leksik — À LIRE POUR REPRENDRE

Dernière mise à jour : 17 novembre 2026. Branche `claude/leksik`.

## Version 1 : terminée

66 termes, 110 images doublement vérifiées, test de bout en bout OK, lancement par double-clic (`Lancer Leksik.command`).

## Version 2 : TERMINÉE (6 nov. 2026)

- **Contenu** : 982 termes candidats (13 catégories, priorité 1–3), **471 termes et 797 images** doublement vérifiées
  dans le jeu. Les autres termes n'ont pas d'image fiable sur Commons (rapport détaillé : `VERIFICATION.md`).
- **Code** : page Paramètres, incompatibles dans les données, Gérer paginé avec recherche, 13 catégories.
- **Test de bout en bout** : 10 791 vérifications, 0 échouée (390 et 1280 px).
- Chaîne : recherche Commons (catégories vérifiées, puis plein texte), 1re vérification (agents Sonnet, lots
  p-001 à p-092), contre-vérification (lots v2-001 à v2-023), `integrer.mjs`. Outils : `scripts/avancement.py`.

## Version 3 : 1000 images ATTEINT (13 nov. 2026)

- Troisième recherche Commons (`--suite --categories`) sur les termes à 2 images ou moins, par priorité ;
  1re vérification lots p-093 à p-119, contre-vérification v2-024 à v2-030.
- **502 termes et 1009 images** doublement vérifiées. Test de bout en bout : 10 791 vérifications, 0 échouée.
- Recherche arrêtée volontairement après 422 des 590 termes visés (objectif atteint) ; liste dans
  `tmp/troisieme-ids.txt`, journal `tmp/troisieme.log`. 8 termes ont des candidates téléchargées non vérifiées
  (`python3 scripts/avancement.py --premiere=20`). Pour reprendre : relancer la même commande (les termes déjà
  traités sont sautés), puis 1re vérification, `preparer_contre.py --lot=v2-031`, `integrer.mjs`.

## Version 4 : revue complète, TERMINÉE (14 nov. 2026)

- Nouveau design (palette et typographie dans `app/globals.css`), accueil avec progression, zone d'image à hauteur
  fixe, pastilles de partie, image agrandie au clic, raccourcis clavier, définition du mot choisi par erreur.
- Progression par mot et tirage adapté (`lib/progres.ts`), « Réviser mes mots ratés », page Lexique, vignettes,
  icône et manifeste (écran d'accueil du téléphone).
- Test de bout en bout étendu (progression, clavier, image agrandie, lexique) : 11 343 vérifications, 0 échouée.

## Version 5 : refonte visuelle « nomenclature » (17 nov. 2026)

- Demande : un design qui ne fasse pas « fait par une IA ». Un agent designer a fait 4 passes, chacune notée à l'aveugle
  par 3 relecteurs indépendants (nouveaux à chaque tour, captures seules) sur la probabilité « fait par des humains ».
  Notes : passe 1 78/78/64, passe 2 76/79/66, passe 3 80/79/74, passe 4 85/87/84 ; seuil fixé par le propriétaire : 90.
- Direction et règles : `DESIGN.md`. Police Archivo embarquée (`@fontsource-variable/archivo`, OFL), aucune ressource réseau.
- Captures de relecture : `node scripts/capture.mjs tmp/design/<nom>` (serveur lancé) ; dernières dans `tmp/design/passe5/`.
- Crédits Commons nettoyés (`scripts/credits.mjs`, appliqué par `integrer.mjs`) ; apostrophes typographiques dans les données.
- Test de bout en bout : 11 343 vérifications, 0 échouée.

## Rappels

- `scripts/termes-candidats.json` fait foi pour les termes ; `node scripts/integrer.mjs` régénère `data/`,
  `public/images/commons/` et `VERIFICATION.md`.
- Après un changement dans `lib/data.ts`, relancer le serveur de dev s'il tourne depuis longtemps (module resté en mémoire).
- Ne pas lancer `integrer.mjs` pendant le test de bout en bout : les deux écrivent dans `data/`.
- Les photos candidates `tmp/commons/*/NN.jpg` ne sont pas versionnées, seuls les `meta.json` le sont.
  Pour revérifier un terme, retélécharger chaque `url` de son `meta.json` vers son `fichier`.
- L'API Commons bloque après une dizaine de requêtes rapprochées (429) : ne jamais l'interroger en parallèle du script.

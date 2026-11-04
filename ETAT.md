# État d'avancement de Leksik — À LIRE POUR REPRENDRE

Dernière mise à jour : 4 novembre 2026, ~21 h 30 UTC. Branche `claude/leksik`, poussée sur GitHub.

## Où on en est

- **App fonctionnelle** : `npm install && npm run dev`, puis http://localhost:3000. Les pages Jouer, Ajouter et Gérer sont faites.
- **Contenu du jeu** : 56 termes et 96 images Commons, chacune validée par les deux vérifications.
  Façade 15/29 · Toitures 6/10 · Matériaux 9/16 · Structure 10/16 · Ornement 12/19 · Afrique de l'Ouest 4/6 (termes/images).
- **Relecture du contenu** : faite et appliquée (compte rendu : `scripts/verif/relecture-compte-rendu.md`).
  - « la case » est renommée « la case ronde ».
  - Des paires de termes ne sont jamais proposées ensemble : liste `INCOMPATIBLES` dans `lib/shared.ts`.
- **Termes abandonnés pour l'instant** : piédroit, chambranle, balcon, acrotère, croupe, souche de cheminée, corbeau,
  bandeau, console, tôle ondulée, bardage, pisé, banco, case ronde.

## À faire, dans l'ordre

### 1. Test de bout en bout — FAIT (4 nov. 2026)

`tests/e2e.mjs` (Playwright) : lancer `npm run dev > tmp/e2e-server.log 2>&1`, puis `npm run e2e` dans un autre terminal.
Dernier résultat : 3951 vérifications réussies, 0 échouée, deux exécutions consécutives, 390×844 et 1280×860. Aucun bug trouvé dans l'app.
À relancer après toute modification de l'app ou du contenu (et après `integrer.mjs`, jamais pendant).

### 2. Seconde recherche d'images (facultative)

Elle vise les termes qui ont un champ `requetes2` dans `scripts/termes-candidats.json`.

- **piedroit, chambranle, balcon** : candidates 07–12 téléchargées et première vérification faite (piedroit 12, balcon 11 et 12 validées).
- **acrotere, croupe, souche-de-cheminee, corbeau, bandeau, console, tole-ondulee, bardage, pise, banco, case** : candidates 07–12
  téléchargées le 4 nov. ; première vérification en cours.
- Les autres termes ayant `requetes2` sont déjà illustrés : pas de seconde recherche prévue pour eux.
- **Termes restants** : `node scripts/commons.mjs --suite`. Les termes déjà faits sont sautés. Derrière un proxy, ajouter `NODE_USE_ENV_PROXY=1`.
  L'API Commons est lente (2 à 5 min par terme).
- **Ensuite, pour chaque lot :**
  1. Première vérification par un agent, avec les consignes de `scripts/verif/consignes-premiere.md`. Préciser dans le prompt :
     seules les candidates 07+ sont nouvelles, il faut les ajouter au JSON, avec au plus 3 validées par terme.
  2. Contre-vérification par un agent DIFFÉRENT. Lancer `python3 scripts/verif/preparer_contre.py <ids>`, puis suivre `scripts/verif/consignes-contre.md`.
     Le lot reprend aussi les anciennes validées : renommer la sortie (ex. `tmp/verif/contre/suite-1.json`) pour ne rien écraser.
  3. Lancer `node scripts/integrer.mjs`.

### 3. Finitions

- Relire README.md et VERIFICATION.md.
- Compléter DECISIONS.md : relecture, `INCOMPATIBLES`, seconde recherche.
- Écrire le rapport final (SPEC.md « Livraison »), puis committer et pousser.

## Rappels

- `scripts/termes-candidats.json` fait foi pour les termes ; `node scripts/integrer.mjs` régénère `data/`, `public/images/commons/` et `VERIFICATION.md`.
- Ne pas lancer `integrer.mjs` pendant le test de bout en bout : les deux écrivent dans `data/`.
- Les photos candidates `tmp/commons/*/NN.jpg` ne sont pas versionnées, seuls les `meta.json` le sont.
  Pour revérifier un terme, retélécharger chaque `url` de son `meta.json` vers son `fichier`.

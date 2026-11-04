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

### 1. Test de bout en bout (obligatoire, SPEC.md)

Pas encore fait : il a été arrêté avant d'avoir produit quoi que ce soit. Prompt d'agent à utiliser :

> Agent de test de bout en bout de Leksik. Lis SPEC.md (sections « Pages » et « Agent de test de bout en bout ») et CLAUDE.md.
> Écris `tests/e2e.mjs`, un script Playwright pour 390×844 et 1280×860, avec le serveur sur http://localhost:3000. Il couvre :
> - une partie complète dans « Toutes » et dans chaque catégorie, avec des réponses justes et fausses, l'écran de fin et « Revoir mes erreurs » ;
> - aucune image cassée ni `refusée` en partie (en créer une `refusée` pour le test) ;
> - 4 mots distincts, la bonne réponse toujours présente, le vert et le rouge, la définition, le crédit ;
> - `/ajouter` avec un terme existant puis un nouveau terme, avec et sans rectangle, et la suggestion « menau » → « le meneau » ;
>   vérifier data/*.json et public/images/perso/ (WebP de 1600 px de large au maximum) ;
> - `/gerer` : filtres, modification du terme et du rectangle, refus, suppression ;
> - aucune erreur dans la console ni dans le log du serveur.
>
> Le script sauvegarde data/*.json au début et remet tout en état à la fin. Corrige les bugs et relance jusqu'à zéro erreur.

Si Playwright manque : `npm i -D playwright && npx playwright install chromium`, et noter ce choix dans DECISIONS.md.

### 2. Seconde recherche d'images (facultative)

Elle vise les termes qui ont un champ `requetes2` dans `scripts/termes-candidats.json`.

- **Termes déjà téléchargés** (candidates 07+, `"suite": true` dans le `meta.json`) : piedroit, chambranle, balcon.
  Leur première vérification a été **interrompue** : compléter les entrées 07+ manquantes dans `tmp/verif/premiere/<id>.json`,
  sans toucher aux entrées 01–06.
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

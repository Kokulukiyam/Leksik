# État d'avancement de Leksik — À LIRE POUR REPRENDRE

Dernière mise à jour : 4 novembre 2026. Branche `claude/leksik`.

## Version 1 : terminée

66 termes, 110 images doublement vérifiées, test de bout en bout OK, lancement par double-clic (`Lancer Leksik.command`).

## Version 2 (en cours) : environ 1000 termes, objectif au moins 1000 images

Demande : « on vise les 1000 » images, en choisissant les ~1000 éléments qu'un architecte à Dakar a le plus de
chances de croiser sur un chantier (génériques et précis) ; parties toujours de 10 par défaut ; page Paramètres.

### Fait

- **Code** : 13 catégories (`CATEGORIES`, `lib/shared.ts`), champs `priorite` (1–3) et `incompatibles` sur les termes
  (la liste `INCOMPATIBLES` du code a été migrée dans les données), page `/parametres` (`components/Parametres.tsx`,
  `lib/parametres.ts`), Gérer avec recherche et affichage par paquets de 60, `integrer.mjs` qui distingue
  « pas encore traité » d'« abandonné ».
- **Termes** : 937 nouveaux termes rédigés par 7 agents (`scripts/verif/consignes-termes.md`, listes brutes dans
  `scripts/termes/listes-agents/`), contrôlés et fusionnés par `scripts/fusionner_termes.py` → 1007 termes dans
  `scripts/termes-candidats.json`.

### En cours / à faire, dans l'ordre

1. ~~Relecture des 1007 termes~~ FAIT : 245 modifications, 25 suppressions → **982 termes**, tous avec priorité
   (`scripts/termes/relecture/appliquees/`, arbitrages dans `scripts/termes/relecture/arbitrages.txt`).
2. ~~Test de bout en bout mis à jour~~ FAIT : 6941 vérifications, 0 erreur (paramètres, Gérer paginé, incompatibles).
   Si le serveur tourne déjà (lancé par double-clic) : `SERVER_LOG=.next/dev/logs/next-development.log npm run e2e`.
3. **Recherche Commons** : `node scripts/commons.mjs > tmp/commons-1000.log 2>&1` (par priorité ; reprend où il
   s'est arrêté : les termes qui ont un `meta.json` sont sautés). ~30 s à 1 min par terme.
4. **Vérifications, par lots**, au fur et à mesure des téléchargements (`python3 scripts/avancement.py` donne l'état) :
   - première vérification : `python3 scripts/avancement.py --premiere=8` donne les 8 prochains termes prêts ;
     un agent par lot, consignes `scripts/verif/consignes-premiere.md` ;
   - contre-vérification (agent DIFFÉRENT) : `python3 scripts/verif/preparer_contre.py --lot=v2-NNN <ids>`
     (seulement les images pas encore jugées), consignes `scripts/verif/consignes-contre.md`,
     sortie `tmp/verif/contre/v2-NNN.json` ;
   - `node scripts/integrer.mjs` (jamais pendant `npm run e2e`).
5. Test de bout en bout final, README, DECISIONS, rapport, commit et push.

## Journal des lots

- Téléchargement Commons (1re passe) : TERMINÉ le 5 nov. matin pour les 982 termes.
- Première vérification (agents Sonnet) : p-001 à p-032 faits ; p-033 à p-036 en cours (repris après la limite).
- Contre-vérification (modèle principal) : v2-001 à v2-008 faits.
- Seconde passe par catégories en cours pour 377 termes qui ont moins de 2 images
  (`tmp/seconde-passe-ids.txt`, log `tmp/commons-passe2.log`) : ses nouvelles candidates (07–12) apparaissent
  « à vérifier (1re) » ; les agents ne vérifient que les candidates absentes du JSON.
- Restent à traiter ensuite : les 10 termes « sans candidate ».
- Limite d'utilisation Claude atteinte trois fois : reprendre les agents interrompus avec SendMessage.
- État : `python3 scripts/avancement.py`. Jeu au 5 nov. après-midi : 389 termes, 592 images ; lots p-001 à p-064 et v2-001 à v2-015 faits.

## Rappels

- `scripts/termes-candidats.json` fait foi pour les termes ; `node scripts/integrer.mjs` régénère `data/`,
  `public/images/commons/` et `VERIFICATION.md`.
- Ne pas lancer `integrer.mjs` pendant le test de bout en bout : les deux écrivent dans `data/`.
- Les photos candidates `tmp/commons/*/NN.jpg` ne sont pas versionnées, seuls les `meta.json` le sont.
  Pour revérifier un terme, retélécharger chaque `url` de son `meta.json` vers son `fichier`.
- L'API Commons bloque après une dizaine de requêtes rapprochées (429) : ne jamais l'interroger en parallèle du script.

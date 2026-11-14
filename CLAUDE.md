# Leksik — consignes pour Claude Code

Lire d'abord `SPEC.md` (la demande complète), puis **`ETAT.md` (où en est le travail et quoi faire ensuite)**.
Mettre `ETAT.md` à jour à chaque étape franchie, puis committer.

## Projet

- App Next.js 16 (App Router) + TypeScript + Tailwind 4, en français, locale. `npm install` puis `npm run dev`.
- Données : `data/terms.json`, `data/images.json` ; images dans `public/images/commons/` et `public/images/perso/`.
- Seul module d'accès aux données : `lib/data.ts`. Types et fonctions pures : `lib/shared.ts`.
- Pages : `app/page.tsx` (jeu, `components/Jeu.tsx`), `app/lexique` (`components/Lexique.tsx`), `app/ajouter` (`components/Ajouter.tsx`),
  `app/gerer` (`components/Gerer.tsx`), `app/parametres` (`components/Parametres.tsx`). Réglages : `lib/parametres.ts` ; progression : `lib/progres.ts`.
- API : `app/api/images/route.ts` (POST), `app/api/images/[id]/route.ts` (PATCH, DELETE) ; vignettes : `app/vignettes/[...chemin]/route.ts`.
- Design : couleurs et polices dans le bloc `@theme` de `app/globals.css` (classes `bg-fond`, `text-sourdine`, `.btn`, `.champ`…).
  Le test de bout en bout s'appuie sur les `data-testid` et sur les classes `border-green-500` / `border-red-500` des réponses.
- Choix faits en autonomie : `DECISIONS.md` (ajouter une ligne pour tout nouveau choix).

## Chaîne du contenu Commons

1. `NODE_USE_ENV_PROXY=1 node scripts/commons.mjs` : candidates dans `tmp/commons/<termId>/` (NN.jpg non versionnés + `meta.json` versionné).
   `--suite` : seconde recherche avec le champ `requetes2` de `scripts/termes-candidats.json` (ajoute 07.jpg, 08.jpg…).
   Sur une machine sans proxy, `NODE_USE_ENV_PROXY=1` est inutile. L'API Commons limite fortement le débit : le script attend tout seul.
   Pour retrouver les images d'un terme déjà vérifié : supprimer son `meta.json` n'est PAS conseillé (renumérotation) ;
   télécharger plutôt chaque `url` listée dans `meta.json` vers le `fichier` indiqué.
2. Première vérification (agent) : consignes `scripts/verif/consignes-premiere.md`, outils `python3 scripts/verif/outils.py`,
   résultats `tmp/verif/premiere/<termId>.json` (versionnés).
3. Contre-vérification (agent DIFFÉRENT, sans accès aux notes de la 1re) : `python3 scripts/verif/preparer_contre.py <termIds>`
   crée `tmp/verif/contre-lots/<categorie>.json` ; consignes `scripts/verif/consignes-contre.md` ;
   résultats `tmp/verif/contre/<categorie>.json` (versionnés ; un fichier par lot, clé `<termId>/<NN>`).
4. `node scripts/integrer.mjs` : copie les images validées deux fois en WebP dans `public/images/commons/`,
   régénère `data/terms.json`, `data/images.json` et `VERIFICATION.md`. Conserve les photos perso.
   Nécessite les NN.jpg dans `tmp/commons/` pour les images retenues.

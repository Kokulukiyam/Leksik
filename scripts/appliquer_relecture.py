"""Applique à scripts/termes-candidats.json les corrections proposées par les agents de relecture
(scripts/termes/relecture/*.json, format décrit dans scripts/verif/consignes-relecture.md).

  python3 scripts/appliquer_relecture.py            affiche ce qui serait fait
  python3 scripts/appliquer_relecture.py --ecrire   applique

Les fichiers appliqués sont déplacés dans scripts/termes/relecture/appliquees/.
Un terme supprimé disparaît aussi des `incompatibles` des autres termes.
"""
import json
import re
import sys
from pathlib import Path

R = Path(__file__).resolve().parents[1]
CANDIDATS = R / "scripts" / "termes-candidats.json"
DOSSIER = R / "scripts" / "termes" / "relecture"
CATEGORIES = re.findall(r'^  "(.+)",$', (R / "lib" / "shared.ts").read_text().split("as const")[0], re.M)

termes = json.loads(CANDIDATS.read_text())
par_id = {t["id"]: t for t in termes}
fichiers = sorted(DOSSIER.glob("*.json"))
suppr, modifs, problemes, bilans = set(), 0, [], []

for f in fichiers:
    for e in json.loads(f.read_text()):
        tid, action = e.get("id"), e.get("action")
        if action == "bilan":
            bilans.append(f"{f.name} : {e.get('raison', '')}")
            continue
        t = par_id.get(tid)
        if not t:
            problemes.append(f"{f.name} · {tid} : terme inconnu")
            continue
        if action == "supprimer":
            suppr.add(tid)
        elif action == "modifier":
            for k in ("terme", "definition", "priorite"):
                if k in e:
                    t[k] = e[k]
            if "categorie" in e:
                if e["categorie"] in CATEGORIES:
                    t["categorie"] = e["categorie"]
                else:
                    problemes.append(f"{f.name} · {tid} : catégorie inconnue {e['categorie']}")
            inc = [i for i in t.get("incompatibles", []) if i not in e.get("incompatibles_retrait", [])]
            for i in e.get("incompatibles_ajout", []):
                if i not in par_id:
                    problemes.append(f"{f.name} · {tid} : incompatible inconnu {i}")
                elif i not in inc and i != tid:
                    inc.append(i)
            t["incompatibles"] = inc
            modifs += 1
        else:
            problemes.append(f"{f.name} · {tid} : action inconnue {action}")

# Termes avec des images déjà dans le jeu : on ne les supprime pas sans le dire.
images = json.loads((R / "data" / "images.json").read_text())
illustres = {i["termId"] for i in images}
for tid in sorted(suppr & illustres):
    problemes.append(f"{tid} : suppression ignorée, le terme a déjà des images dans le jeu")
suppr -= illustres

restants = [t for t in termes if t["id"] not in suppr]
for t in restants:
    t["incompatibles"] = [i for i in t.get("incompatibles", []) if i not in suppr]
    if not t["incompatibles"]:
        t.pop("incompatibles", None)

print(f"{len(fichiers)} fichiers : {modifs} modifications, {len(suppr)} suppressions → {len(restants)} termes")
for p in problemes:
    print(" !", p)
for b in bilans:
    print(" ·", b)
if "--ecrire" in sys.argv:
    CANDIDATS.write_text(json.dumps(restants, ensure_ascii=False, indent=2) + "\n")
    (DOSSIER / "appliquees").mkdir(exist_ok=True)
    for f in fichiers:
        f.rename(DOSSIER / "appliquees" / f.name)
    (DOSSIER / "supprimes.txt").open("a").write("".join(f"{i}\n" for i in sorted(suppr)))
    print("→ appliqué")

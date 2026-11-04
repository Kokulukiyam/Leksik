"""État de la chaîne du contenu, terme par terme.

  python3 scripts/avancement.py                 résumé
  python3 scripts/avancement.py --premiere=N    les N prochains termes prêts pour la première vérification
                                                (téléchargés, pas encore vérifiés), par priorité
  python3 scripts/avancement.py --contre        termes dont des images validées attendent la contre-vérification
"""
import json
import sys
from collections import Counter
from pathlib import Path

R = Path(__file__).resolve().parents[1]
TERMES = json.loads((R / "scripts" / "termes-candidats.json").read_text())
contre = set()
for f in (R / "tmp" / "verif" / "contre").glob("*.json"):
    contre |= {r["cle"] for r in json.loads(f.read_text())}


def etat(t):
    meta = R / "tmp" / "commons" / t["id"] / "meta.json"
    if not meta.exists():
        return "à télécharger", 0
    cands = json.loads(meta.read_text())["candidats"]
    prem = R / "tmp" / "verif" / "premiere" / f"{t['id']}.json"
    verdicts = {c["fichier"]: c for c in json.loads(prem.read_text())["candidats"]} if prem.exists() else {}
    if not cands:
        return "sans candidate", 0
    if any(c["fichier"] not in verdicts for c in cands):
        return "à vérifier (1re)", 0
    valides = [c for c in cands if verdicts[c["fichier"]]["verdict"] == "validée"]
    if any(f"{t['id']}/{c['fichier'][:-4]}" not in contre for c in valides):
        return "à contre-vérifier", 0
    return "terminé", len(valides)


etats = [(t, *etat(t)) for t in TERMES]
args = sys.argv[1:]
prio = lambda t: t.get("priorite", 0)
if any(a.startswith("--premiere=") for a in args):
    n = int(next(a for a in args if a.startswith("--premiere="))[11:])
    print(" ".join([t["id"] for t, e, _ in sorted(etats, key=lambda x: prio(x[0])) if e == "à vérifier (1re)"][:n]))
elif "--contre" in args:
    print(" ".join(t["id"] for t, e, _ in etats if e == "à contre-vérifier"))
else:
    print(f"{len(TERMES)} termes")
    for e, n in Counter(e for _, e, _ in etats).most_common():
        print(f"  {e} : {n}")
    images = json.loads((R / "data" / "images.json").read_text())
    print(f"Jeu (data/) : {len(json.loads((R / 'data' / 'terms.json').read_text()))} termes, "
          f"{sum(i['statut'] == 'validée' for i in images)} images validées")

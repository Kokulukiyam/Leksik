"""Prépare la contre-vérification : pour chaque image validée à la première vérification,
une copie avec son rectangle dessiné, et un lot par catégorie ne contenant que l'image,
le terme et sa définition (sans la note de la première vérification).

  python3 scripts/verif/preparer_contre.py [termId ...]
      -> tmp/verif/contre-images/<termId>-<NN>.jpg
      -> tmp/verif/contre-lots/<categorie>.json
  python3 scripts/verif/preparer_contre.py --lot=<nom> [termId ...]
      -> un seul lot tmp/verif/contre-lots/<nom>.json, sans les images déjà contre-vérifiées
         (résultat attendu dans tmp/verif/contre/<nom>.json)
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from outils import RACINE, dessiner_cadre, ouvrir, reduire  # noqa: E402

TERMES = json.loads((RACINE / "scripts" / "termes-candidats.json").read_text())
PREM = RACINE / "tmp" / "verif" / "premiere"
IMG = RACINE / "tmp" / "verif" / "contre-images"
LOTS = RACINE / "tmp" / "verif" / "contre-lots"


def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def deja_jugees():
    cles = set()
    for f in (RACINE / "tmp" / "verif" / "contre").glob("*.json"):
        cles |= {r["cle"] for r in json.loads(f.read_text())}
    return cles


def main(filtre, lot=None):
    jugees = deja_jugees() if lot else set()
    IMG.mkdir(parents=True, exist_ok=True)
    LOTS.mkdir(parents=True, exist_ok=True)
    lots = {}
    for t in TERMES:
        if filtre and t["id"] not in filtre:
            continue
        f = PREM / f"{t['id']}.json"
        if not f.exists():
            continue
        for c in json.loads(f.read_text())["candidats"]:
            if c["verdict"] != "validée":
                continue
            nn = c["fichier"][:-4]
            if f"{t['id']}/{nn}" in jugees:
                continue
            img = reduire(ouvrir(t["id"], nn), 1280)
            r = c.get("rectangle")
            if r:
                img = dessiner_cadre(img, r["x"], r["y"], r["largeur"], r["hauteur"])
            chemin = IMG / f"{t['id']}-{nn}.jpg"
            img.save(chemin, quality=88)
            # Mauvaises réponses possibles : la catégorie, sans les termes incompatibles (jamais proposés avec lui).
            inc = set(t.get("incompatibles", [])) | {x["id"] for x in TERMES if t["id"] in x.get("incompatibles", [])}
            voisins = [x["terme"] for x in TERMES if x["categorie"] == t["categorie"] and x["id"] != t["id"] and x["id"] not in inc]
            lots.setdefault(t["categorie"], []).append(
                {
                    "cle": f"{t['id']}/{nn}",
                    "image": str(chemin),
                    "rectangle": bool(r),
                    "terme": t["terme"],
                    "definition": t["definition"],
                    "autres_termes_de_la_categorie": voisins,
                }
            )
    if lot:
        items = [x for cat in lots.values() for x in cat]
        out = LOTS / f"{lot}.json"
        out.write_text(json.dumps(items, ensure_ascii=False, indent=2))
        print(out, len(items))
        return
    for cat, items in lots.items():
        out = LOTS / f"{slug(cat)}.json"
        out.write_text(json.dumps(items, ensure_ascii=False, indent=2))
        print(out, len(items))


if __name__ == "__main__":
    lot = next((a[6:] for a in sys.argv[1:] if a.startswith("--lot=")), None)
    main({a for a in sys.argv[1:] if not a.startswith("--")}, lot)

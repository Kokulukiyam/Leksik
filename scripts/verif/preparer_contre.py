"""Prépare la contre-vérification : pour chaque image validée à la première vérification,
une copie avec son rectangle dessiné, et un lot par catégorie ne contenant que l'image,
le terme et sa définition (sans la note de la première vérification).

  python3 scripts/verif/preparer_contre.py [termId ...]
      -> tmp/verif/contre-images/<termId>-<NN>.jpg
      -> tmp/verif/contre-lots/<categorie>.json
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


def main(filtre):
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
            img = reduire(ouvrir(t["id"], nn), 1280)
            r = c.get("rectangle")
            if r:
                img = dessiner_cadre(img, r["x"], r["y"], r["largeur"], r["hauteur"])
            chemin = IMG / f"{t['id']}-{nn}.jpg"
            img.save(chemin, quality=88)
            voisins = [x["terme"] for x in TERMES if x["categorie"] == t["categorie"] and x["id"] != t["id"]]
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
    for cat, items in lots.items():
        out = LOTS / f"{slug(cat)}.json"
        out.write_text(json.dumps(items, ensure_ascii=False, indent=2))
        print(out, len(items))


if __name__ == "__main__":
    main(set(sys.argv[1:]))

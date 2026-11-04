"""Outils de vérification visuelle des images candidates (tmp/commons/<termId>/NN.jpg).

  python3 scripts/verif/outils.py planche <termId>
      -> tmp/verif/<termId>-planche.jpg : toutes les candidates numérotées.
  python3 scripts/verif/outils.py grille <termId> <NN>
      -> tmp/verif/<termId>-NN-grille.jpg : l'image avec une grille de repérage tous les 10 %.
  python3 scripts/verif/outils.py cadre <termId> <NN> <x> <y> <largeur> <hauteur>
      -> tmp/verif/<termId>-NN-cadre.jpg : l'image avec le rectangle dessiné (valeurs 0–1).
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

RACINE = Path(__file__).resolve().parents[2]
CANDIDATS = RACINE / "tmp" / "commons"
SORTIE = RACINE / "tmp" / "verif"


def police(taille):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(f, taille)
        except OSError:
            pass
    return ImageFont.load_default()


def ouvrir(term_id, nn):
    img = Image.open(CANDIDATS / term_id / f"{nn}.jpg")
    return ImageOps.exif_transpose(img).convert("RGB")


def reduire(img, cote=1100):
    img = img.copy()
    img.thumbnail((cote, cote))
    return img


def dessiner_cadre(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    W, H = img.size
    x0, y0, x1, y1 = x * W, y * H, (x + w) * W, (y + h) * H
    e = max(3, round(min(W, H) / 250))
    d.rectangle([x0 - e, y0 - e, x1 + e, y1 + e], outline=(0, 0, 0), width=e)
    d.rectangle([x0, y0, x1, y1], outline=(255, 214, 10), width=e)
    d.rectangle([x0 + e, y0 + e, x1 - e, y1 - e], outline=(0, 0, 0), width=max(1, e // 2))
    return img


def planche(term_id):
    meta = json.loads((CANDIDATS / term_id / "meta.json").read_text())
    vignettes = []
    for c in meta["candidats"]:
        # Candidates non téléchargées sur cette machine (NN.jpg non versionnés) : ignorées.
        if not (CANDIDATS / term_id / c["fichier"]).exists():
            continue
        im = ouvrir(term_id, c["fichier"][:-4])
        im.thumbnail((520, 400))
        vignettes.append((c["fichier"][:-4], im))
    if not vignettes:
        print("aucune candidate")
        return
    cols = 3
    rows = (len(vignettes) + cols - 1) // cols
    planche = Image.new("RGB", (cols * 530, rows * 410), (30, 30, 30))
    f = police(34)
    for i, (nn, im) in enumerate(vignettes):
        ox, oy = (i % cols) * 530 + 5, (i // cols) * 410 + 5
        planche.paste(im, (ox, oy))
        d = ImageDraw.Draw(planche)
        d.rectangle([ox, oy, ox + 62, oy + 44], fill=(0, 0, 0))
        d.text((ox + 6, oy + 2), nn, fill=(255, 214, 10), font=f)
    SORTIE.mkdir(parents=True, exist_ok=True)
    out = SORTIE / f"{term_id}-planche.jpg"
    planche.save(out, quality=85)
    print(out)


def grille(term_id, nn):
    img = reduire(ouvrir(term_id, nn))
    d = ImageDraw.Draw(img)
    W, H = img.size
    f = police(14)
    for k in range(1, 10):
        x, y = W * k / 10, H * k / 10
        d.line([(x, 0), (x, H)], fill=(0, 255, 255), width=1)
        d.line([(0, y), (W, y)], fill=(0, 255, 255), width=1)
        d.text((x + 2, 2), f".{k}", fill=(0, 255, 255), font=f)
        d.text((2, y + 2), f".{k}", fill=(0, 255, 255), font=f)
    SORTIE.mkdir(parents=True, exist_ok=True)
    out = SORTIE / f"{term_id}-{nn}-grille.jpg"
    img.save(out, quality=88)
    print(out, f"{W}x{H}")


def cadre(term_id, nn, x, y, w, h):
    img = dessiner_cadre(reduire(ouvrir(term_id, nn)), x, y, w, h)
    SORTIE.mkdir(parents=True, exist_ok=True)
    out = SORTIE / f"{term_id}-{nn}-cadre.jpg"
    img.save(out, quality=88)
    print(out)


if __name__ == "__main__":
    cmd, *a = sys.argv[1:]
    if cmd == "planche":
        planche(a[0])
    elif cmd == "grille":
        grille(a[0], a[1])
    elif cmd == "cadre":
        cadre(a[0], a[1], *map(float, a[2:6]))
    else:
        print(__doc__)

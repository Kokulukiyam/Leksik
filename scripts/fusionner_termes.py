"""Contrôle les listes de nouveaux termes (scripts/termes/*.json (les listes déjà fusionnées sont rangées dans scripts/termes/listes-agents/)) et les ajoute à scripts/termes-candidats.json.

  python3 scripts/fusionner_termes.py            contrôle seulement (affiche les problèmes)
  python3 scripts/fusionner_termes.py --ecrire   ajoute les termes valides à termes-candidats.json

Règles : champs complets, catégorie connue, id au bon format et unique, terme avec article, pas de doublon
du terme (aux accents, majuscules et article près) ; les ids inconnus sont retirés de `incompatibles`.
Les termes déjà présents dans termes-candidats.json ne sont pas modifiés.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

R = Path(__file__).resolve().parents[1]
CANDIDATS = R / "scripts" / "termes-candidats.json"
CATEGORIES = re.findall(r'^  "(.+)",$', (R / "lib" / "shared.ts").read_text().split("as const")[0], re.M)
ARTICLE = re.compile(r"^(l['’]\s*|le\s+|la\s+|les\s+)")


def normaliser(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower().replace("’", "'").strip()
    return re.sub(r"[-\s]+", " ", ARTICLE.sub("", s)).strip()


existants = json.loads(CANDIDATS.read_text())
nouveaux = []
for f in sorted((R / "scripts" / "termes").glob("*.json")):
    for t in json.loads(f.read_text()):
        nouveaux.append((f.name, t))

problemes = []
ids = {t["id"] for t in existants}
termes = {normaliser(t["terme"]): t["id"] for t in existants}
retenus = []
for fichier, t in nouveaux:
    ou = f"{fichier} · {t.get('id')}"
    manque = [k for k in ("id", "terme", "categorie", "definition", "priorite", "requetes") if not t.get(k)]
    if manque:
        problemes.append(f"{ou} : champs manquants {manque}")
        continue
    if t["categorie"] not in CATEGORIES:
        problemes.append(f"{ou} : catégorie inconnue « {t['categorie']} »")
        continue
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", t["id"]):
        problemes.append(f"{ou} : id mal formé")
        continue
    if not ARTICLE.match(t["terme"]):
        problemes.append(f"{ou} : terme sans article « {t['terme']} »")
        continue
    if t["priorite"] not in (1, 2, 3):
        problemes.append(f"{ou} : priorité {t['priorite']}")
        continue
    if t["id"] in ids:
        problemes.append(f"{ou} : id en double")
        continue
    n = normaliser(t["terme"])
    if n in termes:
        problemes.append(f"{ou} : terme « {t['terme']} » en double avec {termes[n]}")
        continue
    ids.add(t["id"])
    termes[n] = t["id"]
    retenus.append(t)

for t in retenus:
    inc = t.get("incompatibles") or []
    connus = [i for i in inc if i in ids and i != t["id"]]
    if len(connus) != len(inc):
        problemes.append(f"{t['id']} : incompatibles inconnus retirés {sorted(set(inc) - set(connus))}")
    t["incompatibles"] = connus
    if not t["incompatibles"]:
        del t["incompatibles"]

print(f"{len(nouveaux)} termes proposés, {len(retenus)} valides, {len(problemes)} problèmes")
for p in problemes:
    print(" -", p)
par_cat = {}
for t in existants + retenus:
    par_cat[t["categorie"]] = par_cat.get(t["categorie"], 0) + 1
for c in CATEGORIES:
    print(f"  {c} : {par_cat.get(c, 0)}")

if "--ecrire" in sys.argv:
    champs = ("id", "terme", "categorie", "definition", "priorite", "requetes", "incompatibles")
    ajout = [{k: t[k] for k in champs if k in t} for t in retenus]
    CANDIDATS.write_text(json.dumps(existants + ajout, ensure_ascii=False, indent=2) + "\n")
    print(f"→ {len(ajout)} termes ajoutés à {CANDIDATS.relative_to(R)} ({len(existants) + len(ajout)} au total)")

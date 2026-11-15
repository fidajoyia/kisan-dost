# Real-world ("in the wild") photos per crop from iNaturalist research-grade observations: phone photos of the plant
# in fields and gardens, no disease label. They teach the model which crop a photo shows outside the lab datasets.
# Saved as wild/<crop>/<obs>.jpg, manifest_wild.json with label "<crop>|_plant"; other plants -> label "other".
import json, os, sys, time, io, urllib.request, urllib.parse, concurrent.futures as cf
from PIL import Image
SP = {"wheat": "Triticum aestivum", "rice": "Oryza sativa", "maize": "Zea mays", "cotton": "Gossypium", "sugarcane": "Saccharum officinarum",
 "potato": "Solanum tuberosum", "tomato": "Solanum lycopersicum", "mango": "Mangifera indica", "citrus": "Citrus", "onion": "Allium cepa",
 "chili": "Capsicum annuum", "lentil": "Vicia lens", "groundnut": "Arachis hypogaea", "brinjal": "Solanum melongena", "spinach": "Spinacia oleracea",
 "radish": "Raphanus sativus", "blackgram": "Vigna mungo", "sunflower": "Helianthus annuus", "apple": "Malus domestica", "grape": "Vitis vinifera",
 "guava": "Psidium guajava", "datepalm": "Phoenix dactylifera", "banana": "Musa", "jamun": "Syzygium cumini", "neem": "Azadirachta indica",
 "arjun": "Terminalia arjuna", "moringa": "Moringa oleifera", "mulberry": "Morus", "rose": "Rosa"}
N = int(os.environ.get("N", 300)); UA = {"User-Agent": "kisan-dost-train (student project)"}
def api(params):
    for a in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request("https://api.inaturalist.org/v2/observations?" + urllib.parse.urlencode(params) + "&fields=(id:!t,taxon:(name:!t),photos:(url:!t))", headers=UA), timeout=60))
        except Exception as e: time.sleep(5 + 10 * a)
    return {"results": []}
def save(job):
    u, p = job
    if os.path.exists(p): return 1
    try:
        im = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read())).convert("RGB"); w, h = im.size; k = 256 / min(w, h)
        if k < 1: im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.BILINEAR)
        im.save(p, quality=90); return 1
    except Exception: return 0
man = []
def grab(label, folder, params, n, skip=()):
    os.makedirs(f"wild/{folder}", exist_ok=True); jobs = []; page = 1; seen = set()
    while len(jobs) < n and page <= 12:
        r = api({**params, "quality_grade": "research", "photos": "true", "photo_license": "cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa", "per_page": 200, "page": page})["results"]; page += 1; time.sleep(1.1)
        if not r: break
        for o in r:
            t = (o.get("taxon") or {}).get("name", "")
            if any(t.startswith(s) for s in skip) or not o.get("photos") or o["id"] in seen: continue
            seen.add(o["id"]); jobs.append((o["photos"][0]["url"].replace("square", "medium"), f"wild/{folder}/{o['id']}.jpg"))
            if len(jobs) >= n: break
    with cf.ThreadPoolExecutor(16) as ex: ok = list(ex.map(save, jobs))
    got = [p for (u, p), k in zip(jobs, ok) if k]
    man.extend({"path": p, "label": label, "split": "wild", "ds": "inat:" + folder} for p in got)
    json.dump(man, open("manifest_wild.json", "w")); print(folder, len(got), flush=True)
for crop, taxon in SP.items(): grab(f"{crop}|_plant", crop, {"taxon_name": taxon, "order_by": "votes"}, N)
genera = tuple({t.split()[0] for t in SP.values()})
# other plants: common trees, weeds, ornamentals and crops we do not cover (47126 = Plantae), mostly from South Asia
for i, extra in enumerate([{"place_id": 7155}, {"place_id": 6681}, {"order_by": "votes"}, {"place_id": 7155, "order": "asc"}]):   # 7155 Pakistan, 6681 India
    grab("other", f"_other{i}", {"taxon_id": 47126, **extra}, 700, skip=genera)
print("DONE", len(man), flush=True)

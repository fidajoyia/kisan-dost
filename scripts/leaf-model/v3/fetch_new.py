# Fetch up to CAP photos per class from Hugging Face datasets WITHOUT downloading whole parquet files:
# the datasets-server /rows API pages through the table (100 rows a call) and gives a URL per image.
# Pages are visited in a spread-out order so every class is reached even when the table is sorted by class.
# Every image is shrunk to 256 px on the short side (what the model needs) and saved as new/<crop>__<class>/<n>.jpg
import io, json, os, sys, time, random, urllib.request, urllib.parse, concurrent.futures as cf, collections
from PIL import Image
CAP0 = int(os.environ.get("CAP", 300))
UA = {"User-Agent": "kisan-dost-train"}
def get(url, timeout=120, tries=5):
    for a in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except Exception as e:
            if a == tries - 1: raise
            time.sleep(3 + 5 * a)
def rows(ds, cfg, off):
    q = urllib.parse.urlencode({"dataset": ds, "config": cfg, "split": "train", "offset": off, "length": 100})
    return json.loads(get(f"https://datasets-server.huggingface.co/rows?{q}"))
def save(job):
    global CAP
    url, dst = job
    if os.path.exists(dst): return 1
    try:
        im = Image.open(io.BytesIO(get(url, 180, 3))).convert("RGB"); w, h = im.size; k = 256 / min(w, h)
        if k < 1: im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.BILINEAR)
        im.save(dst, quality=90); return 1
    except Exception as e:
        print("   img fail", str(e)[:60], flush=True); return 0
# spec: crop, dataset, config, total rows, {source label: our label or None to skip}, extra row filter
SPEC = json.load(open(sys.argv[1], encoding="utf-8"))
man = json.load(open("manifest_new.json")) if os.path.exists("manifest_new.json") else []
have = collections.Counter(m["label"] for m in man)
for sp in SPEC:
    crop, ds, cfg, total, mp = sp["crop"], "Project-AgML/" + sp["ds"], sp["cfg"], sp["n"], sp["map"]
    CAP = sp.get("cap", CAP0)
    want = {v for v in mp.values() if v}
    if all(have[f"{crop}|{v}"] >= CAP for v in want): print("done", ds, flush=True); continue
    offs = list(range(0, total, 100)); random.Random(7).shuffle(offs)
    t0 = time.time(); jobs = []
    for off in offs:
        if all(have[f"{crop}|{v}"] >= CAP for v in want): break
        try: r = rows(ds, cfg, off)
        except Exception as e: print("  rows fail", ds, off, str(e)[:60], flush=True); continue
        names = next(f for f in r["features"] if f["name"] == "label")["type"]["names"]
        for x in r["rows"]:
            row = x["row"]
            if sp.get("leaf_only") and row.get("plant_part") not in (None, 1, "leaf"): continue
            our = mp.get(names[row["label"]])
            if not our: continue
            key = f"{crop}|{our}"
            if have[key] >= CAP: continue
            d = os.path.join("new", key.replace("|", "__")); os.makedirs(d, exist_ok=True)
            p = os.path.join(d, f"{sp['ds'][:10]}_{x['row_idx']}.jpg").replace("\\", "/")
            jobs.append((row["image"]["src"], p)); man.append({"path": p, "label": key, "split": "new", "ds": sp["ds"]}); have[key] += 1
        with cf.ThreadPoolExecutor(12) as ex: ok = list(ex.map(save, jobs))
        bad = {p for (u, p), k in zip(jobs, ok) if not k}
        if bad:
            for m in [m for m in man if m["path"] in bad]: have[m["label"]] -= 1
            man = [m for m in man if m["path"] not in bad]
        jobs = []
        json.dump(man, open("manifest_new.json", "w"))
    print(f"{ds}: {[(v, have[f'{crop}|{v}']) for v in sorted(want)]}  {time.time() - t0:.0f}s", flush=True)
print("DONE", len(man), flush=True)

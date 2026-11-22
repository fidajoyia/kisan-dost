# Extra field photos for wheat / rice / maize from ipartzix/Crop_Disease_Image_Dataset (CC-BY-4.0)
import json, os, io, urllib.request, urllib.parse, random, concurrent.futures as cf
from PIL import Image
D = "ipartzix/Crop_Disease_Image_Dataset"
MAP = {"Wheat___Yellow_Rust": "wheat|Stripe Rust", "Wheat___Brown_Rust": "wheat|Leaf Rust", "Wheat___Healthy": "wheat|Healthy Leaf",
       "Rice___Healthy": "rice|Healthy", "Rice___Brown_Spot": "rice|Brown_Spot", "Rice___Leaf_Blast": "rice|Leaf_Blast",
       "Corn_(Maize)___Common_Rust": "maize|Common Rust", "Corn_(Maize)___Northern_Leaf_Blight": "maize|Blight",
       "Corn_(Maize)___Gray_Leaf_Spot_(Cercospora)": "maize|Gray Leaf Spot", "Corn_(Maize)___Healthy": "maize|Healthy"}
CAP = int(os.environ.get("CAP", 600))


def tree():
    out = []; url = f"https://huggingface.co/api/datasets/{D}/tree/main?recursive=true"
    while url:
        r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kd"}), timeout=60); out += json.loads(r.read())
        link = r.headers.get("Link", ""); url = link.split("<")[1].split(">")[0] if 'rel="next"' in link else None
    return [x["path"] for x in out if x["type"] == "file" and x["path"].lower().endswith((".jpg", ".jpeg", ".png"))]


def get(job):
    f, lab = job; out = f"ipz/{lab.replace('|', '__')}/{os.path.basename(f).rsplit('.', 1)[0]}.jpg"
    if os.path.exists(out): return {"path": out, "label": lab, "split": "field", "ds": D}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    for _ in range(4):
        try:
            b = urllib.request.urlopen(urllib.request.Request(f"https://huggingface.co/datasets/{D}/resolve/main/" + urllib.parse.quote(f), headers={"User-Agent": "kd"}), timeout=60).read()
            im = Image.open(io.BytesIO(b)).convert("RGB"); w, h = im.size; k = 256 / min(w, h)
            if k < 1: im = im.resize((round(w * k), round(h * k)), Image.BICUBIC)
            im.save(out, quality=92); return {"path": out, "label": lab, "split": "field", "ds": D}
        except Exception:
            pass
    return None


if __name__ == "__main__":
    files = tree(); jobs = []
    for k, lab in MAP.items():
        fs = sorted(f for f in files if f.split("/")[0] == k); random.Random(7).shuffle(fs)
        jobs += [(f, lab) for f in fs[:CAP]]
    man = []
    with cf.ThreadPoolExecutor(16) as ex:
        for i, r in enumerate(ex.map(get, jobs)):
            if r: man.append(r)
            if i % 500 == 0: print(i, len(jobs), flush=True)
    json.dump(man, open("manifest_ipz.json", "w")); print("DONE", len(man))

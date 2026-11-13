# Streams public crop-disease datasets (Hugging Face parquet), keeps up to CAP images per class,
# resized to 256 px on the short side, saved as data/<crop>/<class>/<n>.jpg. Raw files are deleted
# as soon as they are read. Wheat comes from a field detection set: each box is cut out as one sample.
import io, json, os, sys, urllib.request, collections
import pyarrow.parquet as pq
from PIL import Image

CAP = int(os.environ.get("CAP", 400))
OUT = "data"
SETS = [  # (dataset, config, crop, label field, label names to skip)
    ("Spitblaze/Corn_or_Maize_Leaf_Disease_Dataset", "default", "maize", "label", []),
    ("Project-AgML/rice_leaf_disease_classification", "default", "rice", "label", []),
    ("Project-AgML/sugarcane_leaf_disease_classification", "default", "sugarcane", "label", ["Dried"]),
    ("Project-AgML/cotton_leaf_disease_classification", "raw", "cotton", "label", []),
    ("Project-AgML/cotton_leaf_disease_classification_bangladesh_2", "raw", "cotton", "label", []),
    ("Project-AgML/tomato_leaf_disease", "default", "tomato", "label", []),
    ("Project-AgML/MangoLeafBD_disease_classification", "default", "mango", "label", []),
    ("Project-AgML/potato_leaf_disease_classification", "default", "potato", "label", []),
    ("Project-AgML/citrus_fruit_leaf_disease_classification", "default", "citrus", "label", []),
    ("Project-AgML/wheat_disease_detection", "default", "wheat", "objects", []),
]
SAME = {"Healthy_Leaf": "Healthy", "Healthy Leaf": "Healthy", "Healthy_Rice_Leaf": "Healthy", "healthy": "Healthy",
        "Bacterial_Blight": "Bacterial Blight", "Alternaria_Leaf": "Alternaria", "Fusarium_Wilt": "Fusarium Wilt",
        "Verticillium_Wilt": "Verticillium Wilt", "Common_Rust": "Common Rust", "Gray_Leaf_Spot": "Gray Leaf Spot"}

def get(url, dst):
    req = urllib.request.Request(url, headers={"User-Agent": "kisan-dost-trainer"})
    with urllib.request.urlopen(req, timeout=600) as r, open(dst, "wb") as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)

def save(img, crop, cls, counts):
    key = (crop, cls)
    if counts[key] >= CAP: return
    img = img.convert("RGB"); w, h = img.size; k = 256 / min(w, h)
    if k < 1: img = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.BILINEAR)
    d = os.path.join(OUT, crop, cls.replace("/", "-")); os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, f"{counts[key]:04d}.jpg"), quality=90); counts[key] += 1

counts = collections.Counter(); seen = collections.Counter()  # seen: images per wheat category (uncapped), to name them
for ds, cfg, crop, field, skip in SETS:
    if len(sys.argv) > 1 and crop not in sys.argv[1:]: continue
    files = json.load(urllib.request.urlopen(f"https://huggingface.co/api/datasets/{ds}/parquet", timeout=60))[cfg]["train"]
    info = json.load(urllib.request.urlopen(f"https://datasets-server.huggingface.co/info?dataset={ds}", timeout=60))["dataset_info"][cfg]["features"]
    names = info["label"]["names"] if field == "label" else None
    for url in files:
        tmp = "/home/claude/leafmodel/_part.parquet"; get(url, tmp)
        pf = pq.ParquetFile(tmp)
        for batch in pf.iter_batches(batch_size=64):
            for row in batch.to_pylist():
                img = Image.open(io.BytesIO(row["image"]["bytes"]))
                if crop == "citrus" and row.get("plant_part") not in (1, "leaf"): continue
                if field == "label":
                    cls = names[row["label"]]
                    if cls in skip: continue
                    save(img, crop, SAME.get(cls, cls), counts)
                else:
                    for cat in set(row["objects"]["categories"]): seen[cat] += 1
                    # detection: cut out each box (x1, y1, x2, y2) with a small margin
                    for box, cat in zip(row["objects"]["bbox"], row["objects"]["categories"]):
                        x1, y1, bw, bh = box; x2, y2 = x1 + bw, y1 + bh; mx, my = bw * 0.08, bh * 0.08  # COCO x, y, w, h
                        c = img.crop((max(0, x1 - mx), max(0, y1 - my), min(img.width, x2 + mx), min(img.height, y2 + my)))
                        if min(c.size) >= 40: save(c, crop, f"cat{cat}", counts)
        os.remove(tmp)
        print(ds, os.path.basename(url), {k[1]: v for k, v in counts.items() if k[0] == crop}, flush=True)
json.dump({"kept": {f"{a}/{b}": n for (a, b), n in counts.items()}, "wheat_images_per_cat": seen}, open(f"counts_{'_'.join(sys.argv[1:]) or 'all'}.json", "w"), indent=1)
print("done")

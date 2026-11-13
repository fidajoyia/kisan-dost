# Extra training data: PlantVillage potato (adds Early Blight), and an "other" class
# (ImageNet-style everyday photos, plain backgrounds, leaves of crops we do not cover).
import io, json, os, numpy as np, torch, pyarrow.parquet as pq
from PIL import Image
from transformers import AutoModel
import train as T
torch.set_num_threads(8); rng = np.random.default_rng(1)
names = json.loads(pq.read_schema("ood/pv0.parquet").metadata[b"huggingface"])["info"]["features"]["label"]["names"]
MAP = {"Potato___Early_blight": ("potato|Early Blight", 1000), "Potato___Late_blight": ("potato|Phytopthora", 1000), "Potato___healthy": ("potato|Healthy", 1000),
       "Background_without_leaves": ("other", 1143)}
for n in names:
    if n.split("___")[0] in ("Apple", "Blueberry", "Cherry", "Grape", "Peach", "Pepper,_bell", "Raspberry", "Soybean", "Squash", "Strawberry"): MAP[n] = ("other", 150)
os.makedirs("ood/x", exist_ok=True)
items = []
for f in ["ood/pv0.parquet", "ood/pv1.parquet"]:
    t = pq.read_table(f); lab = np.array(t.column("label").to_pylist()); col = t.column("image")
    for li, n in enumerate(names):
        if n not in MAP: continue
        idx = np.where(lab == li)[0]
        if not len(idx): continue
        cls, cap = MAP[n]; have = sum(1 for x in items if x[1] == n)
        for i in rng.permutation(idx)[: max(0, cap - have)]:
            p = f"ood/x/{os.path.basename(f)[:3]}_{i}.jpg"
            if not os.path.exists(p): Image.open(io.BytesIO(col[int(i)].as_py()["bytes"])).convert("RGB").save(p, quality=92)
            items.append((cls, n, p))
inet = pq.read_table("ood/inet.parquet", columns=["image"]).column("image")
for i in rng.permutation(len(inet))[:2000]:
    p = f"ood/x/in_{i}.jpg"
    if not os.path.exists(p): Image.open(io.BytesIO(inet[int(i)].as_py()["bytes"])).convert("RGB").save(p, quality=92)
    items.append(("other", "imagenette", p))
print({c: sum(1 for x in items if x[0] == c) for c in sorted({x[0] for x in items})}, flush=True)
fm = T.Feat(AutoModel.from_pretrained("facebook/dinov2-small").eval()).eval()
F, FF = [], []
with torch.no_grad():
    for k in range(0, len(items), 32):
        x = np.stack([T.prep(p) for _, _, p in items[k:k + 32]]).astype(np.float32)
        F.append(fm(torch.tensor(x)).numpy()); FF.append(fm(torch.tensor(x[:, :, :, ::-1].copy())).numpy())
        if k % 640 == 0: print(k, len(items), flush=True)
np.savez("extra_feats.npz", feats=np.concatenate(F), feats_flip=np.concatenate(FF), cls=np.array([c for c, _, _ in items]), src=np.array([n for _, n, _ in items]), paths=np.array([p for _, _, p in items]))
print("saved", flush=True)

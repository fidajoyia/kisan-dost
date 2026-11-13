# mirrored copy of every training photo (augmentation); cached in feats_flip.npz
import os, glob, time, numpy as np, torch
from transformers import AutoModel
import train as T
torch.set_num_threads(2)
m = AutoModel.from_pretrained("facebook/dinov2-small").eval(); fm = T.Feat(m).eval()
cache = "feats_flip.npz"; done = {}
if os.path.exists(cache): z = np.load(cache, allow_pickle=True); done = dict(zip(z["paths"], z["feats"]))
skip = {"potato/Bacteria", "potato/Fungi", "potato/Nematode", "potato/Pest", "potato/Virus", "citrus/melanose"}
todo = [p for d, _ in T.classes() if "/".join(d.split("/")[1:]) not in skip for p in sorted(glob.glob(f"{d}/*.jpg")) if p not in done]
print("todo", len(todo), flush=True); t0 = time.time()
with torch.inference_mode():
    for i in range(0, len(todo), 32):
        b = todo[i:i + 32]; done.update(zip(b, fm(torch.from_numpy(np.stack([T.prep(p, flip=True) for p in b]))).numpy()))
        if (i // 32) % 50 == 0:
            print(f"  {i + len(b)}/{len(todo)} {time.time() - t0:.0f}s", flush=True)
            np.savez(cache, paths=np.array(list(done)), feats=np.stack(list(done.values())))
np.savez(cache, paths=np.array(list(done)), feats=np.stack(list(done.values()))); print("done", flush=True)

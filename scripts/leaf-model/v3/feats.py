# 768-number features (the model's own backbone, int8 = exactly what runs on the phone) for each photo, normal + mirrored.
import json, os, sys, numpy as np, onnxruntime as ort
from PIL import Image
so = ort.SessionOptions(); so.intra_op_num_threads = int(os.environ.get("T", 8))
S = ort.InferenceSession("feat.onnx", so)
MEAN, STD = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
def centre(path):  # same as the app: shortest side 256, centre 224
    im = Image.open(path).convert("RGB"); w, h = im.size; k = 256 / min(w, h)
    r = im.resize((max(224, round(w * k)), max(224, round(h * k))), Image.BILINEAR); W, H = r.size
    return r.crop(((W - 224) // 2, (H - 224) // 2, (W - 224) // 2 + 224, (H - 224) // 2 + 224))
def run(im): return S.run(None, {"pixel_values": ((np.asarray(im, np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1)[None]})[2][0]
man = []
for f in sys.argv[2:]: man += json.load(open(f))
man = [m for m in man if m["split"] in sys.argv[1].split(",")]
out = f"feats_{sys.argv[1].replace(',', '_')}.npz"
done = {}
if os.path.exists(out):
    z = np.load(out, allow_pickle=True); done = {p: (a, b) for p, a, b in zip(z["paths"], z["F"], z["FF"])}
lab = {m["path"]: m["label"] for m in man}; dsm = {m["path"]: m["ds"] for m in man}
def dump():
    ps = list(done); np.savez(out, paths=np.array(ps), labels=np.array([lab.get(p, "") for p in ps]), F=np.stack([done[p][0] for p in ps]), FF=np.stack([done[p][1] for p in ps]),
                              ds=np.array([dsm.get(p, "") for p in ps]))
todo = [m for m in man if m["path"] not in done]; print("todo", len(todo), "done", len(done), flush=True)
for i, m in enumerate(todo):
    try: im = centre(m["path"])
    except Exception as e: print("bad", m["path"], e, flush=True); continue
    done[m["path"]] = (run(im), run(im.transpose(Image.FLIP_LEFT_RIGHT)))
    if i % 1000 == 999: dump(); print(i + 1, len(todo), flush=True)
dump(); print("saved", len(done), flush=True)

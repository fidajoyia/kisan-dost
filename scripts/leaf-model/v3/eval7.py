# Compare leaf models on the SAME held-out photos with the app's own decision rule (centre view and 3-view average).
#   python eval7.py kisan-leaf-v6 kisan-leaf-v7
import sys, json, numpy as np, onnxruntime as ort, collections, random
from PIL import Image

MEAN = np.array([0.485, 0.456, 0.406], np.float32); STD = np.array([0.229, 0.224, 0.225], np.float32)
def arr(im): return ((np.asarray(im, np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
def centre(im):
    w, h = im.size; k = 256 / min(w, h); r = im.resize((max(224, round(w * k)), max(224, round(h * k))), Image.BILINEAR); W, H = r.size
    return r.crop(((W - 224) // 2, (H - 224) // 2, (W - 224) // 2 + 224, (H - 224) // 2 + 224))
def fit(im):
    w, h = im.size; m = max(w, h); c = Image.new("RGB", (m, m), tuple(int(x) for x in np.asarray(im.resize((1, 1), Image.BOX)).reshape(3)))
    c.paste(im, ((m - w) // 2, (m - h) // 2)); return c.resize((224, 224), Image.BILINEAR)

class Model:
    def __init__(s, name):
        lab = json.load(open(name + "-labels.json", encoding="utf-8")); s.labels = lab["labels"]; s.guard = lab.get("guard")
        s.sess = ort.InferenceSession(name + ".onnx", providers=["CPUExecutionProvider"]); s.O = s.labels.index("other"); s.name = name
        s.outs = [o.name for o in s.sess.get_outputs()]
    def views(s, im, tta):
        c = centre(im); return [c, fit(im), c.transpose(Image.FLIP_LEFT_RIGHT)] if tta else [c]
    def decide(s, path, tta):
        im = Image.open(path).convert("RGB"); P = []; sims = []
        for v in s.views(im, tta):
            o = dict(zip(s.outs, s.sess.run(None, {"pixel_values": arr(v)}))); P.append(o["probs"][0]); sims.append(float(o["sim"].ravel()[0]))
        pr = np.mean(P, 0); sim = max(sims); L = s.labels; O = s.O
        if pr[O] >= 0.5 or (s.guard is not None and sim < s.guard): return "notcrop", None, None
        rest = 1 - pr[O]; cp = collections.defaultdict(float)
        for i, l in enumerate(L):
            if i != O: cp[l.split("|")[0]] += pr[i] / rest
        c = max(cp, key=cp.get)
        if cp[c] < 0.3: return "unclear", c, None
        mine = sorted([i for i in range(len(L)) if i != O and L[i].startswith(c + "|")], key=lambda i: -pr[i])
        if L[mine[0]].endswith("|_plant"): return "crop", c, "_plant"
        leaf = [i for i in mine if not L[i].endswith("|_plant")]; sm = sum(pr[i] for i in leaf)
        if pr[leaf[0]] / sm < 0.6: return "crop", c, "_leafonly"
        return "crop", c, L[leaf[0]].split("|", 1)[1]

def score(m, items, tta, other_test=False):
    r = collections.Counter(); dis = [0, 0]
    for p, y in items:
        k, c, d = m.decide(p, tta)
        if other_test: r["refused" if k == "notcrop" else "named"] += 1; continue
        crop, want = y.split("|", 1)
        if k != "crop": r[k] += 1; continue
        r["right" if c == crop else "wrong"] += 1
        if c == crop and not want.startswith("_") and d not in ("_plant", "_leafonly"): dis[1] += 1; dis[0] += (d == want)
        if c == crop and not want.startswith("_"): r["dis_total"] += 1
    n = len(items)
    if other_test: return {"other plants refused": round(100 * r["refused"] / n, 1)}
    out = {"crop right": round(100 * r["right"] / n, 1), "wrong crop": round(100 * r["wrong"] / n, 1), "retake": round(100 * (r["unclear"] + r["notcrop"]) / n, 1)}
    if dis[1]: out["disease right (when named)"] = round(100 * dis[0] / dis[1], 1); out["disease named"] = round(100 * dis[1] / max(1, r["dis_total"]), 1)
    return out

if __name__ == "__main__":
    tests = json.load(open("ft7_tests.json")); rs = random.Random(5)
    others = [t for v in tests.values() for t in v if t[1] == "other"]
    tests = {k: [t for t in v if t[1] != "other"] for k, v in tests.items()}
    for k in ("ORIG20", "NEW20"): tests[k] = rs.sample(tests[k], 1200)
    others = rs.sample(others, min(800, len(others)))
    res = {}
    for name in sys.argv[1:]:
        m = Model(name)
        for tta in (False, True):
            tag = f"{name} {'3-view' if tta else 'centre'}"
            for k in ("ORIG20", "UNSEEN", "NEW20", "WILD20", "FIELD20", "IPZ20", "DIGI50"):
                res[f"{tag} {k}"] = score(m, tests[k], tta); print(tag, k, len(tests[k]), res[f"{tag} {k}"], flush=True)
            res[f"{tag} OTHER"] = score(m, others, tta, True); print(tag, "OTHER", len(others), res[f"{tag} OTHER"], flush=True)
            print(tag, "user cotton photo:", m.decide("user_cotton.png", tta), flush=True)
    json.dump(res, open("eval7.json", "w"), indent=1)

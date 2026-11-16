# v4 vs v5 on the same held-out photos, with the app's exact decision rule (crop first, 60% rules, "other"/guard check).
# Also: same leaf photographed again (shift / zoom / light / tilt / JPEG): does the answer stay the same?
import json, sys, io, collections, numpy as np, onnxruntime as ort, random
from PIL import Image, ImageEnhance
from ft import split, centre, tensor
so = ort.SessionOptions(); so.log_severity_level = 3; so.intra_op_num_threads = int(__import__("os").environ.get("T", 14))
def model(name):
    S = ort.InferenceSession(name + ".onnx", so); L = json.load(open(name + "-labels.json")); lab = L["labels"]
    return S, lab, L["guard"], lab.index("other"), [l.split("|")[0] if l != "other" else None for l in lab]
def answer(m, im):
    S, lab, g, O, ci = m
    pr, sim = S.run(["probs", "sim"], {"pixel_values": tensor(centre(im))[None]}); pr = pr[0]; sim = float(np.ravel(sim)[0])
    if pr[O] >= .5 or sim < g: return "notcrop"
    rest = 1 - pr[O]; cp = collections.Counter()
    for i, c in enumerate(ci):
        if c: cp[c] += pr[i] / rest
    c, p = cp.most_common(1)[0]
    if p < .6: return "unclear"
    mine = sorted([i for i, x in enumerate(ci) if x == c], key=lambda i: -pr[i])
    if lab[mine[0]].endswith("_plant"): return c + "|_plant"
    leaf = [i for i in mine if not lab[i].endswith("_plant")]; s = sum(pr[i] for i in leaf)
    return lab[leaf[0]] if pr[leaf[0]] / s >= .6 else c + "|_leaf"
def retake(im, rng):
    w, h = im.size; s = rng.uniform(.8, 1.0); cw, ch = int(w * s), int(h * s)
    x0, y0 = rng.randint(0, w - cw), rng.randint(0, h - ch); v = im.crop((x0, y0, x0 + cw, y0 + ch)).rotate(rng.uniform(-10, 10), resample=Image.BILINEAR, fillcolor=(128, 128, 128))
    v = ImageEnhance.Brightness(v).enhance(rng.uniform(.8, 1.2)); v = ImageEnhance.Color(v).enhance(rng.uniform(.85, 1.15))
    b = io.BytesIO(); v.save(b, "JPEG", quality=rng.randint(60, 92)); return Image.open(io.BytesIO(b.getvalue())).convert("RGB")
crop = lambda y: y.split("|")[0]
labels, tr, tests = split()
models = {n: model(n) for n in sys.argv[1:]}
out = {}
for n, m in models.items():
    r = {}
    for t, items in tests.items():
        a = [(answer(m, Image.open(p).convert("RGB")), y) for p, y in items]
        real = [(x, y) for x, y in a if y != "other"]
        if t == "WILD20":
            named = [(x, y) for x, y in real if x not in ("notcrop", "unclear")]
            r[t] = {"right crop named": round(100 * np.mean([crop(x) == crop(y) for x, y in real]), 1),
                    "wrong crop named": round(100 * np.mean([x not in ("notcrop", "unclear") and crop(x) != crop(y) for x, y in real]), 1),
                    "asked to retake": round(100 * np.mean([x in ("notcrop", "unclear") for x, y in real]), 1),
                    "other plants refused": round(100 * np.mean([x == "notcrop" for x, y in a if y == "other"]), 1)}
        else:
            r[t] = {"disease right": round(100 * np.mean([x == y for x, y in real]), 1),
                    "crop right": round(100 * np.mean([crop(x) == crop(y) for x, y in real]), 1),
                    "wrong crop": round(100 * np.mean([x not in ("notcrop", "unclear") and crop(x) != crop(y) for x, y in real]), 1),
                    "asked to retake": round(100 * np.mean([x in ("notcrop", "unclear") or x.endswith("|_leaf") for x, y in real]), 1)}
        print(n, t, r[t], flush=True)
    # stability: 150 dataset leaves (cotton, guava, wheat, rice, tomato...), each photographed 5 times
    rs = random.Random(0); pool = [x for x in tests["ORIG20"] + tests["NEW20"] if x[1] != "other"]; pick = rs.sample(pool, 150)
    same = right = 0
    for k, (p, y) in enumerate(pick):
        im = Image.open(p).convert("RGB"); shots = [im] + [retake(im, random.Random(k * 10 + j)) for j in range(4)]
        a = [answer(m, s) for s in shots]; same += len(set(a)) == 1; right += np.mean([x == y for x in a])
    r["STABLE"] = {"same answer on 5 shots": round(100 * same / 150, 1), "right per shot": round(100 * right / 150, 1)}
    print(n, "STABLE", r["STABLE"], flush=True); out[n] = r
json.dump(out, open("compare_v4_v5.json", "w"), indent=1)

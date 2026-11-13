# Kisan Dost leaf model: DINOv2-small image features (frozen) + our own classifier trained on
# public field datasets of Pakistan's crops. 80/20 stratified split; accuracy reported on the
# held-out 20% that the classifier never saw. Exports one ONNX file (backbone + head + softmax).
import json, os, sys, time, glob, numpy as np, torch
from PIL import Image
from transformers import AutoModel

torch.set_num_threads(2)
MEAN, STD = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
WHEAT = json.load(open("wheat_names.json")) if os.path.exists("wheat_names.json") else {}

def prep(path, flip=False):
    im = Image.open(path).convert("RGB"); w, h = im.size; k = 256 / min(w, h)
    im = im.resize((max(224, round(w * k)), max(224, round(h * k))), Image.BILINEAR); w, h = im.size
    l, t = (w - 224) // 2, (h - 224) // 2; im = im.crop((l, t, l + 224, t + 224))
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = (np.asarray(im, np.float32) / 255 - MEAN) / STD
    return a.transpose(2, 0, 1)

class Feat(torch.nn.Module):  # CLS token + mean patch token, the usual DINOv2 linear-probe feature
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, x):
        h = s.m(pixel_values=x).last_hidden_state
        return torch.cat([h[:, 0], h[:, 1:].mean(1)], 1)

def classes():
    out = []
    for d in sorted(glob.glob("data/*/*")):
        crop, cls = d.split("/")[1:]
        if crop == "wheat":
            if cls not in WHEAT: continue
            cls = WHEAT[cls]
        out.append((d, f"{crop}|{cls}"))
    return out

def extract(model):
    cache = "feats.npz"; done = {}
    if os.path.exists(cache):
        z = np.load(cache, allow_pickle=True); done = dict(zip(z["paths"], z["feats"]))
    todo = [p for d, _ in classes() for p in sorted(glob.glob(f"{d}/*.jpg")) if p not in done]
    print("to extract", len(todo), "cached", len(done), flush=True)
    t0 = time.time()
    with torch.inference_mode():
        for i in range(0, len(todo), 32):
            b = todo[i:i + 32]
            f = model(torch.from_numpy(np.stack([prep(p) for p in b]))).numpy()
            done.update(zip(b, f))
            if (i // 32) % 25 == 0:
                print(f"  {i + len(b)}/{len(todo)}  {time.time() - t0:.0f}s", flush=True)
                np.savez(cache, paths=np.array(list(done)), feats=np.stack(list(done.values())))
    np.savez(cache, paths=np.array(list(done)), feats=np.stack(list(done.values())))
    return done

if __name__ == "__main__":
    m = AutoModel.from_pretrained("facebook/dinov2-small").eval(); fm = Feat(m).eval()
    feats = extract(fm)
    if sys.argv[1:2] == ["extract"]: sys.exit(0)
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    X, y, names = [], [], []
    for d, label in classes():
        for p in sorted(glob.glob(f"{d}/*.jpg")):
            X.append(feats[p]); y.append(label)
    X, y = np.stack(X).astype(np.float32), np.array(y)
    labels = sorted(set(y)); yi = np.array([labels.index(v) for v in y])
    Xtr, Xte, ytr, yte = train_test_split(X, yi, test_size=0.2, stratify=yi, random_state=42)
    mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-6
    C = float(os.environ.get("C", 0.5))
    clf = LogisticRegression(C=C, max_iter=4000, n_jobs=2).fit((Xtr - mu) / sd, ytr)
    pr = clf.predict((Xte - mu) / sd); acc = accuracy_score(yte, pr)
    crop_acc = np.mean([labels[a].split("|")[0] == labels[b].split("|")[0] for a, b in zip(yte, pr)])
    print(f"\nTEST accuracy (held-out {len(yte)} photos): {acc * 100:.2f}%   crop correct: {crop_acc * 100:.2f}%   C={C}")
    rep = classification_report(yte, pr, target_names=labels, digits=3, output_dict=True)
    worst = sorted(((rep[l]["f1-score"], l, rep[l]["support"]) for l in labels))[:12]
    for f1, l, n in worst: print(f"  f1 {f1:.3f}  {l}  (n={n})")
    json.dump({"accuracy": acc, "crop_accuracy": crop_acc, "n_test": int(len(yte)), "n_train": int(len(ytr)), "classes": len(labels),
               "per_class": {l: {k: rep[l][k] for k in ("precision", "recall", "f1-score", "support")} for l in labels}},
              open("metrics.json", "w"), indent=1)
    if sys.argv[1:2] == ["export"]:
        # final model trained on all data; standardisation folded into the linear layer
        Xall = (X - mu) / sd
        clf = LogisticRegression(C=C, max_iter=4000, n_jobs=2).fit(Xall, yi)
        W = clf.coef_ / sd; b = clf.intercept_ - (clf.coef_ / sd) @ mu
        class Full(torch.nn.Module):
            def __init__(s):
                super().__init__(); s.f = fm; s.h = torch.nn.Linear(W.shape[1], W.shape[0])
                s.h.weight.data = torch.tensor(W, dtype=torch.float32); s.h.bias.data = torch.tensor(b, dtype=torch.float32)
            def forward(s, pixel_values): return torch.softmax(s.h(s.f(pixel_values)), -1)
        full = Full().eval()
        torch.onnx.export(full, (torch.randn(1, 3, 224, 224),), "kisan-leaf.onnx", input_names=["pixel_values"], output_names=["probs"],
                          opset_version=17, dynamo=False, dynamic_axes={"pixel_values": {0: "n"}, "probs": {0: "n"}})
        json.dump(labels, open("kisan-leaf-labels.json", "w"), ensure_ascii=False)
        print("exported kisan-leaf.onnx", os.path.getsize("kisan-leaf.onnx") // 1e6, "MB")

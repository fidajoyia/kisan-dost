# Kisan Dost leaf model v3: the same on-phone image backbone (DINOv2-small, int8, taken from v2 so features are
# exactly what the phone computes) + a new classifier head for 9 old and 20 new crops / trees / roses.
# Tests (photos never used for training):
#   ORIG20  = the original 20% hold-out of the v2 data (same split, seed 42)
#   UNSEEN  = photos from the same public datasets that v2 never used (rows after the 400th per class)
#   NEW20   = 20% hold-out of the newly added crops
# Decision rule identical to the app: refused if P(other) >= 0.5 or similarity to the nearest class centre < guard.
import json, sys, time, collections, numpy as np, onnx
from onnx import helper, numpy_helper, TensorProto
from sklearn.model_selection import train_test_split

MIN_CLASS = 40
SKIP = {"potato|Bacteria", "potato|Fungi", "potato|Nematode", "potato|Pest", "potato|Virus", "citrus|melanose"}
PV_MAP = {"Apple___healthy": "apple|Healthy", "Grape___healthy": "grape|Healthy"}   # PlantVillage leaves of crops we now cover
PV_DROP = ("Apple___", "Grape___", "Pepper,_bell___")                             # diseases we do not cover / chilli look-alikes

def load(npz, mans):
    z = np.load(npz, allow_pickle=True); man = {}
    for f in mans:
        for m in json.load(open(f)): man[m["path"]] = m
    if not mans:  # unseen photos: label stored in the npz, split = folder (test/ or train/)
        man = {p: {"label": l, "split": p.split("/")[0], "ds": d} for p, l, d in zip(z["paths"], z["labels"], z["ds"])}
    P, F, FF, Y, SP = [], [], [], [], []
    for p, f, ff in zip(z["paths"], z["F"], z["FF"]):
        m = man.get(p)
        if not m: continue
        lab, ds = m["label"], m.get("ds", "")
        if ds in PV_MAP: lab = PV_MAP[ds]
        elif ds.startswith(PV_DROP): continue
        if lab in SKIP: continue
        P.append(p); F.append(f); FF.append(ff); Y.append(lab); SP.append(m.get("split", ""))
    return np.array(P), np.stack(F), np.stack(FF), np.array(Y), np.array(SP)

t0 = time.time()
Po, Fo, FFo, Yo, _ = load("feats_orig.npz", ["manifest_orig.json", "manifest_extra.json"])
Pu, Fu, FFu, Yu, Su = load("feats_test_train.npz", [])
Pn, Fn, FFn, Yn, _ = load("feats_new.npz", ["manifest_new.json"])
cnt = collections.Counter(list(Yo) + list(Yn))
keep_lab = {l for l, n in cnt.items() if n >= MIN_CLASS}
print("dropped (too few photos):", {l: n for l, n in cnt.items() if n < MIN_CLASS}, flush=True)
def sel(*a):
    m = np.array([y in keep_lab for y in a[3]]); return [x[m] for x in a]
Po, Fo, FFo, Yo, _ = sel(Po, Fo, FFo, Yo, Yo); Pn, Fn, FFn, Yn, _ = sel(Pn, Fn, FFn, Yn, Yn); Pu, Fu, FFu, Yu, Su = sel(Pu, Fu, FFu, Yu, Su)
labels = sorted(keep_lab); L = {l: i for i, l in enumerate(labels)}; O = L["other"]
io_tr, io_te = train_test_split(np.arange(len(Yo)), test_size=0.2, stratify=Yo, random_state=42)
in_tr, in_te = train_test_split(np.arange(len(Yn)), test_size=0.2, stratify=Yn, random_state=42)
ut, uf = Su == "test", Su == "train"
Xtr = np.concatenate([Fo[io_tr], FFo[io_tr], Fn[in_tr], FFn[in_tr], Fu[uf], FFu[uf]])
Ytr = np.array([L[y] for y in np.concatenate([Yo[io_tr], Yo[io_tr], Yn[in_tr], Yn[in_tr], Yu[uf], Yu[uf]])])
print(f"classes {len(labels)}  train rows {len(Ytr)} (incl. mirrored)  tests: orig {len(io_te)} new {len(in_te)} unseen {ut.sum()}", flush=True)

# small classes repeated up to a third of the median, so they are not drowned out
c = collections.Counter(Ytr); floor = int(np.median(list(c.values())) / 3); rng = np.random.default_rng(0); idx = []
for k, n in c.items():
    ii = np.where(Ytr == k)[0]; idx += list(ii) + (list(rng.choice(ii, floor - n)) if n < floor else [])
Xb, Yb = Xtr[idx], Ytr[idx]
mu, sd = Xb.mean(0), Xb.std(0) + 1e-6
class TorchMLP:
    """Same head as v2 (768 -> 1024 ReLU -> classes), trained on the GPU; 10% of the training rows held back for early stopping."""
    def fit(self, X, Y, n_cls):
        import torch
        torch.manual_seed(0); dev = "cuda" if torch.cuda.is_available() else "cpu"
        tr, va = train_test_split(np.arange(len(Y)), test_size=0.1, stratify=Y, random_state=0)
        Xt, Yt = torch.tensor(X, dtype=torch.float32, device=dev), torch.tensor(Y, device=dev)
        net = torch.nn.Sequential(torch.nn.Linear(X.shape[1], 1024), torch.nn.ReLU(), torch.nn.Linear(1024, n_cls)).to(dev)
        opt = torch.optim.AdamW(net.parameters(), lr=1e-3, weight_decay=1e-2); EP = 60
        sched = torch.optim.lr_scheduler.OneCycleLR(opt, 2e-3, total_steps=EP * (len(tr) // 256 + 1))
        lossf = torch.nn.CrossEntropyLoss(label_smoothing=0.05); best, state, bad = 0, None, 0
        trt, vat = torch.tensor(tr, device=dev), torch.tensor(va, device=dev)
        for ep in range(EP):
            net.train(); perm = trt[torch.randperm(len(trt), device=dev)]
            for i in range(0, len(perm), 256):
                b = perm[i:i + 256]; opt.zero_grad(); lossf(net(Xt[b]), Yt[b]).backward(); opt.step(); sched.step()
            net.eval()
            with torch.no_grad(): a = (net(Xt[vat]).argmax(1) == Yt[vat]).float().mean().item()
            if a > best: best, state, bad = a, {k: v.clone() for k, v in net.state_dict().items()}, 0
            else:
                bad += 1
                if bad >= 10: break
        net.load_state_dict(state); self.n_iter_ = ep + 1; self.val_ = best; print(f"device {dev}, val acc {best:.4f}", flush=True)
        self.coefs_ = [net[0].weight.detach().cpu().numpy().T.astype(np.float64), net[2].weight.detach().cpu().numpy().T.astype(np.float64)]
        self.intercepts_ = [net[0].bias.detach().cpu().numpy().astype(np.float64), net[2].bias.detach().cpu().numpy().astype(np.float64)]
        self.classes_ = np.arange(n_cls); return self
    def predict_proba(self, X):
        z = np.maximum(X @ self.coefs_[0] + self.intercepts_[0], 0) @ self.coefs_[1] + self.intercepts_[1]
        z -= z.max(1, keepdims=True); e = np.exp(z); return e / e.sum(1, keepdims=True)
clf = TorchMLP().fit(((Xb - mu) / sd).astype(np.float32), Yb, len(labels))
print(f"trained in {time.time() - t0:.0f}s, {clf.n_iter_} epochs", flush=True)

nrm = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
crop_cls = [i for i in range(len(labels)) if i != O]
Xc = np.concatenate([Fo[io_tr], Fn[in_tr], Fu[uf]]); Yc = np.array([L[y] for y in np.concatenate([Yo[io_tr], Yn[in_tr], Yu[uf]])])
C = nrm(np.stack([nrm(Xc[Yc == i]).mean(0) for i in crop_cls]))
thr = float(np.percentile((nrm(Xc[Yc != O]) @ C.T).max(1), 0.5))

def decide(F):
    P = np.zeros((len(F), len(labels))); P[:, clf.classes_] = clf.predict_proba((F - mu) / sd)
    S = (nrm(F) @ C.T).max(1); q = P.copy(); q[:, O] = -1
    return np.where((P[:, O] >= 0.5) | (S < thr), O, q.argmax(1))
crop = lambda i: labels[i].split("|")[0]
report = {}
for name, F, Y in [("ORIG20", Fo[io_te], Yo[io_te]), ("UNSEEN", Fu[ut], Yu[ut]), ("NEW20", Fn[in_te], Yn[in_te])]:
    y = np.array([L[v] for v in Y]); d = decide(F)
    real = y != O
    acc = (d == y).mean(); cr = np.mean([crop(a) == crop(b) for a, b in zip(d[real], y[real])]); rej = np.mean(d[real] == O)
    pc = collections.defaultdict(list)
    for a, b in zip(d, y): pc[crop(b) if b != O else "other"].append(a == b)
    report[name] = {"n": int(len(y)), "acc": round(acc * 100, 2), "crop": round(cr * 100, 2), "refused": round(rej * 100, 2),
                    "per_crop": {k: round(float(np.mean(v)) * 100, 1) for k, v in sorted(pc.items())}}
    print(name, json.dumps(report[name]), flush=True)
pcls = collections.defaultdict(lambda: [0, 0, 0])  # per class: test photos, correct, predicted as this class
for F, Y in [(Fo[io_te], Yo[io_te]), (Fn[in_te], Yn[in_te]), (Fu[ut], Yu[ut])]:
    d = decide(F)
    for a, b in zip(d, [L[v] for v in Y]): pcls[b][0] += 1; pcls[b][1] += int(a == b); pcls[a][2] += 1
per_class = {labels[k]: {"test_photos": v[0], "recall": round(v[1] / v[0], 3) if v[0] else 0, "precision": round(v[1] / v[2], 3) if v[2] else 0} for k, v in sorted(pcls.items()) if k != O}
weak = sorted(per_class.items(), key=lambda kv: kv[1]["recall"])[:15]
print("weakest:", [(k, v["recall"], v["test_photos"]) for k, v in weak], flush=True)
if "--eval" in sys.argv: sys.exit()

# ---- export: v2's image backbone (unchanged) + this head, same inputs/outputs as the app expects ----
m = onnx.load("feat.onnx"); g = m.graph; FEAT = "/f/Concat_output_0"
need, keep = {FEAT}, []
for n in reversed(list(g.node)):
    if any(o in need for o in n.output): keep.append(n); need.update(i for i in n.input if i)
keep.reverse()
W1 = (clf.coefs_[0] / sd[:, None]).astype(np.float32); b1 = (clf.intercepts_[0] - (mu / sd) @ clf.coefs_[0]).astype(np.float32)
W2 = clf.coefs_[1].astype(np.float32); b2 = clf.intercepts_[1].astype(np.float32)
# columns of the classifier follow clf.classes_; put them in label order (every class is present)
assert list(clf.classes_) == list(range(len(labels)))
inits = [numpy_helper.from_array(a, n) for a, n in [(W1, "h_W1"), (b1, "h_b1"), (W2, "h_W2"), (b2, "h_b2"), (C.T.astype(np.float32), "h_C"), (np.array([1e-12], np.float32), "h_eps"), (np.array([-1], np.int64), "h_ax")]]
nodes = [
    helper.make_node("MatMul", [FEAT, "h_W1"], ["h_m1"]), helper.make_node("Add", ["h_m1", "h_b1"], ["h_a1"]), helper.make_node("Relu", ["h_a1"], ["h_r1"]),
    helper.make_node("MatMul", ["h_r1", "h_W2"], ["h_m2"]), helper.make_node("Add", ["h_m2", "h_b2"], ["h_a2"]), helper.make_node("Softmax", ["h_a2"], ["probs"], axis=-1),
    helper.make_node("ReduceL2", [FEAT], ["h_l2"], axes=[-1], keepdims=1), helper.make_node("Max", ["h_l2", "h_eps"], ["h_l2c"]),
    helper.make_node("Div", [FEAT, "h_l2c"], ["h_n"]), helper.make_node("MatMul", ["h_n", "h_C"], ["h_s"]),
    helper.make_node("ReduceMax", ["h_s"], ["sim"], axes=[-1], keepdims=0),
]
used = {i for n in keep + nodes for i in n.input}
g2 = helper.make_graph(keep + nodes, "kisan-leaf-v3", list(g.input),
    [helper.make_tensor_value_info("probs", TensorProto.FLOAT, ["n", len(labels)]), helper.make_tensor_value_info("sim", TensorProto.FLOAT, ["n"])],
    [i for i in g.initializer if i.name in used] + inits)
m2 = helper.make_model(g2, opset_imports=m.opset_import, producer_name="kisan-dost"); m2.ir_version = m.ir_version
onnx.checker.check_model(m2); onnx.save(m2, "kisan-leaf-v3.onnx")
json.dump({"labels": labels, "guard": round(thr, 4)}, open("kisan-leaf-v3-labels.json", "w"), ensure_ascii=False)
json.dump({"report": report, "per_class": per_class, "labels": labels, "train_rows": int(len(Ytr) // 2)}, open("v3_report.json", "w"), ensure_ascii=False, indent=1)
np.savez("v3_test.npz", P=np.concatenate([Po[io_te], Pn[in_te], Pu[ut]]), Y=np.concatenate([Yo[io_te], Yn[in_te], Yu[ut]]))
print("exported kisan-leaf-v3.onnx", flush=True)

# ---- parity: exported model's head vs numpy head, fed through the full graph on real test photos ----
import onnxruntime as ort, datetime
from PIL import Image
S = ort.InferenceSession("kisan-leaf-v3.onnx")
MEAN, STD = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
def centre(path):
    im = Image.open(path).convert("RGB"); w, h = im.size; k = 256 / min(w, h)
    r = im.resize((max(224, round(w * k)), max(224, round(h * k))), Image.BILINEAR); W, H = r.size
    return r.crop(((W - 224) // 2, (H - 224) // 2, (W - 224) // 2 + 224, (H - 224) // 2 + 224))
rs = np.random.default_rng(1); ok = n = 0; mx = 0
for P_, F_, Y_ in [(Po[io_te], Fo[io_te], Yo[io_te]), (Pn[in_te], Fn[in_te], Yn[in_te])]:
    for i in rs.choice(len(P_), 150, replace=False):
        x = ((np.asarray(centre(P_[i]), np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1)[None]
        pr, sim = S.run(["probs", "sim"], {S.get_inputs()[0].name: x})
        ref = np.zeros(len(labels)); ref[clf.classes_] = clf.predict_proba((F_[i:i + 1] - mu) / sd)[0]
        mx = max(mx, float(np.abs(pr.reshape(-1) - ref).max())); n += 1; ok += int(pr.reshape(-1).argmax() == ref.argmax())
print(f"parity: {ok}/{n} same top class, max prob diff {mx:.4f}", flush=True)

tot = sum(r["n"] for r in report.values())
allF = [(Fo[io_te], Yo[io_te]), (Fn[in_te], Yn[in_te]), (Fu[ut], Yu[ut])]
D = np.concatenate([decide(F) for F, _ in allF]); Yall = np.array([L[v] for _, Y in allF for v in Y]); real = Yall != O
for k, v in per_class.items():
    pr_, rc = v["precision"], v["recall"]; v["f1"] = round(2 * pr_ * rc / (pr_ + rc), 3) if pr_ + rc else 0
card = {"name": "Kisan Dost leaf model v3", "trained": datetime.date.today().isoformat(),
    "test_accuracy": round(float((D == Yall).mean()) * 100, 2),
    "crop_accuracy": round(float(np.mean([crop(a) == crop(b) for a, b in zip(D[real], Yall[real])])) * 100, 2),
    "test_photos": int(len(Yall)), "train_photos": int(len(Ytr) // 2), "classes": len(per_class),
    "crops": sorted({l.split("|")[0] for l in per_class}),
    "method": "Frozen DINOv2-small image features (same int8 backbone as v2) + our MLP classifier (1024 hidden), ONNX, runs in the browser",
    "split": "stratified 80/20, seed 42, plus photos from the same datasets that were never downloaded for training; test photos never used in training",
    "augmentation": "horizontal flip", "tests": report,
    "refused_real_crop_photos_pct": round(float(np.mean(D[real] == O)) * 100, 2),
    "other_class_correct_pct": round(float(np.mean(D[~real] == O)) * 100, 2), "per_class": per_class}
json.dump(card, open("kisan-leaf-card-v3.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("card", {k: card[k] for k in ("test_accuracy", "crop_accuracy", "test_photos", "train_photos", "classes", "refused_real_crop_photos_pct", "other_class_correct_pct")}, len(card["crops"]), flush=True)

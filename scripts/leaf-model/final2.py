# Kisan Dost leaf model v2 = v1 + (a) PlantVillage potato photos incl. a new class "potato|Early Blight",
# (b) an "other" class (everyday photos, bare backgrounds, leaves of crops we do not cover) so the app can say
# "this is not a leaf of a crop we check" instead of naming a disease, and (c) a similarity guard:
# cosine similarity of the photo's features to the nearest crop-class centre; too far = not one of our crops.
import json, glob, os, sys, time, numpy as np, torch
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report
from transformers import AutoModel
import train as T
torch.set_num_threads(2)
SKIP = {"potato|Bacteria", "potato|Fungi", "potato|Nematode", "potato|Pest", "potato|Virus", "citrus|melanose"}
z = np.load("feats.npz", allow_pickle=True); F = dict(zip(z["paths"], z["feats"]))
z2 = np.load("feats_flip.npz", allow_pickle=True); FF = dict(zip(z2["paths"], z2["feats"]))
paths, y = [], []
for d, lab in T.classes():
    if lab in SKIP: continue
    for p in sorted(glob.glob(f"{d}/*.jpg")):
        if p in F: paths.append(p); y.append(lab)
paths = np.array(paths); y = np.array(y)
ptr, pte, ytr, yte = train_test_split(paths, y, test_size=0.2, stratify=y, random_state=42)  # same split as v1
E = np.load("extra_feats.npz", allow_pickle=True)
ei = np.arange(len(E["cls"]))
etr, ete = train_test_split(ei, test_size=0.2, stratify=E["src"], random_state=42)
labels = sorted(set(y) | set(E["cls"]))
L = {l: i for i, l in enumerate(labels)}
have = [i for i, p in enumerate(ptr) if p in FF]
Xtr = np.concatenate([np.stack([F[p] for p in ptr]), np.stack([FF[ptr[i]] for i in have]), E["feats"][etr], E["feats_flip"][etr]])
Ytr = np.concatenate([[L[v] for v in ytr], [L[ytr[i]] for i in have], [L[v] for v in E["cls"][etr]], [L[v] for v in E["cls"][etr]]])
Xte = np.stack([F[p] for p in pte]); Yte = np.array([L[v] for v in yte])
Xe, Ye, Se = E["feats"][ete], np.array([L[v] for v in E["cls"][ete]]), E["src"][ete]
mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-6
clf = MLPClassifier((1024,), alpha=1e-3, early_stopping=True, max_iter=300, random_state=0).fit((Xtr - mu) / sd, Ytr)
P = clf.predict((Xte - mu) / sd)
print(f"v1 test photos: accuracy {accuracy_score(Yte, P) * 100:.2f}%  wrongly called 'other': {np.mean(P == L['other']) * 100:.2f}%", flush=True)
Pe = clf.predict((Xe - mu) / sd)
for s in sorted(set(Se)): m = Se == s; print(f"  extra test {s}: correct {np.mean(Pe[m] == Ye[m]) * 100:.0f}% (n={m.sum()})", flush=True)
# similarity guard on crop classes
nrm = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
crop_cls = [c for c in range(len(labels)) if labels[c] != "other"]
Xall_tr = np.concatenate([np.stack([F[p] for p in ptr]), E["feats"][etr]]); Yall_tr = np.concatenate([[L[v] for v in ytr], [L[v] for v in E["cls"][etr]]])
C = nrm(np.stack([nrm(Xall_tr[Yall_tr == c]).mean(0) for c in crop_cls]))
s_in = np.concatenate([(nrm(Xte) @ C.T).max(1), (nrm(Xe[Ye != L["other"]]) @ C.T).max(1)])
thr = float(np.percentile(s_in, 0.5))
s_oth = (nrm(Xe) @ C.T).max(1)
for s in sorted(set(Se)):
    m = (Se == s)
    if labels[Ye[m][0]] == "other": print(f"  {s}: caught by class {np.mean(Pe[m] == L['other']) * 100:.0f}%, by guard {np.mean(s_oth[m] < thr) * 100:.0f}%, either {np.mean((Pe[m] == L['other']) | (s_oth[m] < thr)) * 100:.0f}%", flush=True)
print(f"guard threshold {thr:.3f}: real crop photos rejected {np.mean(s_in < thr) * 100:.2f}%", flush=True)
if "--eval" in sys.argv: sys.exit()

W1, W2 = clf.coefs_; b1, b2 = clf.intercepts_
W1f = W1 / sd[:, None]; b1f = b1 - (mu / sd) @ W1
class Full(torch.nn.Module):
    def __init__(s, fm):
        super().__init__(); s.f = fm
        s.l1 = torch.nn.Linear(*W1.shape); s.l2 = torch.nn.Linear(*W2.shape)
        s.l1.weight.data = torch.tensor(W1f.T, dtype=torch.float32); s.l1.bias.data = torch.tensor(b1f, dtype=torch.float32)
        s.l2.weight.data = torch.tensor(W2.T, dtype=torch.float32); s.l2.bias.data = torch.tensor(b2, dtype=torch.float32)
        s.register_buffer("C", torch.tensor(C.T, dtype=torch.float32))
    def forward(s, pixel_values):
        f = s.f(pixel_values)
        sim = (torch.nn.functional.normalize(f, dim=-1) @ s.C).max(-1).values
        return torch.softmax(s.l2(torch.relu(s.l1(f))), -1), sim
fm = T.Feat(AutoModel.from_pretrained("facebook/dinov2-small").eval()).eval()
full = Full(fm).eval()
torch.onnx.export(full, (torch.randn(1, 3, 224, 224),), "kisan-leaf2-fp32.onnx", input_names=["pixel_values"], output_names=["probs", "sim"], opset_version=17, dynamo=False)
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic("kisan-leaf2-fp32.onnx", "kisan-leaf2.onnx", weight_type=QuantType.QInt8, op_types_to_quantize=["MatMul", "Gemm"], per_channel=True)
print("int8 MB", round(os.path.getsize("kisan-leaf2.onnx") / 1e6, 1), flush=True)
json.dump({"labels": labels, "guard": round(thr, 4)}, open("kisan-leaf2-meta.json", "w"), ensure_ascii=False)
np.savez("v2_split.npz", pte=pte, yte=yte, ete_paths=E["paths"][ete], ete_cls=E["cls"][ete], ete_src=Se, thr=thr)
print("exported", flush=True)

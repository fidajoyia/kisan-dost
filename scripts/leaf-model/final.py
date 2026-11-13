# Final Kisan Dost leaf model.
#  - classes: 61 (9 crops), public field datasets (see SOURCES)
#  - features: frozen DINOv2-small (CLS + mean patch); head: our MLP (768 -> 1024 -> 61), trained here
#  - split: 80% train / 20% test, stratified, seed 42. Reported accuracy = this exact shipped model on the 20%.
#  - export: one ONNX (preprocessed 224x224 image -> class probabilities), then int8 weight quantisation,
#    and the quantised file is re-tested end to end on the test photos.
import json, glob, os, sys, time, numpy as np, torch
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report
from transformers import AutoModel
import train as T

SKIP = {"potato|Bacteria", "potato|Fungi", "potato|Nematode", "potato|Pest", "potato|Virus", "citrus|melanose"}
SOURCES = ["Spitblaze/Corn_or_Maize_Leaf_Disease_Dataset", "Project-AgML/rice_leaf_disease_classification",
           "Project-AgML/sugarcane_leaf_disease_classification", "Project-AgML/cotton_leaf_disease_classification (raw)",
           "Project-AgML/cotton_leaf_disease_classification_bangladesh_2 (raw)", "Project-AgML/tomato_leaf_disease",
           "Project-AgML/MangoLeafBD_disease_classification", "Project-AgML/potato_leaf_disease_classification",
           "Project-AgML/citrus_fruit_leaf_disease_classification (leaf)", "Project-AgML/wheat_disease_detection (boxes cut out)"]
use_flip = os.path.exists("feats_flip.npz") and "--noflip" not in sys.argv
z = np.load("feats.npz", allow_pickle=True); F = dict(zip(z["paths"], z["feats"]))
FF = {}
if use_flip: z2 = np.load("feats_flip.npz", allow_pickle=True); FF = dict(zip(z2["paths"], z2["feats"]))

paths, y = [], []
for d, lab in T.classes():
    if lab in SKIP: continue
    for p in sorted(glob.glob(f"{d}/*.jpg")):
        if p in F: paths.append(p); y.append(lab)
labels = sorted(set(y)); yi = np.array([labels.index(v) for v in y]); paths = np.array(paths)
ptr, pte, ytr, yte = train_test_split(paths, yi, test_size=0.2, stratify=yi, random_state=42)
Xtr = np.stack([F[p] for p in ptr]); Ytr = ytr
if use_flip:
    have = [i for i, p in enumerate(ptr) if p in FF]
    Xtr = np.concatenate([Xtr, np.stack([FF[ptr[i]] for i in have])]); Ytr = np.concatenate([ytr, ytr[have]])
Xte = np.stack([F[p] for p in pte])
mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-6
clf = MLPClassifier((1024,), alpha=1e-3, early_stopping=True, max_iter=300, random_state=0).fit((Xtr - mu) / sd, Ytr)
acc = accuracy_score(yte, clf.predict((Xte - mu) / sd))
print(f"features test accuracy: {acc * 100:.2f}%  (train {len(Ytr)} incl. flips={use_flip}, test {len(yte)}, classes {len(labels)})", flush=True)

# ---- export: backbone + standardisation folded into layer 1 + MLP + softmax
W1, W2 = clf.coefs_; b1, b2 = clf.intercepts_
W1f = W1 / sd[:, None]; b1f = b1 - (mu / sd) @ W1
class Full(torch.nn.Module):
    def __init__(s, fm):
        super().__init__(); s.f = fm
        s.l1 = torch.nn.Linear(*W1.shape); s.l2 = torch.nn.Linear(*W2.shape)
        s.l1.weight.data = torch.tensor(W1f.T, dtype=torch.float32); s.l1.bias.data = torch.tensor(b1f, dtype=torch.float32)
        s.l2.weight.data = torch.tensor(W2.T, dtype=torch.float32); s.l2.bias.data = torch.tensor(b2, dtype=torch.float32)
    def forward(s, pixel_values): return torch.softmax(s.l2(torch.relu(s.l1(s.f(pixel_values)))), -1)
fm = T.Feat(AutoModel.from_pretrained("facebook/dinov2-small").eval()).eval()
full = Full(fm).eval()
torch.onnx.export(full, (torch.randn(1, 3, 224, 224),), "kisan-leaf-fp32.onnx", input_names=["pixel_values"], output_names=["probs"], opset_version=17, dynamo=False)
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic("kisan-leaf-fp32.onnx", "kisan-leaf.onnx", weight_type=QuantType.QInt8, op_types_to_quantize=["MatMul", "Gemm"], per_channel=True)  # ConvInteger is not available in onnxruntime-web
print("sizes MB: fp32", round(os.path.getsize("kisan-leaf-fp32.onnx") / 1e6, 1), "int8", round(os.path.getsize("kisan-leaf.onnx") / 1e6, 1), flush=True)

# ---- end-to-end test of the shipped file: image file -> same preprocessing as the app -> ONNX
import onnxruntime as ort
res = {}
if os.environ.get("LIMIT"): pte, yte = pte[:int(os.environ["LIMIT"])], yte[:int(os.environ["LIMIT"])]
for name in ["kisan-leaf.onnx", "kisan-leaf-fp32.onnx"] if "--both" in sys.argv else ["kisan-leaf.onnx"]:
    s = ort.InferenceSession(name); pr = []; t0 = time.time()
    for i in range(0, len(pte), 32):
        x = np.stack([T.prep(p) for p in pte[i:i + 32]]).astype(np.float32)
        pr += [int(np.argmax(s.run(None, {"pixel_values": x[k:k + 1]})[0])) for k in range(len(x))]
    pr = np.array(pr); a = accuracy_score(yte, pr)
    crop = np.mean([labels[i].split("|")[0] == labels[j].split("|")[0] for i, j in zip(yte, pr)])
    res[name] = (a, crop); print(f"END-TO-END {name}: accuracy {a * 100:.2f}%  crop {crop * 100:.2f}%  ({time.time() - t0:.0f}s)", flush=True)
rep = classification_report(yte, pr, labels=list(range(len(labels))), target_names=labels, output_dict=True, zero_division=0)
a, crop = res["kisan-leaf.onnx"]
card = {"name": "Kisan Dost leaf model v1", "trained": time.strftime("%Y-%m-%d"),
        "test_accuracy": round(a * 100, 2), "crop_accuracy": round(crop * 100, 2), "test_photos": int(len(yte)), "train_photos": int(len(ptr)),
        "classes": len(labels), "crops": sorted({l.split("|")[0] for l in labels}),
        "method": "Frozen DINOv2-small image features + our MLP classifier (1024 hidden), int8 ONNX, runs in the browser",
        "split": "stratified 80/20, seed 42; test photos never used in training", "augmentation": "horizontal flip" if use_flip else "none",
        "sources": SOURCES,
        "per_class": {l: {"precision": round(rep[l]["precision"], 3), "recall": round(rep[l]["recall"], 3), "f1": round(rep[l]["f1-score"], 3), "test_photos": int(rep[l]["support"])} for l in labels}}
json.dump(card, open("kisan-leaf-card.json", "w"), ensure_ascii=False, indent=1)
json.dump(labels, open("kisan-leaf-labels.json", "w"), ensure_ascii=False)
print("wrote kisan-leaf-card.json", flush=True)

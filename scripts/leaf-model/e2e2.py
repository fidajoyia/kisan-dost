import json, time, numpy as np, onnxruntime as ort
from sklearn.metrics import accuracy_score, classification_report
import train as T
m = json.load(open("kisan-leaf2-meta.json")); labels, thr = m["labels"], m["guard"]; L = {l: i for i, l in enumerate(labels)}
z = np.load("v2_split.npz", allow_pickle=True)
so = ort.SessionOptions(); so.intra_op_num_threads = 2
s = ort.InferenceSession("kisan-leaf2.onnx", so)
def run(paths):
    P, SIM = [], []
    for p in paths:
        pr, sim = s.run(None, {"pixel_values": T.prep(p)[None].astype(np.float32)}); P.append(pr[0]); SIM.append(float(sim[0]))
    return np.array(P), np.array(SIM)
def decide(P, SIM):  # same rule as the app
    o = L["other"]; notours = (P[:, o] >= 0.5) | (SIM < thr)
    Q = P.copy(); Q[:, o] = -1
    return np.where(notours, o, Q.argmax(1))
t0 = time.time()
P, SIM = run(z["pte"]); yte = np.array([L[v] for v in z["yte"]]); D = decide(P, SIM)
acc = accuracy_score(yte, D); crop = np.mean([labels[i].split("|")[0] == labels[j].split("|")[0] for i, j in zip(yte, D)]); rej = np.mean(D == L["other"])
print(f"v1 test {len(yte)}: accuracy {acc*100:.2f}% crop {crop*100:.2f}% refused {rej*100:.2f}% ({time.time()-t0:.0f}s)", flush=True)
Pe, Se = run(z["ete_paths"]); De = decide(Pe, Se); ye = np.array([L[v] for v in z["ete_cls"]]); src = z["ete_src"]
res = {}
for g, f in [("plantvillage potato", lambda x: x.startswith("Potato")), ("everyday photos", lambda x: x == "imagenette"), ("bare backgrounds", lambda x: x.startswith("Background")), ("leaves of other crops", lambda x: not x.startswith(("Potato", "Background")) and x != "imagenette")]:
    mm = np.array([f(x) for x in src]); res[g] = round(float(np.mean(De[mm] == ye[mm])) * 100, 1); print(g, res[g], mm.sum(), flush=True)
pp, ps = run(["/home/claude/video/out/test3.jpg"]); print("person photo ->", labels[decide(pp, ps)[0]], ps)
rep = classification_report(yte, D, labels=[L[l] for l in labels if l != "other"], target_names=[l for l in labels if l != "other"], output_dict=True, zero_division=0)
card = json.load(open("kisan-leaf-card.json"))
card.update({"name": "Kisan Dost leaf model v2", "trained": time.strftime("%Y-%m-%d"), "test_accuracy": round(acc*100, 2), "crop_accuracy": round(crop*100, 2), "refused_real_crop_photos_pct": round(rej*100, 2),
  "test_photos": int(len(yte)), "classes": len(labels) - 1, "crops": sorted({l.split("|")[0] for l in labels if l != "other"}),
  "not_our_crop_check": {"method": "an 'other' class (everyday photos, bare backgrounds, leaves of crops we do not cover) plus a similarity check against each crop class", "held_out_correct_pct": res},
  "sources": card["sources"] + ["DScomp380/plant_village (potato; other crops and backgrounds as 'other')", "Imagenette (everyday photos as 'other')"],
  "per_class": {l: {"precision": round(rep[l]["precision"], 3), "recall": round(rep[l]["recall"], 3), "f1": round(rep[l]["f1-score"], 3), "test_photos": int(rep[l]["support"])} for l in labels if l != "other"}})
json.dump(card, open("kisan-leaf2-card.json", "w"), ensure_ascii=False, indent=1); print("card written", flush=True)

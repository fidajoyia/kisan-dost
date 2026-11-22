# Kisan Dost leaf model v7 (from v6 + more field photos + half of the farmer phone photos): the WHOLE model is trained (DINOv2-small backbone + classifier), not only the classifier.
# Training photos are changed at random every time they are seen (zoom / crop, rotation, flip, light, colour, blur,
# JPEG quality) so the model gives the same, right answer for the same leaf photographed again in a field.
# Same photos, same classes and the SAME held-out test photos as v4, so the numbers compare directly.
#   python ft.py train   -> ft_last.pt (one checkpoint per epoch)
#   python ft.py export  -> kisan-leaf-v7.onnx (int8, same inputs/outputs as the app reads) + labels + guard
import json, sys, os, io, time, math, random, collections, numpy as np
from sklearn.model_selection import train_test_split
from PIL import Image, ImageEnhance, ImageFilter

MIN_CLASS = 40
SKIP = {"potato|Bacteria", "potato|Fungi", "potato|Nematode", "potato|Pest", "potato|Virus", "citrus|melanose"}
PV_MAP = {"Apple___healthy": "apple|Healthy", "Grape___healthy": "grape|Healthy"}
PV_DROP = ("Apple___", "Grape___", "Pepper,_bell___")
MEAN, STD = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)

def load(npz, mans):
    z = np.load(npz, allow_pickle=True); man = {}
    for f in mans:
        for m in json.load(open(f)): man[m["path"]] = m
    if not mans:
        man = {p: {"label": l, "split": p.split("/")[0], "ds": d} for p, l, d in zip(z["paths"], z["labels"], z["ds"])}
    P, Y, SP = [], [], []
    for p in z["paths"]:
        m = man.get(p)
        if not m: continue
        lab, ds = m["label"], m.get("ds", "")
        if ds in PV_MAP: lab = PV_MAP[ds]
        elif ds.startswith(PV_DROP): continue
        if lab in SKIP: continue
        P.append(p); Y.append(lab); SP.append(m.get("split", ""))
    return np.array(P), np.array(Y), np.array(SP)

def split():
    """Exactly the v4 split (same seeds, same order)."""
    Po, Yo, _ = load("feats_orig.npz", ["manifest_orig.json", "manifest_extra.json"])
    Pu, Yu, Su = load("feats_test_train.npz", [])
    Pn, Yn, _ = load("feats_new.npz", ["manifest_new.json"])
    Pw, Yw, _ = load("feats_wild.npz", ["manifest_wild.json"])
    _, first = np.unique([p.split("/")[-1] for p in Pw], return_index=True); Pw, Yw = Pw[first], Yw[first]
    cnt = collections.Counter(list(Yo) + list(Yn) + list(Yw)); keep = {l for l, n in cnt.items() if n >= MIN_CLASS}
    def sel(P, Y, S=None):
        m = np.array([y in keep for y in Y]); return (P[m], Y[m]) if S is None else (P[m], Y[m], S[m])
    Po, Yo = sel(Po, Yo); Pn, Yn = sel(Pn, Yn); Pu, Yu, Su = sel(Pu, Yu, Su); Pw, Yw = sel(Pw, Yw)
    labels = sorted(keep)
    io_tr, io_te = train_test_split(np.arange(len(Yo)), test_size=0.2, stratify=Yo, random_state=42)
    in_tr, in_te = train_test_split(np.arange(len(Yn)), test_size=0.2, stratify=Yn, random_state=42)
    ut, uf = Su == "test", Su == "train"
    iw_tr, iw_te = train_test_split(np.arange(len(Yw)), test_size=0.2, stratify=Yw, random_state=42)
    train = list(zip(np.concatenate([Po[io_tr], Pn[in_tr], Pu[uf], Pw[iw_tr]]), np.concatenate([Yo[io_tr], Yn[in_tr], Yu[uf], Yw[iw_tr]])))
    tests = {"ORIG20": list(zip(Po[io_te], Yo[io_te])), "UNSEEN": list(zip(Pu[ut], Yu[ut])), "NEW20": list(zip(Pn[in_te], Yn[in_te])), "WILD20": list(zip(Pw[iw_te], Yw[iw_te]))}
    # v6: real field photos (PlantDoc, Indian / Bangladeshi rice fields, citrus orchard, cotton field), 80/20
    fm = [m for m in json.load(open("manifest_field.json")) if m["label"] in keep and os.path.exists(m["path"])]
    Pf, Yf = np.array([m["path"] for m in fm]), np.array([m["label"] for m in fm])
    if_tr, if_te = train_test_split(np.arange(len(Yf)), test_size=0.2, stratify=Yf, random_state=42)
    train += list(zip(Pf[if_tr], Yf[if_tr])); tests["FIELD20"] = list(zip(Pf[if_te], Yf[if_te]))
    # v7: more field photos for wheat / rice / maize (ipartzix, CC-BY-4.0), 80/20
    im_ = [m for m in json.load(open("manifest_ipz.json")) if m["label"] in keep and os.path.exists(m["path"])]
    Pi, Yi = np.array([m["path"] for m in im_]), np.array([m["label"] for m in im_])
    ii_tr, ii_te = train_test_split(np.arange(len(Yi)), test_size=0.2, stratify=Yi, random_state=42)
    train += list(zip(Pi[ii_tr], Yi[ii_tr])); tests["IPZ20"] = list(zip(Pi[ii_te], Yi[ii_te]))
    # v7: half of the farmers' own phone photos (Digital Green, expert-labelled crop) teach the crop name as "<crop>|_plant";
    # the other half stays unseen for testing (DIGI50)
    dg = [m for m in json.load(open("manifest_digi.json")) if f"{m['crop']}|_plant" in keep]
    rs = random.Random(11); rs.shuffle(dg); half = len(dg) // 2
    train += [(m["path"], f"{m['crop']}|_plant") for m in dg[:half]]
    tests["DIGI50"] = [(m["path"], f"{m['crop']}|_plant") for m in dg[half:]]
    return labels, train, tests

def centre(im):  # what the app does: short side 256, centre 224
    w, h = im.size; k = 256 / min(w, h); r = im.resize((max(224, round(w * k)), max(224, round(h * k))), Image.BILINEAR); W, H = r.size
    return r.crop(((W - 224) // 2, (H - 224) // 2, (W - 224) // 2 + 224, (H - 224) // 2 + 224))

def augment(im, rng):
    if rng.random() < 0.5: im = im.rotate(rng.uniform(-25, 25), resample=Image.BILINEAR, expand=False, fillcolor=tuple(int(c) for c in np.asarray(im).reshape(-1, 3).mean(0)))
    w, h = im.size
    for _ in range(10):  # random crop: 30-100% of the photo, aspect 3:4 .. 4:3
        a = rng.uniform(0.3, 1.0) * w * h; r = math.exp(rng.uniform(math.log(3 / 4), math.log(4 / 3)))
        cw, ch = int(round(math.sqrt(a * r))), int(round(math.sqrt(a / r)))
        if cw <= w and ch <= h: x0, y0 = rng.randint(0, w - cw), rng.randint(0, h - ch); im = im.crop((x0, y0, x0 + cw, y0 + ch)); break
    im = im.resize((224, 224), Image.BILINEAR)
    if rng.random() < 0.5: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if rng.random() < 0.2: im = im.transpose(Image.FLIP_TOP_BOTTOM)
    im = ImageEnhance.Brightness(im).enhance(rng.uniform(0.65, 1.35)); im = ImageEnhance.Contrast(im).enhance(rng.uniform(0.7, 1.3))
    im = ImageEnhance.Color(im).enhance(rng.uniform(0.7, 1.3))
    if rng.random() < 0.2: im = im.filter(ImageFilter.GaussianBlur(rng.uniform(0.3, 1.5)))
    if rng.random() < 0.3:
        b = io.BytesIO(); im.save(b, "JPEG", quality=rng.randint(35, 90)); im = Image.open(io.BytesIO(b.getvalue())).convert("RGB")
    return im

def tensor(im): return ((np.asarray(im, np.float32) / 255 - MEAN) / STD).transpose(2, 0, 1)

import torch
class DS(torch.utils.data.Dataset):
    def __init__(s, items, L, train): s.items, s.L, s.train = items, L, train
    def __len__(s): return len(s.items)
    def __getitem__(s, i):
        p, y = s.items[i]; im = Image.open(p).convert("RGB")
        im = augment(im, random.Random()) if s.train else centre(im)
        return torch.from_numpy(tensor(im)), s.L[y]

class Net(torch.nn.Module):
    def __init__(s, n):
        super().__init__()
        from transformers import AutoModel
        s.m = AutoModel.from_pretrained("facebook/dinov2-small")
        s.l1 = torch.nn.Linear(768, 1024); s.drop = torch.nn.Dropout(0.2); s.l2 = torch.nn.Linear(1024, n)
    def feat(s, x):
        h = s.m(pixel_values=x).last_hidden_state; return torch.cat([h[:, 0], h[:, 1:].mean(1)], 1)
    def forward(s, x): return s.l2(s.drop(torch.relu(s.l1(s.feat(x)))))

class Full(torch.nn.Module):   # what goes on the phone: probabilities + similarity to the nearest class centre
    def __init__(s, net, C): super().__init__(); s.net = net; s.register_buffer("C", C)
    def forward(s, pixel_values):
        f = s.net.feat(pixel_values)
        sim = (torch.nn.functional.normalize(f, dim=-1) @ s.C).max(-1).values
        return torch.softmax(s.net.l2(torch.relu(s.net.l1(f))), -1), sim

def train(EP=int(os.environ.get("EP", 4))):
    labels, tr, tests = split(); L = {l: i for i, l in enumerate(labels)}
    json.dump({"labels": labels}, open("ft7_labels.json", "w")); json.dump(tests, open("ft7_tests.json", "w"))
    print(f"classes {len(labels)} train {len(tr)} tests {[(k, len(v)) for k, v in tests.items()]}", flush=True)
    cnt = collections.Counter(y for _, y in tr); w = torch.tensor([cnt[y] ** -0.5 * (3.0 if p.startswith(("field/", "wild/", "ipz/", "digi/")) else 1.0) for p, y in tr], dtype=torch.double)
    sampler = torch.utils.data.WeightedRandomSampler(w, len(tr), replacement=True)
    dl = torch.utils.data.DataLoader(DS(tr, L, True), batch_size=48, sampler=sampler, num_workers=12, persistent_workers=True, drop_last=True, prefetch_factor=4)
    val = random.Random(0).sample(tests["ORIG20"] + tests["NEW20"] + tests["WILD20"] + tests["FIELD20"] + tests["IPZ20"], 1500)   # quick per-epoch check only
    vl = torch.utils.data.DataLoader(DS(val, L, False), batch_size=96, num_workers=8)
    dev = "cuda"; net = Net(len(labels)).to(dev); net.load_state_dict(torch.load("ft6_last.pt", map_location=dev))  # start from v6
    opt = torch.optim.AdamW([{"params": net.m.parameters(), "lr": 2e-5}, {"params": list(net.l1.parameters()) + list(net.l2.parameters()), "lr": 1e-3}], weight_decay=0.05)
    steps = EP * len(dl); sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=[1.5e-5, 5e-4], total_steps=steps, pct_start=0.1)
    scaler = torch.cuda.amp.GradScaler(); lossf = torch.nn.CrossEntropyLoss(label_smoothing=0.1); t0 = time.time()
    for ep in range(EP):
        net.train(); tot = n = 0
        for i, (x, y) in enumerate(dl):
            x, y = x.to(dev, non_blocking=True), y.to(dev, non_blocking=True)
            with torch.autocast("cuda", dtype=torch.float16): loss = lossf(net(x), y)
            opt.zero_grad(set_to_none=True); scaler.scale(loss).backward(); scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(net.parameters(), 1.0); scaler.step(opt); scaler.update(); sched.step()
            tot += loss.item(); n += 1
            if i % 200 == 0: print(f"ep {ep} step {i}/{len(dl)} loss {tot / n:.3f} {time.time() - t0:.0f}s", flush=True)
        net.eval(); ok = m = 0
        with torch.no_grad(), torch.autocast("cuda", dtype=torch.float16):
            for x, y in vl: ok += (net(x.to(dev)).argmax(1).cpu() == y).sum().item(); m += len(y)
        print(f"== epoch {ep} done, loss {tot / n:.3f}, quick check {ok / m * 100:.2f}% ({time.time() - t0:.0f}s)", flush=True)
        torch.save(net.state_dict(), "ft7_last.pt")

def export():
    labels, tr, tests = split(); L = {l: i for i, l in enumerate(labels)}; O = L["other"]
    dev = "cuda"; net = Net(len(labels)).to(dev); net.load_state_dict(torch.load("ft7_last.pt", map_location=dev)); net.eval()
    # class centres for the "is this one of our plants" check, from up to 150 training photos per class
    by = collections.defaultdict(list)
    for p, y in tr: by[y].append(p)
    rs = random.Random(1); sub = [(p, y) for y, ps in by.items() if y != "other" for p in rs.sample(ps, min(150, len(ps)))]
    dl = torch.utils.data.DataLoader(DS(sub, L, False), batch_size=96, num_workers=8); F, Y = [], []
    with torch.no_grad():
        for x, y in dl: F.append(torch.nn.functional.normalize(net.feat(x.to(dev)).float(), dim=-1).cpu()); Y.append(y)
    F, Y = torch.cat(F), torch.cat(Y); crop_cls = [i for i in range(len(labels)) if i != O]
    C = torch.nn.functional.normalize(torch.stack([F[Y == i].mean(0) for i in crop_cls]), dim=-1)
    thr = float(np.percentile((F @ C.T).max(1).values.numpy(), 0.5))
    full = Full(net.cpu().float(), C.T.contiguous()).eval()
    torch.onnx.export(full, (torch.randn(1, 3, 224, 224),), "kisan-leaf-v7-fp32.onnx", input_names=["pixel_values"], output_names=["probs", "sim"], opset_version=17, dynamo=False)
    from onnxruntime.quantization import quantize_dynamic, QuantType
    quantize_dynamic("kisan-leaf-v7-fp32.onnx", "kisan-leaf-v7.onnx", weight_type=QuantType.QInt8, op_types_to_quantize=["MatMul", "Gemm"], per_channel=True)
    json.dump({"labels": labels, "guard": round(thr, 4)}, open("kisan-leaf-v7-labels.json", "w"), ensure_ascii=False)
    print("exported, guard", round(thr, 4), "MB", round(os.path.getsize("kisan-leaf-v7.onnx") / 1e6, 1), flush=True)

if __name__ == "__main__":
    {"train": train, "export": export}[sys.argv[1]]()

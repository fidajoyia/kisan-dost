
import sys, json, numpy as np, onnxruntime as ort, collections
from PIL import Image
onnx, labjs = sys.argv[1], sys.argv[2]
lab=json.load(open(labjs,encoding="utf-8")); labels=lab["labels"]; guard=lab.get("guard")
s=ort.InferenceSession(onnx, providers=["CPUExecutionProvider"])
O=labels.index("other")
def prep(p):
    im=Image.open(p).convert("RGB"); w,h=im.size; k=256/min(w,h); im=im.resize((max(224,round(w*k)),max(224,round(h*k))),Image.BICUBIC)
    w,h=im.size; l=(w-224)//2; t=(h-224)//2; im=im.crop((l,t,l+224,t+224))
    a=(np.asarray(im,dtype=np.float32)/255-[0.485,0.456,0.406])/[0.229,0.224,0.225]; return a.transpose(2,0,1)[None].astype(np.float32)
def decide(p):
    o=dict(zip([x.name for x in s.get_outputs()], s.run(None,{"pixel_values":prep(p)})))
    pr=o["probs"][0]; sim=float(o["sim"].ravel()[0]) if "sim" in o else 1
    if pr[O]>=0.5 or (guard is not None and sim<guard): return "notcrop",None,None
    rest=1-pr[O]; cp=collections.defaultdict(float)
    for i,l in enumerate(labels):
        if i!=O: cp[l.split("|")[0]]+=pr[i]/rest
    c=max(cp,key=cp.get)
    if cp[c]<0.3: return "unclear",c,None
    mine=sorted([i for i in range(len(labels)) if i!=O and labels[i].startswith(c+"|")],key=lambda i:-pr[i])
    if labels[mine[0]].endswith("|_plant"): return "crop",c,"_plant"
    leaf=[i for i in mine if not labels[i].endswith("|_plant")]; sm=sum(pr[i] for i in leaf)
    if pr[leaf[0]]/sm<0.6: return "crop",c,"_leafonly"
    return "crop",c,labels[leaf[0]].split("|",1)[1]
def run(name, items):
    r=collections.Counter(); dis=[0,0]
    for p,crop,d in items:
        k,c,dd=decide(p)
        if k!="crop": r[k]+=1; continue
        r["right" if c==crop else "wrong"]+=1
        if c==crop and d and dd not in ("_plant","_leafonly"):
            dis[1]+=1; dis[0]+= (dd==d)
    n=len(items); print(f"{name} n={n} crop-right {r['right']/n:.1%} wrong {r['wrong']/n:.1%} unclear {r['unclear']/n:.1%} notcrop {r['notcrop']/n:.1%}" + (f" | disease named {dis[1]} right {dis[0]/max(1,dis[1]):.1%}" if dis[1] else ""), flush=True)
digi=[(m["path"],m["crop"],None) for m in json.load(open("manifest_digi.json"))]
run("DIGI (farmer phone photos)", digi)
fm=json.load(open("manifest_field.json")); import random; random.Random(3).shuffle(fm)
run("FIELD (new field sets, sample 800)", [(m["path"],m["label"].split("|")[0],m["label"].split("|")[1]) for m in fm[:800]])
for extra in sys.argv[3:]:
    print(extra, decide(extra))

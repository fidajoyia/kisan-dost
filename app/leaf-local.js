"use client";
// Kisan Dost's own leaf model, run on the farmer's phone (no API, works on any browser with WebAssembly).
// Model: DINOv2-small image features + our classifier trained on public datasets of Pakistan's crops, fruit trees, trees and roses
// (see /models/kisan-leaf-card.json for the classes and held-out test accuracy).
import { KB, CROPS_UR, CROPS_EN, KIND_UR, SAFETY_UR } from "@/lib/leaf-kb";

// onnxruntime-web 1.20.1 files live in public/ort
const ORT_CDN = "/ort/";
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
let session = null, labels = null, guard = null, loading = null;
const CROP_SURE = 0.3, DISEASE_SURE = 0.6;

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.ort) return res();
    const s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("model runtime could not load"));
    document.head.appendChild(s);
  });
}

export function warmLeafModel() {
  if (loading) return loading;
  loading = (async () => {
    await loadScript(`${ORT_CDN}ort.wasm.min.js`);
    const ort = window.ort;
    ort.env.wasm.wasmPaths = ORT_CDN;
    ort.env.wasm.numThreads = 1; // no cross-origin isolation on a normal page
    const [buf, lab] = await Promise.all([
      fetch("/models/kisan-leaf-v5.onnx").then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).catch(() => { throw new Error("model file missing"); }),
      fetch("/models/kisan-leaf-v5-labels.json").then((r) => r.json()).catch(() => { throw new Error("model file missing"); }),
    ]);
    session = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    labels = Array.isArray(lab) ? lab : lab.labels; // v2: {labels, guard}
    guard = Array.isArray(lab) ? null : lab.guard;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

// same preprocessing as training: shortest side 256, centre crop 224, ImageNet normalisation
async function toTensor(dataUrl) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const k = 256 / Math.min(img.width, img.height);
  const w = Math.max(224, Math.round(img.width * k)), h = Math.max(224, Math.round(img.height * k));
  const c = document.createElement("canvas"); c.width = 224; c.height = 224;
  const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
  g.drawImage(img, -(w - 224) / 2, -(h - 224) / 2, w, h);
  const px = g.getImageData(0, 0, 224, 224).data, n = 224 * 224, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) out[ch * n + i] = (px[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
  return new window.ort.Tensor("float32", out, [1, 3, 224, 224]);
}

// Several photos (front / back of the leaf) are averaged.
export async function diagnoseLocally(images, weather) {
  await warmLeafModel();
  const probs = new Float32Array(labels.length);
  let sim = 1;
  for (const im of images) {
    const t = await toTensor(`data:${im.mediaType || "image/jpeg"};base64,${im.data}`);
    const out = await session.run({ pixel_values: t });
    const p = out.probs.data; for (let i = 0; i < p.length; i++) probs[i] += p[i] / images.length;
    if (out.sim) sim = Math.min(sim, out.sim.data[0]);
  }
  // Not a leaf of a crop we check (a person, a wall, a leaf of another plant): say so, never name a disease.
  const other = labels.indexOf("other");
  if ((other >= 0 && probs[other] >= 0.5) || (guard != null && sim < guard)) return notOurCrop();
  const rest = 1 - (other >= 0 ? probs[other] : 0);
  // First which crop: add up all of a crop's classes. Then the best class inside that crop.
  const cropP = {};
  labels.forEach((l, i) => { if (i !== other) { const c = l.split("|")[0]; cropP[c] = (cropP[c] || 0) + probs[i] / rest; } });
  const crop = Object.keys(cropP).sort((x, y) => cropP[y] - cropP[x])[0];
  // Checked on real phone photos never used in training: at 60% or more the crop name was right 99.5% of the time.
  // Real phone photos never used in training: naming the best crop when it holds 30% or more was right 94% of the time;
  // below that only 46%, so then the app asks for one clearer photo instead of guessing.
  if (cropP[crop] < CROP_SURE) return { source: "kisan-dost-model", is_plant: false, image_note: "پتا صاف نظر نہیں آیا۔ ایک ہی پتے کی قریب سے، دن کی روشنی میں تصویر لیں تاکہ پتا پوری تصویر میں ہو۔",
    image_note_en: "The leaf was not clear. Take one leaf close up, in daylight, so that it fills the photo." };
  return forCrop(probs, crop, weather, cropP[crop]);
}


function forCrop(probs, crop, weather, cropSure) {
  const other = labels.indexOf("other");
  const mine = [...probs.keys()].filter((i) => i !== other && labels[i].startsWith(crop + "|")).sort((x, y) => probs[y] - probs[x]);
  // "<crop>|_plant" = the model knows the plant from field photos but this is not a close leaf photo it can read a disease from
  if (labels[mine[0]].endsWith("|_plant")) return plantOnly(crop, cropSure);
  const leaf = mine.filter((i) => !labels[i].endsWith("|_plant"));
  const sum = leaf.reduce((t, i) => t + probs[i], 0) || 1;
  if (probs[leaf[0]] / sum < DISEASE_SURE) return plantOnly(crop, cropSure, true);
  return buildResult(leaf.slice(0, 4).map((i) => ({ label: labels[i], p: probs[i] / sum })), weather, cropSure);
}

function plantOnly(crop, p, leafPhoto) {
  const name = CROPS_UR[crop] || crop, en = (CROPS_EN[crop] || crop).toLowerCase();
  return {
    source: "kisan-dost-model", is_plant: true, plant_only: true,
    plant: { name_local: name, name_en: CROPS_EN[crop] || crop, confidence: Math.round(Math.min(1, p) * 100) },
    image_note: leafPhoto
      ? `یہ ${name} کا پتا ہے۔ بیماری جاننے کے لیے متاثرہ حصے کی قریب سے، دن کی روشنی میں ایک اور تصویر لیں۔`
      : `یہ ${name} کا پودا ہے۔ بیماری جاننے کے لیے ایک پتے کی قریب سے، دن کی روشنی میں تصویر لیں۔`,
    image_note_en: leafPhoto
      ? `This is a ${en} leaf. To find the disease, take one more photo of the affected part close up, in daylight.`
      : `This is a ${en} plant. To find the disease, take a photo of one leaf close up, in daylight.`,
  };
}

function notOurCrop() {
  return {
    source: "kisan-dost-model", is_plant: false,
    image_note: "یہ تصویر ان پودوں کے پتے کی نہیں ہے جن کی ایپ جانچ کرتی ہے (نیچے فہرست دیکھیں)۔ صرف ایک پتے کی قریب سے، دن کی روشنی میں صاف تصویر لیں (پیچھے زمین یا ہاتھ ہو تو ٹھیک ہے)۔ غلط اندازے سے بچنے کے لیے ہم کوئی بیماری یا اسپرے نہیں بتا رہے۔",
    image_note_en: "This photo is not a leaf of the plants the app checks (see the list below). Take a clear photo of one leaf close up, in daylight (soil or a hand behind it is fine). To avoid a wrong answer, no disease or spray is named.",
  };
}

function buildResult(top, wx, cropAll) {
  const [best] = top;
  const [crop] = best.label.split("|");
  const kb = KB[best.label] || {};
  const conf = Math.round(best.p * 100);
  const cropP = cropAll; // crop certainty = all probability on this crop's classes
  const healthy = kb.kind === "healthy";
  const alts = top.slice(1) // not shown: one clear answer
    .filter((x) => x.p >= 0.08 && KB[x.label]).map((x) => ({ ...KB[x.label], crop: x.label.split("|")[0], p: Math.round(x.p * 100) }));
  const humid = wx?.current?.humidity, temp = wx?.current?.temp;
  const wet = (wx?.rain?.next7_mm || 0) >= 5 || humid >= 80;
  return {
    source: "kisan-dost-model",
    is_plant: true,
    plant: { name_local: CROPS_UR[crop] || crop, name_en: CROPS_EN[crop] || crop, confidence: Math.round(Math.min(1, cropP) * 100) },
    health: { status: healthy ? "healthy" : best.p >= 0.8 ? "moderate" : "early", label: healthy ? "صحت مند" : kb.ur, label_en: healthy ? "Healthy" : kb.en, score: healthy ? 92 : Math.max(20, 70 - Math.round(best.p * 40)) },
    diseases: healthy ? [] : [{ name_local: kb.ur, name_en: kb.en, pathogen: KIND_UR[kb.kind] || "", confidence: conf, signs: kb.signs || [] }],
    alternatives: [],
    spray: kb.spray || [],
    sprayNote: kb.note || "",
    treatment: { organic: kb.organic || [], chemical: kb.spray || [], cultural: kb.cultural || [] },
    prevention: [],
    safety: SAFETY_UR,
    weatherNote: !healthy && ["fungus", "bacteria"].includes(kb.kind) && wet
      ? `اگلے دنوں نمی ${humid ?? "–"}% اور بارش کا امکان ہے؛ ایسے موسم میں یہ بیماری تیزی سے پھیلتی ہے، اسپرے میں دیر نہ کریں۔ بارش سے فوراً پہلے اسپرے نہ کریں۔`
      : !healthy && kb.kind === "pest" && temp >= 30 ? `گرم موسم (${Math.round(temp)}°) میں رس چوسنے والے کیڑے تیزی سے بڑھتے ہیں؛ صبح یا شام کے وقت اسپرے کریں۔` : "",
    weatherNote_en: !healthy && ["fungus", "bacteria"].includes(kb.kind) && wet
      ? `Humidity is ${humid ?? "–"}% and rain is likely in the coming days; this disease spreads fast in such weather, so do not delay the spray. Do not spray just before rain.`
      : !healthy && kb.kind === "pest" && temp >= 30 ? `In hot weather (${Math.round(temp)}°) sucking insects multiply fast; spray in the morning or evening.` : "",
    advice: "",
    image_note: "",
  };
}

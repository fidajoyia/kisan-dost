"use client";
// Seed finder: registered varieties from the world's top agricultural institutions; the farmer sorts, filters and compares the facts.
import { urduName } from "@/lib/urdu-name";
import { useEffect, useMemo, useState } from "react";
import { tempSummary, ZONES } from "@/lib/seeds";
import { CROPS } from "@/lib/seed-intel/crops";
import { instById } from "@/lib/seed-intel/institutions";

const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const SEP = (lang) => (lang === "ur" ? "، " : ", ");
const arr = (a) => (Array.isArray(a) ? a : []);
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const MONTHS_UR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const doy = (m, d) => Math.floor((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / 864e5);
function sowing(crop, mean, lang) {
  const M = lang === "ur" ? MONTHS_UR : MONTHS_EN;
  const today = doy(new Date().getMonth() + 1, new Date().getDate());
  let state = "later", days = 999;
  for (const [m1, d1, m2, d2] of crop.sow) {
    const a = doy(m1, d1), b = doy(m2, d2);
    if (a <= b ? today >= a && today <= b : today >= a || today <= b) { state = "now"; break; }
    days = Math.min(days, (a - today + 365) % 365);
  }
  if (state === "now" && mean != null) state = mean > crop.temp[1] + 1 ? "hot" : mean < crop.temp[0] - 1 ? "cold" : "now";
  else if (state !== "now" && days <= 45) state = "soon";
  const win = crop.sow.map(([m1, d1, m2, d2]) => `${d1} ${M[m1 - 1]} – ${d2} ${M[m2 - 1]}`).join(lang === "ur" ? "، " : ", ");
  return { state, days, win };
}

// Everything a farmer reads here is in Urdu and comes only from the variety's official registration.
// A fact the registration does not state is shown as "not stated", never guessed.
const NA = (l) => pick(l, "رجسٹریشن میں درج نہیں", "not stated in the registration");
const DISEASE_UR = [
  [/stripe rust|yellow rust/i, "پیلی کنگی"], [/leaf rust|brown rust/i, "بھوری کنگی"], [/stem rust|black rust/i, "کالی کنگی"],
  [/powdery mildew/i, "سفوفی پھپھوندی"], [/downy mildew/i, "روئیں دار پھپھوندی"], [/fusarium head blight|head scab|\bscab\b/i, "سٹے کا جھلساؤ (فیوزیریم)"],
  [/septoria|leaf blotch/i, "پتوں کے دھبے (سیپٹوریا)"], [/tan spot/i, "بھورے دھبے (ٹین اسپاٹ)"], [/glume blotch/i, "سٹے کے دھبے"],
  [/soil-?borne wheat mosaic/i, "مٹی سے پھیلنے والا موزیک وائرس"], [/wheat streak mosaic/i, "گندم کا دھاری دار موزیک وائرس"], [/barley yellow dwarf/i, "پیلا بونا وائرس"],
  [/hessian fly/i, "ہیسین مکھی"], [/greenbug|aphid/i, "سست تیلا"], [/blast/i, "بلاسٹ (جھلساؤ)"], [/sheath blight/i, "تنے کا جھلساؤ"],
  [/bacterial (leaf )?blight|bacterial panicle/i, "بیکٹیریائی جھلساؤ"], [/straighthead/i, "سٹریٹ ہیڈ"], [/leaf curl/i, "پتہ مروڑ وائرس"],
  [/bacterial blight/i, "بیکٹیریائی جھلساؤ"], [/fusarium wilt/i, "اکھیڑا (فیوزیریم)"], [/verticillium/i, "اکھیڑا (ورٹیسیلیم)"], [/nematode/i, "نیماٹوڈ (کیڑے)"],
  [/root[- ]knot/i, "جڑ کی گانٹھ"], [/smut/i, "کانگیاری"], [/red rot/i, "رتا روگ (سرخ سڑن)"], [/mosaic|virus/i, "وائرس"], [/late blight/i, "پچھیتا جھلساؤ"],
  [/early blight/i, "اگیتا جھلساؤ"], [/borer/i, "گڑوواں سنڈی"], [/rot/i, "سڑن"], [/blight/i, "جھلساؤ"], [/rust/i, "کنگی"], [/spot/i, "دھبے"],
];
const diseaseUr = (xs, l) => {
  const out = [];
  for (const raw of arr(xs)) {
    const x = String(raw).replace(/\(.*$/, "").replace(/based on.*$/i, "").replace(/prevailing races of/i, "").trim();
    if (!x) continue;
    const hit = DISEASE_UR.find(([re]) => re.test(x));
    if (l === "ur" && !hit) continue; // no Urdu name known: leave it out rather than show English
    const t = l === "ur" ? hit[1] : x;
    if (!out.includes(t)) out.push(t);
  }
  return out;
};
const TYPE_UR = { "hard red winter": "سخت سرخ دانہ", "soft red winter": "نرم سرخ دانہ", "hard red spring": "سخت سرخ دانہ", "hard white winter": "سخت سفید دانہ", "soft white winter": "نرم سفید دانہ",
  "hard white spring": "سخت سفید دانہ", "soft white spring": "نرم سفید دانہ", "two-row": "دو قطاری", "six-row": "چھ قطاری", upland: "عام (اپ لینڈ) کپاس", pima: "پیما (لمبا ریشہ)",
  hybrid: "ہائبرڈ", inbred: "عام قسم (ہائبرڈ نہیں)", "long-grain": "لمبا دانہ", "medium-grain": "درمیانہ دانہ", "short-grain": "چھوٹا دانہ", aromatic: "خوشبودار", jasmine: "جیسمین (خوشبودار)" };
const QUALITY_UR = { "baking quality": "روٹی / بیکنگ کے لیے اچھی", "fibre quality": "اچھا ریشہ", protein: "زیادہ پروٹین", oil: "زیادہ تیل", "sugar content": "زیادہ مٹھاس", malting: "مالٹنگ" };
const instLabel = (c, lang) => arr(c.institutions).map((i) => pick(lang, i.name_ur, i.name_en)).join(SEP(typeof l === "undefined" ? lang : l));

// one plain line on weather: was it proven in weather like yours?
function climateLine(c, l) {
  const k = c.climate;
  if (!k) return { cls: "na", short: pick(l, "معلوم نہیں", "unknown"), long: pick(l, "رجسٹریشن میں نہیں لکھا کہ یہ کس علاقے میں آزمایا گیا، اس لیے آپ کے موسم سے موازنہ ممکن نہیں۔", "The registration does not say where it was tested, so it cannot be compared with your weather.") };
  const d = Math.abs(k.warmer), word = k.warmer > 0 ? pick(l, "گرم", "warmer") : pick(l, "ٹھنڈا", "colder");
  const diff = d < 1 ? pick(l, "تقریباً ایک جیسا", "about the same") : pick(l, `آپ کا علاقہ تقریباً ${Math.round(d)}° ${word}`, `your area is about ${Math.round(d)}° ${word}`);
  const where = pick(l, k.ur, k.en);
  if (k.sim >= 70) return { cls: "g", short: pick(l, "آپ جیسا موسم", "weather like yours"), long: pick(l, `${where} میں آزمایا گیا، جہاں فصل کے مہینوں کا موسم آپ کے علاقے جیسا ہے (${diff})۔`, `Tested in ${where}, where the crop months' weather is like yours (${diff}).`) };
  if (k.sim >= 40) return { cls: "m", short: pick(l, "موسم میں فرق", "some difference"), long: pick(l, `${where} میں آزمایا گیا؛ وہاں کا موسم آپ سے مختلف ہے (${diff})۔ آپ کے کھیت میں نتیجہ مختلف ہو سکتا ہے۔`, `Tested in ${where}; its weather differs from yours (${diff}). Results on your farm may differ.`) };
  return { cls: "b", short: pick(l, "موسم بہت مختلف", "very different"), long: pick(l, `${where} میں آزمایا گیا؛ وہاں کا موسم آپ سے بہت مختلف ہے (${diff})۔ آپ کے علاقے کے لیے خطرہ ہے۔`, `Tested in ${where}; its weather is very different from yours (${diff}). Risky for your area.`) };
}
function yieldLine(c, l) {
  if (c.yieldPct != null && c.yieldPct > 0) return { cls: "g", t: pick(l, `سرکاری تجربات میں پرانی (چیک) اقسام سے ${c.yieldPct}٪ زیادہ`, `${c.yieldPct}% more than the check varieties in official trials`) };
  if (c.yieldPct != null) return { cls: "m", t: pick(l, "پرانی اقسام کے برابر یا کم", "equal to or below the check varieties") };
  if (c.yieldClaim === "higher") return { cls: "g", t: pick(l, "پرانی اقسام سے زیادہ (کتنی زیادہ، یہ درج نہیں)", "more than the check varieties (amount not stated)") };
  if (c.yieldClaim === "high") return { cls: "m", t: pick(l, "اچھی پیداوار لکھی ہے، مگر پرانی اقسام سے موازنہ درج نہیں", "described as high-yielding, but no comparison with check varieties") };
  if (c.yieldClaim === "comparable") return { cls: "m", t: pick(l, "پرانی اقسام کے برابر", "equal to the check varieties") };
  return { cls: "na", t: NA(l) };
}
// t/ha → maunds (40 kg) per acre: 1 t/ha = 1000 kg / 2.471 acres / 40 kg
const maunds = (note) => { const m = String(note || "").match(/([\d.]+)\s*t\/ha/); return m ? Math.round((+m[1] * 1000) / 2.471 / 40) : null; };

function Facts({ c, lang: l }) {
  const cl = climateLine(c, l), y = yieldLine(c, l);
  const res = diseaseUr(c.resistant, l), mod = diseaseUr(c.moderate, l).filter((x) => !res.includes(x));
  const tol = [c.tol?.heat && pick(l, "گرمی", "heat"), c.tol?.drought && pick(l, "کم پانی / خشکی", "drought"), c.tol?.salt && pick(l, "کلر (نمکین زمین)", "salt"), c.tol?.flood && pick(l, "کھڑا پانی", "waterlogging"), c.tol?.cold && pick(l, "کورا / سخت سردی", "frost")].filter(Boolean);
  const mat = { early: pick(l, "جلد پکنے والی", "early"), medium: pick(l, "درمیانی", "medium"), late: pick(l, "دیر سے پکنے والی", "late") }[c.maturity];
  const habit = c.habit === "winter" ? pick(l, "ونٹر (سخت سردی مانگتی ہے)", "winter type (needs a cold winter)") : c.habit === "spring" ? pick(l, "اسپرنگ (ہلکی سردی میں ٹھیک)", "spring type (fine in mild winters)") : null;
  const type = [habit, c.type ? (l === "ur" ? TYPE_UR[c.type.toLowerCase()] : c.type) : null].filter(Boolean).join(SEP(typeof l === "undefined" ? lang : l));
  const mds = maunds(c.yieldNote);
  // "sucrose" in a wheat registration is a flour test, not sweetness
  const qual = arr(c.quality).filter((q) => q !== "sugar content" || ["sugarcane", "sugarbeet", "sorghum"].includes(c.crop));
  const rows = [
    [pick(l, "پیداوار", "Yield"), y.t + (mds ? pick(l, ` · تجربات میں تقریباً ${mds} من فی ایکڑ`, ` · about ${mds} maunds/acre in trials`) : ""), y.cls],
    [pick(l, "بیماری سے بچاؤ", "Disease resistance"), res.length ? res.join(SEP(typeof l === "undefined" ? lang : l)) + (mod.length ? pick(l, ` · کچھ حد تک: ${mod.join(SEP(typeof l === "undefined" ? lang : l))}`, ` · partly: ${mod.join(", ")}`) : "") : mod.length ? pick(l, `کچھ حد تک: ${mod.join(SEP(typeof l === "undefined" ? lang : l))}`, `partly: ${mod.join(", ")}`) : NA(l), res.length ? "g" : "na"],
    [pick(l, "پکنے کا وقت", "Maturity"), mat ? mat + (c.daysEarlier ? pick(l, ` (پرانی اقسام سے ${c.daysEarlier} دن پہلے)`, ` (${c.daysEarlier} days earlier than checks)`) : "") : NA(l), mat ? "" : "na"],
    [pick(l, "کیا برداشت کرتی ہے", "Tolerates"), tol.length ? tol.join(SEP(typeof l === "undefined" ? lang : l)) : NA(l), tol.length ? "" : "na"],
    [pick(l, "قسم", "Type"), type || NA(l), type ? "" : "na"],
    ...(qual.length ? [[pick(l, "معیار", "Quality"), qual.map((q) => (l === "ur" ? QUALITY_UR[q] : q)).filter(Boolean).join(SEP(typeof l === "undefined" ? lang : l)), ""]] : []),
    [pick(l, "جاری ہونے کا سال", "Released"), c.released || c.year || NA(l), ""],
  ];
  return (
    <dl className="sf-facts">
      {rows.map(([k, v, cls]) => <div key={k} className={cls ? `f-${cls}` : ""}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}
// The farmer chooses: sort and filter on facts from the registrations. The app gives no verdict of its own.
const yieldScore = (c) => (c.yieldPct != null ? c.yieldPct : c.yieldClaim === "higher" ? 0.5 : c.yieldClaim ? 0 : -1);
const SORTS = {
  match: { t: ["آپ کے موسم سے میل", "Weather match"], f: (a, b) => (b.climate?.sim ?? -1) - (a.climate?.sim ?? -1) },
  yield: { t: ["پیداوار (پرانی اقسام سے)", "Yield vs checks"], f: (a, b) => yieldScore(b) - yieldScore(a) },
  disease: { t: ["زیادہ بیماریوں سے بچاؤ", "Most disease resistance"], f: (a, b) => arr(b.resistant).length - arr(a.resistant).length },
  new: { t: ["نئی اقسام پہلے", "Newest first"], f: (a, b) => (+(b.released || b.year) || 0) - (+(a.released || a.year) || 0) },
};
const FILTERS = {
  similar: { t: ["آپ جیسا موسم", "Weather like yours"], f: (c) => (c.climate?.sim ?? 0) >= 70 },
  yield: { t: ["زیادہ پیداوار ثابت", "Proven higher yield"], f: (c) => c.yieldPct > 0 || c.yieldClaim === "higher" },
  disease: { t: ["بیماری سے بچاؤ", "Disease resistant"], f: (c) => arr(c.resistant).length > 0 },
  heat: { t: ["گرمی برداشت", "Heat tolerant"], f: (c) => !!c.tol?.heat },
  drought: { t: ["کم پانی", "Drought tolerant"], f: (c) => !!c.tol?.drought },
  salt: { t: ["کلر برداشت", "Salt tolerant"], f: (c) => !!c.tol?.salt },
  early: { t: ["جلد پکنے والی", "Early maturing"], f: (c) => c.maturity === "early" },
};

function Compare({ items, lang: l, onClose }) {
  const rows = [
    [pick(l, "موسم کا میل", "Weather match"), (c) => climateLine(c, l).short],
    [pick(l, "پیداوار", "Yield"), (c) => yieldLine(c, l).t],
    [pick(l, "بیماری سے بچاؤ", "Resists"), (c) => diseaseUr(c.resistant, l).join(SEP(typeof l === "undefined" ? lang : l)) || "–"],
    [pick(l, "برداشت", "Tolerates"), (c) => [c.tol?.heat && pick(l, "گرمی", "heat"), c.tol?.drought && pick(l, "خشکی", "drought"), c.tol?.salt && pick(l, "کلر", "salt"), c.tol?.cold && pick(l, "سردی", "frost")].filter(Boolean).join(SEP(typeof l === "undefined" ? lang : l)) || "–"],
    [pick(l, "پکنے کا وقت", "Maturity"), (c) => ({ early: pick(l, "جلد", "early"), medium: pick(l, "درمیانی", "medium"), late: pick(l, "دیر", "late") }[c.maturity] || "–")],
    [pick(l, "سال", "Year"), (c) => c.released || c.year || "–"],
  ];
  return (
    <section className="sf-cmp">
      <div className="sf-row"><h3 className="sec-title" style={{ margin: 0 }}>{pick(l, "موازنہ", "Compare")}</h3><button type="button" className="btn ghost" onClick={onClose}>{pick(l, "بند کریں", "Close")}</button></div>
      <div className="wx-table-wrap">
        <table className="sf-cmp-t">
          <thead><tr><th />{items.map((c) => <th key={c.id} className={l === "ur" ? "" : "latin"}>{l === "ur" ? urduName(c.name) : c.name}</th>)}</tr></thead>
          <tbody>{rows.map(([k, f]) => <tr key={k}><th>{k}</th>{items.map((c) => <td key={c.id}>{f(c)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

// The institutions behind this crop's varieties, side by side: how many varieties, how many proven in weather
// like the farmer's, best trial yield, most diseases resisted, newest release. Tap one to see only its varieties.
function InstCompare({ list, lang: l, inst, setInst }) {
  const by = new Map();
  for (const c of list) for (const i of arr(c.institutions)) {
    const r = by.get(i.id) || { id: i.id, n: 0, like: 0, best: null, dis: 0, newest: 0 };
    r.n++; if ((c.climate?.sim ?? 0) >= 70) r.like++;
    if (c.yieldPct > 0) r.best = Math.max(r.best || 0, c.yieldPct);
    r.dis = Math.max(r.dis, diseaseUr(c.resistant, l).length);
    r.newest = Math.max(r.newest, +(c.released || c.year) || 0);
    by.set(i.id, r);
  }
  const rows = [...by.values()].map((r) => ({ ...r, def: instById(r.id) || {} }))
    .sort((a, b) => b.like - a.like || b.n - a.n || (a.def.rank || 99) - (b.def.rank || 99)).slice(0, 10);
  if (rows.length < 2) return null;
  return (
    <section className="sf-inst">
      <h3 className="sec-title">{pick(l, "دنیا کے بڑے زرعی اداروں کا موازنہ", "Institutions compared")}</h3>
      <div className="wx-table-wrap">
        <table className="sf-cmp-t">
          <thead><tr>
            <th>{pick(l, "ادارہ", "Institution")}</th><th>{pick(l, "اقسام", "Varieties")}</th><th>{pick(l, "آپ جیسا موسم", "Weather like yours")}</th>
            <th>{pick(l, "سب سے زیادہ پیداوار", "Best yield")}</th><th>{pick(l, "بیماریوں سے بچاؤ", "Diseases resisted")}</th><th>{pick(l, "نئی قسم", "Newest")}</th>
          </tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className={inst === r.id ? "on" : ""} onClick={() => setInst(inst === r.id ? null : r.id)} style={{ cursor: "pointer" }}>
              <th><b>{pick(l, r.def.name_ur, r.def.name_en)}</b><br /><small>{pick(l, r.def.country_ur, r.def.country_en)}{r.def.rank ? pick(l, ` · دنیا میں نمبر ${r.def.rank}`, ` · world no. ${r.def.rank}`) : ""}</small></th>
              <td className="num">{r.n}</td><td className="num">{r.like}</td>
              <td>{r.best ? pick(l, `${r.best}٪ زیادہ`, `+${r.best}%`) : "–"}</td>
              <td className="num">{r.dis || "–"}</td><td className="num">{r.newest || "–"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="hint" style={{ margin: "6px 0 0" }}>{inst ? pick(l, "نیچے صرف اسی ادارے کی اقسام ہیں۔ دوبارہ دبائیں تو سب نظر آئیں گی۔", "Showing only this institution's varieties. Tap again for all.") : pick(l, "کسی ادارے پر دبائیں تو نیچے صرف اس کی اقسام نظر آئیں گی۔", "Tap an institution to see only its varieties.")}</p>
    </section>
  );
}

// One clean variety name: registrations that list several varieties ("A / B / C", "A and B two-row barley cultivars") show the first.
const shortName = (n = "") => {
  let x = String(n).split(" / ")[0].split(/ and |, /)[0].trim();
  const w = x.split(" "); const cut = w.findIndex((t, i) => i > 0 && /^[a-z][a-z-]{3,}$/.test(t));
  return (cut > 0 ? w.slice(0, cut) : w).join(" ");
};
export function SeedFinder({ wx, coords, zone, setZone, lang }) {
  const dir = lang === "ur" ? "rtl" : "ltr";
  const temps = useMemo(() => tempSummary(wx), [wx]);
  const [counts, setCounts] = useState(null);
  const [tops, setTops] = useState({}); // crop id -> best seed (or null when none), filled as each answer arrives
  const [open, setOpen] = useState(null);
  const [tryN, setTryN] = useState(0);

  // The crop list can take up to a minute when the server refreshes its seed data, so keep waiting and retry
  // (3 tries) instead of showing an error while it is still coming.
  useEffect(() => {
    const c = LS.get("kd-seed-counts");
    if (!tryN && c && Date.now() - c.t < 24 * 3600e3 && Object.values(c.d.counts || {}).some((n) => n > 0)) { setCounts(c.d.counts); return; }
    setCounts(null);
    let alive = true;
    const get = (left) => fetch("/api/seeds?counts=1").then((r) => r.json())
      .then((d) => { if (!Object.values(d.counts || {}).some((n) => n > 0)) throw 0; if (alive) { setCounts(d.counts); LS.set("kd-seed-counts", { t: Date.now(), d }); } })
      .catch(() => { if (!alive) return; if (left > 0) setTimeout(() => alive && get(left - 1), 4000); else setCounts({}); });
    get(2);
    return () => { alive = false; };
  }, [tryN]);
  const crops = counts ? CROPS.filter((c) => counts[c.id] > 0) : [];
  // The best seed of every crop, from any research centre in the world (server ranking: weather match, yield, disease, land).
  useEffect(() => {
    if (!coords || !crops.length) return;
    setTops({});
    let alive = true;
    crops.forEach((c) => {
      const q = new URLSearchParams({ crop: c.id, lat: coords.lat, lon: coords.lon, zone, band: temps?.band || "" });
      fetch(`/api/seeds?${q}`).then((r) => r.json()).then((d) => { if (alive) setTops((t) => ({ ...t, [c.id]: arr(d.candidates).slice(0, 3) })); })
        .catch(() => { if (alive) setTops((t) => ({ ...t, [c.id]: [] })); });
    });
    return () => { alive = false; };
  }, [crops.map((c) => c.id).join(), coords?.lat, coords?.lon, zone, temps?.band]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = crops.filter((c) => arr(tops[c.id]).length);
  const waiting = crops.some((c) => !(c.id in tops));
  return (
    <div className="stack seeds2" dir={dir}>
      <section>
        <h3 className="sec-title">{pick(lang, "آپ کی زمین", "Your land")}</h3>
        <div className="zone-switch" role="group" aria-label={pick(lang, "زمین کی قسم", "Land type")}>
          {Object.keys(ZONES).map((z) => (
            <button key={z} type="button" aria-pressed={zone === z} onClick={() => setZone(z)}>
              <span>{pick(lang, ZONES[z].ur, ZONES[z].en)}</span>
            </button>
          ))}
        </div>
      </section>
      {!coords ? <p className="status">{pick(lang, "لوکیشن ملتے ہی آپ کے علاقے کے مطابق بیج دکھائے جائیں گے۔", "Seeds for your area appear once your location is available.")}</p>
        : counts === null || (!ready.length && waiting) ? <div className="thinking"><div className="spin" /><span>{pick(lang, "ہر فصل کی بہترین اقسام تلاش ہو رہی ہیں…", "Finding the best varieties for each crop…")}</span></div>
        : !ready.length ? <p className="status err">{pick(lang, "ابھی بیج کی معلومات نہیں مل سکیں۔", "Seed information could not be loaded right now.")} <button type="button" className="btn ghost" onClick={() => setTryN((n) => n + 1)}>{pick(lang, "دوبارہ کوشش", "Try again")}</button></p>
        : (
          <section>
            <h3 className="sec-title">{pick(lang, "ہر فصل کی 3 بہترین اقسام", "Top 3 varieties of each crop")}</h3>
            {ready.map((cd) => (
              <div key={cd.id} className="sf-crop-group">
                <h4 className="sf-crop-h">{pick(lang, cd.ur, cd.en)}</h4>
                <div className="sf-box-list">
                  {tops[cd.id].map((c, k) => {
                    const id = `${cd.id}:${c.id}`, on = open === id, sow = sowing(cd, temps?.mean14, lang);
                    return (
                      <div key={id} className={`sf-row-v${on ? " on" : ""}`}>
                        <button type="button" className="sf-card-h" aria-expanded={on} onClick={() => setOpen(on ? null : id)}>
                          <span><b><span className="num">{k + 1}.</span> {lang === "ur" ? <span>{urduName(shortName(c.name))}</span> : <span className="latin">{shortName(c.name)}</span>}</b><small>{instLabel(c, lang)}{c.released || c.year ? ` · ${c.released || c.year}` : ""}</small></span>
                        </button>
                        {on ? (
                          <div className="sf-detail">
                            <p className={`sf-sow s-${sow.state}`}><b>{pick(lang, "کاشت کا وقت", "Sowing")}:</b> {sow.win}</p>
                            <Facts c={c} lang={lang} />
                            <Where c={c} lang={lang} />
                          </div>
                        ) : <button type="button" className="linkbtn" onClick={() => setOpen(id)}>{pick(lang, "پوری تفصیل", "Full details")}</button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {waiting ? <p className="hint">{pick(lang, "باقی فصلیں آ رہی ہیں…", "More crops loading…")}</p> : null}
          </section>
        )}
    </div>
  );
}

function Where({ c, lang }) {
  const by = arr(c.institutions).map((i) => pick(lang, i.name_ur, i.name_en)).join(SEP(typeof l === "undefined" ? lang : l));
  return (
    <div className="sf-where">
      <b>{pick(lang, "بیج کہاں سے ملے گا", "Where to get it")}</b>
      <ul>
        {by ? <li>{pick(lang, "تیار کرنے والا ادارہ", "Developed by")}: {by}</li> : null}
        {lang !== "ur" && c.seller?.name && !arr(c.institutions).some((i) => i.name_en === c.seller.name) ? <li>{pick(lang, "تصدیق شدہ بیج / لائسنس", "Certified seed / licence")}: <span className="latin">{c.seller.name}</span></li> : null}
        {lang !== "ur" && c.regNo ? <li>{pick(lang, "سرکاری رجسٹریشن نمبر", "Registration no.")}: <span className="latin">{c.regNo}</span>{c.pi ? <> · {pick(lang, "جین بینک نمبر", "Gene bank no.")} <span className="latin">PI {c.pi}</span></> : null}</li> : null}
      </ul>
    </div>
  );
}

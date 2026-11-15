"use client";
// Seed finder: registered varieties from the world's top agricultural institutions; the farmer sorts, filters and compares the facts.
import { useEffect, useMemo, useState } from "react";
import { tempSummary, ZONES } from "@/lib/seeds";
import { CROPS } from "@/lib/seed-intel/crops";

const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
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
    const t = l === "ur" ? (hit ? hit[1] : x) : x;
    if (!out.includes(t)) out.push(t);
  }
  return out;
};
const TYPE_UR = { "hard red winter": "سخت سرخ دانہ", "soft red winter": "نرم سرخ دانہ", "hard red spring": "سخت سرخ دانہ", "hard white winter": "سخت سفید دانہ", "soft white winter": "نرم سفید دانہ",
  "hard white spring": "سخت سفید دانہ", "soft white spring": "نرم سفید دانہ", "two-row": "دو قطاری", "six-row": "چھ قطاری", upland: "عام (اپ لینڈ) کپاس", pima: "پیما (لمبا ریشہ)",
  hybrid: "ہائبرڈ", inbred: "عام قسم (ہائبرڈ نہیں)", "long-grain": "لمبا دانہ", "medium-grain": "درمیانہ دانہ", "short-grain": "چھوٹا دانہ", aromatic: "خوشبودار", jasmine: "جیسمین (خوشبودار)" };
const QUALITY_UR = { "baking quality": "روٹی / بیکنگ کے لیے اچھی", "fibre quality": "اچھا ریشہ", protein: "زیادہ پروٹین", oil: "زیادہ تیل", "sugar content": "زیادہ مٹھاس", malting: "مالٹنگ" };
const instLabel = (c, lang) => arr(c.institutions).map((i) => pick(lang, i.name_ur, i.name_en)).join("، ");

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
  const type = [habit, c.type ? pick(l, TYPE_UR[c.type.toLowerCase()] || c.type, c.type) : null].filter(Boolean).join("، ");
  const mds = maunds(c.yieldNote);
  // "sucrose" in a wheat registration is a flour test, not sweetness
  const qual = arr(c.quality).filter((q) => q !== "sugar content" || ["sugarcane", "sugarbeet", "sorghum"].includes(c.crop));
  const rows = [
    [pick(l, "موسم کا میل", "Weather match"), cl.long, cl.cls],
    [pick(l, "پیداوار", "Yield"), y.t + (mds ? pick(l, ` · تجربات میں تقریباً ${mds} من فی ایکڑ`, ` · about ${mds} maunds/acre in trials`) : ""), y.cls],
    [pick(l, "بیماری سے بچاؤ", "Disease resistance"), res.length ? res.join("، ") + (mod.length ? pick(l, ` · کچھ حد تک: ${mod.join("، ")}`, ` · partly: ${mod.join(", ")}`) : "") : mod.length ? pick(l, `کچھ حد تک: ${mod.join("، ")}`, `partly: ${mod.join(", ")}`) : NA(l), res.length ? "g" : "na"],
    [pick(l, "پکنے کا وقت", "Maturity"), mat ? mat + (c.daysEarlier ? pick(l, ` (پرانی اقسام سے ${c.daysEarlier} دن پہلے)`, ` (${c.daysEarlier} days earlier than checks)`) : "") : NA(l), mat ? "" : "na"],
    [pick(l, "کیا برداشت کرتی ہے", "Tolerates"), tol.length ? tol.join("، ") : NA(l), tol.length ? "" : "na"],
    [pick(l, "قسم", "Type"), type || NA(l), type ? "" : "na"],
    ...(qual.length ? [[pick(l, "معیار", "Quality"), qual.map((q) => pick(l, QUALITY_UR[q] || q, q)).join("، "), ""]] : []),
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
  pk: { t: ["پاکستان میں دستیاب", "Available in Pakistan"], f: (c) => c.pakistan === "registered" || c.pakistan === "sold" },
};

function Compare({ items, lang: l, onClose }) {
  const rows = [
    [pick(l, "موسم کا میل", "Weather match"), (c) => climateLine(c, l).short],
    [pick(l, "پیداوار", "Yield"), (c) => yieldLine(c, l).t],
    [pick(l, "بیماری سے بچاؤ", "Resists"), (c) => diseaseUr(c.resistant, l).join("، ") || "–"],
    [pick(l, "برداشت", "Tolerates"), (c) => [c.tol?.heat && pick(l, "گرمی", "heat"), c.tol?.drought && pick(l, "خشکی", "drought"), c.tol?.salt && pick(l, "کلر", "salt"), c.tol?.cold && pick(l, "سردی", "frost")].filter(Boolean).join("، ") || "–"],
    [pick(l, "پکنے کا وقت", "Maturity"), (c) => ({ early: pick(l, "جلد", "early"), medium: pick(l, "درمیانی", "medium"), late: pick(l, "دیر", "late") }[c.maturity] || "–")],
    [pick(l, "سال", "Year"), (c) => c.released || c.year || "–"],
    [pick(l, "پاکستان میں", "In Pakistan"), (c) => (c.pakistan === "registered" || c.pakistan === "sold" ? pick(l, "دستیاب", "available") : pick(l, "درآمد کرنا ہوگا", "import needed"))],
  ];
  return (
    <section className="sf-cmp">
      <div className="sf-row"><h3 className="sec-title" style={{ margin: 0 }}>{pick(l, "موازنہ", "Compare")}</h3><button type="button" className="btn ghost" onClick={onClose}>{pick(l, "بند کریں", "Close")}</button></div>
      <div className="wx-table-wrap">
        <table className="sf-cmp-t">
          <thead><tr><th />{items.map((c) => <th key={c.id} className="latin">{c.name}</th>)}</tr></thead>
          <tbody>{rows.map(([k, f]) => <tr key={k}><th>{k}</th>{items.map((c) => <td key={c.id}>{f(c)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

export function SeedFinder({ wx, coords, guess, zone, setZone, lang, goImport }) {
  const dir = lang === "ur" ? "rtl" : "ltr";
  const temps = useMemo(() => tempSummary(wx), [wx]);
  const [counts, setCounts] = useState(null);
  const [crop, setCrop] = useState(null);
  const [data, setData] = useState(null);
  const [state, setState] = useState("idle");
  const [open, setOpen] = useState(null);
  const [sort, setSort] = useState("match");
  const [filters, setFilters] = useState([]);
  const [cmp, setCmp] = useState([]);
  const [showCmp, setShowCmp] = useState(false);

  useEffect(() => {
    const c = LS.get("kd-seed-counts");
    if (c && Date.now() - c.t < 24 * 3600e3) { setCounts(c.d.counts); return; }
    fetch("/api/seeds?counts=1").then((r) => r.json()).then((d) => { if (d.counts) { setCounts(d.counts); LS.set("kd-seed-counts", { t: Date.now(), d }); } }).catch(() => {});
  }, []);
  useEffect(() => { setCrop(LS.get("kd-seed-crop") || "wheat"); }, []);
  useEffect(() => {
    if (!crop || !coords) return;
    const q = new URLSearchParams({ crop, lat: coords.lat, lon: coords.lon, zone, band: temps?.band || "" });
    setState("loading"); setOpen(null); setCmp([]); setShowCmp(false); setFilters([]);
    fetch(`/api/seeds?${q}`).then((r) => r.json()).then((d) => { setData(d); setState(d.error ? "error" : "ok"); }).catch(() => setState("error"));
  }, [crop, coords?.lat, coords?.lon, zone, temps?.band]);

  const choose = (id) => { setCrop(id); LS.set("kd-seed-crop", id); };
  const cropDef = CROPS.find((c) => c.id === crop);
  const sow = cropDef ? sowing(cropDef, temps?.mean14, lang) : null;
  const list = arr(data?.candidates);
  const toggle = (k) => setFilters((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
  const tick = (id) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-3)));
  const view = list.filter((c) => filters.every((k) => FILTERS[k].f(c))).sort(SORTS[sort].f);
  const shown = CROPS.filter((c) => !counts || counts[c.id] > 0 || c.id === crop);

  return (
    <div className="stack seeds2" dir={dir}>
      <section>
        <h3 className="sec-title">{pick(lang, "فصل منتخب کریں", "Choose crop")}</h3>
        <div className="sf-crops" role="tablist">
          {shown.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={crop === c.id} onClick={() => choose(c.id)}>
              {pick(lang, c.ur, c.en)}
            </button>
          ))}
        </div>
        {sow ? (
          <p className={`sf-sow s-${sow.state}`}>
            <b>{pick(lang, "کاشت کا وقت", "Sowing")}:</b> {sow.win} ·{" "}
            {{ now: pick(lang, "ابھی کاشت کریں ✓", "sow now ✓"), hot: pick(lang, "موسم ابھی گرم ہے، چند دن رکیں", "still too warm, wait a few days"), cold: pick(lang, "موسم ابھی ٹھنڈا ہے، رکیں", "still too cold, wait"), soon: pick(lang, `${sow.days} دن میں کاشت شروع`, `starts in ${sow.days} days`), later: pick(lang, "اس موسم میں نہیں", "not this season") }[sow.state]}
          </p>
        ) : null}
      </section>
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
        : state === "loading" && !data ? <div className="thinking"><div className="spin" /><span>{pick(lang, "بیجوں کا آپ کے موسم سے موازنہ ہو رہا ہے…", "Comparing seeds with your weather…")}</span></div>
        : state === "error" ? <p className="status err">{pick(lang, "ابھی بیج کی معلومات نہیں مل سکیں۔ تھوڑی دیر بعد دوبارہ کھولیں۔", "Seed information could not be loaded right now. Try again shortly.")}</p>
        : !list.length ? <p className="status">{pick(lang, "اس فصل کی کوئی رجسٹرڈ قسم ابھی ہمارے پاس نہیں۔ اپنے علاقے کی منظور شدہ قسم ہی کاشت کریں۔", "We have no registered variety for this crop yet. Sow your area's approved variety.")}</p>
        : (
          <>
            <section className="sf-tools">
              <div className="sf-row">
                <label className="sf-sort">{pick(lang, "ترتیب", "Sort")}
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{pick(lang, ...v.t)}</option>)}
                  </select>
                </label>
                <span className="sf-count">{pick(lang, `${view.length} / ${list.length} اقسام`, `${view.length} / ${list.length} varieties`)}</span>
              </div>
              <div className="sf-filters" role="group" aria-label={pick(lang, "فلٹر", "Filters")}>
                {Object.entries(FILTERS).filter(([k]) => list.some(FILTERS[k].f)).map(([k, v]) => (
                  <button key={k} type="button" aria-pressed={filters.includes(k)} onClick={() => toggle(k)}>
                    {pick(lang, ...v.t)} <span className="num">{list.filter(v.f).length}</span>
                  </button>
                ))}
              </div>
              {cmp.length ? <button type="button" className="btn sf-cmpbtn" onClick={() => setShowCmp(true)} disabled={cmp.length < 2}>
                {cmp.length < 2 ? pick(lang, "موازنے کے لیے ایک اور قسم چنیں", "Pick one more to compare") : pick(lang, `${cmp.length} اقسام کا موازنہ کریں`, `Compare ${cmp.length} varieties`)}
              </button> : <p className="hint" style={{ margin: 0 }}>{pick(lang, "ہر قسم پر ☐ دبا کر 2 یا 3 اقسام ساتھ ساتھ دیکھیں۔ فیصلہ آپ کا ہے؛ ایپ صرف حقائق دکھاتی ہے۔", "Tick ☐ on 2 or 3 varieties to see them side by side. The choice is yours; the app only shows facts.")}</p>}
            </section>

            {showCmp && cmp.length >= 2 ? <Compare items={list.filter((c) => cmp.includes(c.id))} lang={lang} onClose={() => setShowCmp(false)} /> : null}

            <section>
              <h3 className="sec-title">{pick(lang, "اقسام", "Varieties")} <small>{pick(lang, cropDef.ur, cropDef.en)}</small></h3>
              {!view.length ? <p className="status">{pick(lang, "ان فلٹرز کے ساتھ کوئی قسم نہیں۔ کوئی فلٹر ہٹا کر دیکھیں۔", "No variety matches these filters. Remove a filter.")}</p> : null}
              <div className="sf-cards">
                {view.map((c) => {
                  const cl = climateLine(c, lang), y = yieldLine(c, lang), res = diseaseUr(c.resistant, lang), on = cmp.includes(c.id);
                  return (
                    <div key={c.id} className={`sf-card${on ? " on" : ""}`}>
                      <div className="sf-card-top">
                        <button type="button" className="sf-tick" aria-pressed={on} aria-label={pick(lang, "موازنے میں شامل کریں", "Add to compare")} onClick={() => tick(c.id)}>{on ? "☑" : "☐"}</button>
                        <button type="button" className="sf-card-h" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                          <span><b className="latin">{c.name}</b><small>{instLabel(c, lang)}{c.released || c.year ? ` · ${c.released || c.year}` : ""}</small></span>
                          <span className={`sf-pill p-${cl.cls}`}>{cl.short}</span>
                        </button>
                      </div>
                      <p className="sf-card-l"><span className={`p-${y.cls}`}>{pick(lang, "پیداوار", "Yield")}: {y.t}</span>{res.length ? <span>{pick(lang, "بچاؤ", "Resists")}: {res.slice(0, 3).join("، ")}</span> : null}</p>
                      {open === c.id ? (
                        <div className="sf-detail">
                          <Facts c={c} lang={lang} />
                          <Where c={c} lang={lang} goImport={goImport} />
                        </div>
                      ) : <button type="button" className="linkbtn" onClick={() => setOpen(c.id)}>{pick(lang, "پوری تفصیل", "Full details")}</button>}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
    </div>
  );
}

function Where({ c, lang, goImport }) {
  return (
    <div className="sf-where">
      <b>{pick(lang, "بیج کہاں سے ملے گا", "Where to get it")}</b>
      <ul>
        {c.seller?.name ? <li>{pick(lang, "بیج / لائسنس", "Seed / licence")}: {c.seller.url ? <a href={c.seller.url} target="_blank" rel="noopener noreferrer" className="latin">{c.seller.name} ↗</a> : <span className="latin">{c.seller.name}</span>}</li> : null}
        {c.pakistan === "registered" || c.pakistan === "sold"
          ? <li className="g">{pick(lang, "پاکستان میں دستیاب", "Available in Pakistan")}{lang !== "ur" && c.pakistanNote ? `: ${c.pakistanNote}` : ""}</li>
          : <li>{pick(lang, "پاکستان میں منگوانا ہو تو: ", "To bring it to Pakistan: ")}<button type="button" className="linkbtn" onClick={goImport}>{pick(lang, "درآمد کا طریقہ", "import steps")}</button></li>}
        {c.pi ? <li>{pick(lang, "تجربے کے لیے تھوڑا بیج (امریکی سرکاری جین بینک)", "Small trial sample (US government gene bank)")}: <a href="https://npgsweb.ars-grin.gov/gringlobal/search" target="_blank" rel="noopener noreferrer" className="latin">PI {c.pi} ↗</a></li> : null}
        <li><a href={c.link} target="_blank" rel="noopener noreferrer">{pick(lang, "اصل رجسٹریشن (انگریزی)", "Original registration (English)")} ↗</a></li>
      </ul>
    </div>
  );
}

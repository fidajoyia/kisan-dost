"use client";
// Seed finder: best seed per crop from the world's top agricultural institutions, compared for this farm.
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

const WHY = {
  yield_pct: (v, l) => pick(l, `سرکاری تجربات میں چیک اقسام سے ${v}% زیادہ پیداوار`, `${v}% more yield than check varieties in official trials`),
  yield_higher: (_, l) => pick(l, "سرکاری تجربات میں چیک اقسام سے زیادہ پیداوار", "higher yield than check varieties in official trials"),
  yield_high: (_, l) => pick(l, "زیادہ پیداوار کی صلاحیت", "high yield potential"),
  yield_same: (_, l) => pick(l, "پیداوار چیک اقسام کے برابر", "yield equal to check varieties"),
  resistant: (v, l) => pick(l, `ان بیماریوں کے خلاف مزاحم: ${v.join("، ")}`, `resistant to ${v.join(", ")}`),
  needs_cold: (v, l) => pick(l, `سرد سردی مانگنے والی (ونٹر) قسم؛ آپ کی سردیوں کا اوسط ${v}°C ہے، اس لیے کم موزوں`, `winter type needs a cold winter; yours averages ${v}°C, so less suited`),
  cold_ok: (v, l) => pick(l, `ونٹر قسم؛ آپ کے علاقے کی سردی (${v}°C) کافی ہے`, `winter type; your winter (${v}°C) is cold enough`),
  spring_type: (_, l) => pick(l, "بہاریہ (اسپرنگ) قسم: ہلکی سردیوں کے لیے موزوں", "spring type: suits mild winters"),
  salt: (_, l) => pick(l, "نمکین (کلر) زمین برداشت کرتی ہے", "tolerates salty (kallar) land"),
  flood: (_, l) => pick(l, "کھڑا پانی / سیم برداشت کرتی ہے", "tolerates standing water / waterlogging"),
  drought: (_, l) => pick(l, "کم پانی / خشکی میں اچھی پیداوار", "yields well with little water / drought"),
  sand: (_, l) => pick(l, "ریتلی زمین کے لیے تیار کی گئی", "bred for sandy soils"),
  heat: (_, l) => pick(l, "گرمی برداشت کرتی ہے", "heat tolerant"),
  early_escape: (_, l) => pick(l, "جلد پکنے والی: آخری گرمی سے پہلے تیار", "early maturing: ready before the late heat"),
  early: (_, l) => pick(l, "جلد پکنے والی", "early maturing"),
  quality: (v, l) => pick(l, `معیار: ${v.map((q) => ({ "baking quality": "روٹی / بیکنگ", "fibre quality": "ریشہ", protein: "پروٹین", oil: "تیل", "sugar content": "مٹھاس", malting: "مالٹنگ" }[q] || q)).join("، ")}`, `quality: ${v.join(", ")}`),
};
const why = (w, lang) => WHY[w.k]?.(w.v, lang) || null;
const instLabel = (c, lang) => arr(c.institutions).map((i) => `#${i.rank} ${pick(lang, i.name_ur, i.name_en)}`).join("، ");
const yieldText = (c, lang) => c.yieldPct != null ? `${c.yieldPct > 0 ? "+" : ""}${c.yieldPct}%` : c.yieldClaim === "higher" ? pick(lang, "زیادہ", "higher") : c.yieldClaim === "high" ? pick(lang, "اچھی", "high") : c.yieldClaim === "comparable" ? pick(lang, "برابر", "equal") : "–";
const matText = (m, lang) => ({ early: pick(lang, "جلد", "early"), medium: pick(lang, "درمیانی", "medium"), late: pick(lang, "دیر", "late") }[m] || "–");

export function SeedFinder({ wx, coords, guess, zone, setZone, lang, goImport }) {
  const dir = lang === "ur" ? "rtl" : "ltr";
  const temps = useMemo(() => tempSummary(wx), [wx]);
  const [counts, setCounts] = useState(null);
  const [crop, setCrop] = useState(null);
  const [data, setData] = useState(null);
  const [state, setState] = useState("idle");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const c = LS.get("kd-seed-counts");
    if (c && Date.now() - c.t < 24 * 3600e3) { setCounts(c.d.counts); return; }
    fetch("/api/seeds?counts=1").then((r) => r.json()).then((d) => { if (d.counts) { setCounts(d.counts); LS.set("kd-seed-counts", { t: Date.now(), d }); } }).catch(() => {});
  }, []);
  useEffect(() => { setCrop(LS.get("kd-seed-crop") || "wheat"); }, []);
  useEffect(() => {
    if (!crop || !coords) return;
    const q = new URLSearchParams({ crop, lat: coords.lat, lon: coords.lon, zone, band: temps?.band || "" });
    setState("loading"); setOpen(null);
    fetch(`/api/seeds?${q}`).then((r) => r.json()).then((d) => { setData(d); setState(d.error ? "error" : "ok"); }).catch(() => setState("error"));
  }, [crop, coords?.lat, coords?.lon, zone, temps?.band]);

  const choose = (id) => { setCrop(id); LS.set("kd-seed-crop", id); };
  const cropDef = CROPS.find((c) => c.id === crop);
  const sow = cropDef ? sowing(cropDef, temps?.mean14, lang) : null;
  const best = data?.best, list = arr(data?.candidates);
  const shown = CROPS.filter((c) => !counts || counts[c.id] > 0 || c.id === crop);

  return (
    <div className="stack seeds2" dir={dir}>
      <section className="sf-ctx">
        <div className="tempstrip">
          <div><span>{pick(lang, "اگلے 14 دن اوسط", "14-day average")}</span><b className="num">{temps ? `${temps.mean14}°C` : "–"}</b></div>
          <div><span>{pick(lang, "دن / رات", "Day / night")}</span><b className="num">{temps ? `${Math.round(temps.max14)}° / ${Math.round(temps.min14)}°` : "–"}</b></div>
          <div><span>{pick(lang, "سردیوں کا اوسط", "Winter average")}</span><b className="num">{data?.ctx?.winterMean != null ? `${data.ctx.winterMean}°C` : "–"}</b></div>
        </div>
        <div className="zone-switch" role="group" aria-label={pick(lang, "زمین کی قسم", "Land type")}>
          {Object.keys(ZONES).map((z) => (
            <button key={z} type="button" aria-pressed={zone === z} onClick={() => setZone(z)}>
              <span>{pick(lang, ZONES[z].ur, ZONES[z].en)}</span>
              {guess?.zone === z ? <em>{pick(lang, "خودکار اندازہ", "auto guess")}</em> : null}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="sec-title">{pick(lang, "فصل منتخب کریں", "Choose crop")} <small>Crop</small></h3>
        <div className="sf-crops" role="tablist">
          {shown.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={crop === c.id} onClick={() => choose(c.id)}>
              {pick(lang, c.ur, c.en)}{counts?.[c.id] ? <span className="num">{counts[c.id]}</span> : null}
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

      {!coords ? <p className="status">{pick(lang, "لوکیشن ملتے ہی آپ کے علاقے کے مطابق بیج دکھائے جائیں گے۔", "Seeds for your area appear once your location is available.")}</p>
        : state === "loading" && !data ? <div className="thinking"><div className="spin" /><span>{pick(lang, "دنیا کے بہترین اداروں کے بیجوں کا موازنہ ہو رہا ہے… (پہلی بار 20–60 سیکنڈ)", "Comparing seeds from the world's top institutions… (first time 20–60 s)")}</span></div>
        : state === "error" ? <p className="status err">{pick(lang, "ابھی بیج کا ڈیٹا نہیں مل سکا۔", "Seed data could not be loaded right now.")} {data?.error ? <span className="latin muted">({data.error})</span> : null}</p>
        : !best ? <p className="status">{pick(lang, "اس فصل کے لیے ابھی کوئی قسم نہیں ملی۔ سسٹم ہر ہفتے نئی اقسام خود تلاش کرتا ہے۔", "No variety found for this crop yet. The system searches for new ones every week.")}</p>
        : (
          <>
            <section className="sf-best">
              <div className="sf-best-head">
                <span className="sf-badge">{pick(lang, "آپ کے لیے بہترین بیج", "Best seed for you")}</span>
                <span className="sf-score num">{best.score}<small>/100</small></span>
              </div>
              <h3><span className="latin">{best.name}</span> <small>{pick(lang, cropDef.ur, cropDef.en)}{best.type ? ` · ${best.type}` : ""}</small></h3>
              <p className="sf-inst">{instLabel(best, lang)}{best.released ? ` · ${best.released}` : ""}</p>
              <ul className="sf-why">
                {arr(best.why).map((w, i) => { const t = why(w, lang); return t ? <li key={i} className={w.good ? "g" : "b"}>{t}</li> : null; })}
              </ul>
              <Where c={best} lang={lang} goImport={goImport} />
            </section>

            <section>
              <h3 className="sec-title">{pick(lang, `موازنہ: ${list.length} اقسام`, `Comparison: ${list.length} varieties`)} <small>{pick(lang, cropDef.ur, cropDef.en)}</small></h3>
              <div className="sf-table" role="table">
                <div className="sf-tr sf-th" role="row">
                  <span>#</span><span>{pick(lang, "بیج / ادارہ", "Seed / institution")}</span><span>{pick(lang, "پیداوار", "Yield")}</span>
                  <span>{pick(lang, "بیماری سے بچاؤ", "Resistance")}</span><span>{pick(lang, "آپ کے لیے موزوں", "Fit")}</span><span>{pick(lang, "اسکور", "Score")}</span>
                </div>
                {list.map((c, i) => (
                  <div key={c.id} className="sf-row">
                    <button type="button" className="sf-tr" role="row" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                      <span className="num">{i + 1}</span>
                      <span><b className="latin">{c.name}</b><small>{arr(c.institutions).map((x) => `#${x.rank} ${x.short}`).join(", ")} · {c.released || c.year || "–"} · {matText(c.maturity, lang)}</small></span>
                      <span className="num">{yieldText(c, lang)}</span>
                      <span className="num">{(c.resistant?.length || 0) + (c.moderate?.length || 0) || "–"}</span>
                      <span><i className="sf-bar"><i style={{ width: `${c.parts?.fit}%` }} /></i></span>
                      <span className="num sf-s">{c.score}</span>
                    </button>
                    {open === c.id ? (
                      <div className="sf-detail">
                        <ul className="sf-why">{arr(c.why).map((w, k) => { const t = why(w, lang); return t ? <li key={k} className={w.good ? "g" : "b"}>{t}</li> : null; })}</ul>
                        {c.moderate?.length ? <p className="hint">{pick(lang, "درمیانی مزاحمت", "Moderate resistance")}: <span className="latin">{c.moderate.join(", ")}</span></p> : null}
                        {c.yieldNote ? <p className="hint">{pick(lang, "تجرباتی پیداوار", "Trial yield")}: <span className="num">{c.yieldNote}</span></p> : null}
                        {c.adapted ? <p className="hint">{pick(lang, "کس علاقے کے لیے", "Bred for")}: <span className="latin">{c.adapted}</span></p> : null}
                        <Where c={c} lang={lang} goImport={goImport} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
            <p className="hint">{pick(lang,
              `ڈیٹا: اداروں کی سرکاری اقسام کی رجسٹریشن رپورٹیں (${data.sources.registrations})${data.sources.web ? ` اور خودکار ویب تحقیق (${data.sources.web})` : ""}۔ ہر ہفتے خود بخود نئی اقسام شامل ہوتی ہیں۔ آخری اپڈیٹ: ${new Date(data.researched || data.updated).toLocaleDateString("ur-PK")}`,
              `Data: the institutions' official variety registrations (${data.sources.registrations})${data.sources.web ? ` and automatic web research (${data.sources.web})` : ""}. New varieties are added automatically every week. Last update: ${new Date(data.researched || data.updated).toLocaleDateString("en-GB")}`)}</p>
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
          ? <li className="g">{pick(lang, "پاکستان میں دستیاب", "Available in Pakistan")}{c.pakistanNote ? `: ${c.pakistanNote}` : ""}</li>
          : <li>{pick(lang, "پاکستان میں منگوانا ہو تو: ", "To bring it to Pakistan: ")}<button type="button" className="linkbtn" onClick={goImport}>{pick(lang, "درآمد کا طریقہ", "import steps")}</button></li>}
        {c.pi ? <li>{pick(lang, "تجربے کے لیے نمونہ", "Trial sample")}: <a href="https://npgsweb.ars-grin.gov/gringlobal/search" target="_blank" rel="noopener noreferrer" className="latin">USDA GRIN · PI {c.pi} ↗</a></li> : null}
        <li><a href={c.link} target="_blank" rel="noopener noreferrer">{c.source === "web" ? pick(lang, "ماخذ", "Source") : pick(lang, "سرکاری رجسٹریشن رپورٹ (ٹرائل ڈیٹا)", "Official registration report (trial data)")} ↗</a></li>
      </ul>
    </div>
  );
}

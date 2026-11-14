"use client";
// Flood screen: the danger for this farm and each river over the next 7 months, in plain words.
// Every level shown here is decided on the server (lib/flood/summary.js); this file only words it.
const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const arr = (a) => (Array.isArray(a) ? a : []);
const MONTHS_UR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (ym, lang) => (lang === "ur" ? MONTHS_UR : MONTHS_EN)[+ym.slice(5, 7) - 1];
const dayMonth = (date, lang) => `${+date.slice(8, 10)} ${monthName(date, lang)}`;

const STEPS = ["low", "moderate", "high", "severe"];
const CSS = { low: "ok", moderate: "mod", high: "hi", severe: "sev" };
const DANGER = { low: ["خطرہ کم ہے", "Low danger"], moderate: ["درمیانہ خطرہ", "Medium danger"], high: ["زیادہ خطرہ", "High danger"], severe: ["بہت زیادہ خطرہ", "Very high danger"] };
const SHORT = { low: ["کم", "Low"], moderate: ["درمیانہ", "Med"], high: ["زیادہ", "High"], severe: ["شدید", "Severe"] };
const FLOOD_CLASS = {
  Normal: ["معمول کا بہاؤ", "normal flow"], LowFlood: ["نچلے درجے کا سیلاب", "low flood"], MediumFlood: ["درمیانے درجے کا سیلاب", "medium flood"],
  HighFlood: ["اونچے درجے کا سیلاب", "high flood"], VeryHighFlood: ["بہت اونچے درجے کا سیلاب", "very high flood"],
  ExceptionallyHighFlood: ["غیر معمولی اونچا سیلاب", "exceptionally high flood"],
};
const TREND = { R: ["پانی چڑھ رہا ہے", "rising"], F: ["پانی اتر رہا ہے", "falling"], S: ["پانی ٹھہرا ہوا ہے", "steady"] };
const DAM = { tarbela: ["تربیلا ڈیم", "Tarbela Dam"], mangla: ["منگلا ڈیم", "Mangla Dam"] };

const lvClass = (k) => `lv-${CSS[k] || "ok"}`;
const dangerTxt = (k, lang) => pick(lang, ...(DANGER[k] || DANGER.low));
const moreLess = (diff, lang) => (diff >= 5 ? pick(lang, "پچھلے سال سے زیادہ", "more than last year") : diff <= -5 ? pick(lang, "پچھلے سال سے کم", "less than last year") : pick(lang, "پچھلے سال جتنا", "about the same as last year"));

// "اپریل سے مئی": the run of months around `ym` that share its level
function span(months, ym, lang) {
  const i = months.findIndex((m) => m.ym === ym);
  if (i < 0) return "";
  let a = i, b = i;
  while (a > 0 && months[a - 1].level === months[i].level) a--;
  while (b < months.length - 1 && months[b + 1].level === months[i].level) b++;
  return a === b ? monthName(months[a].ym, lang) : pick(lang, `${monthName(months[a].ym, lang)} سے ${monthName(months[b].ym, lang)}`, `${monthName(months[a].ym, lang)} to ${monthName(months[b].ym, lang)}`);
}

function waterFact(w, lang) {
  if (!w) return null;
  if (w.kind === "flow") {
    const d = w.pctOfNormal - 100;
    return { dir: d >= 5 ? "up" : d <= -5 ? "down" : "", text: pick(lang,
      `دریا میں اس وقت پانی ${d >= 5 ? "عام دنوں سے زیادہ" : d <= -5 ? "عام دنوں سے کم" : "عام دنوں جتنا"} ہے۔`,
      `The river carries ${d >= 5 ? "more water than usual" : d <= -5 ? "less water than usual" : "a usual amount of water"} right now.`) };
  }
  const diff = w.pct - w.pctLastYear;
  const name = w.kind === "dam" ? pick(lang, ...(DAM[w.key] || ["ڈیم", "Dam"]))
    : pick(lang, `بھارت کے ${w.names.map((n) => n.ur).join(" اور ")} ڈیم`, `India's ${w.names.map((n) => n.en).join(" and ")} dam${w.names.length > 1 ? "s" : ""}`);
  const on = w.date ? pick(lang, ` (${dayMonth(w.date, lang)} کی رپورٹ)`, ` (report of ${dayMonth(w.date, lang)})`) : "";
  return { dir: diff >= 5 ? "up" : diff <= -5 ? "down" : "", old: w.ageDays != null && w.ageDays > 30, text: pick(lang,
    `${name}: ${w.pct}٪ بھرا، ${moreLess(diff, lang)} (پچھلے سال ${w.pctLastYear}٪)${on}`,
    `${name}: ${w.pct}% full, ${moreLess(diff, lang)} (${w.pctLastYear}% last year)${on}`) };
}

function rainFact(pct, lang, where = "") {
  if (pct == null) return null;
  return { dir: pct >= 20 ? "up" : pct <= -20 ? "down" : "", text: where + pick(lang,
    pct >= 20 ? "آنے والے مہینوں میں معمول سے زیادہ بارش متوقع ہے۔" : pct <= -20 ? "آنے والے مہینوں میں معمول سے کم بارش متوقع ہے۔" : "آنے والے مہینوں میں بارش تقریباً معمول کے مطابق متوقع ہے۔",
    pct >= 20 ? "More rain than normal is expected in the coming months." : pct <= -20 ? "Less rain than normal is expected in the coming months." : "About normal rain is expected in the coming months.") };
}

function advice(level, when, lang) {
  if (level === "severe" || level === "high") return pick(lang,
    `${when} سے پہلے دریا کے کچے / بیلے کی فصل کاٹ لیں، مویشی اور اناج اونچی جگہ لے جانے کا انتظام رکھیں، اور PDMA کی وارننگ روز سنیں۔`,
    `Before ${when}, harvest crops in the riverbed (kacha / bela), plan to move animals and grain to high ground, and check PDMA warnings daily.`);
  return pick(lang,
    `${when} میں ہوشیار رہیں: دریا کے قریب نشیبی کھیت میں مہنگی فصل سوچ کر لگائیں اور نالیاں صاف رکھیں۔`,
    `Stay alert in ${when}: think before planting a costly crop in low fields near the river, and keep drains clean.`);
}

function Scale({ level, lang }) {
  const n = STEPS.indexOf(level);
  return <div className="fx-scale" role="img" aria-label={dangerTxt(level, lang)}>{STEPS.map((s, i) => <i key={s} className={i <= n ? "on" : ""} />)}</div>;
}

function Months({ months, lang }) {
  return (
    <div className="fx-months">
      {months.map((m) => (
        <div key={m.ym} className={lvClass(m.level)}>
          <span>{monthName(m.ym, lang)}</span>
          <b>{pick(lang, ...SHORT[m.level])}</b>
        </div>
      ))}
    </div>
  );
}

function Facts({ items }) {
  const list = items.filter(Boolean);
  return list.length ? <ul className="fx-facts">{list.map((f, i) => <li key={i} className={`${f.dir || ""}${f.old ? " old" : ""}`}>{f.text}</li>)}</ul> : null;
}

function RiverCard({ r, lang }) {
  const t = r.today;
  return (
    <div className={`fx-river ${lvClass(r.level)}`}>
      <div className="fx-rhead">
        <b>{pick(lang, r.ur, r.en)}{r.near ? <em className="fx-near">{pick(lang, "آپ کے قریب", "near you")}{r.km != null ? <span className="num"> {r.km} km</span> : null}</em> : null}</b>
        <span className="fx-pill">{dangerTxt(r.level, lang)}</span>
      </div>
      <Months months={r.months} lang={lang} />
      <Facts items={[
        t ? { dir: t.cls === "Normal" ? "" : "up", text: pick(lang,
          `آج ${t.station} پر: ${FLOOD_CLASS[t.cls]?.[0] || t.cls}${TREND[t.trend] ? `، ${TREND[t.trend][0]}` : ""}۔`,
          `Today at ${t.station}: ${FLOOD_CLASS[t.cls]?.[1] || t.cls}${TREND[t.trend] ? `, ${TREND[t.trend][1]}` : ""}.`) } : null,
        r.chance != null ? { text: pick(lang, `بڑے سیلاب کا امکان: ${r.chance < 1 ? "1٪ سے کم" : `${r.chance}٪`}`, `Chance of a big flood: ${r.chance < 1 ? "under 1%" : `${r.chance}%`}`) } : null,
        waterFact(r.water, lang), rainFact(r.rainPct, lang),
      ]} />
      {r.level !== "low" ? <p className="fx-advice">{advice(r.level, span(r.months, r.peakYm, lang), lang)}</p> : null}
    </div>
  );
}

// Small card for the home screen: the farm's flood danger at a glance; opens the flood tab.
export function FloodCard({ data, lang, onOpen }) {
  const f = data?.summary?.farm;
  if (!f) return null;
  return (
    <button type="button" className={`fx-home ${lvClass(f.level)}`} onClick={onOpen}>
      <span className="fx-dot" />
      <span className="fx-home-txt"><b>{pick(lang, "سیلاب", "Flood")}: {dangerTxt(f.level, lang)}</b>
        <small>{f.level === "low" ? pick(lang, "اگلے 7 مہینے", "next 7 months") : span(f.months, f.peakYm, lang)}</small></span>
      <span className="fx-go">{pick(lang, "تفصیل", "Details")}</span>
    </button>
  );
}

export function FloodOutlook({ data, state, lang, onRetry }) {
  if (state === "loading" && !data) return <div className="thinking"><div className="spin" /><span>{pick(lang, "دریا، ڈیم اور آنے والے مہینوں کا موسم دیکھا جا رہا ہے…", "Checking rivers, dams and the coming months' weather…")}</span></div>;
  if (state === "nogps") return <p className="status">{pick(lang, "سیلاب کی پیشگوئی کے لیے اوپر سے اپنا ضلع چنیں یا لوکیشن (GPS) کی اجازت دیں۔", "Pick your district above or allow location (GPS) to get the flood outlook.")}</p>;
  const s = data?.summary;
  if (!s?.farm) return <p className="status err">{pick(lang, "سیلاب کی پیشگوئی ابھی نہیں مل سکی۔", "The flood outlook could not be loaded right now.")} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "دوبارہ کوشش", "Retry")}</button></p>;

  const f = s.farm;
  const rivers = arr(s.rivers), near = rivers.filter((r) => r.near), others = rivers.filter((r) => !r.near);
  const src = rivers.find((r) => r.id === f.source);
  const srcName = src ? pick(lang, src.ur, src.en) : pick(lang, "آپ کے علاقے میں تیز بارش", "heavy rain in your area");
  const sr = f.shortRange;
  const tend = { above: ["معمول سے تیز", "stronger than normal"], normal: ["تقریباً معمول کے مطابق", "about normal"], below: ["معمول سے کمزور", "weaker than normal"] }[f.monsoon?.tendency];

  return (
    <div className="stack flood" dir={lang === "ur" ? "rtl" : "ltr"}>
      {/* 1. The answer for this farm */}
      <section className={`fx-hero ${lvClass(f.level)}`}>
        <span className="fx-tag">{pick(lang, "آپ کے کھیت کے لیے · اگلے 7 مہینے", "Your farm · next 7 months")}</span>
        <h3>{dangerTxt(f.level, lang)}</h3>
        <Scale level={f.level} lang={lang} />
        <p className="fx-why">{f.level !== "low"
          ? pick(lang, `${span(f.months, f.peakYm, lang)} میں ${srcName} سے خطرہ ہے۔`, `Danger in ${span(f.months, f.peakYm, lang)}, from ${srcName}.`)
          : pick(lang, "آنے والے مہینوں میں سیلاب کا بڑا خطرہ نظر نہیں آ رہا۔ معمول کے مطابق کاشت کریں۔", "No big flood danger is seen in the coming months. Farm as usual.")}</p>
        <Months months={f.months} lang={lang} />
        {sr ? <p className={`fx-line${sr.flag !== "none" ? " alert" : ""}`}>{sr.flag === "none" || !sr.date
          ? pick(lang, "اگلے 2 ہفتے: آپ کے علاقے میں کوئی تیز بارش نہیں۔", "Next 2 weeks: no heavy rain in your area.")
          : pick(lang, `اگلے 2 ہفتے: ${dayMonth(sr.date, lang)} کو تیز بارش (${sr.mm} ملی میٹر) کا امکان۔ نشیبی کھیتوں سے پانی نکالنے کا انتظام رکھیں۔`, `Next 2 weeks: heavy rain (${sr.mm} mm) possible on ${dayMonth(sr.date, lang)}. Be ready to drain low fields.`)}</p> : null}
      </section>

      {/* 2. Rivers near the farm */}
      <section>
        <h3 className="sec-title">{pick(lang, "آپ کے قریب دریا", "Rivers near you")}</h3>
        {near.length ? near.map((r) => <RiverCard key={r.id} r={r} lang={lang} />)
          : <p className="status">{pick(lang, "آپ کا کھیت کسی بڑے دریا سے 35 کلومیٹر کے اندر نہیں۔ آپ کے لیے اصل خطرہ تیز بارش سے اچانک پانی بھرنا ہے۔", "Your farm is not within 35 km of a big river. Your main danger is sudden flooding from heavy rain.")}</p>}
        {near.length ? null : <Facts items={[rainFact(f.rainPct, lang, pick(lang, "آپ کے علاقے میں: ", "In your area: "))]} />}
      </section>

      {/* 3. What to do */}
      <section>
        <h3 className="sec-title">{pick(lang, "کیا کریں", "What to do")}</h3>
        <ul className="list">{actions(f.level, lang).map((a, i) => <li key={i}>{a}</li>)}</ul>
        <p className="fx-sos">{pick(lang, "ایمرجنسی میں ریسکیو", "In an emergency call Rescue")} <a className="num" href="tel:1122">1122</a></p>
      </section>

      {!f.monsoon?.covered ? (
        <p className="note">{pick(lang,
          `بڑے سیلاب کے مہینے (جولائی تا ستمبر) ابھی اس 7 ماہ کی پیشگوئی سے آگے ہیں؛ جنوری سے یہاں نظر آنے لگیں گے۔${tend ? ` ابتدائی اندازہ: مون سون ${tend[0]} رہ سکتا ہے، مگر یہ ابھی پکا نہیں۔` : ""}`,
          `The big flood months (July–September) are still beyond this 7-month outlook; they start to appear here from January.${tend ? ` Early hint: the monsoon may be ${tend[1]}, but this is not certain yet.` : ""}`)}</p>
      ) : null}

      {/* 4. All other rivers */}
      {others.length ? (
        <details className="more">
          <summary>{pick(lang, "پاکستان کے باقی دریا", "Other rivers in Pakistan")}</summary>
          {others.map((r) => <RiverCard key={r.id} r={r} lang={lang} />)}
        </details>
      ) : null}

      <details className="more">
        <summary>{pick(lang, "یہ اندازہ کیسے لگتا ہے؟", "How is this worked out?")}</summary>
        <ul className="list">
          <li>{pick(lang, "یہ اندازہ ہے، یقین نہیں۔ NDMA، PDMA اور محکمہ موسمیات کی سرکاری وارننگ ہمیشہ پہلے ہے۔", "This is an estimate, not a certainty. Official NDMA, PDMA and Met Office warnings always come first.")}</li>
          <li>{pick(lang, "بارش، گرمی اور برف کی 7 ماہ کی پیشگوئی: یورپی موسمی مرکز (ECMWF)۔", "7-month rain, heat and snow forecast: the European weather centre (ECMWF).")}</li>
          <li>{pick(lang, "تربیلا اور منگلا: فیڈرل فلڈ کمیشن کی رپورٹ۔ بھارت کے ڈیم: بھارتی سینٹرل واٹر کمیشن کی ہفتہ وار رپورٹ۔ ہر ڈیم کے ساتھ رپورٹ کی تاریخ لکھی ہے۔", "Tarbela and Mangla: Federal Flood Commission report. Indian dams: India's Central Water Commission weekly report. Each dam shows its report date.")}</li>
          <li>{pick(lang,
            `چناب، راوی اور ستلج: کسان دوست کا اپنا ماڈل، 1997 سے اب تک کے ریکارڈ پر جانچا گیا${s.model?.caught ? ` (${s.model.caught.split("/")[1]} بڑے سیلابوں میں سے ${s.model.caught.split("/")[0]} پہلے سے پکڑے)` : ""}۔`,
            `Chenab, Ravi and Sutlej: Kisan Dost's own model, checked on records since 1997${s.model?.caught ? ` (caught ${s.model.caught} past big floods in advance)` : ""}.`)}</li>
          {data.updated ? <li>{pick(lang, "آخری اپڈیٹ: ", "Last updated: ")}<span className="num">{new Date(data.updated).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></li> : null}
        </ul>
      </details>
    </div>
  );
}

function actions(level, lang) {
  const base = pick(lang,
    ["کھیت کی نالیاں اور کھال صاف رکھیں تاکہ بارش کا پانی جلد نکل سکے۔", "بیج، کھاد اور اناج اونچی اور پکی جگہ پر رکھیں۔"],
    ["Keep field drains and watercourses clean so rain water leaves quickly.", "Store seed, fertilizer and grain on high, solid ground."]);
  if (level === "high" || level === "severe") base.unshift(...pick(lang,
    ["دریا کے کچے (بیلے) میں فصل اور مویشی کا منصوبہ پہلے سے بنائیں؛ خطرے والے مہینے سے پہلے کٹائی مکمل کریں۔", "قریب ترین محفوظ اونچی جگہ اور راستہ گھر والوں کو پہلے سے بتا دیں۔"],
    ["Plan crops and animals in the riverbed (kacha / bela) ahead; finish harvest before the risk month.", "Agree the nearest safe high ground and route with your family in advance."]));
  return base;
}

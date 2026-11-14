"use client";
// Feature 3: seasonal flood outlook (7 months) for the farmer's location.
const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const arr = (a) => (Array.isArray(a) ? a : []);
const MONTHS_UR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mName = (ym, lang) => { const [y, m] = ym.split("-").map(Number); return `${(lang === "ur" ? MONTHS_UR : MONTHS_EN)[m - 1]} ${y}`; };
const sign = (v, unit = "%") => (v == null ? "–" : `${v > 0 ? "+" : ""}${Math.round(v * 10) / 10}${unit}`);

const LEVEL = {
  low: ["کم", "Low"], moderate: ["درمیانہ", "Moderate"], high: ["زیادہ", "High"], severe: ["شدید", "Severe"],
};
const LABEL = {
  extreme_high: ["بہت زیادہ (انتہائی)", "Extreme high"], above: ["معمول سے زیادہ", "Above normal"], normal: ["معمول کے مطابق", "Normal"],
  below: ["معمول سے کم", "Below normal"], very_low: ["بہت کم", "Very low"], unknown: ["نامعلوم", "Unknown"],
};
const DRIVER = {
  rain: ["زیادہ بارش", "more rain"], heat: ["زیادہ گرمی (برف پگھلنا)", "more heat (melt)"], snow: ["زیادہ برف / گلیشیئر", "more snow / ice"],
  dam: ["ڈیم زیادہ بھرے ہوئے", "fuller dams"], enso: ["لا نینا / ال نینو", "La Niña / El Niño"],
};
const CLASS = {
  Normal: ["معمول کا بہاؤ", "Normal flow"], LowFlood: ["نچلے درجے کا سیلاب", "Low flood"], MediumFlood: ["درمیانے درجے کا سیلاب", "Medium flood"],
  HighFlood: ["اونچے درجے کا سیلاب", "High flood"], VeryHighFlood: ["بہت اونچے درجے کا سیلاب", "Very high flood"],
  ExceptionallyHighFlood: ["غیر معمولی اونچا سیلاب", "Exceptionally high flood"], NR: ["رپورٹ نہیں ملی", "Not received"],
};
const ENSO = {
  strong_el_nino: ["طاقتور ال نینو", "Strong El Niño"], el_nino: ["ال نینو", "El Niño"], neutral: ["معتدل (نیوٹرل)", "Neutral"],
  la_nina: ["لا نینا", "La Niña"], strong_la_nina: ["طاقتور لا نینا", "Strong La Niña"],
};
const VERDICT = {
  more_extreme: ["اس سال حالات پچھلے سال سے زیادہ شدید ہیں", "Conditions are more extreme than last year"],
  similar: ["اس سال حالات پچھلے سال جیسے ہیں", "Conditions are similar to last year"],
  milder: ["اس سال حالات پچھلے سال سے ہلکے ہیں", "Conditions are milder than last year"],
};
const lv = (k, lang) => pick(lang, ...(LEVEL[k] || LEVEL.low));
const lb = (k, lang) => pick(lang, ...(LABEL[k] || LABEL.unknown));
const levelClass = (k) => ({ low: "ok", moderate: "mod", high: "hi", severe: "sev" }[k] || "ok");

// Plain words for farmers: how big is the danger, more or less water than last year, more or less
// rain coming, and what the next months look like. Calculations stay out of sight.
const DANGER = { low: ["خطرہ کم ہے", "Low danger"], moderate: ["درمیانہ خطرہ", "Medium danger"], high: ["زیادہ خطرہ", "High danger"], severe: ["بہت زیادہ خطرہ", "Very high danger"] };
const dangerTxt = (k, lang) => pick(lang, ...(DANGER[k] || DANGER.low));
const pLevel = (p) => (p >= 75 ? "high" : p >= 50 ? "moderate" : "low"); // trained eastern-rivers model
const RANK = { low: 0, moderate: 1, high: 2, severe: 3 };
const monthOnly = (ym, lang) => (lang === "ur" ? MONTHS_UR : MONTHS_EN)[+ym.slice(5, 7) - 1];

// Consecutive months with the same danger read as one sentence: "نومبر سے فروری: خطرہ کم ہے"
function monthStory(months, lang) {
  const groups = [];
  for (const m of months) { const g = groups[groups.length - 1]; if (g && g.level === m.level) g.to = m.ym; else groups.push({ level: m.level, from: m.ym, to: m.ym }); }
  return groups.map((g) => ({ level: g.level, text: `${g.from === g.to ? monthOnly(g.from, lang) : pick(lang, `${monthOnly(g.from, lang)} سے ${monthOnly(g.to, lang)}`, `${monthOnly(g.from, lang)} to ${monthOnly(g.to, lang)}`)}: ${dangerTxt(g.level, lang)}` }));
}
const cmpWord = (diff, lang, more, less, same) => (diff >= 5 ? more : diff <= -5 ? less : same);

function riverView(b, east, lang) {
  const months = east?.months?.length
    ? east.months.map((m) => ({ ym: m.month, pct: m.p, level: pLevel(m.p) }))
    : arr(b?.months).map((m) => ({ ym: m.ym, pct: m.risk, level: m.level }));
  const peak = months.reduce((a, m) => (!a || m.pct > a.pct ? m : a), null);
  // water now vs last year (dams), or vs normal (Chenab: river flow)
  let water = null;
  const d = b?.factors?.dam;
  if (d?.pct != null && d?.pctLastYear != null) {
    const name = pick(lang, { tarbela: "تربیلا ڈیم", mangla: "منگلا ڈیم" }[d.key] || "ڈیم", { tarbela: "Tarbela Dam", mangla: "Mangla Dam" }[d.key] || "Dam");
    water = { diff: d.pct - d.pctLastYear, text: pick(lang,
      `${name} میں پانی پچھلے سال سے ${cmpWord(d.pct - d.pctLastYear, lang, "زیادہ ہے", "کم ہے", "تقریباً اتنا ہی ہے")} (ابھی ${Math.min(100, Math.round(d.pct))}٪ بھرا، پچھلے سال ${Math.min(100, Math.round(d.pctLastYear))}٪)`,
      `${name} holds ${cmpWord(d.pct - d.pctLastYear, lang, "more", "less", "about the same")} water than last year (${Math.min(100, Math.round(d.pct))}% full now, ${Math.min(100, Math.round(d.pctLastYear))}% last year)`) };
  }
  const ed = arr(east?.dams).filter((x) => x.lastYear);
  if (!water && ed.length) {
    const now = ed.reduce((s, x) => s + x.pct, 0) / ed.length, ly = ed.reduce((s, x) => s + x.lastYear.pct, 0) / ed.length;
    const names = ed.map((x) => pick(lang, x.ur.split(" (")[0], x.en.split(" (")[0])).join(pick(lang, " اور ", " and "));
    water = { diff: now - ly, text: pick(lang,
      `بھارت کے ${names} ڈیم میں پانی پچھلے سال سے ${cmpWord(now - ly, lang, "زیادہ ہے", "کم ہے", "تقریباً اتنا ہی ہے")} (ابھی ${Math.round(now)}٪ بھرا، پچھلے سال ${Math.round(ly)}٪)`,
      `India's ${names} dam${ed.length > 1 ? "s hold" : " holds"} ${cmpWord(now - ly, lang, "more", "less", "about the same")} water than last year (${Math.round(now)}% full now, ${Math.round(ly)}% last year)`) };
  }
  if (!water && east?.flowNowPctOfNormal != null) {
    const v = east.flowNowPctOfNormal;
    water = { diff: v - 100, text: pick(lang, `دریا میں اس وقت پانی ${cmpWord(v - 100, lang, "عام دنوں سے زیادہ", "عام دنوں سے کم", "عام دنوں جتنا")} ہے`, `The river carries ${cmpWord(v - 100, lang, "more water than usual", "less water than usual", "a usual amount of water")} right now`) };
  }
  // rain coming over the river's upper area
  let rainPct = b?.factors?.rain?.forecastPct;
  if (rainPct == null && east?.months?.length) rainPct = east.months.reduce((s, m) => s + m.rainPct, 0) / east.months.length;
  const rain = rainPct == null ? null : { v: rainPct, text: pick(lang,
    rainPct >= 20 ? "آنے والے مہینوں میں معمول سے زیادہ بارش متوقع ہے" : rainPct <= -20 ? "آنے والے مہینوں میں معمول سے کم بارش متوقع ہے" : "آنے والے مہینوں میں بارش تقریباً معمول کے مطابق متوقع ہے",
    rainPct >= 20 ? "More rain than normal is expected in the coming months" : rainPct <= -20 ? "Less rain than normal is expected in the coming months" : "About normal rain is expected in the coming months") };
  return { id: b?.id || east?.id, name: pick(lang, (b || east).ur, (b || east).en), months, peak, level: peak?.level || "low", water, rain };
}

function adviceFor(level, ym, lang) {
  const when = ym ? monthOnly(ym, lang) : "";
  if (level === "severe" || level === "high") return pick(lang,
    `${when} سے پہلے دریا کے کچے / بیلے کی فصل کاٹ لیں، مویشی اور اناج اونچی جگہ لے جانے کا انتظام رکھیں، اور ریڈیو / PDMA کی وارننگ روز سنیں۔`,
    `Before ${when}, harvest crops in the riverbed (kacha / bela), plan to move animals and grain to high ground, and listen to radio / PDMA warnings daily.`);
  if (level === "moderate") return pick(lang,
    `${when} میں ہوشیار رہیں: دریا کے قریب نشیبی کھیت میں مہنگی فصل سوچ کر لگائیں، نالیاں صاف رکھیں اور سرکاری وارننگ سنتے رہیں۔`,
    `Stay alert in ${when}: think before planting a costly crop in low fields near the river, keep drains clean and follow official warnings.`);
  return pick(lang, "فکر کی بات نہیں، معمول کے مطابق کاشت کریں۔", "Nothing to worry about; farm as usual.");
}

function Meter({ pct, level, lang }) {
  return (
    <div className={`fx-meter lv-${levelClass(level)}`} aria-label={`${pct}%`}>
      <span className="fx-track"><span style={{ width: `${Math.max(3, Math.min(100, pct ?? 0))}%` }} /></span>
      <b className="num">{pct ?? "–"}٪</b>
    </div>
  );
}

// Point 4: dam water report, plain: how full each dam is now and the same time last year
const DAM_UR = { tarbela: ["تربیلا ڈیم", "دریائے سندھ"], mangla: ["منگلا ڈیم", "دریائے جہلم"], chashma: ["چشمہ بیراج", "دریائے سندھ"] };
const DAM_EN = { tarbela: ["Tarbela Dam", "Indus"], mangla: ["Mangla Dam", "Jhelum"], chashma: ["Chashma", "Indus"] };
export function DamsReport({ data, lang }) {
  const res = data?.dams?.reservoirs || {};
  const rows = [
    ...["tarbela", "mangla"].filter((k) => res[k]?.pct != null).map((k) => ({ id: k, name: pick(lang, DAM_UR[k][0], DAM_EN[k][0]), river: pick(lang, DAM_UR[k][1], DAM_EN[k][1]), pct: res[k].pct, ly: res[k].pctLastYear, date: data.dams.date, india: false })),
    ...arr(data?.eastern?.rivers).flatMap((r) => arr(r.dams).map((d) => ({ id: d.id, name: pick(lang, d.ur, d.en), river: pick(lang, r.ur, r.en), pct: d.pct, ly: d.lastYear?.pct, date: d.date, india: true }))),
  ];
  if (!rows.length) return null;
  const when = (d) => (d ? new Date(d + "T00:00").toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "long" }) : "");
  return (
    <section className="dams" id="dams">
      <h3 className="sec-title">{pick(lang, "ڈیموں میں پانی", "Water in the dams")}</h3>
      {rows.map((d) => {
        const diff = d.ly != null ? d.pct - d.ly : 0;
        const cmp = d.ly == null ? "" : diff >= 5 ? pick(lang, "پچھلے سال سے زیادہ", "more than last year") : diff <= -5 ? pick(lang, "پچھلے سال سے کم", "less than last year") : pick(lang, "پچھلے سال جتنا", "same as last year");
        return (
          <div key={d.id} className="dam">
            <div className="dam-h"><b>{d.name}</b><small>{d.river}{d.india ? pick(lang, " · بھارت", " · India") : ""}</small></div>
            <div className="dam-bar"><i style={{ width: `${Math.min(100, Math.max(2, d.pct))}%` }} /></div>
            <p>{pick(lang, `ابھی ${Math.min(100, Math.round(d.pct))}٪ بھرا ہے`, `${Math.min(100, Math.round(d.pct))}% full now`)}{cmp ? ` · ${cmp}` : ""}{d.ly != null ? pick(lang, ` (پچھلے سال ${Math.min(100, Math.round(d.ly))}٪)`, ` (last year ${Math.min(100, Math.round(d.ly))}%)`) : ""}</p>
            <small className="dam-date">{pick(lang, `${when(d.date)} کی رپورٹ`, `report of ${when(d.date)}`)}</small>
          </div>
        );
      })}
    </section>
  );
}

function RiverCard({ v, near, lang }) {
  return (
    <div className={`fx-river lv-${levelClass(v.level)}`}>
      <div className="fx-rhead">
        <b>{v.name}{near ? <em className="fl-you">{pick(lang, "آپ کے قریب", "near you")}</em> : null}</b>
        <span className="fl-lv">{dangerTxt(v.level, lang)}</span>
      </div>
      <Meter pct={v.peak?.pct} level={v.level} lang={lang} />
      <ul className="fx-facts">
        {v.water ? <li className={v.water.diff >= 5 ? "up" : v.water.diff <= -5 ? "down" : ""}>{v.water.text}</li> : null}
        {v.rain ? <li className={v.rain.v >= 20 ? "up" : v.rain.v <= -20 ? "down" : ""}>{v.rain.text}</li> : null}
      </ul>
      <div className="fx-story">{monthStory(v.months, lang).map((g, i) => <span key={i} className={`lv-${levelClass(g.level)}`}>{g.text}</span>)}</div>
      <p className="fx-advice">{adviceFor(v.level, v.peak?.ym, lang)}</p>
    </div>
  );
}

export function FloodOutlook({ data, state, lang, onRetry }) {
  const dir = lang === "ur" ? "rtl" : "ltr";
  if (state === "loading" && !data) return <div className="thinking"><div className="spin" /><span>{pick(lang, "دریا، ڈیم اور آنے والے مہینوں کا موسم دیکھا جا رہا ہے…", "Checking rivers, dams and the coming months' weather…")}</span></div>;
  if (state === "nogps") return <p className="status">{pick(lang, "سیلاب کی پیشگوئی کے لیے لوکیشن (GPS) کی اجازت دیں۔", "Allow location (GPS) to get the flood outlook.")}</p>;
  if (!data || data.error) return <p className="status err">{pick(lang, "سیلاب کی پیشگوئی ابھی نہیں مل سکی۔", "The flood outlook could not be loaded right now.")} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "دوبارہ کوشش", "Retry")}</button></p>;

  const f = data.farm || {};
  const near = arr(data.near);
  const eastBy = Object.fromEntries(arr(data.eastern?.rivers).map((r) => [r.id, r]));
  const views = arr(data.basins).map((b) => riverView(b, eastBy[b.id], lang));
  for (const r of arr(data.eastern?.rivers)) if (!views.some((v) => v.id === r.id)) views.push(riverView(null, r, lang));
  const isNear = (id) => near.some((n) => n.id === id);
  const nearViews = views.filter((v) => isNear(v.id)), otherViews = views.filter((v) => !isNear(v.id));
  const local = data.local ? riverView(data.local, null, lang) : null;

  // the farm: for each month the bigger of heavy local rain and the rivers near it
  const farmMonths = (local?.months || []).map((m) => {
    let best = { ...m, src: "local" };
    for (const v of nearViews) { const x = v.months.find((k) => k.ym === m.ym); if (x && RANK[x.level] > RANK[best.level]) best = { ...x, src: v.id }; }
    return best;
  });
  const farmPeak = farmMonths.reduce((a, m) => (!a || RANK[m.level] > RANK[a.level] || (m.level === a.level && m.pct > a.pct) ? m : a), null);
  const srcName = (id) => (id === "local" ? pick(lang, "آپ کے علاقے میں تیز بارش", "heavy rain in your area") : views.find((v) => v.id === id)?.name || "");
  const ms = f.monsoonSignal;

  return (
    <div className="stack flood" dir={dir}>
      {/* 1. The answer for this farm */}
      <section className={`fx-hero lv-${levelClass(farmPeak?.level)}`}>
        <span className="fx-tag">{pick(lang, "آپ کے کھیت کے لیے اگلے 7 مہینے", "Your farm, next 7 months")}</span>
        <h3>{dangerTxt(farmPeak?.level, lang)}</h3>
        <Meter pct={farmPeak?.pct} level={farmPeak?.level} lang={lang} />
        {farmPeak && farmPeak.level !== "low" ? <p>{pick(lang, `سب سے زیادہ خطرہ ${monthOnly(farmPeak.ym, lang)} میں، ${srcName(farmPeak.src)} کی وجہ سے۔`, `Highest in ${monthOnly(farmPeak.ym, lang)}, from ${srcName(farmPeak.src)}.`)}</p>
          : <p>{pick(lang, "آنے والے مہینوں میں سیلاب کا بڑا خطرہ نظر نہیں آ رہا۔", "No big flood danger is seen in the coming months.")}</p>}
        <div className="fx-story">{monthStory(farmMonths, lang).map((g, i) => <span key={i} className={`lv-${levelClass(g.level)}`}>{g.text}</span>)}</div>
        {local?.rain ? <p className="fx-line">{pick(lang, "آپ کے علاقے میں: ", "In your area: ")}{local.rain.text}۔</p> : null}
        {f.shortRange ? <p className={`fx-line ${f.shortRange.flag !== "none" ? "fl-alert" : ""}`}>{f.shortRange.flag === "none"
          ? pick(lang, "اگلے 2 ہفتے: کوئی تیز بارش نہیں۔", "Next 2 weeks: no heavy rain.")
          : pick(lang, `اگلے 2 ہفتے: ${new Date(f.shortRange.maxDay.date + "T00:00").toLocaleDateString("ur-PK", { day: "numeric", month: "long" })} کو تیز بارش کا امکان۔ نشیبی کھیتوں سے پانی نکالنے کا انتظام رکھیں۔`, `Next 2 weeks: heavy rain possible on ${f.shortRange.maxDay.date}. Be ready to drain low fields.`)}</p> : null}
      </section>

      {!f.monsoonCovered ? (
        <p className="note">{pick(lang,
          `مون سون (جولائی سے ستمبر) کی پیشگوئی ابھی دستیاب نہیں، فروری–مارچ میں یہاں آ جائے گی۔${ms ? ` ابتدائی اندازہ: مون سون ${{ above: "معمول سے زیادہ", normal: "تقریباً معمول کے مطابق", below: "معمول سے کمزور" }[ms.tendency]} رہ سکتا ہے (ابھی پکا نہیں)۔` : ""}`,
          `The monsoon (July–September) forecast is not available yet; it appears here in February–March.${ms ? ` Early hint: the monsoon may be ${{ above: "stronger than normal", normal: "about normal", below: "weaker than normal" }[ms.tendency]} (not certain yet).` : ""}`)}</p>
      ) : null}

      <DamsReport data={data} lang={lang} />

      {/* 2. Rivers near the farm */}
      {nearViews.length ? (
        <section>
          <h3 className="sec-title">{pick(lang, "آپ کے قریب دریا", "Rivers near you")}</h3>
          {nearViews.map((v) => <RiverCard key={v.id} v={v} near lang={lang} />)}
        </section>
      ) : <p className="status">{pick(lang, "آپ کا کھیت کسی بڑے دریا کے قریب نہیں۔ آپ کے لیے اصل خطرہ تیز بارش سے اچانک پانی بھرنا ہے۔", "Your farm is not near a big river. Your main danger is sudden flooding from heavy rain.")}</p>}

      {/* 3. What to do */}
      <section>
        <h3 className="sec-title">{pick(lang, "کیا کریں", "What to do")}</h3>
        <ul className="list">{defaultActions(farmPeak?.level, lang).map((a, i) => <li key={i}>{a}</li>)}</ul>
        <p className="note">{pick(lang, "یہ اندازہ ہے، یقین نہیں۔ ہمیشہ NDMA، PDMA اور محکمہ موسمیات کی سرکاری وارننگ پر عمل کریں۔ ایمرجنسی: ریسکیو 1122۔", "This is an estimate, not a certainty. Always follow official NDMA, PDMA and Met Office warnings. Emergency: Rescue 1122.")}</p>
      </section>

      {/* 4. All other rivers */}
      <details className="more fx-all">
        <summary>{pick(lang, "پاکستان کے باقی دریا", "Other rivers in Pakistan")}</summary>
        {otherViews.map((v) => <RiverCard key={v.id} v={v} lang={lang} />)}
      </details>

    </div>
  );
}

function defaultActions(level, lang) {
  const base = pick(lang,
    ["کھیت کی نالیاں اور کھال صاف رکھیں تاکہ بارش کا پانی جلد نکل سکے۔", "بیج، کھاد اور اناج اونچی اور پکی جگہ پر رکھیں۔", "اپنی یونین کونسل اور PDMA کے وارننگ پیغامات کے لیے فون نمبر رجسٹر کریں۔"],
    ["Keep field drains and watercourses clean so rain water leaves quickly.", "Store seed, fertilizer and grain on high, solid ground.", "Register your phone for union council and PDMA warning messages."]);
  if (level === "high" || level === "severe") base.unshift(...pick(lang,
    ["دریا کے کچے (بیلے) میں فصل اور مویشی کا منصوبہ پہلے سے بنائیں؛ خطرے والے مہینے سے پہلے کٹائی مکمل کریں۔", "قریب ترین محفوظ اونچی جگہ اور راستہ گھر والوں کو پہلے سے بتا دیں۔"],
    ["Plan crops and animals in the riverbed (kacha / bela) ahead; finish harvest before the risk month.", "Agree the nearest safe high ground and route with your family in advance."]));
  return base;
}

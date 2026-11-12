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

export function FloodOutlook({ data, state, lang, onRetry }) {
  const dir = lang === "ur" ? "rtl" : "ltr";
  if (state === "loading" && !data) return <div className="thinking"><div className="spin" /><span>{pick(lang, "ڈیم، دریا اور اگلے 7 ماہ کی موسمی پیشگوئی جانچی جا رہی ہے… (پہلی بار 20–40 سیکنڈ)", "Checking dams, rivers and the 7-month seasonal forecast… (first time 20–40 s)")}</span></div>;
  if (state === "nogps") return <p className="status">{pick(lang, "سیلاب کی پیشگوئی کے لیے لوکیشن (GPS) کی اجازت دیں۔", "Allow location (GPS) to get the flood outlook.")}</p>;
  if (!data || data.error) return <p className="status err">{pick(lang, "سیلاب کی پیشگوئی ابھی نہیں مل سکی۔", "The flood outlook could not be loaded right now.")} {data?.error ? <span className="latin muted">({data.error})</span> : null} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "دوبارہ کوشش", "Retry")}</button></p>;

  const f = data.farm || {}, ov = f.overall, ex = data.explain;
  const main = arr(data.basins).find((b) => b.id === f.main) || data.local;
  const mf = main?.factors || {};
  const near = arr(data.near);
  const basinName = (id) => { const b = arr(data.basins).find((x) => x.id === id) || (id === "local" ? data.local : null); return b ? pick(lang, b.ur, b.en) : id; };
  const dams = data.dams?.reservoirs || {};
  const damRow = (key, name) => dams[key] ? {
    name, now: `${dams[key].pct}% · ${dams[key].level} ft`, last: `${dams[key].pctLastYear}% · ${dams[key].levelLastYear} ft`,
    diff: Math.round((dams[key].pct - dams[key].pctLastYear) * 10) / 10,
  } : null;
  const tarbela = damRow("tarbela", pick(lang, "تربیلا ڈیم", "Tarbela Dam")), mangla = damRow("mangla", pick(lang, "منگلا ڈیم", "Mangla Dam"));
  const cond = f.condition;

  return (
    <div className="stack flood" dir={dir}>
      {/* 1. Headline */}
      <section className={`fl-hero lv-${levelClass(ov?.level)}`}>
        <div className="fl-gauge">
          <span className="num">{ov?.risk ?? "–"}</span>
          <small>/100</small>
        </div>
        <div className="fl-head">
          <div className="fl-tag">{pick(lang, "اگلے 7 ماہ میں سیلاب کا خطرہ", "Flood risk, next 7 months")}</div>
          <h3>{lv(ov?.level, lang)}{ov?.ym ? <span> · {pick(lang, "سب سے زیادہ", "peak")} {mName(ov.ym, lang)}</span> : null}</h3>
          <p>{ex?.headline || (ov ? pick(lang,
            `آپ کے علاقے کے لیے سب سے بڑا خطرہ ${basinName(ov.source)} سے ہے${ov.driver ? `، وجہ: ${pick(lang, ...DRIVER[ov.driver])}` : ""}۔`,
            `Your biggest risk comes from ${basinName(ov.source)}${ov.driver ? `, driven by ${DRIVER[ov.driver][1]}` : ""}.`) : "")}</p>
        </div>
      </section>
      {ex?.summary ? <p className="fl-summary">{ex.summary}</p> : null}
      {data.status?.history && data.status.history !== "complete" ? <p className="note">{pick(lang, "پچھلے سالوں کا موسمی ریکارڈ ابھی لوڈ ہو رہا ہے؛ چند منٹ بعد دوبارہ کھولیں تو \"پچھلا سال\" والے خانے مکمل ہو جائیں گے۔", "Past years' weather records are still loading; reopen in a few minutes and the \"last year\" columns will be complete.")} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "تازہ کریں", "Refresh")}</button></p> : null}

      {/* 2. This year vs last year */}
      {cond ? (
        <section>
          <h3 className="sec-title">{pick(lang, "اس سال بمقابلہ پچھلا سال", "This year vs last year")} <small>{main ? pick(lang, main.ur, main.en) : ""}</small></h3>
          <div className={`fl-verdict v-${cond.verdict}`}>
            <b>{pick(lang, ...VERDICT[cond.verdict])}</b>
            <div className="fl-bars">
              <Bar label={pick(lang, "اس سال", "This year")} v={cond.thisYear} />
              <Bar label={pick(lang, "پچھلا سال", "Last year")} v={cond.lastYear} muted />
            </div>
            <small>{pick(lang, "50 = عام سال۔ زیادہ نمبر = سیلاب پیدا کرنے والے حالات زیادہ (بارش، گرمی، برف، ڈیم)۔", "50 = a normal year. Higher = more flood-driving conditions (rain, heat, snow, dams).")}</small>
            {ex?.vs_last_year ? <p>{ex.vs_last_year}</p> : null}
          </div>
        </section>
      ) : null}

      {/* 3. Month by month */}
      <section>
        <h3 className="sec-title">{pick(lang, "مہینہ وار خطرہ", "Risk by month")} <small>ECMWF SEAS5</small></h3>
        <div className="fl-months">
          {arr(f.months).map((m) => (
            <div key={m.ym} className={`fl-m lv-${levelClass(m.level)}`}>
              <span className="fl-mn">{mName(m.ym, lang)}</span>
              <span className="fl-track"><span style={{ width: `${Math.max(3, m.risk)}%` }} /></span>
              <span className="fl-mv num">{m.risk}</span>
              <span className="fl-ml">{lv(m.level, lang)}{m.driver ? ` · ${pick(lang, ...DRIVER[m.driver])}` : ""}</span>
            </div>
          ))}
        </div>
        {!f.monsoonCovered ? (
          <div className="note fl-monsoon">
            <b>{pick(lang, "مون سون (جولائی–ستمبر) کا ابتدائی اشارہ", "Early monsoon (Jul–Sep) signal")}:</b>{" "}
            {f.monsoonSignal ? pick(lang,
              `${{ above: "معمول سے زیادہ خطرے کی طرف", normal: "تقریباً معمول کے مطابق", below: "معمول سے کم خطرے کی طرف" }[f.monsoonSignal.tendency]} (اعتماد کم)۔ `,
              `${{ above: "leaning towards higher than normal risk", normal: "close to normal", below: "leaning towards lower than normal risk" }[f.monsoonSignal.tendency]} (low confidence). `) : ""}
            {pick(lang, "سات ماہ کی پیشگوئی ابھی مون سون تک نہیں پہنچتی؛ یہ اشارہ برف کے ذخیرے، بہار کی گرمی اور ال نینو / لا نینا سے ہے۔ فروری–مارچ سے مون سون کے مہینے بھی پیشگوئی میں آ جائیں گے اور یہ حصہ خود بخود بہتر ہوتا جائے گا۔", "The 7-month forecast does not reach the monsoon yet; this signal comes from snowpack, spring heat and El Niño / La Niña. From February–March the monsoon months enter the forecast and this section updates on its own.")}
          </div>
        ) : null}
      </section>

      {/* 4. Comparison table */}
      <section>
        <h3 className="sec-title">{pick(lang, "وجوہات: اس سال اور پچھلے سال کا موازنہ", "Why: this year compared with last year")} <small>Factors</small></h3>
        <div className="fl-table" role="table">
          <div className="fl-tr fl-th" role="row"><span>{pick(lang, "عامل", "Factor")}</span><span>{pick(lang, "اس سال", "This year")}</span><span>{pick(lang, "پچھلا سال", "Last year")}</span></div>
          {mf.rain ? <Row lang={lang} name={pick(lang, `بارش، اگلے 7 ماہ (${pick(lang, main.ur, main.en)} کا بالائی علاقہ)`, `Rain, next 7 months (${main.en} catchment)`)}
            a={`${sign(mf.rain.forecastPct)} · ${lb(mf.rain.label, lang)}`} b={`${sign(mf.rain.lastYearPct)} · ${lb(mf.rain.lastYearLabel, lang)}`}
            hint={pick(lang, "معمول کے مقابلے میں", "vs normal")} /> : null}
          {mf.heat?.applies ? <Row lang={lang} name={pick(lang, "گرمی (برف و گلیشیئر پگھلنا)", "Heat (snow and glacier melt)")}
            a={`${sign(mf.heat.meltSeasonK ?? mf.heat.forecastK, "°C")} · ${lb(mf.heat.label, lang)}`} b={`${sign(mf.heat.lastYearK, "°C")} · ${lb(mf.heat.lastYearLabel, lang)}`}
            hint={pick(lang, "معمول سے زیادہ / کم درجہ حرارت", "temperature vs normal")} /> : null}
          {mf.snow?.applies ? <Row lang={lang} name={pick(lang, "برف باری، یکم اکتوبر سے اب تک", "Snowfall since 1 October")}
            a={[mf.snow.toDatePct != null ? sign(mf.snow.toDatePct) : null, mf.snow.toDateCm != null ? `${Math.round(mf.snow.toDateCm * 10) / 10} cm` : null].filter(Boolean).join(" · ") || "–"}
            b={[mf.snow.lastYearToDatePct != null ? sign(mf.snow.lastYearToDatePct) : null, mf.snow.lastYearToDateCm != null ? `${Math.round(mf.snow.lastYearToDateCm * 10) / 10} cm` : null].filter(Boolean).join(" · ") || "–"}
            hint={pick(lang, `پیشگوئی: برف کا ذخیرہ ${sign(mf.snow.forecastSwePct)}`, `forecast snowpack ${sign(mf.snow.forecastSwePct)}`)} /> : null}
          {data.dams?.skardu && data.farm.ffcAgeDays != null && data.farm.ffcAgeDays <= 45 ? <Row lang={lang} name={pick(lang, `اسکردو کا درجہ حرارت (گلیشیئر علاقہ، ${data.dams.date})`, `Skardu temperature (glacier zone, ${data.dams.date})`)}
            a={`${data.dams.skardu.max}° / ${data.dams.skardu.min}°`} b={`${data.dams.skardu.maxLastYear}° / ${data.dams.skardu.minLastYear}°`}
            hint={pick(lang, `زیادہ / کم · فرق ${sign(Math.round((data.dams.skardu.max - data.dams.skardu.maxLastYear) * 10) / 10, "°C")}`, `max / min · difference ${sign(Math.round((data.dams.skardu.max - data.dams.skardu.maxLastYear) * 10) / 10, "°C")}`)} /> : null}
          {tarbela ? <Row lang={lang} name={tarbela.name} a={tarbela.now} b={tarbela.last} hint={pick(lang, `ڈیم میں پانی (${sign(tarbela.diff, " پوائنٹ")})`, `storage (${sign(tarbela.diff, " pts")})`)} /> : null}
          {mangla ? <Row lang={lang} name={mangla.name} a={mangla.now} b={mangla.last} hint={pick(lang, `ڈیم میں پانی (${sign(mangla.diff, " پوائنٹ")})`, `storage (${sign(mangla.diff, " pts")})`)} /> : null}
          {data.local?.factors?.rain ? <Row lang={lang} name={pick(lang, "آپ کے کھیت پر بارش، اگلے 7 ماہ", "Rain at your farm, next 7 months")}
            a={`${sign(data.local.factors.rain.forecastPct)} · ${lb(data.local.factors.rain.label, lang)}`} b={`${sign(data.local.factors.rain.lastYearPct)} · ${lb(data.local.factors.rain.lastYearLabel, lang)}`} /> : null}
          {data.enso ? <Row lang={lang} name={pick(lang, "ال نینو / لا نینا (بحرالکاہل)", "El Niño / La Niña (Pacific)")}
            a={`${pick(lang, ...(ENSO[data.enso.phase] || ENSO.neutral))} · ONI ${sign(data.enso.oni, "")}`} b={data.enso.oniYearAgo != null ? `ONI ${sign(data.enso.oniYearAgo, "")}` : "–"}
            hint={pick(lang, "ال نینو عموماً مون سون کمزور، لا نینا مضبوط کرتا ہے", "El Niño usually weakens the monsoon, La Niña strengthens it")} /> : null}
        </div>
        {data.dams?.date ? <p className="hint">{pick(lang, `ڈیم کا ڈیٹا: فیڈرل فلڈ کمیشن کی رپورٹ ${data.dams.date}`, `Dam data: Federal Flood Commission report of ${data.dams.date}`)}{data.farm.ffcAgeDays > 3 ? pick(lang, " (سیلاب کا موسم ختم ہونے کے بعد یہ رپورٹ کبھی کبھار آتی ہے)", " (published only now and then outside flood season)") : ""}. {data.dams.total ? pick(lang, `کل ذخیرہ ${data.dams.total.pct}% (پچھلے سال اسی دن ${data.dams.total.pctLastYear}%)`, `Total storage ${data.dams.total.pct}% (same day last year ${data.dams.total.pctLastYear}%)`) : ""}</p> : null}
      </section>

      {/* 5. Rivers near the farm + today's gauge */}
      <section>
        <h3 className="sec-title">{pick(lang, "آپ کے قریب دریا", "Rivers near you")} <small>FFC gauges</small></h3>
        {!near.length ? <p className="status">{pick(lang, "آپ کا کھیت کسی بڑے دریا کے 35 کلومیٹر کے اندر نہیں۔ آپ کے لیے اصل خطرہ مقامی تیز بارش اور اچانک سیلاب ہے۔", "Your farm is not within 35 km of a major river. Your main risk is heavy local rain and flash flooding.")}</p> : (
          <ul className="list">
            {near.map((n) => {
              const st = arr(f.now).find((x) => x.river === n.id);
              const b = arr(data.basins).find((x) => x.id === n.id);
              return (
                <li key={n.id}>
                  <b>{basinName(n.id)}</b> — <span className="num">{n.km}</span> {pick(lang, "کلومیٹر", "km")}
                  {b?.peak ? <> · {pick(lang, "خطرہ", "risk")} {lv(b.peak.level, lang)} ({mName(b.peak.ym, lang)})</> : null}
                  {st ? <> · {pick(lang, "قریبی گیج", "nearest gauge")}: <span className="latin">{st.station}</span> {st.cls ? `— ${pick(lang, ...(CLASS[st.cls] || CLASS.NR))}${st.trend ? ` (${pick(lang, { R: "بڑھ رہا", F: "کم ہو رہا", S: "مستحکم" }[st.trend], { R: "rising", F: "falling", S: "steady" }[st.trend])})` : ""}` : pick(lang, " — آج کی تازہ رپورٹ نہیں", " — no report for today")}</> : null}
                </li>
              );
            })}
          </ul>
        )}
        {f.shortRange ? (
          <div className={`when ${f.shortRange.flag !== "none" ? "fl-alert" : ""}`}>
            <b>{pick(lang, "اگلے 16 دن", "Next 16 days")}:</b>{" "}
            {f.shortRange.flag === "none"
              ? pick(lang, `کل ${f.shortRange.totalMm} ملی میٹر بارش متوقع، کوئی بہت تیز بارش نہیں۔`, `${f.shortRange.totalMm} mm of rain expected in total, no very heavy day.`)
              : pick(lang, `${f.shortRange.maxDay.date} کو ${Math.round(f.shortRange.maxDay.mm)} ملی میٹر تک بارش کا امکان: نشیبی کھیتوں کا پانی نکالیں، مویشی اور اناج اونچی جگہ رکھیں۔`, `Up to ${Math.round(f.shortRange.maxDay.mm)} mm possible on ${f.shortRange.maxDay.date}: drain low fields, keep animals and grain on high ground.`)}
          </div>
        ) : null}
      </section>

      {/* 6. What to do */}
      <section>
        <h3 className="sec-title">{pick(lang, "کیا کریں", "What to do")} <small>Actions</small></h3>
        <ul className="list">
          {(arr(ex?.actions).length ? ex.actions : defaultActions(ov?.level, lang)).map((a, i) => <li key={i}>{a}</li>)}
        </ul>
        {ex?.watch ? <p className="note">{ex.watch}</p> : null}
        <p className="note">{pick(lang, "یہ موسمی پیشگوئی امکان بتاتی ہے، یقین نہیں۔ ہمیشہ NDMA، PDMA اور فلڈ فورکاسٹنگ ڈویژن کی سرکاری وارننگ پر عمل کریں۔ ایمرجنسی: ریسکیو 1122۔", "A seasonal forecast gives likelihoods, not certainty. Always follow official NDMA, PDMA and Flood Forecasting Division warnings. Emergency: Rescue 1122.")}</p>
        <p className="hint"><a href="https://ndma.gov.pk" target="_blank" rel="noopener noreferrer">NDMA</a> · <a href="https://ffc.gov.pk" target="_blank" rel="noopener noreferrer">Federal Flood Commission</a> · <a href="https://pdma.punjab.gov.pk" target="_blank" rel="noopener noreferrer">PDMA Punjab</a></p>
      </section>

      {/* 7. All rivers */}
      <section>
        <h3 className="sec-title">{pick(lang, "پاکستان کے تمام دریا", "All rivers in Pakistan")} <small>Outlook</small></h3>
        <div className="fl-table fl-rivers" role="table">
          <div className="fl-tr fl-th" role="row"><span>{pick(lang, "دریا", "River")}</span><span>{pick(lang, "سب سے زیادہ خطرہ", "Peak risk")}</span><span>{pick(lang, "پچھلے سال کے مقابلے", "vs last year")}</span></div>
          {arr(data.basins).map((b) => (
            <div key={b.id} className="fl-tr" role="row">
              <span>{pick(lang, b.ur, b.en)}{near.some((n) => n.id === b.id) ? <em className="fl-you">{pick(lang, "آپ کے قریب", "near you")}</em> : null}</span>
              <span className={`fl-lv lv-${levelClass(b.peak?.level)}`}>{b.peak ? `${lv(b.peak.level, lang)} · ${mName(b.peak.ym, lang)}` : "–"}</span>
              <span>{b.condition ? pick(lang, { more_extreme: "زیادہ شدید", similar: "تقریباً ویسا", milder: "ہلکا" }[b.condition.verdict], { more_extreme: "more extreme", similar: "similar", milder: "milder" }[b.condition.verdict]) : "–"} <span className="num muted">({b.condition?.thisYear}/{b.condition?.lastYear})</span></span>
            </div>
          ))}
        </div>
      </section>

      <details className="more">
        <summary>{pick(lang, "یہ پیشگوئی کیسے بنتی ہے؟", "How is this outlook made?")}</summary>
        <ul className="list">
          <li>{pick(lang, "بارش، گرمی اور برف: یورپی مرکز ECMWF کی 7 ماہ کی موسمی پیشگوئی (SEAS5)، ہر دریا کے بالائی علاقوں کے کئی مقامات پر۔", "Rain, heat and snow: ECMWF's 7-month seasonal forecast (SEAS5) at several points in each river's upper catchment.")}</li>
          <li>{pick(lang, `پچھلا سال اور معمول: ERA5 موسمی ریکارڈ (پچھلے سال کے انہی مہینے، اور اس سے پہلے کے ${main?.normalYears || 5} سال کا اوسط)۔`, `Last year and normal: ERA5 weather records (the same months last year, and the average of the ${main?.normalYears || 5} years before).`)}</li>
          <li>{pick(lang, "ڈیم اور دریا: فیڈرل فلڈ کمیشن کی روزانہ رپورٹ (تربیلا، منگلا، چشمہ: آج کی سطح بمقابلہ پچھلے سال اسی دن)۔", "Dams and rivers: the Federal Flood Commission's daily report (Tarbela, Mangla, Chashma: today's level vs the same day last year).")}</li>
          <li>{pick(lang, "ال نینو / لا نینا: امریکی ادارے NOAA کا ONI انڈیکس۔", "El Niño / La Niña: NOAA's ONI index.")}</li>
          <li>{pick(lang, "ہر عامل کو 0–100 نمبر (50 = عام سال) ملتا ہے؛ برفانی دریاؤں (سندھ، کابل) میں گرمی اور برف کا وزن زیادہ ہے۔ مہینے کا خطرہ = اس مہینے کا عام سیلابی خطرہ × اس سال کے حالات۔ ڈیٹا ہر 12 گھنٹے بعد خود بخود تازہ ہوتا ہے۔", "Each factor gets a 0–100 score (50 = a normal year); heat and snow weigh more for glacier-fed rivers (Indus, Kabul). Monthly risk = that month's usual flood hazard × this year's conditions. Data refreshes on its own every 12 hours.")}</li>
        </ul>
        {data.status?.errors?.length ? <p className="hint">{pick(lang, "کچھ ذرائع اس وقت دستیاب نہیں تھے:", "Some sources were unavailable:")} <span className="latin">{data.status.errors.join("; ")}</span></p> : null}
      </details>
    </div>
  );
}

function Bar({ label, v, muted }) {
  return (
    <div className={`fl-bar ${muted ? "muted" : ""}`}>
      <span>{label}</span>
      <span className="fl-track"><span style={{ width: `${Math.max(2, v ?? 0)}%` }} /><i style={{ insetInlineStart: "50%" }} /></span>
      <b className="num">{v ?? "–"}</b>
    </div>
  );
}

function Row({ name, a, b, hint }) {
  return (
    <div className="fl-tr" role="row">
      <span>{name}{hint ? <small>{hint}</small> : null}</span>
      <span className="num">{a}</span>
      <span className="num muted">{b}</span>
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

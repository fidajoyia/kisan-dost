"use client";
// Rivers at every headworks / barrage and the water going into canals there (FFD daily bulletin).
import { useState } from "react";
import { RIVER_UR, RIVER_EN } from "@/lib/headworks";

const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const arr = (a) => (Array.isArray(a) ? a : []);
const fmt = (n) => (n == null ? "–" : n.toLocaleString("en"));
const MONTHS_UR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const dayUr = (d, lang) => (d ? (lang === "ur" ? `${+d.slice(8, 10)} ${MONTHS_UR[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : d) : "–");
const LEVEL = { "Below Low": ["معمول کا بہاؤ", "normal flow", "ok"], Normal: ["معمول کا بہاؤ", "normal flow", "ok"], Low: ["نچلے درجے کا سیلاب", "low flood", "mod"],
  Medium: ["درمیانہ سیلاب", "medium flood", "hi"], High: ["اونچا سیلاب", "high flood", "sev"], "Very High": ["بہت اونچا سیلاب", "very high flood", "sev"], "Exceptionally High": ["غیر معمولی سیلاب", "exceptional flood", "sev"] };
const KIND = { dam: ["ڈیم", "Dam"], barrage: ["بیراج / ہیڈ", "Barrage"], gauge: ["پیمائش کا مقام", "Gauge"] };

function Station({ s, lang, big }) {
  const lv = LEVEL[s.level];
  const share = s.toCanals != null && s.inflow ? Math.round((s.toCanals / s.inflow) * 100) : null;
  return (
    <div className={`hw${big ? " big" : ""}`}>
      <div className="hw-head">
        <b>{pick(lang, s.ur, s.id)}</b>
        <small>{pick(lang, RIVER_UR[s.river], RIVER_EN[s.river])} · {pick(lang, ...KIND[s.kind])}{s.km != null ? <> · <span className="num">{s.km} km</span></> : null}</small>
        {lv ? <span className={`hw-lv lv-${lv[2]}`}>{pick(lang, lv[0], lv[1])}</span> : null}
      </div>
      {s.inflow == null ? <p className="hint">{pick(lang, "اس رپورٹ میں یہاں کا بہاؤ درج نہیں۔", "No flow reported here in this bulletin.")}</p> : (
        <>
          <div className="hw-nums">
            <div><span>{pick(lang, "آمد", "Inflow")}</span><b className="num">{fmt(s.inflow)}</b></div>
            <div><span>{s.kind === "dam" ? pick(lang, "اخراج", "Release") : pick(lang, "آگے دریا میں", "On down river")}</span><b className="num">{fmt(s.outflow)}</b></div>
            {s.toCanals != null ? <div className="c"><span>{pick(lang, "نہروں میں", "Into canals")}</span><b className="num">{fmt(s.toCanals)}</b></div> : null}
          </div>
          {share != null ? <div className="hw-bar" aria-hidden="true"><i style={{ width: `${share}%` }} /></div> : null}
          {s.toCanals != null ? <p className="hint" style={{ margin: "2px 0 0" }}>{pick(lang, `آنے والے پانی کا تقریباً ${share}٪ یہاں سے نہروں میں جا رہا ہے۔`, `About ${share}% of the incoming water goes into canals here.`)}</p> : null}
        </>
      )}
      {s.canals.length ? <p className="hw-canals"><span>{pick(lang, "یہاں سے نکلنے والی بڑی نہریں:", "Main canals from here:")}</span> {s.canals.map((c) => pick(lang, c[0], c[1])).join(pick(lang, "، ", ", "))}</p> : null}
    </div>
  );
}

export function WaterScreen({ data, state, lang, onRetry }) {
  const [river, setRiver] = useState("near");
  if (state === "loading" && !data) return <div className="thinking"><div className="spin" /><span>{pick(lang, "دریاؤں اور بیراجوں کا بہاؤ لایا جا رہا ہے…", "Fetching river and barrage flows…")}</span></div>;
  if (!data || data.error) return <p className="status err">{pick(lang, "دریاؤں کا بہاؤ ابھی نہیں مل سکا۔", "River flows could not be loaded right now.")} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "دوبارہ کوشش", "Retry")}</button></p>;
  const st = arr(data.stations), hasKm = st.some((s) => s.km != null);
  const rivers = [...new Set(st.map((s) => s.river))];
  const shown = river === "near" ? st.slice(0, 3) : st.filter((s) => s.river === river);
  const totalCanals = st.reduce((a, s) => a + (s.toCanals || 0), 0);
  const r = data.reservoirs || {};
  return (
    <div className="stack water" dir={lang === "ur" ? "rtl" : "ltr"}>
      <section className="wt-top">
        <p className="wt-date">{pick(lang, "رپورٹ کی تاریخ", "Bulletin date")}: <b>{dayUr(data.date, lang)}</b></p>
        {data.season === "ended" || data.ageDays > 2 ? <p className="note" style={{ margin: "6px 0 0" }}>{pick(lang,
          `یہ اس موسم کی آخری رپورٹ ہے؛ آج کا بہاؤ مختلف ہو سکتا ہے۔ نئی رپورٹ 15 جون سے روزانہ آئے گی۔`,
          `PMD's Flood Forecasting Division issues this daily bulletin only from 15 June to mid-October. This is the season's last bulletin (${data.ageDays} days old); today's flows may differ. Next bulletins from 15 June.`)}</p> : null}
        {data.situation && lang !== "ur" ? <p className="hint">{data.situation}</p> : null}
        <div className="wt-sum">
          <div><span>{pick(lang, "تمام بیراجوں سے نہروں میں", "Into canals, all barrages")}</span><b className="num">{fmt(totalCanals)}</b><small>{pick(lang, "کیوسک", "cusecs")}</small></div>
          {r.tarbela ? <div><span>{pick(lang, "تربیلا ڈیم بھرا", "Tarbela full")}</span><b className="num">{Math.round(r.tarbela.storagePct)}%</b><small className="num">{r.tarbela.levelFt} ft</small></div> : null}
          {r.mangla ? <div><span>{pick(lang, "منگلا ڈیم بھرا", "Mangla full")}</span><b className="num">{Math.round(r.mangla.storagePct)}%</b><small className="num">{r.mangla.levelFt} ft</small></div> : null}
        </div>
      </section>

      <section>
        <div className="sf-filters" role="tablist" aria-label={pick(lang, "دریا", "River")}>
          {hasKm ? <button type="button" aria-pressed={river === "near"} onClick={() => setRiver("near")}>{pick(lang, "میرے قریب", "Near me")}</button> : null}
          {rivers.map((x) => <button key={x} type="button" aria-pressed={river === x} onClick={() => setRiver(x)}>{pick(lang, RIVER_UR[x], RIVER_EN[x])}</button>)}
        </div>
        <div className="hw-list">{(hasKm || river !== "near" ? shown : st).map((s, i) => <Station key={s.id} s={s} lang={lang} big={river === "near" && i === 0} />)}</div>
      </section>

      <details className="more">
        <summary>{pick(lang, "یہ اعداد کیا ہیں؟", "What do these numbers mean?")}</summary>
        <ul className="list">
          <li>{pick(lang, "پانی کیوسک میں ہے (ایک سیکنڈ میں کتنے مکعب فٹ پانی)۔", "All flows in cusecs (cubic feet of water per second), measured at 6 am.")}</li>
          <li>{pick(lang, "ہر نہر کا الگ بہاؤ اس رپورٹ میں نہیں ہوتا؛ اپنی نہر کی باری اور پانی کے لیے محکمہ انہار کے دفتر سے رابطہ کریں۔", "Flows of individual canals are not in this bulletin; ask your Irrigation Department office for your canal's turn and supply.")}</li>
        </ul>
      </details>
    </div>
  );
}

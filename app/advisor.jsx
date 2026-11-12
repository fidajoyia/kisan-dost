"use client";
import { useMemo, useState } from "react";
import { rankSeeds, tempSummary, ZONES, GET_TEXT } from "@/lib/seeds";
import { CENTERS, RANKING, centerById } from "@/lib/research-centers";
import { IMPORT_ROUTES, IMPORT_CONTACTS, IMPORT_UPDATED } from "@/lib/import-guide";

const MONTHS_UR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
const n0 = (v) => (v === 0 || v ? Math.round(Number(v)) : "–");

// Static data is written in Urdu and English; Roman Urdu users get the English text.
export const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const dirOf = (lang) => (lang === "ur" ? "rtl" : "ltr");

const BAND = {
  cold: ["سرد", "Cold"], cool: ["ٹھنڈا", "Cool"], mild: ["معتدل", "Mild"], warm: ["گرم", "Warm"], hot: ["شدید گرم", "Hot"],
};

function windowText(sow, lang) {
  const M = lang === "ur" ? MONTHS_UR : MONTHS_EN;
  return sow.map(([m1, d1, m2, d2]) => `${d1} ${M[m1 - 1]} – ${d2} ${M[m2 - 1]}`).join(lang === "ur" ? "، " : ", ");
}

function statusInfo(s, lang) {
  switch (s.status) {
    case "now": return ["ok", pick(lang, "ابھی کاشت کا وقت", "Sow now")];
    case "wait_cooler": return ["warn", pick(lang, "موسم ابھی گرم ہے، چند دن رکیں", "Still too warm, wait a few days")];
    case "wait_warmer": return ["warn", pick(lang, "موسم ابھی ٹھنڈا ہے، رکیں", "Still too cold, wait")];
    case "soon": return ["soon", pick(lang, `${s.daysToStart} دن میں کاشت شروع`, `Sowing starts in ${s.daysToStart} days`)];
    default: return ["later", pick(lang, "اس موسم میں نہیں", "Not this season")];
  }
}

const REASON = {
  sand: (v, lang) => pick(lang, `مٹی میں ریت تقریباً ${n0(v)}% (SoilGrids)`, `about ${n0(v)}% sand in the soil (SoilGrids)`),
  ph: (v, lang) => pick(lang, `مٹی کا pH ${v} (8.5 سے اوپر کلر کی علامت)`, `soil pH ${v} (above 8.5 points to kallar)`),
  rait_district: (_, lang) => pick(lang, "یہ ضلع ریتلے علاقے (تھل / چولستان / تھر) میں ہے", "this district is in a sandy belt (Thal / Cholistan / Thar)"),
  sem_district: (_, lang) => pick(lang, "اس ضلع میں سیم و تھور عام ہے", "waterlogging and salinity are common in this district"),
};

// ---------------------------------------------------------------- Seed advisor
export function SeedAdvisor({ wx, guess, zone, setZone, research, lang, goImport, district }) {
  const temps = useMemo(() => tempSummary(wx), [wx]);
  const ranked = useMemo(() => rankSeeds({ zone, temps }), [zone, temps]);
  const now = ranked.filter((s) => ["now", "wait_cooler", "wait_warmer"].includes(s.status));
  const soon = ranked.filter((s) => s.status === "soon");
  const later = ranked.filter((s) => s.status === "later");
  const related = (crop) => arr(research?.items).filter((r) => r.crop === crop).slice(0, 2);

  return (
    <div className="stack" dir={dirOf(lang)}>
      <section>
        <h3 className="sec-title">{pick(lang, "آپ کا موسم", "Your weather")} <small>next 14 days · live</small></h3>
        {temps ? (
          <div className="tempstrip">
            <div><span>{pick(lang, "اوسط درجہ حرارت", "Average temp")}</span><b className="num">{temps.mean14}°C</b></div>
            <div><span>{pick(lang, "دن / رات", "Day / night")}</span><b className="num">{n0(temps.max14)}° / {n0(temps.min14)}°</b></div>
            <div><span>{pick(lang, "موسم", "Band")}</span><b>{pick(lang, BAND[temps.band][0], BAND[temps.band][1])}</b></div>
          </div>
        ) : <p className="status">{pick(lang, "لائیو موسم ملتے ہی بیج آپ کے درجہ حرارت کے مطابق ترتیب پائیں گے۔ ابھی صرف کیلنڈر کے مطابق دکھا رہے ہیں۔", "Seeds will be ranked by your temperature once live weather loads. Showing by calendar for now.")}</p>}
        {temps && temps.hottest >= 38 ? <p className="note" style={{ marginTop: 8 }}>{pick(lang, `اگلے دو ہفتوں میں درجہ حرارت ${n0(temps.hottest)}° تک جا سکتا ہے؛ گرمی برداشت کرنے والی اقسام کو ترجیح دیں اور شام کو پانی دیں۔`, `Temperatures may reach ${n0(temps.hottest)}° in the next two weeks; prefer heat-tolerant varieties and irrigate in the evening.`)}</p> : null}
        {temps && temps.coldest <= 2 ? <p className="note" style={{ marginTop: 8 }}>{pick(lang, `رات کا درجہ حرارت ${n0(temps.coldest)}° تک گر سکتا ہے؛ کورے سے بچاؤ کے لیے ہلکا پانی دیں۔`, `Night temperature may drop to ${n0(temps.coldest)}°; a light irrigation helps protect against frost.`)}</p> : null}
      </section>

      <section>
        <h3 className="sec-title">{pick(lang, "آپ کی زمین", "Your land")} <small>Land type</small></h3>
        <div className="zone-switch" role="group" aria-label={pick(lang, "زمین کی قسم", "Land type")}>
          {Object.keys(ZONES).map((z) => (
            <button key={z} type="button" aria-pressed={zone === z} onClick={() => setZone(z)}>
              <span>{pick(lang, ZONES[z].ur, ZONES[z].en)}</span>
              {guess?.zone === z ? <em>{pick(lang, "خودکار اندازہ", "auto guess")}</em> : null}
            </button>
          ))}
        </div>
        {guess ? (
          <p className="hint">
            {pick(lang, "اندازے کی بنیاد", "Guess based on")}: {arr(guess.reasons).map((r) => REASON[r.k]?.(r.v, lang)).filter(Boolean).join(pick(lang, "؛ ", "; ")) || pick(lang, "کوئی خاص علامت نہیں ملی", "no special signs found")}
            {district ? ` (${district})` : ""}. {pick(lang, "سیم اور ریت کھیت در کھیت بدلتی ہے، اس لیے اپنی زمین کے مطابق خود منتخب کریں۔", "Sem and sand change field to field, so pick what matches your own land.")}
          </p>
        ) : <p className="hint">{pick(lang, "اپنی زمین کی قسم منتخب کریں۔", "Pick your land type.")}</p>}
      </section>

      <SeedGroup title={pick(lang, "ابھی کاشت کریں", "Sow now")} sub="Sow now" seeds={now} lang={lang} related={related} goImport={goImport}
        empty={pick(lang, "اس وقت اس زمین کے لیے کاشت کا کوئی موسم نہیں۔ نیچے آنے والی فصلیں دیکھیں۔", "Nothing to sow on this land right now. See upcoming crops below.")} />
      {soon.length ? <SeedGroup title={pick(lang, "اگلے 6 ہفتوں میں", "Next 6 weeks")} sub="Coming up" seeds={soon} lang={lang} related={related} goImport={goImport} /> : null}
      {later.length ? (
        <details className="more">
          <summary>{pick(lang, `باقی سال کی فصلیں (${later.length})`, `Rest of the year (${later.length})`)}</summary>
          <SeedGroup seeds={later} lang={lang} related={related} goImport={goImport} />
        </details>
      ) : null}
      <p className="note">{pick(lang, "تاریخیں پنجاب و سندھ کے میدانی علاقوں کی ہیں؛ پہاڑی علاقوں میں فرق ہوتا ہے، اس لیے درجہ حرارت کی جانچ بھی ساتھ چلتی ہے۔ حتمی قسم اپنے ضلع کے محکمہ زراعت (توسیع) سے تصدیق کریں۔", "Dates are for the Punjab and Sindh plains; hills differ, which is why the temperature check runs too. Confirm the final variety with your district agriculture extension office.")}</p>
    </div>
  );
}

function SeedGroup({ title, sub, seeds, lang, related, goImport, empty }) {
  return (
    <section>
      {title ? <h3 className="sec-title">{title} <small>{sub}</small></h3> : null}
      {!seeds.length ? <p className="status">{empty}</p> : (
        <div className="seeds">
          {seeds.map((s) => <SeedCard key={s.id} s={s} lang={lang} rel={related(s.crop)} goImport={goImport} />)}
        </div>
      )}
    </section>
  );
}

function SeedCard({ s, lang, rel, goImport }) {
  const [cls, label] = statusInfo(s, lang);
  return (
    <article className={`seed st-${cls}`}>
      <div className="seed-top">
        <h4>{pick(lang, s.crop_ur, s.crop_en)} {typeof s.variety === "string" ? <span className="latin variety">{s.variety}</span> : <span className="variety">{pick(lang, s.variety.ur, s.variety.en)}</span>}</h4>
        <span className={`pill ${cls === "ok" ? "low" : cls === "warn" ? "medium" : "neutral"}`}>{label}</span>
      </div>
      <div className="chips">
        <span className={`chip fit${s.fit}`}>{s.fit === 2 ? pick(lang, "آپ کی زمین کے لیے موزوں", "Suits your land") : pick(lang, "احتیاط سے", "With care")}</span>
        <span className="chip">🗓 {windowText(s.sow, lang)}</span>
        <span className="chip"><span className="num">{s.temp[0]}–{s.temp[1]}°C</span> {pick(lang, "اوسط", "avg")}</span>
        {s.origin ? <span className="chip leaf latin">{s.origin}</span> : null}
      </div>
      <p className="seed-note">{pick(lang, s.note_ur, s.note_en)}</p>
      <details>
        <summary>{pick(lang, "پاکستان میں کیسے ملے گا؟", "How to get it in Pakistan?")}</summary>
        <p>{pick(lang, GET_TEXT[s.get].ur, GET_TEXT[s.get].en)}</p>
        <p className="by"><b>{pick(lang, "تیار / فراہم کرنے والا", "Bred / supplied by")}:</b> <span className="latin">{s.by}{s.year ? ` · ${s.year}` : ""}</span></p>
        {s.get === "imported" || s.get === "research" ? <button type="button" className="btn ghost" onClick={goImport}>{pick(lang, "درآمد کا مکمل طریقہ دیکھیں", "See the full import steps")}</button> : null}
      </details>
      {rel.length ? (
        <div className="seed-rel">
          <b>{pick(lang, "اس فصل پر نئی تحقیق", "New research on this crop")}:</b>
          <ul>{rel.map((r) => <li key={r.id}><a href={r.link} target="_blank" rel="noopener noreferrer">{r.title}</a> <span className="latin muted">({centerById(r.center)?.short})</span></li>)}</ul>
        </div>
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------- Research feed
export function ResearchFeed({ data, state, lang, newIds, zone, band, onRetry }) {
  const [mine, setMine] = useState(true);
  const items = arr(data?.items);
  const matches = (r) => !arr(r.zones).length || arr(r.zones).includes(zone);
  const warm = band === "warm" || band === "hot", cold = band === "cold" || band === "cool";
  const tempMatch = (r) => (warm && r.temp === "heat") || (cold && r.temp === "cold");
  const shown = items
    .filter((r) => !mine || matches(r))
    .sort((a, b) => (newIds.has(b.id) - newIds.has(a.id)) || (tempMatch(b) - tempMatch(a)));

  return (
    <div className="stack" dir={dirOf(lang)}>
      <section>
        <h3 className="sec-title">{pick(lang, "نئی تحقیق", "New research")} <small>auto-updated</small></h3>
        <p className="hint" style={{ marginTop: 0 }}>
          {pick(lang, "دنیا کی 10 بہترین زرعی جامعات (QS 2026 درجہ بندی) کی تازہ تحقیق خود بخود یہاں آتی ہے (ہر چند گھنٹے بعد)، اور آسان زبان میں سمجھائی جاتی ہے۔", "Fresh research from the world top 10 agricultural universities (QS 2026 ranking) arrives here automatically (every few hours), explained in simple words.")}
          {data?.updated ? ` ${pick(lang, "آخری اپڈیٹ", "Last updated")}: ${new Date(data.updated).toLocaleString(lang === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
        <label className="toggle">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          <span>{pick(lang, `صرف میری زمین سے متعلق: ${ZONES[zone].ur}`, `Only for my land: ${ZONES[zone].en}`)}</span>
        </label>
        {state === "loading" && !items.length ? <div className="thinking"><div className="spin" /><span>{pick(lang, "تحقیق لائی جا رہی ہے…", "Fetching research…")}</span></div>
          : state === "error" && !items.length ? <p className="status err">{pick(lang, "ابھی تحقیق نہیں مل سکی۔", "Research could not be loaded right now.")} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "دوبارہ کوشش", "Retry")}</button></p>
          : !shown.length ? <p className="status">{pick(lang, "اس فلٹر کے مطابق کوئی نئی تحقیق نہیں۔", "No new research for this filter.")}</p>
          : (
            <div className="rs-list">
              {shown.map((r) => {
                const c = centerById(r.center);
                return (
                  <article key={r.id} className="rs">
                    <div className="rs-meta">
                      {newIds.has(r.id) ? <span className="new">{pick(lang, "نیا", "New")}</span> : null}
                      {c ? <span className="chip leaf latin">{c.short}</span> : null}
                      {r.date ? <span className="num muted">{r.date}</span> : null}
                      {tempMatch(r) ? <span className="chip">{pick(lang, "آپ کے موسم سے متعلق", "Fits your weather")}</span> : null}
                      {arr(r.zones).filter((z) => z !== "normal").map((z) => <span key={z} className="chip">{pick(lang, ZONES[z]?.ur, ZONES[z]?.en)}</span>)}
                    </div>
                    <h4>{r.title}</h4>
                    {r.summary ? <p>{r.summary}</p> : null}
                    {r.farmer_action ? <div className="when"><b>{pick(lang, "کسان کے لیے", "For farmers")}:</b> {r.farmer_action}</div> : null}
                    <a className="src" href={r.link} target="_blank" rel="noopener noreferrer">{pick(lang, "اصل تحقیق / خبر", "Original source")} ↗ <span className="latin muted">{r.source}</span></a>
                  </article>
                );
              })}
            </div>
          )}
        {data?.mode === "raw" ? <p className="note">{pick(lang, "یہ اصل عنوانات ہیں؛ آسان اردو خلاصے کے لیے سرور پر ANTHROPIC_API_KEY ضروری ہے۔", "These are original titles; simple summaries need ANTHROPIC_API_KEY on the server.")}</p> : null}
      </section>
      <Centers lang={lang} />
    </div>
  );
}

function Centers({ lang }) {
  return (
    <section>
      <h3 className="sec-title">{pick(lang, "دنیا کے 10 بہترین زرعی تحقیقی ادارے", "World top 10 agricultural institutions")} <small>QS 2026</small></h3>
      <p className="hint" style={{ marginTop: 0 }}>{pick(lang, `درجہ بندی: ${RANKING.name}`, `Ranking: ${RANKING.name}`)}</p>
      <ol className="centers">
        {CENTERS.map((c) => (
          <li key={c.id} className="center">
            <div className="center-head">
              <span className="rank num">{c.rank}</span>
              <div>
                <b className="latin">{c.name_en}</b>
                <span>{lang === "ur" ? c.name_ur : ""}</span>
                <span className="muted">{pick(lang, c.country_ur, c.country_en)}</span>
              </div>
            </div>
            <p><b>{pick(lang, "تحقیق کے شعبے", "Research strengths")}:</b> {pick(lang, c.focus_ur, c.focus_en)}</p>
            <a href={c.web} target="_blank" rel="noopener noreferrer" className="latin">{c.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗</a>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------- Import guide
export function ImportGuide({ lang }) {
  return (
    <div className="stack" dir={dirOf(lang)}>
      {IMPORT_ROUTES.map((r, i) => (
        <section key={r.id}>
          <h3 className="sec-title">{pick(lang, r.title_ur, r.title_en)} <small>{["Trial", "Bulk"][i]}</small></h3>
          <ol className="steps">{(lang === "ur" ? r.steps_ur : r.steps_en).map((s, k) => <li key={k}>{s}</li>)}</ol>
        </section>
      ))}
      <section>
        <h3 className="sec-title">{pick(lang, "متعلقہ ادارے", "Who to contact")} <small>Contacts</small></h3>
        <ul className="list">
          {IMPORT_CONTACTS.map((c) => (
            <li key={c.name}><b className="latin">{c.name}</b> — {pick(lang, c.role_ur, c.role_en)}{c.web ? <> · <a href={c.web} target="_blank" rel="noopener noreferrer" className="latin">{c.web.replace(/^https?:\/\/(www\.)?/, "")}</a></> : null}</li>
          ))}
        </ul>
      </section>
      <p className="note">{pick(lang, `قواعد ${IMPORT_UPDATED} کے مطابق؛ درخواست سے پہلے NSDRA / DPP سے فیس اور فارم کی تصدیق کر لیں۔`, `Rules as of ${IMPORT_UPDATED}; confirm fees and forms with NSDRA / DPP before applying.`)}</p>
    </div>
  );
}

"use client";
import { useState } from "react";
import { ZONES } from "@/lib/seeds";
import { CENTERS, RANKING, centerById } from "@/lib/research-centers";
import { IMPORT_ROUTES, IMPORT_CONTACTS, IMPORT_UPDATED } from "@/lib/import-guide";

const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);

// Static data is written in Urdu and English; Roman Urdu users get the English text.
export const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const dirOf = (lang) => (lang === "ur" ? "rtl" : "ltr");

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
        <p className="hint" style={{ marginTop: 0 }}>
          {pick(lang, "نئی تحقیق خود بخود یہاں آتی ہے۔", "New research arrives here automatically.")}
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
                    {r.summarized === false && lang === "ur" ? (<>
                      <h4>{r.title_ur || "زرعی تحقیق"}</h4>
                      <p>{c ? `${c.name_ur || c.short} کی نئی تحقیق۔` : "نئی تحقیق۔"} {pick(lang, "تفصیل اصل (انگریزی) تحقیق میں ہے:", "")}</p>
                      <p className="latin rs-en" dir="ltr">{r.title}</p>
                    </>) : (<>
                      <h4>{r.title}</h4>
                      {r.summary && r.summary !== r.title && !r.summary.startsWith(r.title) ? <p>{r.summary}</p> : null}
                    </>)}
                    {r.farmer_action ? <div className="when"><b>{pick(lang, "کسان کے لیے", "For farmers")}:</b> {r.farmer_action}</div> : null}
                    <a className="src" href={r.link} target="_blank" rel="noopener noreferrer">{pick(lang, "اصل تحقیق / خبر", "Original source")} ↗ <span className="latin muted">{r.source}</span></a>
                  </article>
                );
              })}
            </div>
          )}
        {data?.mode === "raw" ? <p className="note">{pick(lang, "ہر تحقیق کے اوپر لکھا ہے کہ وہ کس فصل اور کس مسئلے کے بارے میں ہے۔ پوری تفصیل اصل تحقیق کے لنک پر ہے۔", "Each item shows which crop and subject it is about. Full details are at the original source link.")}</p> : null}
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
          <h3 className="sec-title">{pick(lang, r.title_ur, r.title_en)}</h3>
          <ol className="steps">{(lang === "ur" ? r.steps_ur : r.steps_en).map((s, k) => <li key={k}>{s}</li>)}</ol>
        </section>
      ))}
      <section>
        <h3 className="sec-title">{pick(lang, "متعلقہ ادارے", "Who to contact")}</h3>
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

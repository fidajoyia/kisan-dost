"use client";
import { useEffect, useState } from "react";
import { CENTERS, RANKING, centerById } from "@/lib/research-centers";
import { CROP_UR } from "@/lib/research-tags";
import { IMPORT_ROUTES, IMPORT_CONTACTS, IMPORT_UPDATED } from "@/lib/import-guide";

const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);

// Static data is written in Urdu and English; Roman Urdu users get the English text.
export const pick = (lang, ur, en) => (lang === "ur" ? ur : en);
const dirOf = (lang) => (lang === "ur" ? "rtl" : "ltr");

export function ResearchFeed({ data, state, lang, newIds, onRetry }) {
  const [crop, setCrop] = useState("all");
  const [urHead, setUrHead] = useState({}); // id → Urdu headline, translated on the phone when the server could not
  const items = arr(data?.items).map((r) => (r.headline_ur || !urHead[r.id] ? r : { ...r, headline_ur: urHead[r.id] }));
  useEffect(() => {
    if (lang !== "ur") return;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem("kd-rs-ur") || "{}"); } catch {}
    setUrHead(saved);
    const todo = arr(data?.items).filter((r) => !r.headline_ur && !saved[r.id] && r.title);
    if (!todo.length) return;
    let alive = true;
    Promise.all(todo.map((r) => fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=" + encodeURIComponent(r.title.slice(0, 400)))
      .then((x) => x.json()).then((j) => [r.id, (j?.[0] || []).map((p) => p?.[0] || "").join("").trim()]).catch(() => [r.id, ""])))
      .then((pairs) => {
        if (!alive) return;
        const next = { ...saved };
        for (const [id, s] of pairs) if (/[\u0600-\u06FF]/.test(s)) next[id] = s;
        const keep = Object.fromEntries(Object.entries(next).slice(-200));
        try { localStorage.setItem("kd-rs-ur", JSON.stringify(keep)); } catch {}
        setUrHead(keep);
      });
    return () => { alive = false; };
  }, [data, lang]);
  // crops that have research right now, most items first
  const counts = {};
  for (const r of items) if (r.crop && r.crop !== "other") counts[r.crop] = (counts[r.crop] || 0) + 1;
  const crops = Object.keys(counts).sort((x, y) => counts[y] - counts[x]);
  const shown = items.filter((r) => crop === "all" || r.crop === crop)
    .sort((x, y) => newIds.has(y.id) - newIds.has(x.id)); // new first; otherwise the server's order (most useful first)

  return (
    <div className="stack" dir={dirOf(lang)}>
      <section>
        {crops.length ? (
          <div className="sf-crops rs-filter" role="tablist" aria-label={pick(lang, "فصل", "Crop")}>
            <button type="button" role="tab" aria-selected={crop === "all"} onClick={() => setCrop("all")}>{pick(lang, "سب", "All")}</button>
            {crops.map((c) => <button key={c} type="button" role="tab" aria-selected={crop === c} onClick={() => setCrop(c)}>{pick(lang, CROP_UR[c], c)}</button>)}
          </div>
        ) : null}
        {state === "loading" && !items.length ? <div className="thinking"><div className="spin" /><span>{pick(lang, "تحقیق لائی جا رہی ہے…", "Fetching research…")}</span></div>
          : state === "error" && !items.length ? <p className="status err">{pick(lang, "ابھی تحقیق نہیں مل سکی۔", "Research could not be loaded right now.")} <button type="button" className="btn ghost" onClick={onRetry}>{pick(lang, "دوبارہ کوشش", "Retry")}</button></p>
          : (
            <div className="rs-list">
              {shown.map((r) => {
                const c = centerById(r.center);
                return (
                  <article key={r.id} className="rs">
                    <h4>{newIds.has(r.id) ? <span className="new">{pick(lang, "نیا", "New")}</span> : null}{lang === "ur" ? r.headline_ur || r.title_ur : r.title}</h4>{lang === "ur" && r.headline_ur ? <p className="rs-tags">{r.title_ur}</p> : null}
                    <p className="rs-meta">{c ? <span>{pick(lang, c.name_ur, c.short)}</span> : null}{r.date ? <span className="num">{r.date}</span> : null}</p>
                  </article>
                );
              })}
            </div>
          )}
      </section>
      <details className="more rs-centers">
        <summary>{pick(lang, "یہ تحقیق کن اداروں سے آتی ہے؟", "Where does this research come from?")}</summary>
        <p className="hint">{pick(lang, "دنیا کی 10 بہترین زرعی جامعات", RANKING.name)}</p>
        <ol className="list">
          {CENTERS.map((c) => <li key={c.id}>{pick(lang, c.name_ur, c.name_en)} <span className="muted">· {pick(lang, c.country_ur, c.country_en)}</span></li>)}
        </ol>
      </details>
    </div>
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
            <li key={c.name}><b className="latin">{c.name}</b> — {pick(lang, c.role_ur, c.role_en)}{c.web ? <> · <span className="latin">{c.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span></> : null}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

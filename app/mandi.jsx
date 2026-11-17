"use client";
// Point 7: today's mandi rates (nearest Punjab market) and government schemes for farmers.
import { useState } from "react";
import { SCHEMES } from "@/lib/schemes";
import { t, isUr, locale } from "@/lib/en";

const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
const rs = (n) => Number(n).toLocaleString("en-US");
const UNIT = { maund: "فی من (40 کلو)", dozen: "فی درجن", "100pcs": "فی 100 دانے" };
const GROUPS = [["farm", "فصلیں"], ["vegetables", "سبزیاں"], ["fruits", "پھل"], ["grains", "اناج اور دالیں"]];

export function MandiRates({ data, state, onRetry }) {
  const [g, setG] = useState("farm");
  if (state === "loading" && !data) return <div className="thinking"><div className="spin" /><span>{t("آج کے منڈی ریٹ آ رہے ہیں…")}</span></div>;
  if (state === "nogps") return <p className="status">{t("منڈی ریٹ کے لیے اپنا ضلع چنیں (اوپر جگہ پر کلک کریں)۔")}</p>;
  if (!data || data.error) return <p className="status err">{t("منڈی ریٹ ابھی نہیں مل سکے۔")}{" "}<button type="button" className="btn ghost" onClick={onRetry}>{t("دوبارہ کوشش")}</button></p>;
  const items = arr(data.items);
  const shown = g === "farm" ? items.filter((x) => x.farm) : items.filter((x) => x.group === g && !x.farm);
  const groups = GROUPS.filter(([k]) => (k === "farm" ? items.some((x) => x.farm) : items.some((x) => x.group === k && !x.farm)));
  const day = data.date ? new Date(data.date + "T00:00").toLocaleDateString(locale(), { day: "numeric", month: "long" }) : "";
  return (
    <div className="stack mandi">
      <div className="mandi-head">
        <b>{isUr() ? `${data.market?.ur} منڈی` : `${data.market?.name} mandi`}</b>
        <span>{day ? (isUr() ? `${day} کے ریٹ` : `Rates of ${day}`) : t("آج کے ریٹ")}{data.market?.km > 60 ? (isUr() ? ` · آپ سے ${data.market.km} کلومیٹر` : ` · ${data.market.km} km from you`) : ""}</span>
      </div>
      <div className="sf-crops" role="tablist">
        {groups.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={g === k} onClick={() => setG(k)}>{t(l)}</button>)}
      </div>
      <ul className="rates">
        {shown.map((x, i) => (
          <li key={i}>
            <span className="r-name"><b>{isUr() ? x.ur : String(x.name).replace(/\s*\([^)]*[\u0600-\u06FF][^)]*\)/, "")}</b>{isUr() && x.variety ? <small className="latin">{x.variety}</small> : null}</span>
            <span className="r-price"><b className="num">{rs(x.price)}</b><small>{t("روپے")}{" "}{t(UNIT[x.unit])}</small></span>
          </li>
        ))}
      </ul>
      <p className="note">{t("یہ سرکاری منڈی کا اوسط تھوک ریٹ ہے۔")}</p>
    </div>
  );
}

export function Schemes() {
  const [open, setOpen] = useState(null);
  return (
    <div className="stack schemes">
      {SCHEMES.map((s) => (
        <article key={s.id} className="scheme">
          <button type="button" className="scheme-h" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
            <b>{t(s.title)}</b><span aria-hidden="true">{open === s.id ? "−" : "+"}</span>
          </button>
          <p>{t(s.gives)}</p>
          {open === s.id ? (
            <dl className="sf-facts">
              <div><dt>{t("کون لے سکتا ہے")}</dt><dd>{t(s.who)}</dd></div>
              <div><dt>{t("کیسے لیں")}</dt><dd>{t(s.how)}</dd></div>
              <div><dt>{t("سرکاری صفحہ")}</dt><dd><a href={s.source} target="_blank" rel="noopener noreferrer">{t("کھولیں ↗")}</a></dd></div>
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  );
}

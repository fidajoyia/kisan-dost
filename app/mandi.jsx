"use client";
// Point 7: today's mandi rates (nearest Punjab market) and government schemes for farmers.
import { useState } from "react";
import { SCHEMES } from "@/lib/schemes";

const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
const rs = (n) => Number(n).toLocaleString("en-US");
const UNIT = { maund: "فی من (40 کلو)", dozen: "فی درجن", "100pcs": "فی 100 دانے" };
const GROUPS = [["farm", "فصلیں"], ["vegetables", "سبزیاں"], ["fruits", "پھل"], ["grains", "اناج اور دالیں"]];

export function MandiRates({ data, state, onRetry }) {
  const [g, setG] = useState("farm");
  if (state === "loading" && !data) return <div className="thinking"><div className="spin" /><span>آج کے منڈی ریٹ آ رہے ہیں…</span></div>;
  if (state === "nogps") return <p className="status">منڈی ریٹ کے لیے اپنا ضلع چنیں (اوپر جگہ پر کلک کریں)۔</p>;
  if (!data || data.error) return <p className="status err">منڈی ریٹ ابھی نہیں مل سکے۔ <button type="button" className="btn ghost" onClick={onRetry}>دوبارہ کوشش</button></p>;
  const items = arr(data.items);
  const shown = g === "farm" ? items.filter((x) => x.farm) : items.filter((x) => x.group === g && !x.farm);
  const groups = GROUPS.filter(([k]) => (k === "farm" ? items.some((x) => x.farm) : items.some((x) => x.group === k && !x.farm)));
  const day = data.date ? new Date(data.date + "T00:00").toLocaleDateString("ur-PK", { day: "numeric", month: "long" }) : "";
  return (
    <div className="stack mandi">
      <div className="mandi-head">
        <b>{data.market?.ur} منڈی</b>
        <span>{day ? `${day} کے ریٹ` : "آج کے ریٹ"}{data.market?.km > 60 ? ` · آپ سے ${data.market.km} کلومیٹر` : ""}</span>
      </div>
      <div className="sf-crops" role="tablist">
        {groups.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={g === k} onClick={() => setG(k)}>{l}</button>)}
      </div>
      <ul className="rates">
        {shown.map((x, i) => (
          <li key={i}>
            <span className="r-name"><b>{x.ur}</b>{x.variety ? <small className="latin">{x.variety}</small> : null}</span>
            <span className="r-price"><b className="num">{rs(x.price)}</b><small>روپے {UNIT[x.unit]}</small></span>
          </li>
        ))}
      </ul>
      <p className="note">یہ سرکاری منڈی کا اوسط تھوک ریٹ ہے۔</p>
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
            <b>{s.title}</b><span aria-hidden="true">{open === s.id ? "−" : "+"}</span>
          </button>
          <p>{s.gives}</p>
          {open === s.id ? (
            <dl className="sf-facts">
              <div><dt>کون لے سکتا ہے</dt><dd>{s.who}</dd></div>
              <div><dt>کیسے لیں</dt><dd>{s.how}</dd></div>
              <div><dt>سرکاری صفحہ</dt><dd><a href={s.source} target="_blank" rel="noopener noreferrer">کھولیں ↗</a></dd></div>
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  );
}

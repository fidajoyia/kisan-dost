"use client";
// What the leaf model was trained on: its 9 crops and every disease / pest it can name,
// read straight from the model's report card, so this list can never drift from the model.
import { useState } from "react";
import CARD from "../public/models/kisan-leaf-card.json";
import { KB, CROPS_UR } from "@/lib/leaf-kb";

const ORDER = ["wheat", "rice", "maize", "cotton", "sugarcane", "potato", "tomato", "mango", "citrus"];
const byCrop = {};
for (const [label, s] of Object.entries(CARD.per_class)) {
  const [crop] = label.split("|");
  (byCrop[crop] ||= []).push({ label, ur: KB[label]?.ur || label.split("|")[1], healthy: KB[label]?.kind === "healthy", n: s.test_photos, ok: s.recall });
}
// per-crop accuracy on the held-out test photos (weighted by photos; classes without test photos left out)
const acc = (list) => {
  const t = list.reduce((a, x) => a + x.n, 0);
  return t ? Math.round((list.reduce((a, x) => a + x.ok * x.n, 0) / t) * 100) : null;
};
const crops = ORDER.filter((c) => byCrop[c]);

export function TrainedCrops() {
  const [open, setOpen] = useState(null);
  const list = open ? byCrop[open].slice().sort((a, b) => b.healthy - a.healthy) : [];
  return (
    <section className="card tc">
      <h3 className="card-title">ایپ ان فصلوں کو پہچانتی ہے <small>{crops.length} فصلیں · {CARD.classes} بیماریاں / حالتیں</small></h3>
      <div className="tc-crops" role="tablist" aria-label="فصل">
        {crops.map((c) => {
          const nDis = byCrop[c].filter((x) => !x.healthy).length;
          return (
            <button key={c} type="button" role="tab" aria-selected={open === c} onClick={() => setOpen(open === c ? null : c)}>
              <b>{CROPS_UR[c]}</b><small><span className="num">{nDis}</span> بیماریاں</small>
            </button>
          );
        })}
      </div>
      {open ? (
        <div className="tc-list">
          <ul>
            {list.map((x) => <li key={x.label} className={x.healthy ? "h" : ""}>{x.healthy ? (x.label.endsWith("Ear") ? "صحت مند سٹہ" : "صحت مند پتا") : x.ur}</li>)}
          </ul>
          {acc(byCrop[open]) != null ? <p className="hint">ٹیسٹ تصاویر پر درست پہچان: <span className="num">{acc(byCrop[open])}%</span> (یہ تصاویر ماڈل نے تربیت میں نہیں دیکھیں)</p> : null}
        </div>
      ) : <p className="hint">کسی فصل پر دبائیں تو اس کی وہ بیماریاں نظر آئیں گی جو ایپ پہچان سکتی ہے۔ ان کے علاوہ کسی پودے یا بیماری کی تصویر پر ایپ اندازہ نہیں لگاتی۔</p>}
      <p className="hint">تربیت: <span className="num">{CARD.train_photos.toLocaleString("en")}</span> تصاویر · مجموعی درستگی <span className="num">{CARD.test_accuracy}%</span> (<span className="num">{CARD.test_photos.toLocaleString("en")}</span> ٹیسٹ تصاویر پر)</p>
    </section>
  );
}

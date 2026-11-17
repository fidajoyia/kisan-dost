"use client";
// What the leaf model was trained on: its crops, vegetables, fruit trees, trees and roses, and every disease / pest it can name,
// read straight from the model's report card, so this list can never drift from the model.
import { useState } from "react";
import CARD from "../public/models/kisan-leaf-card.json";
import { KB, CROPS_UR, CROPS_EN } from "@/lib/leaf-kb";
import { GROUPS } from "@/lib/leaf-kb-more";
import { t, isUr, locale } from "@/lib/en";

const GROUP_UR = { field: "کھیت کی فصلیں", veg: "سبزیاں", fruit: "پھل دار درخت", trees: "درخت اور پھول", other: "دیگر" };
const byCrop = {};
for (const [label, s] of Object.entries(CARD.per_class)) {
  const [crop] = label.split("|");
  (byCrop[crop] ||= []).push({ label, ur: KB[label]?.ur || label.split("|")[1], en: KB[label]?.en || label.split("|")[1], healthy: KB[label]?.kind === "healthy", });
}
const grouped = new Set(Object.values(GROUPS).flat());
const groups = Object.entries(GROUPS)
  .map(([g, ids]) => [g, ids.filter((c) => byCrop[c])])
  .concat([["other", Object.keys(byCrop).filter((c) => !grouped.has(c))]])
  .filter(([, ids]) => ids.length);
const nCrops = Object.keys(byCrop).length;

export function TrainedCrops() {
  const [open, setOpen] = useState(null);
  const list = open ? byCrop[open].slice().sort((a, b) => b.healthy - a.healthy) : [];
  return (
    <section className="card tc">
      <h3 className="card-title">{t("ایپ ان پودوں کو پہچانتی ہے")}{" "}<small><span className="num">{nCrops}</span>{" "}{t("فصلیں / درخت")}</small></h3>
      {groups.map(([g, ids]) => (
        <div key={g} className="tc-group">
          {groups.length > 1 ? <h4>{t(GROUP_UR[g])}</h4> : null}
          <div className="tc-crops" role="tablist" aria-label={t(GROUP_UR[g])}>
            {ids.map((c) => {
              const nDis = byCrop[c].filter((x) => !x.healthy).length;
              return (
                <button key={c} type="button" role="tab" aria-selected={open === c} onClick={() => setOpen(open === c ? null : c)}>
                  <b>{(isUr() ? CROPS_UR[c] : CROPS_EN[c]) || c}</b><small>{nDis ? <><span className="num">{nDis}</span>{" "}{t("بیماریاں")}</> : t("صرف پہچان")}</small>
                </button>
              );
            })}
          </div>
          {open && ids.includes(open) ? (
            <div className="tc-list">
              <ul>
                {list.map((x) => <li key={x.label} className={x.healthy ? "h" : ""}>{x.healthy ? (x.label.endsWith("Ear") ? t("صحت مند سٹہ") : t("صحت مند پتا")) : isUr() ? x.ur : x.en}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
      {!open ? <p className="hint">{t("کسی فصل یا درخت پر دبائیں تو اس کی وہ بیماریاں نظر آئیں گی جو ایپ پہچان سکتی ہے۔ ان کے علاوہ کسی پودے یا بیماری کی تصویر پر ایپ اندازہ نہیں لگاتی۔")}</p> : null}
    </section>
  );
}

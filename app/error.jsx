"use client";
import { t, isUr } from "@/lib/en";
export default function Error({ reset }) {
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "40px auto", fontFamily: "var(--f-body)" }} dir={isUr() ? "rtl" : "ltr"}>
      <h2>{t("کچھ گڑبڑ ہو گئی")}</h2>
      <p>{t("ایپ دوبارہ کھولنے کے لیے نیچے بٹن دبائیں۔")}</p>
      <button type="button" className="btn" onClick={() => reset()}>{t("دوبارہ کھولیں")}</button>
    </div>
  );
}

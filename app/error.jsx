"use client";
export default function Error({ reset }) {
  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "40px auto", fontFamily: "var(--f-body)" }} dir="rtl">
      <h2>کچھ گڑبڑ ہو گئی</h2>
      <p>ایپ دوبارہ کھولنے کے لیے نیچے بٹن دبائیں۔</p>
      <button type="button" className="btn" onClick={() => reset()}>دوبارہ کھولیں</button>
    </div>
  );
}

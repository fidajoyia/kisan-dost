"use client";
import { Safe } from "./boundary";
import { useEffect, useRef, useState } from "react";
import { allDistricts, PROVINCES } from "@/lib/districts";
import { ResearchFeed, ImportGuide } from "./advisor";
import { SeedFinder } from "./seeds";
import { FloodOutlook, FloodCard } from "./flood";
import { TrainedCrops } from "./crops";
import { WaterScreen } from "./water";
import { MandiRates, Schemes } from "./mandi";
import { diagnoseLocally, warmLeafModel } from "./leaf-local";

const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const WMO = (c) =>
  c == null ? "" : c === 0 ? "صاف آسمان" : c <= 3 ? "جزوی بادل" : c <= 48 ? "دھند" : c <= 67 ? "بارش / بوندا باندی"
  : c <= 77 ? "برفباری" : c <= 82 ? "بارش کے جھالے" : "آندھی / گرج چمک";
const RAIN_STATUS = { none: "بارش نہیں", recent: "حال ہی میں بارش ہوئی", forecast: "بارش متوقع ہے", continuous: "مسلسل بارش کا موسم" };
const IRR = {
  irrigate_now: ["now", "ابھی پانی دیں"],
  irrigate_soon: ["soon", "2 سے 3 دن میں پانی دیں"],
  wait_rain: ["no", "بارش متوقع ہے، ابھی پانی نہ دیں"],
  not_needed: ["no", "ابھی پانی کی ضرورت نہیں"],
  unknown: ["soon", "پانی کی ضرورت کا اندازہ نہیں ہو سکا"],
};
const LVL = { high: "زیادہ خطرہ", medium: "درمیانہ خطرہ", low: "کم خطرہ" };
const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
const n0 = (v) => (v === 0 || v ? Math.round(Number(v)) : "–");

async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return { mediaType: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1], preview: c.toDataURL("image/jpeg", 0.5) };
  } finally { URL.revokeObjectURL(url); }
}

export default function Home() {
  const [lang, setLang] = useState("ur");
  const [coords, setCoords] = useState(null);
  const [locState, setLocState] = useState("locating"); // locating | ok | denied | error
  const [locSource, setLocSource] = useState(null); // gps | saved | district
  const [picking, setPicking] = useState(false);
  const [loc, setLoc] = useState(null);
  const [wx, setWx] = useState(null);
  const [wxState, setWxState] = useState("idle");
  const [outlook, setOutlook] = useState(null);
  const [outState, setOutState] = useState("idle");
  const [images, setImages] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("alerts"); // alerts (home) | weather | flood (water) | seeds | mandi
  const [mandi, setMandi] = useState(null);
  const [mandiState, setMandiState] = useState("idle");
  const [mandiTry, setMandiTry] = useState(0);
  const [soil, setSoil] = useState(null);   // automatic land-type guess
  const [zone, setZoneState] = useState(null);
  const [research, setResearch] = useState(null);
  const [resState, setResState] = useState("idle");
  const [resTry, setResTry] = useState(0);
  const [newIds, setNewIds] = useState(() => new Set());
  const [flood, setFlood] = useState(null);
  const [floodState, setFloodState] = useState("loading");
  const [floodTry, setFloodTry] = useState(0);
  const [water, setWater] = useState(null);
  const [waterState, setWaterState] = useState("idle");
  const [waterTry, setWaterTry] = useState(0);
  const resultRef = useRef(null);

  // 1. Automatic GPS on open (falls back to the last location the farmer chose).
  function locate() {
    const saved = LS.get("kd-coords");
    setLocState("locating");
    const fallback = (state) => { if (saved) { setCoords(saved); setLocSource("saved"); setLocState("ok"); } else setLocState(state); };
    if (!navigator.geolocation) return fallback("error");
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = { lat: p.coords.latitude, lon: p.coords.longitude }; LS.set("kd-coords", c); setCoords(c); setLocSource("gps"); setLocState("ok"); setPicking(false); },
      () => fallback("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }
  useEffect(() => {
    setLang(LS.get("kd-lang") || "ur"); locate();
  }, []);

  // 2. Place name + live weather as soon as coordinates exist.
  useEffect(() => {
    if (!coords) return;
    const q = `lat=${coords.lat}&lon=${coords.lon}`;
    setWxState("loading");
    fetch(`/api/location?${q}`).then((r) => r.json()).then(setLoc).catch(() => setLoc({ ...coords }));
    fetch(`/api/weather?${q}`).then((r) => r.json())
      .then((w) => { if (!w || w.error || !w.current || !Array.isArray(w.days)) throw 0; setWx(w); setWxState("ok"); })
      .catch(() => setWxState("error"));
  }, [coords]);

  // 3. Regional disease alerts + days 17–30 outlook (cached per place, day and language).
  useEffect(() => {
    if (!loc || !wx) return;
    const key = `kd-outlook2:${loc.district || `${coords.lat.toFixed(1)},${coords.lon.toFixed(1)}`}:${wx.today}:${lang}`;
    const cached = LS.get(key);
    if (cached) { setOutlook(cached); setOutState("ok"); return; }
    setOutState("loading");
    fetch("/api/outlook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ location: loc, weather: wx, lang }) })
      .then((r) => r.json())
      .then((o) => { if (o.error) throw 0; LS.set(key, o); setOutlook(o); setOutState("ok"); })
      .catch(() => setOutState("error"));
  }, [loc, wx, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Land type (normal / sem / rait): SoilGrids + district lists; the farmer can override.
  useEffect(() => {
    setZoneState(LS.get("kd-zone"));
    const t = LS.get("kd-tab"); if (["weather", "flood", "water", "seeds", "mandi"].includes(t)) setTab(t);
  }, []);
  useEffect(() => {
    if (!coords) return;
    const q = new URLSearchParams({ lat: coords.lat, lon: coords.lon, district: loc?.district || "" });
    fetch(`/api/soil?${q}`).then((r) => r.json()).then((s) => { if (!s.error) setSoil(s); }).catch(() => {});
  }, [coords, loc?.district]);
  const zoneNow = zone || soil?.zone || "normal";
  const setZone = (z) => { setZoneState(z); LS.set("kd-zone", z); };

  // 5. Newest research from the 10 centres (server refreshes it automatically; cached here for 3 h).
  useEffect(() => {
    const key = "kd-research3";
    const cached = LS.get(key);
    const markNew = (d) => {
      const seen = LS.get("kd-research-seen");
      const ids = arr(d?.items).map((x) => x?.id);
      setNewIds(new Set(seen ? ids.filter((id) => !seen.includes(id)) : []));
      if (!seen) LS.set("kd-research-seen", ids);
    };
    if (cached && Date.now() - cached.t < 3 * 3600e3 && !resTry) { setResearch(cached.d); setResState("ok"); markNew(cached.d); return; }
    setResState("loading");
    fetch("/api/research").then((r) => r.json())
      .then((d) => { if (d.error && !d.items?.length) throw 0; LS.set(key, { t: Date.now(), d }); setResearch(d); setResState("ok"); markNew(d); })
      .catch(() => setResState("error"));
  }, [resTry]);

  // 6. Seasonal flood outlook (Feature 3): server combines dams, rivers, 7-month forecast and ENSO.
  useEffect(() => {
    if (!coords) return;
    const key = `kd-flood3:${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
    const c = LS.get(key);
    if (c && Date.now() - c.t < 3 * 3600e3 && !floodTry) { setFlood(c.d); setFloodState("ok"); return; }
    setFloodState("loading");
    const q = new URLSearchParams({ lat: coords.lat, lon: coords.lon });
    fetch(`/api/flood?${q}`).then((r) => r.json())
      .then((d) => { setFlood(d); setFloodState(d.error ? "error" : "ok"); if (!d.error) LS.set(key, { t: Date.now(), d }); })
      .catch(() => { setFlood(null); setFloodState("error"); });
  }, [coords, floodTry]);

  // 7. River flows at headworks and water into canals: only fetched when the water tab is opened.
  useEffect(() => {
    if (tab !== "water") return;
    const key = `kd-water1:${coords ? `${coords.lat.toFixed(1)},${coords.lon.toFixed(1)}` : "-"}`;
    const c = LS.get(key);
    if (c && Date.now() - c.t < 3 * 3600e3 && !waterTry) { setWater(c.d); setWaterState("ok"); return; }
    setWaterState("loading");
    const q = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";
    fetch(`/api/water${q}`).then((r) => r.json())
      .then((d) => { setWater(d); setWaterState(d.error ? "error" : "ok"); if (!d.error) LS.set(key, { t: Date.now(), d }); })
      .catch(() => setWaterState("error"));
  }, [tab, coords, waterTry]);

  // 7. Mandi rates at the nearest government market (cached here for 3 h).
  useEffect(() => {
    if (!coords) return;
    const key = `kd-mandi:${coords.lat.toFixed(1)},${coords.lon.toFixed(1)}`;
    const c = LS.get(key);
    if (c && Date.now() - c.t < 3 * 3600e3 && !mandiTry) { setMandi(c.d); setMandiState("ok"); return; }
    setMandiState("loading");
    fetch(`/api/mandi?lat=${coords.lat}&lon=${coords.lon}`).then((r) => r.json())
      .then((d) => { setMandi(d); setMandiState(d.error ? "error" : "ok"); if (!d.error) LS.set(key, { t: Date.now(), d }); })
      .catch(() => { setMandi(null); setMandiState("error"); });
  }, [coords, mandiTry]);

  // open a screen, optionally scrolled to one of its parts
  function go(t, anchor) {
    openTab(t);
    setTimeout(() => { const el = anchor && document.getElementById(anchor); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); else window.scrollTo({ top: 0 }); }, 60);
  }

  function openTab(t) {
    if (tab === "research" && t !== "research") setNewIds(new Set()); // seen once you leave the tab
    setTab(t); LS.set("kd-tab", t);
    if (t === "research" && research) {
      const seen = LS.get("kd-research-seen") || [];
      LS.set("kd-research-seen", [...new Set([...arr(research?.items).map((x) => x?.id), ...arr(seen)])].slice(0, 400));
    }
  }

  // 6. Photo picked → analyse immediately.
  async function onPick(e) {
    const files = [...(e.target.files || [])].slice(0, 3);
    e.target.value = "";
    if (!files.length) return;
    setErr(""); setResult(null); setBusy(true);
    try {
      const imgs = await Promise.all(files.map(compress));
      setImages(imgs);
      // Kisan Dost's own model, on the phone: no API, no internet needed after the first load
      const j = await diagnoseLocally(imgs, wx);
      setResult(j); setTab("alerts"); LS.set("kd-tab", "alerts");
      const hist = LS.get("kd-history") || [];
      LS.set("kd-history", [{ t: Date.now(), name: j.plant?.name_local || "", place: loc?.district || "" }, ...hist].slice(0, 20));
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
    } catch (e2) {
      console.error("leaf check failed", e2);
      setErr(/runtime|model file/.test(String(e2?.message)) ? "ابھی معائنہ شروع نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ تصویر لیں۔" : "تصویر کا معائنہ نہیں ہو سکا۔ پتے کی قریب سے صاف تصویر دوبارہ لیں۔");
    } finally { setBusy(false); }
  }

  function pickDistrict(v) {
    const d = allDistricts().find((x) => `${x.province}|${x.district}` === v);
    if (!d) return;
    const c = { lat: d.lat, lon: d.lon }; LS.set("kd-coords", c); setCoords(c); setLocSource("district"); setLocState("ok"); setPicking(false);
  }

  const placeLabel = loc
    ? [loc.place, loc.district, loc.province_ur || PROVINCES[loc.province] || loc.province].filter(Boolean).join("، ")
    : "";

  // the flood answer on the home screen: first thing on the page when the danger is high
  const floodHot = ["high", "severe"].includes(flood?.summary?.farm?.level);
  const floodCard = <FloodCard data={flood} lang={lang} onOpen={() => { openTab("flood"); window.scrollTo({ top: 0 }); }} />;
  const placeShort = locState === "locating" ? "جگہ تلاش ہو رہی ہے…" : loc ? (loc.district || loc.place || "میری جگہ") : locState === "ok" ? "میری جگہ" : "جگہ چنیں";
  const camInputs = (compact) => (
    <div className={compact ? "cam-row" : "cam-big"} onPointerDown={() => warmLeafModel().catch(() => {})} onFocus={() => warmLeafModel().catch(() => {})}>
      <label className="cam-main">
        <input id="camera" type="file" accept="image/*" capture="environment" onChange={onPick} disabled={busy} />
        <span><Ico.camera />{busy ? "معائنہ ہو رہا ہے…" : compact ? "نئی تصویر" : "پتے کی تصویر لیں"}</span>
      </label>
      <label className="cam-alt">
        <input id="gallery" type="file" accept="image/*" multiple onChange={onPick} disabled={busy} />
        <span><Ico.image />گیلری سے</span>
      </label>
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>کسان دوست</h1>
        <button type="button" className="tb-place" aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
          <Ico.pin /><span>{placeShort}</span>
          {wxState === "ok" ? <b className="num">{n0(wx.current?.temp)}°</b> : null}
        </button>
        <select id="lang" className="tb-lang" aria-label="زبان" value={lang} onChange={(e) => { setLang(e.target.value); LS.set("kd-lang", e.target.value); }}>
          <option value="ur">اردو</option>
          <option value="roman">Roman</option>
          <option value="en">English</option>
        </select>
      </header>

      {picking || locState === "denied" || locState === "error" ? (
        <div className="pickloc">
          <p>{locState === "denied" || locState === "error" ? "فون کی لوکیشن (GPS) نہیں ملی۔ اپنا ضلع چنیں:" : `ابھی کی جگہ: ${placeLabel || "–"}${locSource === "district" ? " (منتخب ضلع)" : ""}`}</p>
          <div className="pickloc-row">
            <select id="district" defaultValue="" onChange={(e) => pickDistrict(e.target.value)}>
              <option value="" disabled>ضلع منتخب کریں</option>
              {Object.keys(PROVINCES).map((p) => (
                <optgroup key={p} label={PROVINCES[p]}>
                  {allDistricts().filter((d) => d.province === p).map((d) => <option key={d.district} value={`${p}|${d.district}`}>{d.district}</option>)}
                </optgroup>
              ))}
            </select>
            <button type="button" className="btn ghost" onClick={locate}>GPS سے</button>
          </div>
        </div>
      ) : null}

      <main className="screen" id="sheet-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} ref={resultRef}>
        <Safe resetKey={`${tab}|${lang}|${result ? 1 : 0}`}>
          {tab === "flood" ? <Screen bare title="سیلاب کا خطرہ" sub={placeLabel || "دریا، ڈیم اور آنے والے 7 مہینے"}><FloodOutlook data={flood} state={!coords && ["denied", "error"].includes(locState) ? "nogps" : floodState} lang={lang} onRetry={() => setFloodTry((n) => n + 1)} /><button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={() => go("water")}>دریا، بیراج اور نہروں میں پانی دیکھیں ←</button></Screen>
            : tab === "weather" ? <Screen bare title="موسم" sub={placeShort}><WeatherScreen wx={wx} wxState={wxState} outlook={outlook} outState={outState} /></Screen>
            : tab === "seeds" ? (
              <Screen bare title="بیج کا مشورہ" sub="آپ کے موسم اور زمین کے مطابق">
                <div className="card"><SeedFinder wx={wx} coords={coords} guess={soil} zone={zoneNow} setZone={setZone} lang={lang} goImport={() => go("seeds", "import")} /></div>
                <details className="card fold" id="research"><summary>دنیا کی نئی زرعی تحقیق{newIds.size ? <span className="badge-in num">{newIds.size}</span> : null}</summary><ResearchFeed data={research} state={resState} lang={lang} newIds={newIds} onRetry={() => setResTry((n) => n + 1)} /></details>
                <details className="card fold" id="import"><summary>بیج باہر سے منگوانے کا طریقہ</summary><ImportGuide lang={lang} /></details>
              </Screen>
            )
            : tab === "mandi" ? (
              <Screen bare title="منڈی اور سرکاری اسکیمیں">
                <div className="card"><MandiRates data={mandi} state={!coords && ["denied", "error"].includes(locState) ? "nogps" : mandiState} onRetry={() => setMandiTry((n) => n + 1)} /></div>
                <h3 className="sec-title" id="schemes">کسانوں کے لیے سرکاری اسکیمیں</h3>
                <Schemes />
              </Screen>
            )
            : tab === "water" ? <Screen bare title="دریا، بیراج اور نہریں" sub="ہر ہیڈ ورکس پر پانی کی آمد اور نہروں میں پانی"><WaterScreen data={water} state={waterState} lang={lang} onRetry={() => setWaterTry((n) => n + 1)} /></Screen>
            : busy ? <div className="card"><div className="thinking"><div className="spin" /><span>تصویر کا معائنہ ہو رہا ہے… چند سیکنڈ</span></div></div>
            : result ? (
              <div className="stack">
                <div className="res-bar">
                  <button type="button" className="back" onClick={() => { setResult(null); setImages([]); }}><Ico.back />واپس</button>
                  {images.length ? <div className="thumbs">{images.map((im, i) => <img key={i} src={im.preview} alt={`پتے کی تصویر ${i + 1}`} />)}</div> : null}
                </div>
                {camInputs(true)}
                <div className="card"><Result d={result} place={placeLabel} /></div>
                {result.is_plant === false ? <TrainedCrops /> : null}
              </div>
            ) : (
              <div className="stack">
                {floodHot ? floodCard : null}
                <section className="hero">
                  <h2>پتے کی تصویر سے بیماری اور دوا</h2>
                  <ol className="hero-steps">
                    <li><Ico.camera /><span>پتے کی تصویر</span></li>
                    <li><Ico.search /><span>بیماری کی پہچان</span></li>
                    <li><Ico.spray /><span>صحیح دوا</span></li>
                  </ol>
                  {camInputs(false)}
                  {err ? <p className="board-err" role="alert">{err}</p> : null}
                  <p className="hero-hint">دن کی روشنی میں ایک پتا قریب سے لیں۔</p>
                </section>
                <Tiles wx={wx} wxState={wxState} outlook={outlook} flood={flood} mandi={mandi} go={go} />
                <TrainedCrops />
              </div>
            )}
        </Safe>
      </main>

      <nav className="bottomnav" role="tablist" aria-label="حصے">
        {[["alerts", "معائنہ", Ico.leaf], ["weather", "موسم", Ico.sun], ["flood", "پانی", Ico.water], ["seeds", "بیج", Ico.sprout], ["mandi", "منڈی", Ico.market]].map(([k, l, I]) => (
          <button key={k} id={`tab-${k}`} role="tab" type="button" aria-selected={tab === k || (k === "flood" && tab === "water")} aria-controls="sheet-panel" onClick={() => { if (k === "alerts") { setResult(null); } openTab(k); window.scrollTo({ top: 0 }); }}>
            <span className="bn-ico"><I />
              {k === "weather" && arr(outlook?.alerts).some((a) => a.level === "high") && tab !== "weather" ? <i className="badge">!</i> : null}
              {k === "flood" && floodHot && tab !== "flood" ? <i className="badge">!</i> : null}
            </span>
            <span className="bn-lbl">{l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Screen({ title, sub, bare, children }) {
  return (
    <div className="stack">
      <div className="screen-head"><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</div>
      {bare ? children : <div className="card">{children}</div>}
    </div>
  );
}

// simple line icons (24px grid, current colour)
const svg = (d) => function I() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>; };
const Ico = {
  leaf: svg(<><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19 14 10" /></>),
  water: svg(<><path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /></>),
  sprout: svg(<><path d="M12 21v-9" /><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z" /><path d="M12 14c0-4 3-6 7-6 0 4-3 6-7 6Z" /></>),
  book: svg(<><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z" /><path d="M4 20a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1Z" /></>),
  box: svg(<><path d="M3 8 12 3l9 5v8l-9 5-9-5V8Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>),
  camera: svg(<><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></>),
  image: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></>),
  search: svg(<><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>),
  spray: svg(<><path d="M9 9h6v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9Z" /><path d="M10 9V6h4v3" /><path d="M14 6h3" /><path d="M19 4v.01M21 6v.01M19 8v.01" /></>),
  pin: svg(<><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  back: svg(<path d="m9 6 6 6-6 6" />),
  drop: svg(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />),
  canal: svg(<><path d="M4 4v16M20 4v16" /><path d="M4 9h16M4 15h16" /><path d="M7 12c1.5-1 3.5-1 5 0s3.5 1 5 0" /></>),
  sun: svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  market: svg(<><path d="M4 10h16l-1.5-5h-13L4 10Z" /><path d="M5 10v9h14v-9" /><path d="M10 19v-5h4v5" /></>),
  dam: svg(<><path d="M3 20h18" /><path d="M6 20V8l4-3v15" /><path d="M10 12c2 1 4 1 6 0s3-1 5 0" /><path d="M10 16c2 1 4 1 6 0s3-1 5 0" /></>),
  alert: svg(<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17v.01" /></>),
  scheme: svg(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
};

const IRR_SOIL = { irrigate_now: "زمین خشک ہو چکی ہے", irrigate_soon: "زمین میں نمی کم ہو رہی ہے", wait_rain: "زمین میں نمی ٹھیک ہے", not_needed: "زمین میں نمی کافی ہے" };
const rainWord = (mm, future) => (mm == null ? "–" : mm < 1 ? (future ? "بارش کا امکان نہیں" : "بارش نہیں ہوئی") : mm < 5 ? (future ? "ہلکی بارش کا امکان" : "ہلکی بارش ہوئی") : mm < 25 ? (future ? "اچھی بارش کا امکان" : "اچھی بارش ہوئی") : (future ? "تیز بارش کا امکان" : "تیز بارش ہوئی"));

// Points 5 and 6: weather warnings, rain and soil moisture
function WeatherScreen({ wx, wxState, outlook, outState }) {
  if (wxState !== "ok") return <div className="card"><p className="status">{wxState === "error" ? "موسم ابھی نہیں مل سکا۔ تھوڑی دیر بعد دوبارہ کھولیں۔" : "جگہ ملتے ہی موسم یہاں آ جائے گا۔"}</p></div>;
  const [cls, label] = IRR[wx.irrigation?.need] || IRR.unknown;
  const next = arr(wx.days).filter((d) => !d.past).slice(0, 7);
  const dayName = (d) => (d.date === wx.today ? "آج" : new Date(d.date + "T00:00").toLocaleDateString("ur-PK", { weekday: "short" }));
  return (
    <>
      <section className="card wx">
        <div className="wx-head">
          <div className="wx-temp"><b className="num">{n0(wx.current?.temp)}°</b><span>{WMO(wx.current?.code)}</span></div>
          <div className="wx-meta"><span>ہوا میں نمی <b className="num">{n0(wx.current?.humidity)}%</b></span></div>
        </div>
        <div className="days7">
          {next.map((d) => (
            <div key={d.date} className={d.date === wx.today ? "today" : ""}>
              <span>{dayName(d)}</span>
              <b className="num">{n0(d.tmax)}°</b>
              <small className="num">{n0(d.tmin)}°</small>
              <i>{d.rain_mm >= 1 ? <Ico.drop /> : ""}</i>
            </div>
          ))}
        </div>
      </section>
      <section className="card" id="warnings">
        <h3 className="card-title">موسم کی وارننگ</h3>
        <Alerts outlook={outlook} state={outState} />
      </section>
      <section className="card" id="rain">
        <h3 className="card-title">بارش اور زمین کی نمی</h3>
        <ul className="facts2">
          <li><span>پچھلا ہفتہ</span><b>{rainWord(wx.rain?.past7_mm, false)}</b></li>
          <li><span>اگلا ہفتہ</span><b>{rainWord(wx.rain?.next7_mm, true)}</b></li>
          <li><span>زمین</span><b>{IRR_SOIL[wx.irrigation?.need] || "معلوم نہیں ہو سکا"}</b></li>
        </ul>
        <div className={`irr2 ${cls}`}><Ico.drop /><b>{label}</b></div>
      </section>
    </>
  );
}

// Home: the seven things the app does, each with today's answer in a few words
function Tiles({ wx, wxState, outlook, flood, mandi, go }) {
  const alerts = arr(outlook?.alerts);
  const high = alerts.filter((a) => a.level === "high").length;
  const fl = flood?.summary?.farm?.level;
  const FL = { low: "خطرہ کم ہے", moderate: "درمیانہ خطرہ", high: "زیادہ خطرہ", severe: "بہت زیادہ خطرہ" };
  const dw = flood?.summary?.farm?.water, tar = dw?.kind === "dam" ? dw.pct : null;
  const pick1 = arr(mandi?.items).find((x) => /^Wheat$/i.test(x.name)) || arr(mandi?.items).find((x) => x.farm);
  const tiles = [
    ["weather", "warnings", Ico.alert, "موسم کی وارننگ", wxState !== "ok" ? "" : high ? `${high} بڑا خطرہ` : alerts.length ? `${alerts.length} احتیاط` : "کوئی خطرہ نہیں", high ? "bad" : ""],
    ["weather", "rain", Ico.drop, "بارش اور زمین کی نمی", wxState === "ok" ? (IRR[wx.irrigation?.need] || IRR.unknown)[1] : "", "water"],
    ["flood", null, Ico.water, "سیلاب کی وارننگ", fl ? FL[fl] : "", ["high", "severe"].includes(fl) ? "bad" : "water"],
    ["water", null, Ico.dam, "ڈیم، دریا اور نہریں", tar != null ? `ڈیم ${Math.min(100, Math.round(tar))}٪ بھرا` : "بیراجوں پر پانی", "water"],
    ["seeds", null, Ico.sprout, "بیج کا مشورہ", "آپ کے موسم کے مطابق", "leaf"],
    ["mandi", null, Ico.market, "منڈی کے ریٹ", pick1 ? `${pick1.ur} ${Number(pick1.price).toLocaleString("en-US")} روپے من` : "آج کے ریٹ", "sun"],
    ["mandi", "schemes", Ico.scheme, "سرکاری اسکیمیں", "کسان کارڈ، ٹریکٹر", "sun"],
  ];
  return (
    <div className="tiles">
      {tiles.map(([t, anchor, I, title, line, c], i) => (
        <button key={i} type="button" className={`tile t-${c}`} onClick={() => go(t, anchor)}>
          <span className="tile-ico"><I /></span>
          <b>{title}</b>
          {line ? <small>{line}</small> : null}
        </button>
      ))}
    </div>
  );
}

function Alerts({ outlook, state }) {
  if (state === "loading") return <div className="thinking"><div className="spin" /><span>وارننگ تیار ہو رہی ہے…</span></div>;
  if (state === "error") return <p className="status">وارننگ ابھی نہیں مل سکی۔</p>;
  if (!outlook) return <p className="status">جگہ اور موسم ملتے ہی وارننگ یہاں آ جائے گی۔</p>;
  return (
    <div className="stack" style={{ gap: 14 }}>
      {arr(outlook.alerts).length ? (
        <div className="risks">
          {arr(outlook.alerts).map((a, i) => {
            const L = ["high", "medium", "low"].includes(a.level) ? a.level : "medium";
            return <div className="risk" key={i}><span className={`pill ${L}`}>{LVL[L]}</span><h4>{a.crop}: {a.threat}</h4><p>{a.reason}</p>{a.action ? <div className="when">کیا کریں: {a.action}</div> : null}</div>;
          })}
        </div>
      ) : null}
      {arr(outlook.farm_tips).length ? <ul className="list">{arr(outlook.farm_tips).map((t, i) => <li key={i}>{t}</li>)}</ul> : null}
    </div>
  );
}

function Result({ d, place }) {
  const [tab, setTab] = useState("organic");
  if (d.is_plant === false) return <div className="notcrop"><b>یہ تصویر پہچانی نہیں جا سکی</b><p>{d.image_note || "پتے کی قریب سے واضح تصویر لیں۔"}</p></div>;
  if (d.plant_only) return <div className="notcrop plantonly"><b>{d.plant?.name_local}</b><p>{d.image_note}</p></div>;
  const p = d.plant || {}, h = d.health || {}, t = d.treatment || {};
  const s = Math.max(0, Math.min(100, Number(h.score) || 0));
  const col = h.status === "healthy" ? "var(--ok)" : h.status === "early" ? "var(--warn)" : "var(--bad)";
  const r = 46, c = 2 * Math.PI * r;
  const statusTxt = h.label || { healthy: "صحت مند", early: "ابتدائی بیماری", moderate: "درمیانی بیماری", severe: "شدید بیماری" }[h.status] || "";
  return (
    <div className="stack">
      {d.advice ? <p className="note" style={{ fontSize: ".95rem", color: "var(--ink)", margin: 0 }}>{d.advice}</p> : null}
      <div className="idrow">
        <div>
          <p className="plant-name">{p.name_local || p.name_en || "نامعلوم پودا"}</p>
          <div className="sci">{p.name_en}{p.scientific ? ` · ${p.scientific}` : ""}</div>
          <div className="chips">
            {place ? <span className="loc-chip">📍 {place}</span> : null}
            {p.category ? <span className="chip leaf">{p.category}</span> : null}
            {p.growth_stage ? <span className="chip">{p.growth_stage}</span> : null}
          </div>
        </div>
        <div className="gauge">
          <div className="gauge-word" style={{ borderColor: col, color: col }}>{h.status === "healthy" ? "صحت مند" : "بیماری ملی"}</div>
          <div className="lbl">{statusTxt}</div>
        </div>
      </div>

      <section>
        <h3 className="sec-title">ابھی کی تشخیص</h3>
        <div className="dz">
          {h.status === "healthy" && !arr(d.diseases).length ? <div className="healthy">پتا صحت مند نظر آ رہا ہے۔</div> :
            arr(d.diseases).map((x, i) => {
              const cf = Math.max(0, Math.min(100, Number(x.confidence) || 0));
              return (
                <article key={i} className={`dis${cf < 50 ? " mild" : ""}`}>
                  <div className="dis-top"><h3>{x.name_local} <span className="latin" style={{ fontWeight: 400, color: "var(--muted)", fontSize: ".85rem" }}>{x.name_en}</span></h3></div>
                  <div style={{ fontSize: ".88rem", color: "var(--muted)" }}>{x.pathogen}{x.stage ? ` · مرحلہ: ${x.stage}` : ""}</div>
                  {arr(x.signs).length ? <ul>{arr(x.signs).map((sg, k) => <li key={k}>{sg}</li>)}</ul> : null}
                </article>
              );
            })}
        </div>
      </section>

      {arr(d.spray).length ? (
        <section className="spray">
          <h3 className="sec-title">سفارش کردہ اسپرے (دوا)</h3>
          <ol className="spray-list">
            {arr(d.spray).map((x, i) => (
              <li key={i}>
                <b>{x.ur}</b>
                <span className="latin">{x.ai}</span>
                <small>کس کے لیے: {x.target}{i ? " · متبادل دوا" : " · پہلی پسند"}</small>
              </li>
            ))}
          </ol>
          {d.sprayNote ? <p className="spray-note">{d.sprayNote}</p> : null}
          {d.weatherNote ? <p className="spray-note wx">{d.weatherNote}</p> : null}
          <ul className="safety">{arr(d.safety).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      ) : d.diseases?.length ? (
        <section className="spray"><h3 className="sec-title">اسپرے</h3><p className="spray-note">{d.sprayNote || "اس مسئلے کے لیے کیمیائی زہر کی ضرورت نہیں؛ نیچے دیے گئے طریقے اپنائیں۔"}</p></section>
      ) : null}


      {arr(d.risks).length ? (
        <section>
          <h3 className="sec-title">آنے والے خطرے کی وارننگ</h3>
          <div className="risks">
            {arr(d.risks).map((x, i) => {
              const L = ["high", "medium", "low"].includes(x.level) ? x.level : "medium";
              return <div className="risk" key={i}><span className={`pill ${L}`}>{LVL[L]}</span><h4>{x.name_local}</h4><p>{x.reason}</p>{x.when ? <div className="when">کب: {x.when}</div> : null}</div>;
            })}
          </div>
        </section>
      ) : null}

      {d.irrigation?.advice ? (
        <section>
          <h3 className="sec-title">اس فصل کی آبپاشی</h3>
          <p style={{ margin: 0 }}>{d.irrigation.advice}</p>
          {d.irrigation.next_watering ? <p style={{ margin: 0 }}><b>اگلا پانی:</b> {d.irrigation.next_watering}</p> : null}
          {d.irrigation.method_tip ? <p className="note" style={{ marginTop: 6 }}>{d.irrigation.method_tip}</p> : null}
        </section>
      ) : null}


      <section>
        <h3 className="sec-title">مزید علاج اور بچاؤ</h3>
        <div className="tabs" role="tablist">
          {[["organic", "قدرتی / گھریلو"], ["cultural", "کاشت کے طریقے"], ["chemical", "کیمیائی"]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <ul className="list">{(arr(t[tab]).length ? arr(t[tab]) : ["کوئی تجویز نہیں"]).map((x, i) => <li key={i}>{x}</li>)}</ul>
        {tab === "chemical" ? <p className="note">دوا کی مقدار اور وقفہ ڈبے کے لیبل کے مطابق رکھیں۔</p> : null}
      </section>

      {arr(d.prevention).length ? <section><h3 className="sec-title">بچاؤ</h3><ul className="list">{arr(d.prevention).map((x, i) => <li key={i}>{x}</li>)}</ul></section> : null}
      {d.image_note ? <p className="note">تصویر کے بارے میں: {d.image_note}</p> : null}
    </div>
  );
}

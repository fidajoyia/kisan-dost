// Live data for the flood outlook. Every source is free and needs no key.
//  1. ECMWF SEAS5 seasonal forecast (Open-Meteo): monthly rain / temperature / snowpack anomaly, 7 months ahead.
//  2. ERA5 reanalysis (Open-Meteo archive): what actually happened last year and in normal years.
//  3. Federal Flood Commission (FFC) daily report: Tarbela / Mangla / Chashma levels this year vs last
//     year, today's flood class at every barrage, Skardu temperature vs last year.
//  4. NOAA CPC Oceanic Niño Index (ONI): El Niño / La Niña, which shifts Pakistan's monsoon.
//  5. Open-Meteo 16-day forecast: heavy rain in the next two weeks (short-range warning).

const UA = { "User-Agent": "KisanDost/1.2 (flood outlook)" };
async function get(url, { ms = 30000, type = "json" } = {}) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${new URL(url).host}`);
  return type === "json" ? r.json() : type === "text" ? r.text() : r.arrayBuffer();
}
const arr = (j) => (Array.isArray(j) ? j : [j]);

// ---- Open-Meteo free-tier guard ----
// Free use is limited per minute / hour / day, and a request "costs" more with more places and days
// (about places × ceil(days / 14)). This in-process budget spaces requests so we never hit the limit.
const BUDGET_PER_MIN = Number(process.env.OPEN_METEO_BUDGET_PER_MIN || 450);
const spent = []; // [timestamp, weight]
export const omWeight = (places, days, vars = 3) => places * Math.ceil(Math.max(1, days) / 14) * Math.ceil(vars / 10);
export async function omThrottle(weight, maxWaitMs = 60000) {
  const t0 = Date.now();
  for (;;) {
    const now = Date.now();
    while (spent.length && now - spent[0][0] > 60000) spent.shift();
    const used = spent.reduce((s, x) => s + x[1], 0);
    if (used + weight <= BUDGET_PER_MIN || !spent.length) { spent.push([now, weight]); return; }
    const wait = 60000 - (now - spent[0][0]) + 250;
    if (now - t0 + wait > maxWaitMs) throw new Error("open-meteo budget: try again shortly");
    await new Promise((r) => setTimeout(r, wait));
  }
}
const ymd = (d) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- 1. seasonal forecast
export const SEASONAL_VARS = [
  "precipitation_mean", "precipitation_anomaly", "temperature_2m_mean", "temperature_2m_anomaly",
  "snow_depth_water_equivalent_mean", "snow_depth_water_equivalent_anomaly",
];
export async function fetchSeasonal(points) {
  await omThrottle(Math.ceil(points.length * 1.5));
  const url = new URL("https://seasonal-api.open-meteo.com/v1/seasonal");
  url.search = new URLSearchParams({
    latitude: points.map((p) => p[0]).join(","), longitude: points.map((p) => p[1]).join(","),
    monthly: SEASONAL_VARS.join(","), models: "ecmwf_seas5_ensemble_mean", forecast_days: "215",
  });
  return arr(await get(url.toString(), { ms: 40000 })).map((x) => x.monthly);
}

// ---------------------------------------------------------------- 2. ERA5 history
// Hydrological season starts 1 October (snow builds up from then). Returns daily data per point.
export async function fetchArchive(points, start, end, maxWaitMs) {
  await omThrottle(omWeight(points.length, (Date.parse(end) - Date.parse(start)) / 864e5 + 1), maxWaitMs);
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.search = new URLSearchParams({
    latitude: points.map((p) => p[0]).join(","), longitude: points.map((p) => p[1]).join(","),
    start_date: start, end_date: end, daily: "precipitation_sum,temperature_2m_mean,snowfall_sum",
  });
  return arr(await get(url.toString(), { ms: 45000 })).map((x) => x.daily);
}

// Season windows: k=0 is this season (1 Oct → 6 days ago), k=1 last year, k=2..N earlier years (the "normal").
export function seasonWindows(today, monthsAhead, years = 6) {
  const y = today.getUTCFullYear(), m = today.getUTCMonth() + 1;
  const seasonStart = m >= 10 ? y : y - 1;
  const endM = new Date(Date.UTC(y, m - 1 + monthsAhead, 0)); // last day of the last forecast month
  const lag = new Date(today.getTime() - 6 * 864e5);
  const out = [{ k: 0, start: `${seasonStart}-10-01`, end: ymd(lag) }];
  for (let k = 1; k <= years; k++) {
    const e = new Date(Date.UTC(endM.getUTCFullYear() - k, endM.getUTCMonth(), endM.getUTCDate()));
    out.push({ k, start: `${seasonStart - k}-10-01`, end: ymd(e) });
  }
  return out;
}

// ---------------------------------------------------------------- 3. Federal Flood Commission
const RESERVOIRS = ["Tarbela", "Chashma", "Mangla"];
const STATIONS = ["Tarbela", "Kalabagh", "Chashma", "Taunsa", "Guddu", "Sukkur", "Kotri", "Warsak", "Nowshera",
  "Chakdara Bridge", "Munda", "Charsadda Road", "Mangla", "Rasul", "Marala", "Khanki", "Qadirabad", "Trimmu",
  "Panjnad", "Jassar", "Shahdara", "Balloki", "Sidhnai", "G.S Wala", "Sulemanki", "Islam"];
const CLASS_RE = /(ExceptionallyHighFlood|VeryHighFlood|HighFlood|MediumFlood|LowFlood|Normal|NR)(?:\(([RFS])\))?/;
export const CLASS_RANK = { Normal: 0, NR: -1, LowFlood: 1, MediumFlood: 2, HighFlood: 3, VeryHighFlood: 4, ExceptionallyHighFlood: 5 };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// The PDF's text layer splits numbers ("153 5. 71"), so strip every space and read the fixed decimal patterns.
export function parseFFC(text) {
  const s = String(text).replace(/\s+/g, "");
  const out = { date: null, reservoirs: {}, total: null, stations: {}, skardu: null };
  const dm = s.match(/StoragePosition:([A-Za-z]+)(\d{1,2}),(\d{4})/) || s.match(/RiverFlowSituation:([A-Za-z]+)(\d{1,2}),(\d{4})/);
  if (dm) {
    const mi = MONTHS.indexOf(dm[1].toLowerCase());
    if (mi >= 0) out.date = `${dm[3]}-${String(mi + 1).padStart(2, "0")}-${dm[2].padStart(2, "0")}`;
  }
  const yrs = s.match(/WaterLevel\(Feet-AMSL\)LiveStorage\(MAF\)PresentStorage\(%ageoftotalstorage\)(\d{4})(\d{4})(\d{4})/);
  const L = "(\\d{3,4}\\.\\d{2})", S = "(\\d{1,2}\\.\\d{3})";
  for (const name of RESERVOIRS) {
    const m = s.match(new RegExp(`${name}${L}${L}${L}${L}${L}${S}${S}${S}(\\d{1,3}(?:\\.\\d{1,2})?)%`));
    if (!m) continue;
    const n = m.slice(1).map(Number);
    out.reservoirs[name.toLowerCase()] = {
      maxLevel: n[0], minLevel: n[1], level2yAgo: n[2], levelLastYear: n[3], level: n[4],
      liveMax: n[5], liveLastYear: n[6], live: n[7], pct: n[8],
      pctLastYear: Math.round((n[6] / n[5]) * 1000) / 10,
      years: yrs ? yrs.slice(1).map(Number) : null,
    };
  }
  const t = s.match(/TotalLiveStorage:?(\d{1,2}\.\d{3})(\d{1,2}\.\d{3})(\d{1,2}\.\d{3})(\d{1,3}(?:\.\d{1,2})?)%/);
  if (t) out.total = { liveMax: +t[1], liveLastYear: +t[2], live: +t[3], pct: +t[4], pctLastYear: Math.round((+t[2] / +t[1]) * 1000) / 10 };

  const flow = s.split(/2\.ReservoirStorage/)[0];
  let cursor = 0;
  const pos = STATIONS.map((name) => {
    const key = name.replace(/\s+/g, "");
    const i = flow.indexOf(key, cursor);
    if (i >= 0) cursor = i + key.length;
    return [name, i, key.length];
  });
  pos.forEach(([name, i, len], idx) => {
    if (i < 0) return;
    const next = pos.slice(idx + 1).find((p) => p[1] > i);
    const seg = flow.slice(i + len, next ? next[1] : undefined);
    const m = seg.match(CLASS_RE);
    out.stations[name] = m ? { cls: m[1], trend: m[2] || null } : { cls: null, trend: null };
  });
  const k = s.match(/Maximum(-?\d+\.\d)0C(-?\d+\.\d)0C(-?\d+\.\d)0CMinimum(-?\d+\.\d)0C(-?\d+\.\d)0C/);
  if (k) out.skardu = { maxLastYear: +k[1], max: +k[2], minLastYear: +k[4], min: +k[5] };
  return out;
}

async function pdfText(buf) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join(" ") : text;
}

// Newest "Annexure-I" report. FFC publishes daily in flood season (mid-June to mid-October) and only
// now and then outside it, so the report can be weeks old; its date is always returned.
export async function fetchFFC() {
  const list = await get("https://ffc.gov.pk/wp-json/wp/v2/media?search=Annexure-I&per_page=5&orderby=date&_fields=date,source_url", { ms: 15000 });
  for (const item of list || []) {
    if (!/\.pdf$/i.test(item.source_url || "")) continue;
    try {
      const parsed = parseFFC(await pdfText(await get(item.source_url, { type: "buffer", ms: 30000 })));
      if (Object.keys(parsed.reservoirs).length) return { ...parsed, url: item.source_url, published: item.date?.slice(0, 10) };
    } catch {}
  }
  throw new Error("no readable FFC report");
}

// ---------------------------------------------------------------- 4. ENSO
export function parseONI(text) {
  const rows = String(text).trim().split("\n").map((l) => l.trim().split(/\s+/)).filter((r) => r.length >= 4 && /^\d{4}$/.test(r[1]));
  const last = rows.slice(-4).map(([seas, yr, , anom]) => ({ season: `${seas} ${yr}`, oni: +anom }));
  const now = last.at(-1);
  if (!now) return null;
  const phase = now.oni >= 1.5 ? "strong_el_nino" : now.oni >= 0.5 ? "el_nino" : now.oni <= -1.5 ? "strong_la_nina" : now.oni <= -0.5 ? "la_nina" : "neutral";
  const yearAgo = rows.length >= 13 ? +rows[rows.length - 13][3] : null;
  return { ...now, phase, trend: Math.round((now.oni - last[0].oni) * 100) / 100, recent: last, oniYearAgo: yearAgo };
}
export async function fetchONI() {
  return parseONI(await get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", { type: "text", ms: 15000 }));
}

// ---------------------------------------------------------------- 5. next 16 days
export async function fetchShortRange(lat, lon) {
  await omThrottle(2);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: lat, longitude: lon, daily: "precipitation_sum", forecast_days: "16", timezone: "Asia/Karachi" });
  const j = await get(url.toString(), { ms: 15000 });
  const days = (j.daily?.time || []).map((d, i) => ({ date: d, mm: j.daily.precipitation_sum[i] ?? 0 }));
  return { total: Math.round(days.reduce((s, d) => s + d.mm, 0)), heavy: days.filter((d) => d.mm >= 50), max: days.reduce((m, d) => (d.mm > m.mm ? d : m), { mm: 0 }) };
}

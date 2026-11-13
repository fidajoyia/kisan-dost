// Flood outlook service: fetches live data (cached in layers), runs the model, adds a plain-language explanation.
//
// Cost-aware caching (free APIs, no keys):
//   past seasons (ERA5, last year + normal years) never change → cached ~30 days per calendar month
//   this season so far (ERA5)                                → 24 h
//   seasonal forecast (SEAS5 updates monthly)                → 12 h
//   FFC dam report 3 h · ENSO 24 h · 16-day forecast 3 h · Claude explanation 6 h
// A request never waits long for history: if a past season isn't cached yet it is fetched within a
// small time budget, otherwise the outlook is returned without it and the next request (or the daily
// cron) fills it in.
import { unstable_cache } from "next/cache";
import { BASINS, HISTORY_POINTS, riversNear, nearestStation, basinById } from "./rivers.js";
import { fetchSeasonal, fetchArchive, seasonWindows, fetchFFC, fetchONI, fetchShortRange } from "./sources.js";
import { basinOutlook, farmOutlook } from "./model.js";
import { fetchEasternInputs, easternOutlook } from "./eastern.js";
import { askClaudeJSON, langInstruction, hasAI } from "@/lib/claude";

const MONTHS_AHEAD = 7;
const NORMAL_YEARS = Number(process.env.FLOOD_NORMAL_YEARS || 4); // k = 2 … NORMAL_YEARS+1
const tag = ["flood"];
const settle = async (p) => { try { return { ok: true, v: await p }; } catch (e) { return { ok: false, e: e.cause?.code ? `${e.message} (${e.cause.code})` : e.message }; } };
const monthKey = () => new Date().toISOString().slice(0, 7);
const dayKey = () => new Date().toISOString().slice(0, 10);

const BASIN_SEASONAL_PTS = BASINS.flatMap((b) => b.catchment);
const BASIN_HISTORY_PTS = BASINS.flatMap((b) => b.catchment.slice(0, HISTORY_POINTS));

const seasonalCached = unstable_cache((ptsKey, pts) => fetchSeasonal(pts), ["flood-seasonal-v2"], { revalidate: 12 * 3600, tags: tag });
// one ERA5 window per cache entry; `stamp` = month for past seasons, day for this season
// (own tag, so the daily refresh doesn't throw away a month of fixed past data)
const windowCached = unstable_cache((ptsKey, stamp, k, pts, start, end) => fetchArchive(pts, start, end, 25000),
  ["flood-era5-v2"], { revalidate: 31 * 24 * 3600, tags: ["flood-history"] });
const ffcData = unstable_cache(() => fetchFFC(), ["flood-ffc-v2"], { revalidate: 3 * 3600, tags: tag });
const oniData = unstable_cache(() => fetchONI(), ["flood-oni-v2"], { revalidate: 24 * 3600, tags: tag });
const shortCached = unstable_cache((lat, lon) => fetchShortRange(lat, lon), ["flood-short-v2"], { revalidate: 3 * 3600, tags: tag });

// Fetch ERA5 windows one after another (they are the expensive part) within a time budget.
async function history(ptsKey, pts, budgetMs) {
  const t0 = Date.now();
  const wins = seasonWindows(new Date(), MONTHS_AHEAD, NORMAL_YEARS + 1);
  const out = {}, errors = [];
  for (const w of wins) {
    const left = budgetMs - (Date.now() - t0);
    if (left < 3000) { errors.push(`history k=${w.k} deferred`); continue; }
    const stamp = w.k === 0 ? dayKey() : monthKey();
    let r = await settle(windowCached(ptsKey, stamp, w.k, pts, w.start, w.end));
    // the free-tier guard said "wait": with time left (cron, background fill) wait for the next minute and retry
    while (!r.ok && /budget/.test(r.e) && budgetMs - (Date.now() - t0) > 35000) {
      await new Promise((res) => setTimeout(res, 30000));
      r = await settle(windowCached(ptsKey, stamp, w.k, pts, w.start, w.end));
    }
    if (r.ok) out[w.k] = r.v; else errors.push(`history k=${w.k}: ${r.e}`);
  }
  return { archive: out, errors };
}

function slice(list, from, n) { return list.slice(from, from + n); }
function sliceArchive(archive, from, n) {
  const out = {};
  for (const [k, pts] of Object.entries(archive || {})) out[k] = pts.slice(from, from + n);
  return out;
}

export async function buildOutlook({ lat, lon, historyBudgetMs = 40000 }) {
  const cellLat = Math.round(lat * 4) / 4, cellLon = Math.round(lon * 4) / 4; // ~25 km cell for the farm's own rain
  const local = [[cellLat, cellLon]];
  const [bS, lS, ffc, oni, sr] = await Promise.all([
    settle(seasonalCached("basins", BASIN_SEASONAL_PTS)), settle(seasonalCached(`local:${cellLat},${cellLon}`, local)),
    settle(ffcData()), settle(oniData()), settle(shortCached(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10)),
  ]);
  const bH = await history("basins", BASIN_HISTORY_PTS, historyBudgetMs * 0.75);
  const lH = await history(`local:${cellLat},${cellLon}`, local, historyBudgetMs * 0.25);

  const F = ffc.ok ? ffc.v : null, O = oni.ok ? oni.v : null;
  let basins = [];
  if (bS.ok) {
    let sOff = 0, hOff = 0;
    basins = BASINS.map((b) => {
      const n = b.catchment.length, h = Math.min(HISTORY_POINTS, n);
      const o = basinOutlook(b, { seasonalPts: slice(bS.v, sOff, n), archive: sliceArchive(bH.archive, hOff, h), ffc: F, oni: O });
      sOff += n; hOff += h;
      return o;
    });
  }
  const localO = lS.ok ? basinOutlook({ id: "local", ur: "مقامی بارش / اچانک سیلاب", en: "Local rain / flash floods", glacier: 0, dam: null },
    { seasonalPts: lS.v, archive: lH.archive, ffc: null, oni: O }) : null;
  if (!basins.length && !localO) throw new Error("seasonal forecast unavailable: " + (bS.e || lS.e));

  const near = riversNear(lat, lon).map((n) => ({ ...n, station: nearestStation(basinById(n.id), lat, lon) }));
  const farm = farmOutlook({ basins, local: localO, near, ffc: F, oni: O, shortRange: sr.ok ? sr.v : null });
  const historyComplete = !bH.errors.length && !lH.errors.length;
  return {
    updated: new Date().toISOString(),
    location: { lat, lon },
    near, farm, basins, local: localO,
    dams: F ? { date: F.date, url: F.url, reservoirs: F.reservoirs, total: F.total, skardu: F.skardu, stations: F.stations, snapshot: !!F.snapshot } : null,
    enso: O,
    status: {
      seasonal: bS.ok || lS.ok, history: historyComplete ? "complete" : Object.keys(bH.archive).length ? "partial" : "pending",
      ffc: ffc.ok, enso: oni.ok, shortRange: sr.ok,
      errors: [bS, lS, ffc, oni, sr].filter((x) => !x.ok).map((x) => x.e).concat(bH.errors, lH.errors),
    },
  };
}

// ---- plain-language explanation by Claude (optional; the app shows all numbers without it) ----
const EXPLAIN_SHAPE = `{"headline":"","summary":"","vs_last_year":"","actions":["",""],"watch":""}`;
function brief(o) {
  const main = o.basins.find((b) => b.id === o.farm.main) || o.local;
  return {
    farm_rivers: o.near.map((n) => `${basinById(n.id)?.en} (${n.km} km)`),
    overall: o.farm.overall, months: o.farm.months.map((m) => `${m.ym}: risk ${m.risk} (${m.level})${m.driver ? `, driver ${m.driver}` : ""}`),
    main_river: main && { name: main.en, factors: main.factors, condition: main.condition },
    local_rain: o.local?.factors?.rain,
    dams: o.dams && { report_date: o.dams.date, tarbela: o.dams.reservoirs.tarbela, mangla: o.dams.reservoirs.mangla, total: o.dams.total, skardu_temp: o.dams.skardu },
    enso: o.enso && { oni: o.enso.oni, phase: o.enso.phase, season: o.enso.season, oni_year_ago: o.enso.oniYearAgo },
    monsoon_in_forecast_window: o.farm.monsoonCovered, early_monsoon_signal: o.farm.monsoonSignal,
    next_16_days: o.farm.shortRange, gauge_today: o.farm.now,
  };
}
const explainCached = unstable_cache(async (key, lang, b) => {
  const prompt = `You are a flood-risk adviser for Pakistani farmers. Explain this seasonal flood outlook for one farm, using ONLY the numbers below. Do not invent figures.

${JSON.stringify(b)}

Rules: risk is 0–100 (low <30, moderate 30–54, high 55–74, severe ≥75). "condition" compares this year's flood-driving conditions with last year's (50 = normal). Rain % is versus normal. Dam storage is compared with the same day last year. A seasonal forecast is a probability guide, not a certainty. If the monsoon (Jun–Sep) is outside the forecast window, say it will firm up as the forecast extends, and say what snowpack, heat and El Niño / La Niña suggest. Always tell the farmer to follow official NDMA / PDMA / FFC warnings.

Write: headline (one short line), summary (2–3 simple sentences), vs_last_year (1–2 sentences: more extreme, similar or milder than last year, and why), actions (3–5 practical steps for this farm in the coming months), watch (which month to watch most and why).
${langInstruction(lang)}
Reply with ONLY one JSON object: ${EXPLAIN_SHAPE}`;
  return askClaudeJSON({ text: prompt, maxTokens: 1500 });
}, ["flood-explain-v2"], { revalidate: 6 * 3600, tags: tag });

// When history is incomplete, keep filling it after the response (works on a normal Node server;
// on serverless hosts the daily cron does this instead). One background fill at a time.
let filling = null;
function fillInBackground(lat, lon) {
  if (filling) return;
  const cellLat = Math.round(lat * 4) / 4, cellLon = Math.round(lon * 4) / 4;
  filling = (async () => {
    await history("basins", BASIN_HISTORY_PTS, 300000);
    await history(`local:${cellLat},${cellLon}`, [[cellLat, cellLon]], 120000);
  })().catch(() => {}).finally(() => { filling = null; });
}

// Chenab / Ravi / Sutlej: trained model + GloFAS flow forecast + Indian dams (same for every farm)
const easternCached = unstable_cache(async () => easternOutlook(await fetchEasternInputs()), ["flood-eastern-v1"], { revalidate: 6 * 3600, tags: tag });

export async function getOutlook(lat, lon, lang) {
  const o = await buildOutlook({ lat, lon });
  if (o.status.history !== "complete") fillInBackground(lat, lon);
  let explain = null;
  if (hasAI() && o.status.history !== "pending") {
    const key = `${Math.round(lat * 4) / 4},${Math.round(lon * 4) / 4}:${dayKey()}:${o.farm.overall?.risk}:${o.status.history}`;
    try { explain = await explainCached(key, lang, brief(o)); } catch {}
  }
  let eastern = null;
  try { eastern = await easternCached(); } catch (e) { eastern = { error: e.message }; }
  return { ...o, explain, eastern };
}

// Daily cron: fill every cache (generous budget, so first visitors of the day get complete history).
export async function warmFlood() {
  const o = await buildOutlook({ lat: 31.63, lon: 71.07, historyBudgetMs: 240000 });
  let eastern = "ok"; try { await easternCached(); } catch (e) { eastern = e.message; }
  return { history: o.status.history, errors: o.status.errors, eastern };
}

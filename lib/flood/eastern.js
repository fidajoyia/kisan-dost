// Eastern rivers (Chenab, Ravi, Sutlej): water that comes from India.
//  1. Our trained model (data/flood-model.json, scripts/flood-model): monthly flood probability at the
//     border station from rain / heat over the Indian catchment (ECMWF SEAS5 seasonal forecast) and the
//     river's flow now (GloFAS). Validated leave-one-year-out on 1997–2026.
//  2. GloFAS 7-month river-flow forecast at Marala, Jassar and Ganda Singh Wala (Copernicus, via Open-Meteo).
//  3. Indian dams upstream (CWC): Bhakra and Pong (Sutlej), Ranjit Sagar (Ravi). Not a model input
//     (history too short); a full dam in the monsoon raises the risk one step (lib/flood/summary.js).
import M from "../../data/flood-model.json";
import { omThrottle } from "./sources.js";
import { fetchIndiaDams } from "./india-dams.js";

export const EASTERN = {
  chenab: { ur: "دریائے چناب", en: "Chenab", station_ur: "مرالہ", dams: [] },
  ravi: { ur: "دریائے راوی", en: "Ravi", station_ur: "جسڑ", dams: ["thein"] },
  sutlej: { ur: "دریائے ستلج", en: "Sutlej", station_ur: "گنڈا سنگھ والا", dams: ["bhakra", "pong"] },
};
const RIVERS = Object.keys(EASTERN);
const sig = (z) => 1 / (1 + Math.exp(-z));
const l1p = (x) => Math.log1p(Math.max(0, Math.min(10, x)));

async function getJSON(url, ms = 45000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), cache: "no-store", headers: { "User-Agent": "KisanDost/1.4" } });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

export async function fetchEasternInputs() {
  const pts = RIVERS.flatMap((r) => M.catchment_points[r].map((p) => [r, ...p]));
  await omThrottle(Math.ceil(pts.length * 1.5));
  const sUrl = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${pts.map((p) => p[1]).join(",")}&longitude=${pts.map((p) => p[2]).join(",")}`
    + "&monthly=precipitation_mean,precipitation_anomaly,temperature_2m_anomaly&models=ecmwf_seas5_ensemble_mean&forecast_days=215";
  const cells = RIVERS.map((r) => M.station_cells[r]);
  await omThrottle(cells.length * 18);
  const gUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${cells.map((c) => c[0]).join(",")}&longitude=${cells.map((c) => c[1]).join(",")}`
    + "&daily=river_discharge&past_days=31&forecast_days=210";
  const [s, g, dams] = await Promise.all([getJSON(sUrl), getJSON(gUrl), fetchIndiaDams().catch((e) => ({ dams: [], errors: [e.message] }))]);
  const seasonal = {}; (Array.isArray(s) ? s : [s]).forEach((x, i) => { (seasonal[pts[i][0]] ||= []).push(x.monthly); });
  const glofas = {}; (Array.isArray(g) ? g : [g]).forEach((x, i) => { glofas[RIVERS[i]] = x.daily; });
  return { seasonal, glofas, dams, fetched: new Date().toISOString() };
}

const monthKey = (d) => d.slice(0, 7);
export function easternOutlook(inp, today = new Date()) {
  const todayStr = today.toISOString().slice(0, 10);
  const damById = Object.fromEntries((inp.dams?.dams || []).map((d) => [d.id, d]));
  const rivers = RIVERS.map((r) => {
    const sets = inp.seasonal[r] || [];
    const months = (sets[0]?.time || []).map((t, k) => {
      const vals = sets.map((m) => ({ mean: m.precipitation_mean?.[k], anom: m.precipitation_anomaly?.[k], ta: m.temperature_2m_anomaly?.[k] }));
      const ratios = vals.map((v) => (v.mean != null && v.anom != null && v.mean - v.anom > 0.05 ? v.mean / (v.mean - v.anom) : 1));
      return { month: t.slice(0, 7), pRatio: ratios.reduce((a, b) => a + b, 0) / ratios.length,
        tAnom: vals.reduce((a, v) => a + (v.ta ?? 0), 0) / vals.length };
    }).filter((m) => m.month >= todayStr.slice(0, 7)).slice(0, 7);

    const g = inp.glofas[r] || { time: [], river_discharge: [] };
    const byMonth = {};
    g.time.forEach((t, i) => { const v = g.river_discharge[i]; if (v == null) return; const k = monthKey(t); (byMonth[k] ||= { past: [], fut: [] })[t < todayStr ? "past" : "fut"].push(v); });
    const recent = g.time.map((t, i) => [t, g.river_discharge[i]]).filter(([t, v]) => t < todayStr && v != null).slice(-30).map(([, v]) => v);
    const nowMean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
    const clim = (mo) => M.clim_qmean[r][String(mo)];
    const thr = M.thr_m3s[r];

    let qPrevRatio = nowMean != null ? nowMean / clim(today.getUTCMonth() + 1) : 1;
    let pPrev = 1;
    const out = months.map((m) => {
      const mo = +m.month.slice(5, 7), monsoon = [7, 8, 9].includes(mo) ? 1 : 0;
      const x = { lp: l1p(m.pRatio), lpp: l1p(pPrev), lq: l1p(qPrevRatio), t_anom: m.tAnom, ls: l1p(1),
        lp_m: l1p(m.pRatio) * monsoon, lq_m: l1p(qPrevRatio) * monsoon, ms: Math.sin(2 * Math.PI * mo / 12), mc: Math.cos(2 * Math.PI * mo / 12),
        monsoon, is_chenab: +(r === "chenab"), is_ravi: +(r === "ravi"), is_sutlej: +(r === "sutlej") };
      const z = M.features.reduce((s, f, i) => s + M.coef[i] * ((x[f] - M.mu[i]) / M.sd[i]), M.intercept);
      const p = sig(z);
      const fut = byMonth[m.month]?.fut || [];
      const gPeak = fut.length ? Math.max(...fut) : null;
      // next month's starting state: GloFAS forecast mean for this month if we have it, else normal
      qPrevRatio = fut.length ? fut.reduce((a, b) => a + b, 0) / fut.length / clim(mo) : 1;
      pPrev = m.pRatio;
      return { month: m.month, p: Math.round(p * 100), rainPct: Math.round((m.pRatio - 1) * 100), tAnom: Math.round(m.tAnom * 10) / 10,
        glofasPeakPctOfFlood: gPeak != null ? Math.round((gPeak / thr) * 100) : null, glofasDays: fut.length };
    });
    const dams = EASTERN[r].dams.map((id) => damById[id]).filter(Boolean);
    return { id: r, ...EASTERN[r], months: out, dams, flowNowPctOfNormal: nowMean != null ? Math.round(nowMean / clim(today.getUTCMonth() + 1) * 100) : null };
  });
  return { rivers, model: { name: M.name, validation: M.validation, label: M.label, trained_on: M.trained_on },
    damsSource: inp.dams?.source, damErrors: inp.dams?.errors || [], fetched: inp.fetched };
}

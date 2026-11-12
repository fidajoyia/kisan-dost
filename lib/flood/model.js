// Flood outlook model (pure functions, no network) — Kisan Dost Feature 3.
//
// For every river basin and every month of the next 7 months it combines five signals,
// each scored 0–100 where 50 = a normal year:
//   rain   SEAS5 forecast rain anomaly over the catchment (% above / below the model's normal)
//   heat   SEAS5 temperature anomaly (°C): more heat = faster snow and glacier melt (glacier-fed rivers)
//   snow   snow / ice stored in the catchment: SEAS5 snow-water anomaly, or ERA5 snowfall so far this season
//   dam    FFC reservoir storage today vs the same day last year (fuller dams = less room to absorb a flood)
//   enso   NOAA ONI: La Niña tends to strengthen the monsoon, El Niño to weaken it (monsoon months only)
// Monthly risk = climatological flood hazard of that month × combined score.
// The same signals measured for last year give "this year vs last year".
import { BASINS, MONTH_HAZARD, MELT_MONTHS, MONSOON_MONTHS } from "./rivers.js";

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const r1 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);
const mean = (xs) => { const v = xs.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const sum = (xs) => xs.reduce((s, x) => s + (x ?? 0), 0);

export const scoreRain = (pct) => (pct == null ? 50 : clamp(50 + pct));
export const scoreHeat = (k) => (k == null ? 50 : clamp(50 + k * 15));
export const scoreSnow = (pct) => (pct == null ? 50 : clamp(50 + pct * 0.8));
export const scoreEnso = (oni) => (oni == null ? 50 : clamp(50 - oni * 12));
export function scoreDam(d) {
  if (!d || d.pct == null || d.pctLastYear == null) return null;
  return clamp(50 + (d.pct - d.pctLastYear) * 1.5 + Math.max(0, d.pct - 90) * 2);
}
export const level = (risk) => (risk >= 75 ? "severe" : risk >= 55 ? "high" : risk >= 30 ? "moderate" : "low");

// Words for an anomaly, used in the "this year vs last year" table.
export function rainLabel(p) { return p == null ? "unknown" : p >= 40 ? "extreme_high" : p >= 15 ? "above" : p > -15 ? "normal" : p > -40 ? "below" : "very_low"; }
export function heatLabel(k) { return k == null ? "unknown" : k >= 2 ? "extreme_high" : k >= 0.7 ? "above" : k > -0.7 ? "normal" : k > -2 ? "below" : "very_low"; }

// ---- helpers over API shapes ----
// seasonal: [{ time:[YYYY-MM-01…], precipitation_mean:[…], … }] one per catchment point
export function seasonalMonths(seasonalPts) {
  const t = seasonalPts?.[0]?.time || [];
  return t.map((ym, i) => {
    const v = (k) => mean(seasonalPts.map((p) => p?.[k]?.[i]));
    const rain = v("precipitation_mean"), anom = v("precipitation_anomaly");
    const swe = v("snow_depth_water_equivalent_mean"), sweA = v("snow_depth_water_equivalent_anomaly");
    const clim = rain != null && anom != null ? Math.max(0, rain - anom) : null;
    const sweClim = swe != null && sweA != null ? Math.max(0, swe - sweA) : null;
    return {
      ym: ym.slice(0, 7), m: +ym.slice(5, 7), rainMm: r1(rain), climMm: r1(clim), rainAnomMm: r1(anom),
      rainPct: clim > 5 ? r1((anom / clim) * 100) : null,
      tempK: r1(v("temperature_2m_anomaly")), tempC: r1(v("temperature_2m_mean")),
      sweMm: r1(swe), swePct: sweClim > 20 ? r1((sweA / sweClim) * 100) : null,
    };
  });
}

// ERA5 daily → totals for the calendar months `months` (YYYY-MM), shifted back k years.
function monthsFromDaily(dailyPts, months, k) {
  const want = new Set(months.map((ym) => `${+ym.slice(0, 4) - k}${ym.slice(4)}`));
  const per = dailyPts.map((d) => {
    let rain = 0, tsum = 0, tn = 0, has = false;
    (d?.time || []).forEach((t, i) => {
      if (!want.has(t.slice(0, 7))) return;
      has = true; rain += d.precipitation_sum?.[i] ?? 0;
      const tm = d.temperature_2m_mean?.[i]; if (tm != null) { tsum += tm; tn++; }
    });
    return has ? { rain, temp: tn ? tsum / tn : null } : null;
  }).filter(Boolean);
  if (!per.length) return null;
  return { rain: mean(per.map((x) => x.rain)), temp: mean(per.map((x) => x.temp)) };
}
// Snowfall (cm) and rain (mm) from 1 Oct for the first n days of the season.
function toDate(dailyPts, n) {
  const per = dailyPts.map((d) => ({ snow: sum((d?.snowfall_sum || []).slice(0, n)), rain: sum((d?.precipitation_sum || []).slice(0, n)) }));
  return per.length ? { snow: mean(per.map((x) => x.snow)), rain: mean(per.map((x) => x.rain)) } : null;
}
const pctVs = (x, base) => (x == null || base == null || base <= 0.5 ? null : r1(((x - base) / base) * 100));

// archive: { 0:[daily per point], 1:[…], 2:[…], … }
export function historyFactors(archive, months) {
  const ks = Object.keys(archive || {}).map(Number).filter((k) => k >= 2 && archive[k]);
  const ly = archive?.[1] ? monthsFromDaily(archive[1], months, 1) : null;
  const normals = ks.map((k) => monthsFromDaily(archive[k], months, k)).filter(Boolean);
  const nRain = mean(normals.map((x) => x.rain)), nTemp = mean(normals.map((x) => x.temp));
  const n0 = archive?.[0]?.[0]?.time?.length || 0;
  const cur = n0 && archive[0] ? toDate(archive[0], n0) : null;
  const lyTD = n0 && archive?.[1] ? toDate(archive[1], n0) : null;
  const nTD = ks.map((k) => toDate(archive[k], n0)).filter(Boolean);
  const nSnow = mean(nTD.map((x) => x.snow)), nRainTD = mean(nTD.map((x) => x.rain));
  return {
    lastYearRainMm: r1(ly?.rain), normalRainMm: r1(nRain), lastYearRainPct: pctVs(ly?.rain, nRain),
    lastYearTempK: ly?.temp != null && nTemp != null ? r1(ly.temp - nTemp) : null,
    seasonDays: n0,
    snowToDateCm: r1(cur?.snow), snowToDateLastYearCm: r1(lyTD?.snow), snowToDateNormalCm: r1(nSnow),
    snowToDatePct: pctVs(cur?.snow, nSnow), snowToDateLastYearPct: pctVs(lyTD?.snow, nSnow),
    rainToDateMm: r1(cur?.rain), rainToDateLastYearMm: r1(lyTD?.rain), rainToDatePct: pctVs(cur?.rain, nRainTD),
    normalYears: ks.length,
  };
}

// ---- one basin ----
export function basinOutlook(basin, { seasonalPts, archive, ffc, oni }) {
  const months = seasonalMonths(seasonalPts);
  const hist = historyFactors(archive, months.map((x) => x.ym));
  const g = basin.glacier || 0;
  const res = basin.dam ? ffc?.reservoirs?.[basin.dam] : null;
  const dam = res ? { key: basin.dam, ...res, date: ffc.date, score: scoreDam(res) } : null;

  const climTot = sum(months.map((x) => x.climMm)), anomTot = sum(months.map((x) => x.rainAnomMm));
  const rainPct = climTot > 5 ? r1((anomTot / climTot) * 100) : null;
  const tempK = r1(mean(months.map((x) => x.tempK)));
  const meltK = r1(mean(months.filter((x) => MELT_MONTHS.includes(x.m)).map((x) => x.tempK)));
  const peakSwe = months.reduce((b, x) => (x.swePct != null && (b == null || (x.sweMm ?? 0) > (b.sweMm ?? 0)) ? x : b), null);
  const snowPct = peakSwe?.swePct ?? hist.snowToDatePct;

  const monthly = months.map((x) => {
    const melt = MELT_MONTHS.includes(x.m), monsoon = MONSOON_MONTHS.includes(x.m);
    const parts = [
      ["rain", scoreRain(x.rainPct ?? rainPct), 0.45],
      ["heat", scoreHeat(x.tempK), g * (melt ? 0.35 : 0.1)],
      ["snow", scoreSnow(x.swePct ?? hist.snowToDatePct), g * ([4, 5, 6, 7].includes(x.m) ? 0.3 : 0.15)],
      ["dam", dam?.score ?? null, dam?.score != null ? 0.15 : 0],
      ["enso", scoreEnso(oni?.oni), monsoon && oni ? 0.15 : 0],
    ].filter(([, s, w]) => s != null && w > 0);
    const W = sum(parts.map((p) => p[2]));
    const score = Math.round(sum(parts.map(([, s, w]) => s * w)) / W);
    const risk = Math.round(MONTH_HAZARD[x.m - 1] * score);
    const top = parts.map(([k, s, w]) => [k, (s - 50) * w]).sort((a, b) => b[1] - a[1])[0];
    return { ...x, score, risk, level: level(risk), driver: top && top[1] > 2 ? top[0] : null };
  });

  // Season-wide condition index (no month hazard): how unusual this year is, and the same for last year.
  const idx = (r, k, s, d, e) => {
    const parts = [[scoreRain(r), 0.45], [scoreHeat(k), 0.25 * g], [scoreSnow(s), 0.25 * g], [d, d != null ? 0.15 : 0], [scoreEnso(e), e != null ? 0.15 : 0]].filter(([, w]) => w > 0);
    return Math.round(sum(parts.map(([v, w]) => v * w)) / sum(parts.map(([, w]) => w)));
  };
  const thisYear = idx(rainPct, meltK ?? tempK, snowPct, dam?.score ?? null, oni?.oni ?? null);
  const lastYear = idx(hist.lastYearRainPct, hist.lastYearTempK, hist.snowToDateLastYearPct, null, oni?.oniYearAgo ?? null);
  const diff = thisYear - lastYear;
  const peak = monthly.reduce((b, x) => (!b || x.risk > b.risk ? x : b), null);

  return {
    id: basin.id, ur: basin.ur, en: basin.en, glacier: g,
    months: monthly, peak: peak && { ym: peak.ym, risk: peak.risk, level: peak.level, driver: peak.driver },
    factors: {
      rain: { forecastPct: rainPct, label: rainLabel(rainPct), forecastMm: r1(sum(months.map((x) => x.rainMm))), normalMm: r1(climTot), lastYearPct: hist.lastYearRainPct, lastYearLabel: rainLabel(hist.lastYearRainPct), lastYearMm: hist.lastYearRainMm, rainToDatePct: hist.rainToDatePct },
      heat: { forecastK: tempK, meltSeasonK: meltK, label: heatLabel(meltK ?? tempK), lastYearK: hist.lastYearTempK, lastYearLabel: heatLabel(hist.lastYearTempK), applies: g >= 0.15 },
      snow: { forecastSwePct: peakSwe?.swePct ?? null, peakMonth: peakSwe?.ym ?? null, toDatePct: hist.snowToDatePct, toDateCm: hist.snowToDateCm, lastYearToDatePct: hist.snowToDateLastYearPct, lastYearToDateCm: hist.snowToDateLastYearCm, normalToDateCm: hist.snowToDateNormalCm, applies: g >= 0.15 },
      dam,
    },
    condition: { thisYear, lastYear, diff, verdict: diff >= 8 ? "more_extreme" : diff <= -8 ? "milder" : "similar" },
    normalYears: hist.normalYears,
  };
}

// ---- everything for one farm ----
// near: [{id, km}] rivers near the farm; local: basin-shaped object for the farm's own rain (flash floods)
export function farmOutlook({ basins, local, near, ffc, oni, shortRange, today = new Date() }) {
  const nearIds = near.map((n) => n.id);
  const mine = [...basins.filter((b) => nearIds.includes(b.id)), local].filter(Boolean);
  const months = (local || basins[0])?.months.map((m, i) => {
    const rows = mine.map((b) => ({ id: b.id, ...b.months[i] })).filter((x) => x.risk != null);
    const top = rows.reduce((a, x) => (!a || x.risk > a.risk ? x : a), null);
    return top ? { ym: m.ym, m: m.m, risk: top.risk, level: top.level, source: top.id, driver: top.driver } : { ym: m.ym, m: m.m, risk: 0, level: "low" };
  }) || [];
  const peak = months.reduce((b, x) => (!b || x.risk > b.risk ? x : b), null);
  // "Main" river = the nearest real river (hill torrents and local rain only when there is no river).
  const byNear = (b) => near.findIndex((n) => n.id === b.id);
  const main = mine.filter((b) => b.id !== "local" && b.id !== "torrents").sort((a, b) => byNear(a) - byNear(b))[0]
    || mine.find((b) => b.id === "torrents") || local;

  // Short range: today's flood class at the nearest gauge (only if the FFC report is ≤ 2 days old) + next 16 days rain.
  const ageDays = ffc?.date ? Math.round((today - new Date(ffc.date + "T06:00:00+05:00")) / 864e5) : null;
  const now = near.map((n) => {
    const st = n.station; const s = st && ffc?.stations?.[st.name];
    return st ? { river: n.id, station: st.name, km: st.km, cls: ageDays != null && ageDays <= 2 ? s?.cls ?? null : null, trend: s?.trend ?? null } : null;
  }).filter(Boolean);
  const monthsCovered = months.map((x) => x.m);
  const monsoonCovered = monthsCovered.some((m) => MONSOON_MONTHS.includes(m));
  // Early monsoon signal (only when Jul–Sep is beyond the 7-month forecast): snow stored upstream,
  // spring heat (melt), and El Niño / La Niña. Low confidence by design: ENSO often changes by summer.
  let monsoonSignal = null;
  if (!monsoonCovered && main) {
    const g = main.glacier || 0, f = main.factors;
    const parts = [
      [scoreSnow(f.snow.forecastSwePct ?? f.snow.toDatePct), 0.35 * g],
      [scoreHeat(f.heat.meltSeasonK ?? f.heat.forecastK), 0.25 * g],
      [scoreEnso(oni?.oni), oni ? 0.25 : 0],
      [scoreRain(f.rain.forecastPct), 0.1], // winter / spring rain says little about the monsoon
    ].filter(([v, w]) => v != null && w > 0);
    const W = sum(parts.map((p) => p[1]));
    const score = W ? Math.round(sum(parts.map(([v, w]) => v * w)) / W) : 50;
    monsoonSignal = { score, tendency: score >= 60 ? "above" : score <= 40 ? "below" : "normal", confidence: "low", enso: oni?.phase ?? null };
  }
  return {
    overall: peak ? { risk: peak.risk, level: peak.level, ym: peak.ym, source: peak.source, driver: peak.driver } : null,
    months, main: main?.id || null,
    condition: main?.condition || null,
    monsoonCovered, monsoonSignal,
    shortRange: shortRange ? { totalMm: shortRange.total, heavyDays: shortRange.heavy, maxDay: shortRange.max, flag: shortRange.heavy.length ? (shortRange.max.mm >= 100 ? "danger" : "watch") : "none" } : null,
    now, ffcAgeDays: ageDays,
  };
}

export { BASINS };

// Does the farm's weather look like the weather where the variety was proven?
// Monthly mean temperature over the crop's own months in Pakistan (crops.js `grow`), farm vs trial region.
// Both from the same source (NASA POWER 2001–2020 normals), so the comparison is like-for-like.
import PC from "../../data/place-climate.json";
import { placeById } from "./places.js";
import { cropById } from "./crops.js";

const M = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export async function fetchFarmClimate(lat, lon) {
  const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`;
  const r = await fetch(u, { signal: AbortSignal.timeout(30000), cache: "no-store", headers: { "User-Agent": "KisanDost/1.4" } });
  if (!r.ok) throw new Error(`NASA POWER ${r.status}`);
  const j = await r.json();
  const t = j.properties.parameter.T2M, rain = j.properties.parameter.PRECTOTCORR;
  return { t: M.map((m) => t[m]), rain: M.map((m) => rain[m]) };
}

// sim 0–100: 100 = same temperatures month by month; every 1 °C of average difference costs 12 points
export function climateMatch(cropId, placeIds, farm) {
  const crop = cropById(cropId);
  if (!crop?.grow || !farm || !placeIds?.length) return null;
  let best = null;
  for (const id of placeIds.slice(0, 3)) {
    const pc = PC.places[id], place = placeById(id);
    if (!pc || !place) continue;
    const diffs = crop.grow.map((m) => farm.t[m - 1] - pc.t[m - 1]);
    const absAvg = diffs.reduce((s, d) => s + Math.abs(d), 0) / diffs.length;
    const warmer = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    const rainFarm = crop.grow.reduce((s, m) => s + farm.rain[m - 1] * 30.4, 0), rainTrial = crop.grow.reduce((s, m) => s + pc.rain[m - 1] * 30.4, 0);
    const sim = Math.max(0, Math.min(100, Math.round(100 - 12 * absAvg)));
    const r = { place: id, ur: place.ur, en: place.en, sim, warmer: Math.round(warmer * 10) / 10,
      farmT: Math.round(crop.grow.reduce((s, m) => s + farm.t[m - 1], 0) / crop.grow.length * 10) / 10,
      trialT: Math.round(crop.grow.reduce((s, m) => s + pc.t[m - 1], 0) / crop.grow.length * 10) / 10,
      rainFarm: Math.round(rainFarm), rainTrial: Math.round(rainTrial), months: crop.grow };
    if (!best || r.sim > best.sim) best = r;
  }
  return best;
}

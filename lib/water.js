// River flows at every headworks, barrage and dam, and the water taken into canals there.
// Source: Pakistan Meteorological Department, Flood Forecasting Division (FFD) Lahore, daily flood bulletin
// (public page https://ffd.pmd.gov.pk/bulletin). FFD issues it every day from 15 June to mid-October; outside
// the flood season the newest bulletin is the last one of the season, so its date is always shown.
// If the page cannot be reached, the saved copy in data/ffd-latest.json is used (scripts/update-ffd.mjs).
import { unstable_cache } from "next/cache";
import { HEADWORKS } from "./headworks.js";
import { URL_BULLETIN, bulletinText, parseBulletin } from "./water-parse.mjs";

async function fetchLive() {
  const r = await fetch(URL_BULLETIN, { headers: { "User-Agent": "KisanDost/1.5 (farm advisory app; daily river flows)" }, signal: AbortSignal.timeout(25000), cache: "no-store" });
  if (!r.ok) throw new Error(`ffd ${r.status}`);
  const p = parseBulletin(bulletinText(await r.text()));
  if (Object.keys(p.stations).length < 10) throw new Error("ffd bulletin table not found");
  return p;
}

async function load() {
  try { return { ...(await fetchLive()), source: "live" }; } catch (e) {
    const snap = await import("../data/ffd-latest.json").then((m) => m.default || m).catch(() => null);
    if (snap?.stations) return { ...snap, source: "saved", liveError: e.message };
    throw e;
  }
}
const cached = unstable_cache(load, ["kd-water-v1"], { revalidate: 3 * 3600, tags: ["water"] });

const ageDays = (date) => (date ? Math.max(0, Math.round((Date.now() - Date.parse(date + "T06:00:00+05:00")) / 864e5)) : null);

// Every headworks with its flows; at barrages the water taken into canals = inflow − outflow.
export async function getWater() {
  const b = await cached();
  const list = HEADWORKS.map((h) => {
    const s = b.stations[h.id];
    const canal = s && h.kind === "barrage" && h.canals.length ? Math.max(0, s.inflow - s.outflow) : null;
    return { id: h.id, ur: h.ur, river: h.river, kind: h.kind, lat: h.lat, lon: h.lon, canals: h.canals,
      inflow: s?.inflow ?? null, outflow: s?.outflow ?? null, toCanals: canal, level: s?.level ?? null, forecast: s?.forecast ?? null };
  });
  return { date: b.date, ageDays: ageDays(b.date), season: b.season, situation: b.situation, reservoirs: b.reservoirs,
    source: b.source, url: URL_BULLETIN, stations: list };
}

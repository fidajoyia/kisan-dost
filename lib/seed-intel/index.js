// Seed intelligence engine: automatically researches, compares and recommends seed varieties from the
// world's top agricultural institutions, crop by crop, for one farm.
//
// 1. Official cultivar registrations (Journal of Plant Registrations, via the free Crossref API): every
//    variety a top institution released, with trial yield vs check varieties, maturity, resistances.
//    Credited only to the institution that developed / released it.       → cached 7 days per institution
// 2. Where each variety was tested (places.js) and how that climate compares with the farm's over the
//    crop's months (climate.js, NASA POWER normals).
// 3. Scoring for this farm (score.js): weather match, yield vs checks, disease resistance, winter habit,
//    land type (normal / sem / rait). "Best" only if proven in weather like the farm's AND higher yield.
import { unstable_cache } from "next/cache";
import { INSTITUTIONS, instById } from "./institutions.js";
import { CROPS, cropById } from "./crops.js";
import { candidateFrom } from "./extract.js";
import { rankCandidates } from "./score.js";
import { fetchArchive } from "@/lib/flood/sources";
import { fetchFarmClimate, climateMatch } from "./climate.js";

const TAG = ["seeds"];
const UA = { "User-Agent": `KisanDost/1.3 (seed research${process.env.CROSSREF_MAILTO ? `; mailto:${process.env.CROSSREF_MAILTO}` : ""})` };
const JPR_ISSN = "1936-5209"; // Journal of Plant Registrations

// Crossref's public pool allows few parallel list queries, so requests go one at a time with back-off.
let chain = Promise.resolve();
function crossref(url) {
  const run = async () => {
    let last;
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(45000), cache: "no-store" });
        if (r.ok) return await r.json();
        last = `crossref ${r.status}`;
        if (r.status !== 429 && r.status < 500) break;
      } catch (e) { last = e.message; }
      await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
    }
    throw new Error(last || "crossref unavailable");
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

// All released cultivars of one institution since 2010 (registrations are dated; older ones still count).
const registrationsOf = unstable_cache(async (instId) => {
  const inst = instById(instId);
  const out = [];
  for (let offset = 0; offset < 600; offset += 100) {
    const url = new URL("https://api.crossref.org/works");
    url.search = new URLSearchParams({
      "query.affiliation": inst.aff, filter: `issn:${JPR_ISSN},from-pub-date:2010`, rows: "100", offset: String(offset),
      select: "DOI,title,abstract,author,published",
    });
    const j = await crossref(url.toString());
    const items = j?.message?.items || [];
    for (const w of items) { const c = candidateFrom(w); if (c && c.inst.includes(instId)) out.push(c); }
    if (items.length < 100) break;
  }
  return out;
}, ["seed-registrations-v4"], { revalidate: 7 * 86400, tags: TAG });

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch((e) => ({ error: e.message })); } }));
  return out;
}

// Not cached as a whole: each institution is cached on its own, so one failure never freezes a
// partial list for a week; the next request simply retries the missing institutions.
export async function allRegistrations() {
  const res = await pool(INSTITUTIONS, 2, (i) => registrationsOf(i.id));
  const byDoi = new Map(), errors = [];
  res.forEach((r, k) => { if (Array.isArray(r)) r.forEach((c) => byDoi.set(c.doi, { ...c, inst: [...new Set([...(byDoi.get(c.doi)?.inst || []), ...c.inst])] })); else errors.push(`${INSTITUTIONS[k].short}: ${r.error}`); });
  if (!byDoi.size) throw new Error("no registrations reachable: " + errors.join("; "));
  return { list: [...byDoi.values()], errors, built: new Date().toISOString() };
}

// Last winter's mean temperature at the farm (Dec–Feb, ERA5): decides if winter-type cereals can work.
const farmClimate = unstable_cache((lat, lon) => fetchFarmClimate(lat, lon), ["seed-farm-climate-v1"], { revalidate: 180 * 86400, tags: TAG });

const winterMean = unstable_cache(async (lat, lon) => {
  const now = new Date(); const y = now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const [d] = await fetchArchive([[lat, lon]], `${y - 1}-12-01`, `${y}-02-28`);
  const t = (d?.temperature_2m_mean || []).filter((v) => v != null);
  return t.length ? Math.round((t.reduce((s, v) => s + v, 0) / t.length) * 10) / 10 : null;
}, ["seed-winter-v1"], { revalidate: 30 * 86400, tags: TAG });

export async function cropCounts() {
  const all = await allRegistrations();
  const counts = Object.fromEntries(CROPS.map((c) => [c.id, 0]));
  all.list.forEach((c) => { counts[c.crop] = (counts[c.crop] || 0) + 1; });
  return { counts, built: all.built, errors: all.errors };
}

export async function recommend({ crop, lat, lon, zone = "normal", band = null }) {
  const all = await allRegistrations();
  const base = all.list.filter((c) => c.crop === crop);
  const cellLat = Math.round(lat * 4) / 4, cellLon = Math.round(lon * 4) / 4;
  let wm = null; try { wm = await winterMean(cellLat, cellLon); } catch {}
  let fc = null; try { fc = await farmClimate(Math.round(lat * 2) / 2, Math.round(lon * 2) / 2); } catch {}
  const ctx = { zone, band, winterMean: wm, farmClimate: !!fc };
  const withClimate = (xs) => xs.map((c) => ({ ...c, climate: climateMatch(crop, c.places, fc) }));
  let ranked = rankCandidates(withClimate(base), ctx);
  ranked = ranked.map((c) => ({ ...c, seller: c.seller || (c.seedBy ? { name: c.seedBy, url: null } : c.institutions[0]?.seed && (!/\((\w+)\)$/.test(c.institutions[0].seed) || c.institutions[0].seed.endsWith(`(${crop})`)) ? { name: c.institutions[0].seed, url: c.institutions[0].web } : { name: c.institutions[0]?.name_en, url: c.institutions[0]?.web }) }));
  // No verdict: every variety with its facts; the farmer sorts, filters and compares on the phone.
  return {
    crop, ctx, updated: all.built, researched: null,
    total: ranked.length, candidates: ranked.slice(0, 80),
    sources: { registrations: base.length },
    errors: all.errors,
  };
}

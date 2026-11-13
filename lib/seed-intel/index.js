// Seed intelligence engine: automatically researches, compares and recommends seed varieties from the
// world's top agricultural institutions, crop by crop, for one farm.
//
// 1. Official cultivar registrations (Journal of Plant Registrations, via the free Crossref API): every
//    variety a top institution released, with trial yield vs check varieties, maturity, resistances.
//    Credited only to the institution that developed / released it.       → cached 7 days per institution
// 2. Automatic web research by Claude (only if ANTHROPIC_API_KEY is set), once a week per crop:
//    where each seed is sold / licensed, whether it is available in Pakistan, and extra varieties from
//    institutions that don't publish there (China Agricultural Univ., Wageningen, SLU, ETH, Ghent, NMBU…).
//    Every web fact must carry a source URL or it is dropped.               → cached 7 days per crop
// 3. Scoring for this farm (lib/seed-intel/score.js): yield, disease resistance, fit to local winter,
//    heat and land type (normal / sem / rait), recency, strength of evidence.  → computed per request
import { unstable_cache } from "next/cache";
import { INSTITUTIONS, instById } from "./institutions.js";
import { CROPS, cropById } from "./crops.js";
import { candidateFrom } from "./extract.js";
import { rankCandidates } from "./score.js";
import { askClaudeJSON, hasAI } from "@/lib/claude";
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

// ---- weekly web research per crop (Claude + web search) ----
const RESEARCH_SHAPE = `{"availability":[{"id":"","seller":"","seller_url":"","sold_outside_us":"yes|no|unknown","pakistan":"registered|sold|not_found","pakistan_note":"","source_url":""}],"extra":[{"name":"","institution":"","year":0,"type":"","yield_pct_vs_check":null,"yield_note":"","maturity":"early|medium|late|","resistant":[""],"tolerant":["heat|drought|salt|flood|cold"],"habit":"spring|winter|","seller":"","seller_url":"","source_url":""}]}`;
const researchCrop = unstable_cache(async (cropId, top) => {
  const crop = cropById(cropId);
  const insts = INSTITUTIONS.map((i) => `${i.id} = ${i.name_en} (rank ${i.rank})`).join("; ");
  const prompt = `You research seed varieties for farmers. Crop: ${crop.en}.
Institutions (id = name): ${insts}

A) For each variety below, find who sells or licenses the seed (official seller / foundation seed programme / licensee, with its web page), whether seed is sold outside the USA, and whether it is registered or sold in Pakistan.
${top.map((c) => `- id=${c.id} | ${c.name} | ${c.inst.map((i) => instById(i)?.short).join(", ")} | ${c.year}`).join("\n")}

B) Find up to 6 MORE ${crop.en} varieties bred or released since 2015 by the institutions above that are NOT in list A, especially China Agricultural University, Wageningen, SLU, ETH Zurich, Ghent, NMBU, UBC, Guelph, Cornell, Purdue, UC Davis, Iowa State. Give the facts the source states: year, type, yield advantage over check varieties (%), maturity, disease resistance, heat/drought/salt/flood tolerance, spring/winter habit for cereals, and the seller.

Strict rules: use only facts stated on a page you found; every item needs source_url (the page); leave a field empty if not stated; never guess a number. institution must be one of the ids above.
Reply with ONLY one JSON object: ${RESEARCH_SHAPE}`;
  const j = await askClaudeJSON({ text: prompt, maxTokens: 5000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }] });
  const ok = (u) => typeof u === "string" && /^https?:\/\//.test(u);
  const availability = Object.fromEntries((j.availability || []).filter((a) => a.id && (ok(a.seller_url) || ok(a.source_url))).map((a) => [a.id, a]));
  const extra = (j.extra || []).filter((x) => x.name && ok(x.source_url) && instById(x.institution)).map((x) => ({
    id: `web:${x.institution}:${x.name}`, doi: null, link: x.source_url, name: x.name, crop: cropId, inst: [x.institution],
    year: x.year || null, released: x.year || null, title: x.name, summary: x.yield_note || "", source: "web",
    yieldPct: typeof x.yield_pct_vs_check === "number" ? x.yield_pct_vs_check : null, yieldClaim: typeof x.yield_pct_vs_check === "number" ? "higher" : null,
    yieldNote: x.yield_note || null, maturity: x.maturity || null, daysEarlier: null, resistant: (x.resistant || []).filter(Boolean), moderate: [],
    tol: Object.fromEntries(["heat", "drought", "salt", "flood", "cold", "acid", "sand"].map((k) => [k, (x.tolerant || []).includes(k)])),
    habit: x.habit || null, quality: [], adapted: null, pi: null, regNo: null, seedBy: x.seller || null, pvp: false, type: x.type || null,
    seller: x.seller ? { name: x.seller, url: ok(x.seller_url) ? x.seller_url : null } : null,
  }));
  return { availability, extra, researched: new Date().toISOString() };
}, ["seed-research-v1"], { revalidate: 7 * 86400, tags: TAG });

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
  let research = null, researchError = null;
  if (hasAI() && process.env.SEED_WEB_RESEARCH !== "0") {
    // research the strongest candidates (neutral context, so one weekly result serves every farm)
    const top = rankCandidates(base, {}).slice(0, 8).map((c) => ({ id: c.id, name: c.name, inst: c.inst, year: c.year }));
    try { research = await researchCrop(crop, top); } catch (e) { researchError = e.message; }
    if (research) {
      ranked = rankCandidates(withClimate([...base, ...research.extra]), ctx).map((c) => {
        const a = research.availability[c.id];
        return a ? { ...c, seller: { name: a.seller, url: a.seller_url || null }, soldOutsideUS: a.sold_outside_us, pakistan: a.pakistan, pakistanNote: a.pakistan_note, availabilitySource: a.source_url || a.seller_url } : c;
      });
    }
  }
  ranked = ranked.map((c) => ({ ...c, seller: c.seller || (c.seedBy ? { name: c.seedBy, url: null } : c.institutions[0]?.seed && (!/\((\w+)\)$/.test(c.institutions[0].seed) || c.institutions[0].seed.endsWith(`(${crop})`)) ? { name: c.institutions[0].seed, url: c.institutions[0].web } : { name: c.institutions[0]?.name_en, url: c.institutions[0]?.web }) }));
  // Farmer protection: "best" only if it was proven in weather like this farm's AND its registration
  // reports more yield than the check varieties. Otherwise no recommendation, only the comparison.
  const safe = (c) => c.climate?.sim >= 70 && (c.yieldPct > 0 || c.yieldClaim === "higher") && !c.why.some((w) => w.k === "needs_cold");
  const best = ranked.find(safe) || null;
  return {
    crop, ctx, updated: all.built, researched: research?.researched || null,
    total: ranked.length, best, closest: best ? null : ranked[0] || null, candidates: ranked.slice(0, 15), safeCount: ranked.filter(safe).length,
    sources: { registrations: base.length, web: research?.extra?.length || 0 },
    errors: [...all.errors, ...(researchError ? [`web research: ${researchError}`] : [])],
  };
}

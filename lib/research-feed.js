// Automatic research feed: pulls the newest papers and news from the world top-10 agricultural
// institutions in lib/research-centers.js, then (optionally) has Claude explain each one for farmers.
//
// Sources (all free; every one is optional and failure-tolerant):
//  1. Europe PMC REST API (no key): newest crop/soil papers with an author from each institution.
//  2. Official RSS/Atom feeds listed per institution (add more with RESEARCH_FEEDS).
//  3. Google News RSS per institution: keyless news coverage.
//  4. OpenAlex scholarly index: only if OPENALEX_API_KEY is set (free key from openalex.org).
// Extra feeds can be added without code changes: RESEARCH_FEEDS='[{"center":"icba","url":"https://…/rss"}]'
import { CENTERS, detectCenter } from "@/lib/research-centers";

const UA = "KisanDost/1.1 (farm advisory app; research digest)";
const MAX_AGE_DAYS = Number(process.env.RESEARCH_MAX_AGE_DAYS || 180);

// ---------- helpers ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
export const stripHtml = (s = "") => decode(decode(s)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
};
const attr = (block, name, a) => {
  const m = block.match(new RegExp(`<${name}[^>]*\\s${a}="([^"]+)"`, "i"));
  return m ? decode(m[1]) : "";
};

export function hashId(s = "") {
  let h = 2166136261;
  for (const ch of s.toLowerCase().replace(/[^a-z0-9]+/g, "")) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function toISO(d) {
  const t = Date.parse(d);
  return isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

async function fetchText(url, ms = 9000) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/json, text/xml, */*" }, signal: AbortSignal.timeout(ms), cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

// ---------- RSS / Atom ----------
export function parseFeed(xml = "") {
  const out = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const it of items) {
    out.push({
      title: stripHtml(tag(it, "title")),
      link: stripHtml(tag(it, "link")) || attr(it, "guid", "href"),
      date: toISO(stripHtml(tag(it, "pubDate")) || stripHtml(tag(it, "dc:date"))),
      summary: stripHtml(tag(it, "description")).slice(0, 600),
      publisher: stripHtml(tag(it, "source")),
    });
  }
  const entries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const e of entries) {
    out.push({
      title: stripHtml(tag(e, "title")),
      link: attr(e, "link", "href"),
      date: toISO(stripHtml(tag(e, "updated")) || stripHtml(tag(e, "published"))),
      summary: stripHtml(tag(e, "summary") || tag(e, "content")).slice(0, 600),
    });
  }
  return out.filter((x) => x.title && x.link);
}

// ---------- Europe PMC (open scholarly index, no key) ----------
// Newest crop / soil / agronomy papers with an author from each top-10 institution.
const TOPIC = '(crop OR wheat OR rice OR maize OR potato OR tomato OR seed OR soil OR irrigation OR salinity OR "heat stress" OR drought OR agronomy)';
export function parseEuropePMC(j) {
  return (j?.resultList?.result || []).map((r) => ({
    title: stripHtml(r.title || "").replace(/\.$/, ""),
    link: r.doi ? `https://doi.org/${r.doi}` : r.pmid ? `https://europepmc.org/article/MED/${r.pmid}` : r.id ? `https://europepmc.org/article/${r.source}/${r.id}` : "",
    date: toISO(r.firstPublicationDate || r.pubYear),
    summary: stripHtml(r.abstractText || "").slice(0, 700),
    journal: r.journalTitle || r.journalInfo?.journal?.title || "",
  })).filter((x) => x.title && x.link);
}

async function fromEuropePMC() {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const until = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const out = [];
  await Promise.allSettled(CENTERS.map(async (c) => {
    const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
    url.search = new URLSearchParams({
      query: `AFF:"${c.aff}" AND ${TOPIC} AND FIRST_PDATE:[${since} TO ${until}]`,
      resultType: "core", format: "json", pageSize: "6", sort: "P_PDATE_D desc",
    });
    parseEuropePMC(JSON.parse(await fetchText(url.toString()))).forEach((x) => out.push({ ...x, center: c.id, source: x.journal || "Europe PMC" }));
  }));
  return out;
}

// ---------- RSS feeds + Google News ----------
function extraFeeds() {
  try { return JSON.parse(process.env.RESEARCH_FEEDS || "[]"); } catch { return []; }
}
async function fromFeeds() {
  const jobs = [];
  for (const c of CENTERS) {
    for (const url of c.feeds) jobs.push({ center: c.id, url, source: c.short });
    const q = encodeURIComponent(`${c.news_q} when:60d`);
    jobs.push({ center: c.id, url: `https://news.google.com/rss/search?q=${q}&hl=en-PK&gl=PK&ceid=PK:en`, source: "Google News" });
  }
  for (const f of extraFeeds()) if (f?.url) jobs.push({ center: f.center || null, url: f.url, source: f.source || "feed" });
  const out = [];
  await Promise.allSettled(jobs.map(async (j) => {
    const items = parseFeed(await fetchText(j.url)).slice(0, 8);
    items.forEach((x) => {
      // Google News titles end with " - Publisher"
      const title = j.source === "Google News" ? x.title.replace(/\s+-\s+[^-]+$/, "") : x.title;
      out.push({ ...x, title, center: j.center || detectCenter(`${x.title} ${x.summary}`), source: x.publisher || j.source });
    });
  }));
  return out;
}

// ---------- OpenAlex (needs a free key) ----------
async function fromOpenAlex() {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) return [];
  const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const out = [];
  await Promise.allSettled(CENTERS.map(async (c) => {
    const url = new URL("https://api.openalex.org/works");
    url.search = new URLSearchParams({
      filter: `raw_affiliation_strings.search:${c.aff},from_publication_date:${since}`,
      search: "crop OR soil OR seed OR agronomy",
      sort: "publication_date:desc", "per-page": "5", api_key: key,
    });
    const j = JSON.parse(await fetchText(url.toString()));
    for (const w of j.results || []) {
      const inv = w.abstract_inverted_index;
      let abs = "";
      if (inv) { const words = []; for (const [k, pos] of Object.entries(inv)) pos.forEach((p) => (words[p] = k)); abs = words.join(" "); }
      out.push({ title: w.title || w.display_name, link: w.doi || w.id, date: w.publication_date, summary: abs.slice(0, 700), center: c.id, source: "OpenAlex" });
    }
  }));
  return out;
}

// ---------- collect everything ----------
export async function collectResearch() {
  const [pmc, feeds, oa] = await Promise.all([fromEuropePMC().catch(() => []), fromFeeds().catch(() => []), fromOpenAlex().catch(() => [])]);
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10);
  const seen = new Set();
  const all = [...oa, ...pmc, ...feeds]
    .filter((x) => x.center && (!x.date || x.date >= cutoff))
    .map((x) => ({ ...x, id: hashId(x.title) }))
    .filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return { items: all, counts: { europepmc: pmc.length, feeds: feeds.length, openalex: oa.length } };
}

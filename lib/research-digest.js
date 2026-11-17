// Builds the farmer-facing research digest and caches it (Next.js data cache, tag "research").
// It refreshes on its own every RESEARCH_REFRESH_HOURS (default 6) and also daily via the
// cron in vercel.json → /api/research/refresh, so new papers appear without any manual step.
import { unstable_cache } from "next/cache";
import { collectResearch } from "@/lib/research-feed";
import { tagResearch } from "@/lib/research-tags";

// The headline in Urdu, so an Urdu reader sees what the research is about (free Google Translate endpoint;
// if it is unreachable the item keeps its crop · subject line only).
async function toUrdu(text) {
  try {
    const u = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=" + encodeURIComponent(text.slice(0, 400));
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return "";
    const j = await r.json();
    const s = (j?.[0] || []).map((p) => p?.[0] || "").join("").trim();
    return /[\u0600-\u06FF]/.test(s) ? s.replace(/[A-Za-z][A-Za-z.'’-]*/g, (w) => w) : "";
  } catch { return ""; }
}

const REFRESH_S = Number(process.env.RESEARCH_REFRESH_HOURS || 6) * 3600;

async function build() {
  const { items: raw, counts } = await collectResearch();
  // keep only farming research, described in Urdu from what it mentions (crop + subject); no AI service
  // most useful first (crop grown in Pakistan + a real field problem), then newest; the phone gets the top 30
  const items = raw.map((x) => { const t = tagResearch(x); return t ? { id: x.id, title: x.title, link: x.link, date: x.date, center: x.center, source: x.source, ...t } : null; })
    .filter(Boolean)
    .sort((a, b) => b.relevance - a.relevance || (b.date || "").localeCompare(a.date || ""))
    .slice(0, 30);
  // Throwing keeps an empty result out of the cache, so the next request tries again.
  if (!items.length) throw new Error("no research sources reachable");
  const ur = await Promise.all(items.map((x) => toUrdu(x.title)));
  items.forEach((x, i) => { x.headline_ur = ur[i]; });
  return { updated: new Date().toISOString(), counts, items };
}

export const getResearch = unstable_cache(build, ["kd-research-v4"], { revalidate: REFRESH_S, tags: ["research"] });

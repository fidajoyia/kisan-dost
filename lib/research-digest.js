// Builds the farmer-facing research digest and caches it (Next.js data cache, tag "research").
// It refreshes on its own every RESEARCH_REFRESH_HOURS (default 6) and also daily via the
// cron in vercel.json → /api/research/refresh, so new papers appear without any manual step.
import { unstable_cache } from "next/cache";
import { collectResearch } from "@/lib/research-feed";
import { tagResearch } from "@/lib/research-tags";

const REFRESH_S = Number(process.env.RESEARCH_REFRESH_HOURS || 6) * 3600;

async function build() {
  const { items: raw, counts } = await collectResearch();
  // keep only farming research, described in Urdu from what it mentions (crop + subject); no AI service
  const items = raw.map((x) => { const t = tagResearch(x); return t ? { ...x, ...t, summarized: false } : null; }).filter(Boolean).slice(0, 30);
  const mode = "raw";
  // Throwing keeps an empty result out of the cache, so the next request tries again.
  if (!items.length) throw new Error("no research sources reachable");
  items.sort((a, b) => (b.relevance ?? 50) - (a.relevance ?? 50) || (b.date || "").localeCompare(a.date || ""));
  return { updated: new Date().toISOString(), mode, counts, items };
}

export const getResearch = unstable_cache(build, ["kd-research-v2"], { revalidate: REFRESH_S, tags: ["research"] });

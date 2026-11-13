// Builds the farmer-facing research digest and caches it (Next.js data cache, tag "research").
// It refreshes on its own every RESEARCH_REFRESH_HOURS (default 6) and also daily via the
// cron in vercel.json → /api/research/refresh, so new papers appear without any manual step.
import { unstable_cache } from "next/cache";
import { askClaudeJSON, langInstruction, hasAI } from "@/lib/claude";
import { collectResearch } from "@/lib/research-feed";
import { CENTERS, centerById } from "@/lib/research-centers";
import { CROP_KEYS } from "@/lib/seeds";

const REFRESH_S = Number(process.env.RESEARCH_REFRESH_HOURS || 6) * 3600;
const hasKey = hasAI;

const SHAPE = `{"items":[{"id":"","title":"","summary":"","farmer_action":"","crop":"","zones":["normal|sem|rait"],"temp":"heat|cold|any","relevance":0}]}`;

async function explainForFarmers(items, lang) {
  const list = items.slice(0, 36).map((x) =>
    `id=${x.id} | institution=${centerById(x.center)?.short} | date=${x.date || "?"} | ${x.title}${x.summary ? ` — ${x.summary.slice(0, 380)}` : ""}`
  ).join("\n");
  const prompt = `You are an agricultural extension officer in Pakistan. Below are the newest papers and news items from the world's top 10 agricultural universities and research institutions (QS 2026 ranking).

${list}

For each item that could matter to a Pakistani farmer (crops, seed varieties, heat or cold stress, salty or waterlogged (sem/kallar) land, sandy (rait/Thal) land, water, pests, soil, climate), return:
- title: a short plain title (max 12 words)
- summary: 1–2 simple sentences on what was found
- farmer_action: one practical line on what it means for a farmer in Pakistan, or what to ask the agriculture department; never invent a variety name or a dose
- crop: one of ${CROP_KEYS.join(", ")}, or "other"
- zones: which land types it helps: normal, sem (waterlogged/salty), rait (sandy). Use [] if not land-specific
- temp: "heat" if about heat tolerance/hot weather, "cold" if about cold/frost, else "any"
- relevance: 0–100 for a Pakistani small farmer
Skip items with relevance below 35, corporate or fundraising news, and anything outside agriculture. Keep the same id. At most 20 items, most relevant and newest first.

${langInstruction(lang)}

Reply with ONLY one JSON object in this shape:
${SHAPE}`;
  const j = await askClaudeJSON({ text: prompt, maxTokens: 6000 });
  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  return (j.items || []).filter((x) => byId[x.id]).map((x) => ({ ...byId[x.id], ...x, summarized: true }));
}

// Last resort when every feed is unreachable: Claude searches the web itself.
async function webSearchFallback(lang) {
  const names = CENTERS.map((c) => c.short).join(", ");
  const prompt = `Search the web for the newest research results (last 3 months) from these world top-10 agricultural universities: ${names}.
Prefer results about wheat, rice, maize, chickpea, millet, potato, vegetables, heat tolerance, salinity or waterlogging, sandy/arid land, and anything about Pakistan or South Asia.
Return up to 12 items. For each: id (any short unique string), institution short name exactly as listed, date (YYYY-MM-DD), link (the source URL you found), title, summary (1–2 simple sentences), farmer_action (one practical line for a Pakistani farmer; never invent a variety name or dose), crop (one of ${CROP_KEYS.join(", ")} or "other"), zones (subset of normal, sem, rait), temp (heat|cold|any), relevance 0–100.
${langInstruction(lang)}
Reply with ONLY one JSON object: {"items":[{"id":"","institution":"","date":"","link":"","title":"","summary":"","farmer_action":"","crop":"","zones":[],"temp":"any","relevance":0}]}`;
  const j = await askClaudeJSON({ text: prompt, maxTokens: 6000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }] });
  return (j.items || []).map((x) => {
    const c = CENTERS.find((k) => k.short.toLowerCase() === String(x.institution || x.centre || "").toLowerCase());
    return { ...x, id: `w-${x.id}`, center: c?.id || null, source: "web search", summarized: true };
  }).filter((x) => x.center && x.link);
}

async function build(lang) {
  const { items: raw, counts } = await collectResearch();
  let items = [], mode = "raw";
  if (raw.length && hasKey()) {
    try { items = await explainForFarmers(raw, lang); mode = "explained"; } catch { items = []; }
  }
  if (!items.length && raw.length) items = raw.slice(0, 30).map((x) => ({ ...x, summarized: false }));
  if (!items.length && hasKey() && process.env.RESEARCH_WEB_SEARCH !== "0") {
    try { items = await webSearchFallback(lang); mode = "web_search"; } catch {}
  }
  // Throwing keeps an empty result out of the cache, so the next request tries again.
  if (!items.length) throw new Error("no research sources reachable");
  items.sort((a, b) => (b.relevance ?? 50) - (a.relevance ?? 50) || (b.date || "").localeCompare(a.date || ""));
  return { updated: new Date().toISOString(), mode, counts, items };
}

export const getResearch = unstable_cache(build, ["kd-research-v1"], { revalidate: REFRESH_S, tags: ["research"] });

import { getResearch } from "@/lib/research-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/research?lang=ur|roman|en → newest research from the ten centres, explained for farmers.
export async function GET(req) {
  const lang = new URL(req.url).searchParams.get("lang");
  const l = ["ur", "roman", "en"].includes(lang) ? lang : "ur";
  try {
    return Response.json(await getResearch(l));
  } catch (e) {
    return Response.json({ error: e.message || "research unavailable", items: [] }, { status: 503 });
  }
}

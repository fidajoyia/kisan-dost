import { getResearch } from "@/lib/research-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/research → newest farming research from the ten institutions, labelled by crop and subject.
export async function GET() {
  try {
    return Response.json(await getResearch());
  } catch (e) {
    return Response.json({ error: e.message || "research unavailable", items: [] }, { status: 503 });
  }
}

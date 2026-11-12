import { getOutlook } from "@/lib/flood";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/flood?lat=..&lon=..&lang=ur → 7-month flood outlook for this farm.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat")), lon = Number(searchParams.get("lon"));
  const lang = ["ur", "roman", "en"].includes(searchParams.get("lang")) ? searchParams.get("lang") : "ur";
  if (!isFinite(lat) || !isFinite(lon) || lat < 22 || lat > 38 || lon < 60 || lon > 79)
    return Response.json({ error: "location must be inside Pakistan" }, { status: 400 });
  try {
    return Response.json(await getOutlook(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, lang));
  } catch (e) {
    return Response.json({ error: e.message || "flood outlook unavailable" }, { status: 503 });
  }
}

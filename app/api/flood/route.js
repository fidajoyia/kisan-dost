import { getOutlook } from "@/lib/flood";

const num = (v) => (v == null || String(v).trim() === "" ? NaN : Number(v));
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/flood?lat=..&lon=.. → 7-month flood outlook for this farm (add &full=1 for every number behind it).
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = num(searchParams.get("lat")), lon = num(searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || lat < 22 || lat > 38 || lon < 60 || lon > 79)
    return Response.json({ error: "location must be inside Pakistan" }, { status: 400 });
  try {
    return Response.json(await getOutlook(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, searchParams.get("full") === "1"));
  } catch (e) {
    return Response.json({ error: e.message || "flood outlook unavailable" }, { status: 503 });
  }
}

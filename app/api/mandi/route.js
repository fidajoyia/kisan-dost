import { mandiFor } from "@/lib/mandi";
const num = (v) => (v == null || String(v).trim() === "" ? NaN : Number(v));
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/mandi?lat=..&lon=.. → today's wholesale rates at the nearest Punjab market (AMIS)
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const lat = num(p.get("lat")), lon = num(p.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: "invalid coordinates" }, { status: 400 });
  try { return Response.json(await mandiFor(lat, lon)); }
  catch (e) { return Response.json({ error: e.message || "unavailable" }, { status: 503 }); }
}

import { getWater } from "@/lib/water";
import { kmTo } from "@/lib/headworks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/water?lat=..&lon=.. → flows at every headworks / barrage and the water taken into canals,
// nearest to the farm first.
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat")), lon = Number(q.get("lon"));
  try {
    const w = await getWater();
    if (isFinite(lat) && isFinite(lon) && q.get("lat")) {
      w.stations = w.stations.map((s) => ({ ...s, km: kmTo(lat, lon, s) })).sort((a, b) => a.km - b.km);
    }
    return Response.json(w);
  } catch (e) {
    return Response.json({ error: e.message || "water data unavailable" }, { status: 503 });
  }
}

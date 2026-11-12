import { recommend, cropCounts } from "@/lib/seed-intel";
import { cropById } from "@/lib/seed-intel/crops";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/seeds?counts=1                         → varieties found per crop
// GET /api/seeds?crop=wheat&lat=..&lon=..&zone=normal|sem|rait&band=cool|mild|warm|hot
//                                                  → ranked comparison + best seed for this farm
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  try {
    if (p.get("counts")) return Response.json(await cropCounts());
    const crop = p.get("crop");
    if (!cropById(crop)) return Response.json({ error: "unknown crop" }, { status: 400 });
    const lat = Number(p.get("lat")), lon = Number(p.get("lon"));
    if (!isFinite(lat) || !isFinite(lon)) return Response.json({ error: "invalid coordinates" }, { status: 400 });
    const zone = ["normal", "sem", "rait"].includes(p.get("zone")) ? p.get("zone") : "normal";
    const band = ["cold", "cool", "mild", "warm", "hot"].includes(p.get("band")) ? p.get("band") : null;
    return Response.json(await recommend({ crop, lat, lon, zone, band }));
  } catch (e) {
    return Response.json({ error: e.message || "seed data unavailable" }, { status: 503 });
  }
}

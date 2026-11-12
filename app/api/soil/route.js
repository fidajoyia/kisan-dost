import { classifyZone, parseSoilGrids } from "@/lib/soil-zones";

export const dynamic = "force-dynamic";

// Land type guess for the seed advisor: SoilGrids texture + pH, combined with district lists.
// GET /api/soil?lat=..&lon=..&district=..
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat")), lon = Number(searchParams.get("lon"));
  const district = searchParams.get("district") || "";
  if (!isFinite(lat) || !isFinite(lon)) return Response.json({ error: "invalid coordinates" }, { status: 400 });

  let soil = { sand: null, clay: null, ph: null }, source = "district-list";
  try {
    const url = new URL("https://rest.isric.org/soilgrids/v2.0/properties/query");
    const p = url.searchParams;
    p.set("lon", lon.toFixed(4)); p.set("lat", lat.toFixed(4)); p.set("value", "mean");
    ["sand", "clay", "phh2o"].forEach((x) => p.append("property", x));
    ["0-5cm", "5-15cm", "15-30cm"].forEach((x) => p.append("depth", x));
    const r = await fetch(url, { signal: AbortSignal.timeout(9000), next: { revalidate: 60 * 60 * 24 * 30 } });
    if (r.ok) {
      soil = parseSoilGrids(await r.json());
      if (soil.sand != null || soil.ph != null) source = "soilgrids";
    }
  } catch {}

  return Response.json({ ...classifyZone(district, soil), soil, source });
}

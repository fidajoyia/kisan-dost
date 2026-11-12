import { nearestDistrict, PROVINCES } from "@/lib/districts";

export const dynamic = "force-dynamic";

// Normalise OSM state names to the province keys we use.
function matchProvince(state = "") {
  const s = state.toLowerCase();
  if (s.includes("punjab")) return "Punjab";
  if (s.includes("sindh")) return "Sindh";
  if (s.includes("khyber")) return "Khyber Pakhtunkhwa";
  if (s.includes("baloch")) return "Balochistan";
  if (s.includes("gilgit")) return "Gilgit-Baltistan";
  if (s.includes("kashmir")) return "Azad Kashmir";
  if (s.includes("islamabad")) return "Islamabad";
  return null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat")), lon = Number(searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    return Response.json({ error: "invalid coordinates" }, { status: 400 });

  const fallback = nearestDistrict(lat, lon);
  let result = {
    lat, lon,
    district: fallback?.district || null,
    province: fallback?.province || null,
    country: fallback ? "Pakistan" : null,
    place: null,
    source: fallback ? "nearest-district" : "none",
  };

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.search = new URLSearchParams({
      lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "10", "accept-language": "en",
      ...(process.env.NOMINATIM_EMAIL ? { email: process.env.NOMINATIM_EMAIL } : {}),
    });
    const r = await fetch(url, {
      headers: { "User-Agent": "KisanDost/1.0 (farm advisory app)" },
      next: { revalidate: 86400 },
    });
    if (r.ok) {
      const j = await r.json();
      const a = j.address || {};
      const province = matchProvince(a.state) || result.province;
      const district = (a.state_district || a.county || a.city || a.town || "").replace(/ District$/i, "") || result.district;
      result = {
        ...result,
        province,
        district,
        country: a.country || result.country,
        place: a.village || a.town || a.city || a.suburb || null,
        source: "openstreetmap",
      };
    }
  } catch {}

  return Response.json({ ...result, province_ur: result.province ? PROVINCES[result.province] || null : null });
}

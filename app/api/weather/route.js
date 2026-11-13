const num = (v) => (v == null || String(v).trim() === "" ? NaN : Number(v));
export const dynamic = "force-dynamic";

// Live weather from Open-Meteo (free, no key): last 7 days + current + 16-day forecast,
// plus soil moisture and reference evapotranspiration for an automatic irrigation estimate.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = num(searchParams.get("lat")), lon = num(searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: "invalid coordinates" }, { status: 400 });

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code",
    hourly: "relative_humidity_2m,dew_point_2m,temperature_2m,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration",
    past_days: "7",
    forecast_days: "16",
    timezone: "auto",
  });

  let j;
  try {
    const r = await fetch(url, { next: { revalidate: 1800 } });
    if (!r.ok) return Response.json({ error: `weather service ${r.status}` }, { status: 502 });
    j = await r.json();
  } catch {
    return Response.json({ error: "weather service unreachable" }, { status: 502 });
  }

  const today = (j.current?.time || new Date().toISOString()).slice(0, 10);
  const h = j.hourly || {};

  // Per-day aggregates from hourly data.
  const agg = {};
  (h.time || []).forEach((t, i) => {
    const day = t.slice(0, 10);
    const a = (agg[day] ||= { rh: [], wet: 0 });
    const rh = h.relative_humidity_2m?.[i];
    if (rh != null) {
      a.rh.push(rh);
      if (rh >= 90) a.wet++; // hours of near-saturated air: proxy for leaf wetness / fungal infection risk
    }
  });
  const mean = (xs) => (xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : null);

  const d = j.daily || {};
  const days = (d.time || []).map((date, i) => ({
    date,
    past: date < today,
    tmax: d.temperature_2m_max?.[i] ?? null,
    tmin: d.temperature_2m_min?.[i] ?? null,
    rain_mm: d.precipitation_sum?.[i] ?? null,
    rain_prob: d.precipitation_probability_max?.[i] ?? null,
    et0_mm: d.et0_fao_evapotranspiration?.[i] ?? null,
    humidity: mean(agg[date]?.rh || []),
    wet_hours: agg[date]?.wet ?? null,
  }));

  const sum = (xs, k) => Math.round(xs.reduce((s, x) => s + (Number(x[k]) || 0), 0) * 10) / 10;
  const past = days.filter((x) => x.past);
  const future = days.filter((x) => !x.past);
  const next3 = future.slice(0, 3), next7 = future.slice(0, 7);

  // ---- Rain summary (automatic) ----
  const rain = {
    past7_mm: sum(past, "rain_mm"),
    past_rainy_days: past.filter((x) => (x.rain_mm || 0) >= 1).length,
    next3_mm: sum(next3, "rain_mm"),
    next7_mm: sum(next7, "rain_mm"),
    next16_mm: sum(future, "rain_mm"),
    next7_rainy_days: next7.filter((x) => (x.rain_mm || 0) >= 1 || (x.rain_prob || 0) >= 60).length,
  };
  rain.status =
    rain.past_rainy_days >= 4 || rain.next7_rainy_days >= 4 ? "continuous"
    : rain.next3_mm >= 2 || rain.next7_rainy_days >= 1 ? "forecast"
    : rain.past7_mm >= 2 ? "recent"
    : "none";

  // ---- Soil moisture now (nearest hour) ----
  const nowIdx = Math.max(0, (h.time || []).findIndex((t) => t >= (j.current?.time || "")));
  const soil = {
    top_3_9cm: h.soil_moisture_3_to_9cm?.[nowIdx] ?? null,
    root_9_27cm: h.soil_moisture_9_to_27cm?.[nowIdx] ?? null,
    unit: "m³/m³",
  };

  // ---- Irrigation need (rough water balance; soil type is unknown, so thresholds are generic) ----
  const deficit7 = Math.round((sum(past, "et0_mm") - rain.past7_mm) * 10) / 10; // mm lost to evapotranspiration beyond rain
  const root = soil.root_9_27cm;
  let need = "unknown";
  if (rain.next3_mm >= 10) need = "wait_rain";
  else if (root != null && root < 0.15) need = "irrigate_now";
  else if (root != null && root < 0.22 && deficit7 > 15) need = "irrigate_soon";
  else if (root != null && root >= 0.3) need = "not_needed";
  else if (deficit7 > 25) need = "irrigate_soon";
  else if (root != null) need = "not_needed";
  const irrigation = { need, et0_past7_mm: sum(past, "et0_mm"), deficit7_mm: deficit7, et0_next7_mm: sum(next7, "et0_mm") };

  // ---- Disease-favourable weather in the next 7 days ----
  const humid_hours_next7 = next7.reduce((s, x) => s + (x.wet_hours || 0), 0);

  return Response.json({
    source: "open-meteo",
    timezone: j.timezone,
    today,
    current: {
      time: j.current?.time,
      temp: j.current?.temperature_2m ?? null,
      humidity: j.current?.relative_humidity_2m ?? null,
      precipitation: j.current?.precipitation ?? null,
      code: j.current?.weather_code ?? null,
    },
    rain,
    soil,
    irrigation,
    humid_hours_next7,
    days,
  });
}

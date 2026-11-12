// Turns the /api/weather payload into compact text for the model prompt.
export function weatherForPrompt(w) {
  if (!w || w.error) return "Live weather: unavailable.";
  const fmt = (x) =>
    `${x.date}${x.past ? " (past)" : ""}: ${x.tmin}–${x.tmax}°C, RH ${x.humidity ?? "?"}%, rain ${x.rain_mm ?? 0}mm` +
    `${x.rain_prob != null ? ` (${x.rain_prob}% chance)` : ""}, humid≥90% hours ${x.wet_hours ?? "?"}, ET0 ${x.et0_mm ?? "?"}mm`;
  return [
    `Live weather source: Open-Meteo. Local date today: ${w.today}.`,
    `Now: ${w.current?.temp}°C, RH ${w.current?.humidity}%, precipitation ${w.current?.precipitation}mm.`,
    `Rain summary: last 7 days ${w.rain?.past7_mm}mm on ${w.rain?.past_rainy_days} days; next 3 days ${w.rain?.next3_mm}mm; next 7 days ${w.rain?.next7_mm}mm; next 16 days ${w.rain?.next16_mm}mm. Status: ${w.rain?.status}.`,
    `Soil moisture (m³/m³): 3–9cm ${w.soil?.top_3_9cm ?? "?"}, 9–27cm ${w.soil?.root_9_27cm ?? "?"} (model estimate, soil type unknown).`,
    `Water balance: ET0 last 7 days ${w.irrigation?.et0_past7_mm}mm, deficit vs rain ${w.irrigation?.deficit7_mm}mm, ET0 next 7 days ${w.irrigation?.et0_next7_mm}mm. Rule-based irrigation need: ${w.irrigation?.need}.`,
    `Hours with RH≥90% in next 7 days: ${w.humid_hours_next7}.`,
    "Daily:",
    ...(w.days || []).map(fmt),
  ].join("\n");
}

export function locationForPrompt(loc) {
  if (!loc) return "Location: unknown (assume Pakistan).";
  const parts = [loc.place, loc.district && `${loc.district} district`, loc.province, loc.country].filter(Boolean);
  return `Location: ${parts.join(", ") || "unknown"} (GPS ${Number(loc.lat).toFixed(3)}, ${Number(loc.lon).toFixed(3)}).`;
}

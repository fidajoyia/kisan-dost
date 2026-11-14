// Small shared helpers for the seed and research screens.
//   ZONES: the three land types a farmer picks (they change which tolerances matter).
//   tempSummary: the next 14 days of the live forecast, summarised.
export const ZONES = {
  normal: { ur: "عام زمین", en: "Normal land" },
  sem: { ur: "سیم / تھور (کلر)", en: "Sem / kallar (waterlogged, salty)" },
  rait: { ur: "ریتلی زمین (تھل، چولستان، تھر)", en: "Sandy land (Thal, Cholistan, Thar)" },
};

export function tempSummary(wx) {
  const fut = (Array.isArray(wx?.days) ? wx.days : []).filter((d) => d && !d.past && d.tmax != null && d.tmin != null).slice(0, 14);
  if (!fut.length) return null;
  const avg = (xs) => Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 10) / 10;
  const mean = avg(fut.map((d) => (d.tmax + d.tmin) / 2));
  return {
    mean14: mean,
    max14: avg(fut.map((d) => d.tmax)),
    min14: avg(fut.map((d) => d.tmin)),
    hottest: Math.max(...fut.map((d) => d.tmax)),
    coldest: Math.min(...fut.map((d) => d.tmin)),
    now: wx?.current?.temp ?? null,
    band: mean < 10 ? "cold" : mean < 18 ? "cool" : mean < 27 ? "mild" : mean < 33 ? "warm" : "hot",
  };
}

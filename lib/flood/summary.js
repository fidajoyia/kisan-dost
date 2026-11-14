// The plain answer the flood screen shows: one danger level per month for the farm and for every river,
// plus the two facts a farmer can check (water stored now vs last year, rain expected vs normal).
// Built once here so the screen, the home card and the tab badge always agree.
const RANK = { low: 0, moderate: 1, high: 2, severe: 3 };
const STEP = ["low", "moderate", "high", "severe"];
const arr = (a) => (Array.isArray(a) ? a : []);
const cap = (v) => Math.min(100, Math.round(v));
const ageDays = (date, today) => (date ? Math.max(0, Math.round((today - Date.parse(date + "T00:00:00Z")) / 864e5)) : null);

// Trained eastern-rivers model: p = chance (%) that the month's peak at the border reaches a 1-in-4-year flood.
// Such a month happens about 3 times in 100, and in testing "p >= 50" caught 24 of 29 of them, so 50 is a
// high warning, not a medium one.
export const chanceLevel = (p) => (p >= 75 ? "severe" : p >= 50 ? "high" : p >= 20 ? "moderate" : "low");

// worst level; the first month that reaches it
const peakOf = (months) => months.reduce((a, m) => (!a || RANK[m.level] > RANK[a.level] ? m : a), null);

function riverSummary(b, east, near, now, today) {
  const dams = arr(east?.dams);
  const fullDam = dams.some((d) => d.pct >= 90); // no room left: monsoon rain upstream is passed straight on
  const months = east?.months?.length
    ? east.months.map((m) => {
      let lv = chanceLevel(m.p);
      if (fullDam && [7, 8, 9].includes(+m.month.slice(5, 7)) && RANK[lv] < RANK.high) lv = STEP[RANK[lv] + 1];
      return { ym: m.month, level: lv, chance: m.p };
    })
    : arr(b?.months).map((m) => ({ ym: m.ym, level: m.level }));
  const peak = peakOf(months);

  let water = null;
  const d = b?.factors?.dam;
  const withLy = dams.filter((x) => x.lastYear);
  if (d?.pct != null && d?.pctLastYear != null) {
    water = { kind: "dam", key: d.key, pct: cap(d.pct), pctLastYear: cap(d.pctLastYear), date: d.date, ageDays: ageDays(d.date, today) };
  } else if (withLy.length) {
    const date = withLy.map((x) => x.date).sort().at(-1);
    water = { kind: "india", names: withLy.map((x) => ({ ur: x.ur.split(" (")[0], en: x.en.split(" (")[0] })),
      pct: cap(withLy.reduce((s, x) => s + x.pct, 0) / withLy.length), pctLastYear: cap(withLy.reduce((s, x) => s + x.lastYear.pct, 0) / withLy.length),
      date, ageDays: ageDays(date, today) };
  } else if (east?.flowNowPctOfNormal != null) {
    water = { kind: "flow", pctOfNormal: east.flowNowPctOfNormal };
  }
  const st = now.find((x) => x.river === (b?.id || east?.id));
  return {
    id: b?.id || east.id, ur: (b || east).ur, en: (b || east).en,
    near: !!near, km: near?.km ?? null,
    method: east?.months?.length ? "model" : "index",
    level: peak?.level || "low", peakYm: peak?.ym || null, chance: peak?.chance ?? null,
    months, water, rainPct: b?.factors?.rain?.forecastPct ?? null,
    today: st?.cls ? { station: st.station, cls: st.cls, trend: st.trend } : null,
  };
}

export function summarise(o, eastern, today = new Date()) {
  const eastBy = Object.fromEntries(arr(eastern?.rivers).map((r) => [r.id, r]));
  const nearBy = Object.fromEntries(arr(o.near).map((n) => [n.id, n]));
  const now = arr(o.farm?.now);
  const rivers = arr(o.basins).map((b) => riverSummary(b, eastBy[b.id], nearBy[b.id], now, today));
  for (const r of arr(eastern?.rivers)) if (!rivers.some((v) => v.id === r.id)) rivers.push(riverSummary(null, r, nearBy[r.id], now, today));
  rivers.sort((a, b) => (b.near - a.near) || ((a.km ?? 1e9) - (b.km ?? 1e9)));

  // the farm: for each month the worse of heavy local rain and the rivers near it
  const nearRivers = rivers.filter((r) => r.near);
  const base = arr(o.local?.months).length ? o.local.months.map((m) => ({ ym: m.ym, level: m.level, source: "local" }))
    : arr(nearRivers[0]?.months).map((m) => ({ ym: m.ym, level: "low", source: "local" }));
  const months = base.map((m) => {
    let best = m;
    for (const r of nearRivers) { const x = r.months.find((k) => k.ym === m.ym); if (x && RANK[x.level] > RANK[best.level]) best = { ym: m.ym, level: x.level, source: r.id }; }
    return best;
  });
  const peak = peakOf(months);
  const f = o.farm || {}, sr = f.shortRange;
  return {
    farm: {
      level: peak?.level || "low", peakYm: peak?.ym || null, source: peak?.source || "local", months,
      rainPct: o.local?.factors?.rain?.forecastPct ?? null,
      shortRange: sr ? { flag: sr.flag, date: sr.maxDay?.date || null, mm: sr.maxDay?.mm != null ? Math.round(sr.maxDay.mm) : null } : null,
      monsoon: { covered: !!f.monsoonCovered, tendency: f.monsoonSignal?.tendency || null },
    },
    rivers,
    model: eastern?.model?.validation ? { caught: eastern.model.validation.caught_flood_months } : null,
  };
}

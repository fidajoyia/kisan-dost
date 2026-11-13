// Indian storage dams upstream of Pakistan's eastern rivers. Their releases reach Pakistan in 1–3 days:
//   Sutlej: Bhakra (Gobind Sagar) on the Sutlej + Pong (Maharana Pratap Sagar) on the Beas (joins at Harike)
//   Ravi:   Ranjit Sagar (Thein)
//   Chenab: Salal, Baglihar, Dul Hasti are run-of-river (almost no storage, not in CWC's storage bulletin);
//           for the Chenab the catchment rain / snow / heat is what matters.
// Data: India Central Water Commission weekly storage bulletin, read through reservoirs.earth (which
// republishes the CWC series since 2023). Falls back to the saved snapshot in data/india-dams.json.
export const INDIA_DAMS = [
  { id: "bhakra", river: "sutlej", ur: "بھاکڑا (گوبند ساگر)", en: "Bhakra (Gobind Sagar)", slug: "bhakra-gobind-sagar-in", liveMcm: 7290, lagDays: "2–3" },
  { id: "pong", river: "sutlej", ur: "پونگ (دریائے بیاس)", en: "Pong (Beas)", slug: "pong-maharana-pratap-sagar-in", liveMcm: 7290, lagDays: "2–3" },
  { id: "thein", river: "ravi", ur: "رنجیت ساگر (تھین)", en: "Ranjit Sagar (Thein)", slug: "ranjit-sagar-thein-in", liveMcm: 2910, lagDays: "1–2" },
];

const RX = /\\?"reading_date\\?":\\?"(\d{4}-\d{2}-\d{2})\\?",\\?"volume_mcm\\?":([\d.]+),\\?"fill_percentage\\?":([\d.]+)/g;
const AVG = /\\?"historicalAvg\\?":\[([\d.,\s]+)\]/;

export function parseDamPage(html) {
  const series = [];
  for (const m of html.matchAll(RX)) series.push({ date: m[1], mcm: +m[2], pct: +m[3] });
  const seen = new Set();
  const uniq = series.filter((x) => (seen.has(x.date) ? false : seen.add(x.date))).sort((a, b) => a.date.localeCompare(b.date));
  const avg = (html.match(AVG)?.[1] || "").split(",").map(Number).filter((n) => !Number.isNaN(n));
  return { series: uniq, monthlyNormal: avg.length === 12 ? avg : null };
}

async function fetchDam(d) {
  const r = await fetch(`https://reservoirs.earth/india/reservoirs/${d.slug}`, {
    headers: { "User-Agent": "KisanDost/1.4 (flood outlook for Pakistani farmers)" }, signal: AbortSignal.timeout(25000), cache: "no-store",
  });
  if (!r.ok) throw new Error(`reservoirs.earth ${r.status}`);
  const p = parseDamPage(await r.text());
  if (p.series.length < 10) throw new Error("dam series not found");
  return p;
}

// state now vs the same week last year vs the normal for this month
export function summarise(d, p) {
  const s = p.series, last = s[s.length - 1];
  const t = Date.parse(last.date), ly = t - 365 * 864e5;
  const lastYear = s.reduce((best, x) => (Math.abs(Date.parse(x.date) - ly) < Math.abs(Date.parse(best.date) - ly) ? x : best), s[0]);
  const lyOk = Math.abs(Date.parse(lastYear.date) - ly) < 15 * 864e5;
  const prev = s[s.length - 2];
  const normal = p.monthlyNormal ? p.monthlyNormal[new Date(t).getUTCMonth()] : null;
  const peak = s.reduce((a, x) => (x.pct > a.pct ? x : a), s[0]);
  return {
    id: d.id, river: d.river, ur: d.ur, en: d.en, lagDays: d.lagDays,
    date: last.date, pct: last.pct, mcm: last.mcm,
    week: prev ? Math.round((last.pct - prev.pct) * 10) / 10 : null,
    lastYear: lyOk ? { date: lastYear.date, pct: lastYear.pct } : null,
    normal, peak: { date: peak.date, pct: peak.pct },
    // a dam above ~90% in the monsoon has no room left: heavy rain upstream is passed straight downstream
    spillRisk: last.pct >= 90 ? "high" : last.pct >= 80 ? "medium" : "low",
    series: s.slice(-60).map((x) => [x.date, x.pct]),
  };
}

export async function fetchIndiaDams() {
  const out = [], errors = [];
  let snapshot = null;
  for (const d of INDIA_DAMS) {
    try { out.push(summarise(d, await fetchDam(d))); }
    catch (e) {
      errors.push(`${d.id}: ${e.message}`);
      snapshot ??= (await import("../../data/india-dams.json")).default;
      const p = snapshot.dams?.[d.id];
      if (p) out.push({ ...summarise(d, p), snapshot: snapshot.saved });
    }
  }
  return { dams: out, errors, source: "India Central Water Commission (CWC) weekly storage bulletin, via reservoirs.earth" };
}

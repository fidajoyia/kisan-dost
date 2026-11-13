// Compares seed candidates for one farm and ranks them. Every point added or removed comes with a
// reason the app can show ("+23% yield over check varieties", "needs a cold winter; yours averages 13°C").
import { instById } from "./institutions.js";

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const W = { yield: 0.3, disease: 0.2, fit: 0.35, recency: 0.05, evidence: 0.1 };

export function scoreCandidate(c, ctx = {}) {
  const why = []; // [{k, good:boolean, v}] machine keys; the UI turns them into words
  // 1. yield vs the check varieties in official trials
  let y;
  if (c.yieldPct != null) { y = clamp(50 + c.yieldPct * 2); why.push({ k: "yield_pct", good: c.yieldPct > 0, v: c.yieldPct }); }
  else if (c.yieldClaim === "higher") { y = 70; why.push({ k: "yield_higher", good: true }); }
  else if (c.yieldClaim === "high") { y = 65; why.push({ k: "yield_high", good: true }); }
  else if (c.yieldClaim === "comparable") { y = 50; why.push({ k: "yield_same", good: false }); }
  else y = 45;
  // 2. disease and pest resistance
  const nRes = (c.resistant?.length || 0) + 0.5 * (c.moderate?.length || 0);
  const d = clamp(40 + nRes * 12);
  if (c.resistant?.length) why.push({ k: "resistant", good: true, v: c.resistant.slice(0, 4) });
  // 3. fit to this farm = does the farm's weather match the weather where the variety was proven
  //    (only facts from the registration: trial region, winter/spring habit, stated tolerances)
  let f;
  if (c.climate?.sim != null) { f = c.climate.sim; why.push({ k: c.climate.sim >= 70 ? "climate_good" : "climate_bad", good: c.climate.sim >= 70, v: c.climate }); }
  else { f = 30; why.push({ k: "trial_unknown", good: false }); }
  const habitCrop = ["wheat", "barley", "oat"].includes(c.crop);
  if (habitCrop && c.habit === "winter" && ctx.winterMean != null && ctx.winterMean > 7) { f -= 35; why.push({ k: "needs_cold", good: false, v: ctx.winterMean }); }
  if (habitCrop && c.habit === "spring") why.push({ k: "spring_type", good: true });
  if (ctx.zone === "sem") { if (c.tol?.salt || c.tol?.flood) { f += 10; why.push({ k: c.tol.salt ? "salt" : "flood", good: true }); } else { f -= 10; why.push({ k: "sem_unknown", good: false }); } }
  if (ctx.zone === "rait") { if (c.tol?.drought || c.tol?.sand) { f += 10; why.push({ k: c.tol.drought ? "drought" : "sand", good: true }); } else { f -= 10; why.push({ k: "rait_unknown", good: false }); } }
  if (ctx.zone === "normal" && c.tol?.drought) why.push({ k: "drought", good: true });
  if (c.tol?.heat) why.push({ k: "heat", good: true });
  if (c.maturity === "early") why.push({ k: "early", good: true });
  if (c.quality?.length) why.push({ k: "quality", good: true, v: c.quality });
  const fit = clamp(f);
  // 4. recency and 5. strength of evidence
  const yr = c.released || c.year || 2000;
  const r = yr >= 2023 ? 100 : yr >= 2020 ? 80 : yr >= 2017 ? 60 : 40;
  const e = c.yieldPct != null ? 100 : c.yieldClaim ? 65 : 40;
  const score = Math.round(y * W.yield + d * W.disease + fit * W.fit + r * W.recency + e * W.evidence);
  const inst = (c.inst || []).map(instById).filter(Boolean);
  return { ...c, score, parts: { yield: Math.round(y), disease: Math.round(d), fit: Math.round(fit), recency: r, evidence: e }, why, institutions: inst.map(({ id, rank, short, name_en, name_ur, web, seed, top10 }) => ({ id, rank, short, name_en, name_ur, web, seed, top10 })) };
}

export function rankCandidates(list, ctx) {
  const seen = new Set();
  return list.map((c) => scoreCandidate(c, ctx))
    .filter((c) => { const k = `${c.crop}:${c.name.toLowerCase()}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.score - a.score || (b.released || 0) - (a.released || 0));
}

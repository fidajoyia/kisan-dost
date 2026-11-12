// Compares seed candidates for one farm and ranks them. Every point added or removed comes with a
// reason the app can show ("+23% yield over check varieties", "needs a cold winter; yours averages 13°C").
import { instById } from "./institutions.js";

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const W = { yield: 0.35, disease: 0.2, fit: 0.25, recency: 0.1, evidence: 0.1 };

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
  // 3. fit to this farm: winter habit vs local winter, land type, heat
  let f = 60;
  const habitCrop = ["wheat", "barley", "oat"].includes(c.crop);
  if (habitCrop && c.habit === "winter" && ctx.winterMean != null && ctx.winterMean > 7) { f -= 35; why.push({ k: "needs_cold", good: false, v: ctx.winterMean }); }
  else if (habitCrop && c.habit === "winter" && ctx.winterMean != null) { f += 5; why.push({ k: "cold_ok", good: true, v: ctx.winterMean }); }
  if (habitCrop && c.habit === "spring") { f += 12; why.push({ k: "spring_type", good: true }); }
  if (ctx.zone === "sem") { if (c.tol?.salt || c.tol?.flood) { f += 22; why.push({ k: c.tol.salt ? "salt" : "flood", good: true }); } else f -= 5; }
  if (ctx.zone === "rait") { if (c.tol?.drought || c.tol?.sand) { f += 22; why.push({ k: c.tol.drought ? "drought" : "sand", good: true }); } else f -= 5; }
  if (ctx.zone !== "rait" && c.tol?.drought) { f += 5; why.push({ k: "drought", good: true }); }
  if (["warm", "hot"].includes(ctx.band)) {
    if (c.tol?.heat) { f += 15; why.push({ k: "heat", good: true }); }
    else if (c.maturity === "early") { f += 5; why.push({ k: "early_escape", good: true }); }
  } else if (c.maturity === "early") why.push({ k: "early", good: true });
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

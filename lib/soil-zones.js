// Guess whether a farm is on ordinary, sem (waterlogged / salty) or rait (sandy) land.
// Two signals, both approximate, so the farmer always gets the final say in the app:
//  1. District lists below (well-known sandy deserts, and districts with widespread
//     waterlogging / salinity in the Indus plains). Sem is patchy inside a district.
//  2. SoilGrids (ISRIC) 250 m soil map: sand % (texture) and pH (pH ≥ 8.5 ⇒ sodic / kallar tendency).

// Sandy deserts: Thal, Cholistan, Thar, Kharan / Chagai.
export const RAIT_DISTRICTS = [
  "Bhakkar", "Layyah", "Khushab", "Mianwali", "Jhang", "Muzaffargarh", // Thal
  "Bahawalpur", "Bahawalnagar", "Rahim Yar Khan", // Cholistan
  "Tharparkar", "Umerkot", // Thar
  "Kharan", "Chagai",
];

// Widespread waterlogging / salinity (Lower Sindh LBOD area, coastal belt, central Punjab doabs).
export const SEM_DISTRICTS = [
  "Badin", "Thatta", "Sanghar", "Mirpur Khas", "Shaheed Benazirabad", "Tando Allahyar",
  "Hyderabad", "Matiari", "Dadu", "Larkana", "Jacobabad",
  "Faisalabad", "Toba Tek Singh", "Sargodha", "Sheikhupura", "Hafizabad", "Mandi Bahauddin",
  "Gujranwala", "Nankana Sahib",
];

const norm = (s = "") => s.toLowerCase().replace(/\s+district$/i, "").trim();
const inList = (list, d) => !!d && list.some((x) => norm(x) === norm(d) || norm(d).includes(norm(x)));

// soil: { sand, clay, ph } in % and pH units (any may be null)
export function classifyZone(district, soil = {}) {
  const reasons = [];
  const sand = soil?.sand, ph = soil?.ph;
  const raitD = inList(RAIT_DISTRICTS, district), semD = inList(SEM_DISTRICTS, district);

  if (sand != null && sand >= 65) {
    reasons.push({ k: "sand", v: sand });
    if (raitD) reasons.push({ k: "rait_district" });
    return { zone: "rait", confidence: raitD ? "high" : "medium", reasons };
  }
  if (ph != null && ph >= 8.5) {
    reasons.push({ k: "ph", v: ph });
    if (semD) reasons.push({ k: "sem_district" });
    return { zone: "sem", confidence: semD ? "medium" : "low", reasons };
  }
  if (raitD && (sand == null || sand >= 50)) {
    reasons.push({ k: "rait_district" });
    if (sand != null) reasons.push({ k: "sand", v: sand });
    return { zone: "rait", confidence: sand != null ? "medium" : "low", reasons };
  }
  if (semD) {
    reasons.push({ k: "sem_district" });
    if (ph != null) reasons.push({ k: "ph", v: ph });
    return { zone: "sem", confidence: "low", reasons };
  }
  if (sand != null) reasons.push({ k: "sand", v: sand });
  if (ph != null) reasons.push({ k: "ph", v: ph });
  return { zone: "normal", confidence: sand != null || ph != null ? "medium" : "low", reasons };
}

// Parse a SoilGrids v2.0 /properties/query response into { sand, clay, ph } for 0–30 cm.
export function parseSoilGrids(j) {
  const layers = j?.properties?.layers || [];
  const out = { sand: null, clay: null, ph: null };
  const weights = { "0-5cm": 5, "5-15cm": 10, "15-30cm": 15 };
  for (const L of layers) {
    const key = { sand: "sand", clay: "clay", phh2o: "ph" }[L.name];
    if (!key) continue;
    const f = L.unit_measure?.d_factor || 10;
    let s = 0, w = 0;
    for (const d of L.depths || []) {
      const v = d.values?.mean, wt = weights[d.label];
      if (v == null || !wt) continue;
      s += (v / f) * wt; w += wt;
    }
    if (w) out[key] = Math.round((s / w) * 10) / 10;
  }
  return out;
}

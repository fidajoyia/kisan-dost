// Crops the seed engine researches. `words` find the crop in a registration title,
// `grow` = months the crop is in the field in Pakistan (climate comparison with the trial region);
// `season` / `sow` / `temp` drive the "sow now?" check (Punjab & Sindh plains; temp = daily mean °C).
export const CROPS = [
  { id: "wheat", ur: "گندم", en: "Wheat", words: [/\bwheat\b/i], exclude: [/wheatgrass/i], season: "rabi", sow: [[11, 1, 12, 10]], temp: [11, 22], habit: true, grow: [11, 12, 1, 2, 3, 4] },
  { id: "rice", ur: "چاول (دھان)", en: "Rice", words: [/\brice\b/i], season: "kharif", sow: [[6, 15, 7, 31]], temp: [24, 35], grow: [7, 8, 9, 10] },
  { id: "maize", ur: "مکئی", en: "Maize", words: [/\bmaize\b/i, /\bcorn\b/i], exclude: [/popcorn/i], season: "kharif", sow: [[2, 1, 3, 15], [7, 20, 8, 20]], temp: [17, 32], grow: [2, 3, 4, 5, 8, 9, 10, 11] },
  { id: "cotton", ur: "کپاس", en: "Cotton", words: [/\bcotton\b/i], season: "kharif", sow: [[4, 1, 5, 31]], temp: [22, 34], grow: [5, 6, 7, 8, 9, 10] },
  { id: "sugarcane", ur: "گنا", en: "Sugarcane", words: [/sugarcane/i], season: "both", sow: [[2, 15, 3, 31], [9, 1, 10, 15]], temp: [20, 32], grow: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: "potato", ur: "آلو", en: "Potato", words: [/\bpotato\b/i], exclude: [/sweet ?potato/i], season: "rabi", sow: [[10, 1, 10, 31], [1, 15, 2, 15]], temp: [14, 26], grow: [10, 11, 12, 1] },
  { id: "barley", ur: "جو", en: "Barley", words: [/\bbarley\b/i], season: "rabi", sow: [[11, 1, 11, 30]], temp: [9, 22], habit: true, grow: [11, 12, 1, 2, 3] },
  { id: "oat", ur: "جئی (چارہ)", en: "Oat (fodder)", words: [/\boats?\b/i], season: "rabi", sow: [[10, 15, 11, 30]], temp: [10, 24], habit: true, grow: [11, 12, 1, 2, 3] },
  { id: "sorghum", ur: "جوار", en: "Sorghum", words: [/sorghum/i], season: "kharif", sow: [[3, 1, 8, 15]], temp: [21, 36], grow: [6, 7, 8, 9] },
  { id: "soybean", ur: "سویابین", en: "Soybean", words: [/soybean/i], season: "kharif", sow: [[6, 15, 7, 31], [2, 15, 3, 15]], temp: [22, 33], grow: [7, 8, 9, 10] },
  { id: "peanut", ur: "مونگ پھلی", en: "Groundnut (peanut)", words: [/peanut/i, /groundnut/i], season: "kharif", sow: [[4, 1, 6, 15]], temp: [22, 34], grow: [5, 6, 7, 8, 9] },
  { id: "bean", ur: "لوبیا / راجماش", en: "Dry bean", words: [/\bbeans?\b/i], exclude: [/soybean/i, /faba|fava/i, /mung/i], season: "kharif", sow: [[2, 15, 3, 31], [8, 1, 8, 31]], temp: [16, 28], grow: [3, 4, 5] },
  { id: "pea", ur: "مٹر", en: "Pea", words: [/\bpeas?\b/i], exclude: [/chickpea|peanut|cowpea/i], season: "rabi", sow: [[10, 15, 11, 30]], temp: [12, 24], grow: [11, 12, 1, 2] },
  { id: "chickpea", ur: "چنا", en: "Chickpea", words: [/chickpea/i], season: "rabi", sow: [[10, 1, 11, 10]], temp: [17, 28], grow: [11, 12, 1, 2, 3] },
  { id: "canola", ur: "سرسوں / کینولا", en: "Canola / mustard", words: [/canola/i, /rapeseed/i, /mustard/i], season: "rabi", sow: [[10, 1, 11, 15]], temp: [14, 26], grow: [10, 11, 12, 1, 2] },
  { id: "sunflower", ur: "سورج مکھی", en: "Sunflower", words: [/sunflower/i], season: "both", sow: [[1, 15, 2, 28], [7, 15, 8, 15]], temp: [18, 32], grow: [2, 3, 4, 5] },
  { id: "tomato", ur: "ٹماٹر", en: "Tomato", words: [/tomato/i], season: "both", sow: [[2, 1, 3, 15], [8, 1, 9, 15]], temp: [17, 30], grow: [2, 3, 4, 5] },
  { id: "alfalfa", ur: "لوسرن (چارہ)", en: "Alfalfa / lucerne", words: [/alfalfa/i, /lucerne/i], season: "rabi", sow: [[10, 1, 11, 30]], temp: [12, 28], grow: [10, 11, 12, 1, 2, 3, 4] },
];

export const cropById = (id) => CROPS.find((c) => c.id === id) || null;
export function cropOf(text = "") {
  for (const c of CROPS) if (c.words.some((r) => r.test(text)) && !(c.exclude || []).some((r) => r.test(text))) return c.id;
  return null;
}

// Institutions whose seed varieties are researched and compared.
// Ranks 1–10 = world top 10 (QS 2026 Agriculture & Forestry, lib/research-centers.js).
// Ranks 11–15 are searched too, so crops the top 10 don't breed (cotton, sugarcane, peanut)
// still get world-class options; their rank is always shown.
// `credit`: patterns that must appear in the "developed / released by" sentence of a registration
// (co-authors from other universities don't count). `seed`: where certified seed / licences come from.
import { CENTERS } from "@/lib/research-centers";

const EXTRA = [
  { id: "tamu", rank: 11, short: "Texas A&M", name_en: "Texas A&M University", name_ur: "ٹیکساس اے اینڈ ایم یونیورسٹی", country_en: "United States", country_ur: "امریکہ", web: "https://agriliferesearch.tamu.edu", aff: "Texas A&M University" },
  { id: "msu", rank: 12, short: "Michigan State", name_en: "Michigan State University", name_ur: "مشی گن اسٹیٹ یونیورسٹی", country_en: "United States", country_ur: "امریکہ", web: "https://www.canr.msu.edu", aff: "Michigan State University" },
  { id: "uf", rank: 13, short: "Florida", name_en: "University of Florida", name_ur: "یونیورسٹی آف فلوریڈا", country_en: "United States", country_ur: "امریکہ", web: "https://ifas.ufl.edu", aff: "University of Florida" },
  { id: "ubc", rank: 14, short: "UBC", name_en: "University of British Columbia", name_ur: "یونیورسٹی آف برٹش کولمبیا", country_en: "Canada", country_ur: "کینیڈا", web: "https://www.landfood.ubc.ca", aff: "University of British Columbia" },
  { id: "guelph", rank: 14, short: "Guelph", name_en: "University of Guelph", name_ur: "یونیورسٹی آف گوئلف", country_en: "Canada", country_ur: "کینیڈا", web: "https://www.uoguelph.ca/oac", aff: "University of Guelph" },
];

const CREDIT = {
  wur: /wageningen/i, ucdavis: /(university of california,?\s*davis|uc[\s-]?davis|univ\.? of california,? davis)/i, slu: /swedish university of agricultural sciences|\bslu\b/i,
  cornell: /cornell/i, cau: /china agricultural university/i, purdue: /purdue/i, iastate: /iowa state/i, ethz: /eth z(u|ü)rich/i,
  ugent: /ghent university|\bugent\b/i, nmbu: /norwegian university of life sciences|\bnmbu\b/i,
  tamu: /texas a\s*&(amp;)?\s*m|agrilife/i, msu: /michigan state/i, uf: /university of florida|uf\/ifas|\bifas\b/i,
  ubc: /university of british columbia/i, guelph: /guelph/i,
};

// Certified-seed programmes that handle university varieties (licensing / foundation seed).
const SEED = {
  ucdavis: "UC Davis Foundation Seed Program", cornell: "Cornell — New York Seed Improvement Project", purdue: "Purdue — Indiana Crop Improvement Association",
  iastate: "Iowa State — Iowa Crop Improvement Association", tamu: "Texas A&M AgriLife Research (licensed seed companies)", msu: "Michigan Crop Improvement Association",
  uf: "UF/IFAS and Florida Sugar Cane League (sugarcane)", guelph: "University of Guelph (licensed seed companies)",
};

export const INSTITUTIONS = [
  ...CENTERS.map((c) => ({ id: c.id, rank: c.rank, short: c.short, name_en: c.name_en, name_ur: c.name_ur, country_en: c.country_en, country_ur: c.country_ur, web: c.web, aff: c.aff })),
  ...EXTRA,
].map((x) => ({ ...x, credit: CREDIT[x.id], seed: SEED[x.id] || null, top10: x.rank <= 10 }));

export const instById = (id) => INSTITUTIONS.find((x) => x.id === id) || null;

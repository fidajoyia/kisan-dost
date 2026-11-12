// World top 10 agricultural research institutions: QS World University Rankings by Subject 2026,
// Agriculture & Forestry (published 2026). Update this list when QS publishes a new year.
// `aff`   = affiliation text used to find the institution's new papers (Europe PMC / OpenAlex).
// `match` = patterns that recognise the institution in an article.
// `feeds` = optional official RSS/Atom feeds; Google News is always used as a keyless fallback.
export const RANKING = { name: "QS World University Rankings by Subject 2026 — Agriculture & Forestry", year: 2026 };

export const CENTERS = [
  {
    id: "wur", rank: 1, short: "Wageningen",
    name_en: "Wageningen University & Research", name_ur: "واخننگن یونیورسٹی اینڈ ریسرچ",
    country_en: "Netherlands", country_ur: "ہالینڈ",
    focus_en: "Plant breeding, potato and vegetable seed, greenhouse horticulture, soil and water, food systems",
    focus_ur: "پودوں کی افزائش، آلو اور سبزیوں کا بیج، گرین ہاؤس باغبانی، مٹی اور پانی، خوراک کا نظام",
    web: "https://www.wur.nl/en.htm", aff: "Wageningen",
    match: [/wageningen/i], feeds: [], news_q: "Wageningen University research crops OR agriculture",
  },
  {
    id: "ucdavis", rank: 2, short: "UC Davis",
    name_en: "University of California, Davis", name_ur: "یونیورسٹی آف کیلیفورنیا، ڈیوس",
    country_en: "United States", country_ur: "امریکہ",
    focus_en: "Plant sciences, seed biotechnology, tomato genetics, irrigation and drought, fruit and vegetable crops",
    focus_ur: "پودوں کی سائنس، بیج کی بائیو ٹیکنالوجی، ٹماٹر کی جینیات، آبپاشی اور خشک سالی، پھل اور سبزیاں",
    web: "https://www.ucdavis.edu", aff: "University of California, Davis",
    match: [/uc davis/i, /university of california,? davis/i], feeds: [], news_q: "\"UC Davis\" crop OR plant OR agriculture research",
  },
  {
    id: "slu", rank: 3, short: "SLU",
    name_en: "Swedish University of Agricultural Sciences", name_ur: "سویڈش یونیورسٹی آف ایگریکلچرل سائنسز",
    country_en: "Sweden", country_ur: "سویڈن",
    focus_en: "Crop production ecology, soil health, plant protection, forestry, livestock",
    focus_ur: "فصل کی پیداوار، مٹی کی صحت، پودوں کا تحفظ، جنگلات، مویشی",
    web: "https://www.slu.se/en/", aff: "Swedish University of Agricultural Sciences",
    match: [/swedish university of agricultural sciences/i, /\bslu\b/], feeds: [], news_q: "\"Swedish University of Agricultural Sciences\"",
  },
  {
    id: "cornell", rank: 4, short: "Cornell",
    name_en: "Cornell University", name_ur: "کارنیل یونیورسٹی",
    country_en: "United States", country_ur: "امریکہ",
    focus_en: "Plant breeding and genetics, wheat rust (Borlaug Global Rust Initiative), plant pathology, soil science",
    focus_ur: "پودوں کی افزائش و جینیات، گندم کی کنگی (بورلاگ گلوبل رسٹ انیشی ایٹو)، پودوں کی بیماریاں، مٹی کی سائنس",
    web: "https://cals.cornell.edu", aff: "Cornell University",
    match: [/cornell/i], feeds: [], news_q: "Cornell CALS crop OR plant research",
  },
  {
    id: "cau", rank: 5, short: "CAU",
    name_en: "China Agricultural University", name_ur: "چائنا ایگریکلچرل یونیورسٹی",
    country_en: "China", country_ur: "چین",
    focus_en: "Crop science, maize and wheat breeding, fertilizer and nutrient management for smallholders",
    focus_ur: "فصلوں کی سائنس، مکئی اور گندم کی افزائش، چھوٹے کسانوں کے لیے کھاد اور غذائی اجزاء کا انتظام",
    web: "https://en.cau.edu.cn", aff: "China Agricultural University",
    match: [/china agricultural university/i], feeds: [], news_q: "\"China Agricultural University\" research",
  },
  {
    id: "purdue", rank: 6, short: "Purdue",
    name_en: "Purdue University", name_ur: "پرڈیو یونیورسٹی",
    country_en: "United States", country_ur: "امریکہ",
    focus_en: "Agronomy, crop and soil sciences, plant stress, food science, agricultural economics",
    focus_ur: "زراعت، فصل اور مٹی کی سائنس، پودوں پر دباؤ (گرمی/خشکی)، فوڈ سائنس، زرعی معاشیات",
    web: "https://ag.purdue.edu", aff: "Purdue University",
    match: [/purdue/i], feeds: [], news_q: "Purdue agriculture crop research",
  },
  {
    id: "iastate", rank: 7, short: "Iowa State",
    name_en: "Iowa State University", name_ur: "آئیووا اسٹیٹ یونیورسٹی",
    country_en: "United States", country_ur: "امریکہ",
    focus_en: "Maize and soybean agronomy, plant breeding, seed science and seed testing",
    focus_ur: "مکئی اور سویابین، پودوں کی افزائش، بیج کی سائنس اور بیج کی جانچ",
    web: "https://www.cals.iastate.edu", aff: "Iowa State University",
    match: [/iowa state/i], feeds: [], news_q: "\"Iowa State University\" crop OR seed research",
  },
  {
    id: "ethz", rank: 8, short: "ETH Zurich",
    name_en: "ETH Zurich", name_ur: "ای ٹی ایچ زیورخ",
    country_en: "Switzerland", country_ur: "سوئٹزرلینڈ",
    focus_en: "Plant sciences, crop genetics, sustainable agroecosystems, world food systems",
    focus_ur: "پودوں کی سائنس، فصلوں کی جینیات، پائیدار زرعی نظام، عالمی خوراک کا نظام",
    web: "https://ethz.ch/en.html", aff: "ETH Zurich",
    match: [/eth z(u|ü)rich/i], feeds: [], news_q: "\"ETH Zurich\" plant OR crop OR agriculture",
  },
  {
    id: "ugent", rank: 9, short: "Ghent",
    name_en: "Ghent University", name_ur: "گینٹ یونیورسٹی",
    country_en: "Belgium", country_ur: "بیلجیم",
    focus_en: "Bioscience engineering, plant biotechnology and systems biology, soil and crop protection",
    focus_ur: "بایو سائنس انجینئرنگ، پودوں کی بائیو ٹیکنالوجی، مٹی اور فصل کا تحفظ",
    web: "https://www.ugent.be/en", aff: "Ghent University",
    match: [/ghent university/i, /\bugent\b/i], feeds: [], news_q: "\"Ghent University\" plant OR crop research",
  },
  {
    id: "nmbu", rank: 10, short: "NMBU",
    name_en: "Norwegian University of Life Sciences", name_ur: "نارویجن یونیورسٹی آف لائف سائنسز",
    country_en: "Norway", country_ur: "ناروے",
    focus_en: "Plant sciences, soil, agroecology, international development (Noragric)",
    focus_ur: "پودوں کی سائنس، مٹی، زرعی ماحولیات، بین الاقوامی ترقی (نوراگرک)",
    web: "https://www.nmbu.no/en", aff: "Norwegian University of Life Sciences",
    match: [/norwegian university of life sciences/i, /\bnmbu\b/i], feeds: [], news_q: "\"Norwegian University of Life Sciences\"",
  },
];

export const centerById = (id) => CENTERS.find((c) => c.id === id) || null;

export function detectCenter(text = "") {
  for (const c of CENTERS) if (c.match.some((re) => re.test(text))) return c.id;
  return null;
}

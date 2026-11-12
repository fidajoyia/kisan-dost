// Seed / variety catalogue. New research from the world top-10 institutions (lib/research-centers.js)
// is attached to these cards by crop, through the research feed.
//
// zones: suitability 0 (avoid) · 1 (possible, with care) · 2 (well suited)
//   normal = ordinary irrigated land
//   sem    = سیم / تھور / کلر: waterlogged or salt-affected land
//   rait   = ریتلی زمین: sandy land (Thal, Cholistan, Thar, Kharan)
// sow:  sowing windows for the plains of Punjab / Sindh as [month, day, month, day].
//       Sindh is often ~2 weeks earlier for rabi; hills and Gilgit-Baltistan differ a lot,
//       which the temperature check catches.
// temp: [low, high] daily MEAN temperature (°C, average of max and min) that suits sowing.
// origin: where the variety's parent material came from, only where published.
// variety: a name, or { ur, en } for a generic recommendation.
// get:  certified | institute | imported | research  (see GET_TEXT)
export const SEEDS = [
  // ---------------- Rabi (winter) ----------------
  {
    id: "wheat-akbar19", crop: "wheat", season: "rabi",
    crop_ur: "گندم", crop_en: "Wheat", variety: "Akbar-2019",
    zones: { normal: 2, sem: 1, rait: 1 }, sow: [[11, 1, 12, 10]], temp: [11, 22],
    origin: "CIMMYT germplasm", by: "Wheat Research Institute, AARI Faisalabad", year: 2019, get: "certified",
    tags: ["zinc", "late"],
    note_ur: "زنک والی، کنگی (rust) کے خلاف مزاحم، 10 دسمبر تک دیر سے کاشت کے لیے بھی موزوں۔ پرانی اقسام فیصل آباد-2008 اور پاکستان-2013 کو کنگی لگتی ہے، ان کا رقبہ کم رکھیں۔",
    note_en: "Zinc-biofortified, rust resistant, also fits late sowing up to 10 December. Older Faisalabad-2008 and Pakistan-2013 are rust-prone, so keep them on less land.",
  },
  {
    id: "wheat-dilkash20", crop: "wheat", season: "rabi",
    crop_ur: "گندم", crop_en: "Wheat", variety: "Dilkash-2020",
    zones: { normal: 2, sem: 1, rait: 1 }, sow: [[11, 1, 12, 10]], temp: [11, 22],
    by: "Wheat Research Institute, Faisalabad", year: 2021, get: "certified",
    tags: ["late"],
    note_ur: "زیادہ پیداوار اور بیماری کے خلاف مزاحمت۔ کپاس یا دھان کے بعد دیر سے کاشت (10 دسمبر تک) کے لیے اچھی۔",
    note_en: "High yield and disease resistance. Good after cotton or rice when sowing is late (up to 10 December).",
  },
  {
    id: "wheat-arooj22", crop: "wheat", season: "rabi",
    crop_ur: "گندم", crop_en: "Wheat", variety: "Arooj-2022",
    zones: { normal: 2, sem: 1, rait: 2 }, sow: [[10, 15, 12, 10]], temp: [11, 23],
    by: "Punjab Agriculture Department", year: 2022, get: "certified",
    tags: ["late", "rainfed"],
    note_ur: "آبپاش اور بارانی دونوں زمینوں کے لیے منظور؛ دیر سے کاشت کے لیے بھی موزوں۔ کم پانی والی ریتلی زمین میں اچھا انتخاب۔",
    note_en: "Approved for both irrigated and rainfed (barani) land; suits late sowing. A good pick for sandy land with limited water.",
  },
  {
    id: "wheat-nawab21", crop: "wheat", season: "rabi",
    crop_ur: "گندم", crop_en: "Wheat", variety: "Nawab-2021",
    zones: { normal: 2, sem: 1, rait: 1 }, sow: [[11, 1, 11, 30]], temp: [11, 22],
    origin: "CIMMYT germplasm", by: "Punjab Agriculture Department", year: 2021, get: "certified",
    tags: ["zinc", "south"],
    note_ur: "جنوبی پنجاب کے لیے بہترین، زنک زیادہ۔ وقت پر (نومبر میں) کاشت کریں۔",
    note_en: "Best for south Punjab, higher zinc. Sow on time (in November).",
  },
  {
    id: "barley", crop: "barley", season: "rabi",
    crop_ur: "جو", crop_en: "Barley", variety: { ur: "منظور شدہ اقسام", en: "approved varieties" },
    zones: { normal: 1, sem: 2, rait: 2 }, sow: [[11, 1, 11, 30]], temp: [9, 22],
    by: "Provincial agriculture departments", get: "certified",
    tags: ["salt", "drought"],
    note_ur: "جو گندم سے زیادہ نمک اور خشکی برداشت کرتا ہے، اس لیے کلر والی اور ریتلی زمین پر گندم کی جگہ اچھا متبادل ہے۔ اپنے ضلع کی منظور شدہ قسم کا نام محکمہ زراعت (توسیع) سے لیں۔",
    note_en: "Barley tolerates more salt and drought than wheat, so it is a good replacement for wheat on kallar and sandy land. Get the approved variety name for your district from the agriculture extension office.",
  },
  {
    id: "chickpea-thal2020", crop: "chickpea", season: "rabi",
    crop_ur: "چنا (دیسی)", crop_en: "Chickpea (desi)", variety: "Thal-2020",
    zones: { normal: 1, sem: 0, rait: 2 }, sow: [[10, 1, 11, 10]], temp: [17, 28],
    by: "Arid Zone Research Institute (AZRI), Bhakkar", year: 2021, get: "institute",
    tags: ["drought", "wilt"],
    note_ur: "تھل کی بارانی ریتلی زمین (بھکر، خوشاب، لیہ، جھنگ) کے لیے۔ اکھیڑا (wilt) اور جھلساؤ (blight) کے خلاف مزاحم، خشکی برداشت۔ چنا نمک برداشت نہیں کرتا، کلر والی زمین پر نہ لگائیں۔",
    note_en: "For rainfed sandy Thal (Bhakkar, Khushab, Layyah, Jhang). Resists Fusarium wilt and Ascochyta blight, tolerates drought. Chickpea does not tolerate salt, so avoid kallar land.",
  },
  {
    id: "lentil", crop: "lentil", season: "rabi",
    crop_ur: "مسور", crop_en: "Lentil", variety: { ur: "منظور شدہ اقسام", en: "approved varieties" },
    zones: { normal: 2, sem: 0, rait: 1 }, sow: [[10, 15, 11, 15]], temp: [14, 25],
    by: "Pulses Research Institute, AARI Faisalabad / NARC", get: "certified",
    tags: [],
    note_ur: "ICARDA مسور کی عالمی افزائش کا مرکز ہے؛ پاکستان میں NARC اور دالوں کے تحقیقی ادارے اس کی لائنیں آزماتے ہیں۔ نمکین زمین پر نہ لگائیں۔",
    note_en: "ICARDA leads global lentil breeding; NARC and Pakistan's pulses institutes test its lines. Avoid salty land.",
  },
  {
    id: "quinoa-uafq7", crop: "quinoa", season: "rabi",
    crop_ur: "کنوا (Quinoa)", crop_en: "Quinoa", variety: "UAF-Q7",
    zones: { normal: 1, sem: 2, rait: 2 }, sow: [[11, 1, 11, 30]], temp: [8, 22],
    by: "University of Agriculture, Faisalabad", year: 2020, get: "institute",
    tags: ["salt", "drought", "frost"],
    note_ur: "پاکستان کی پہلی منظور شدہ کنوا قسم (پنجاب سیڈ کونسل)۔ کورا، نمک اور خشکی برداشت؛ نومبر میں کاشت، اپریل میں برداشت۔ فروخت کا انتظام پہلے سے کر لیں، منڈی ابھی چھوٹی ہے۔",
    note_en: "Pakistan's first approved quinoa (Punjab Seed Council). Tolerates frost, salt and drought; sow in November, harvest in April. Line up a buyer first because the market is still small.",
  },
  {
    id: "potato", crop: "potato", season: "rabi",
    crop_ur: "آلو", crop_en: "Potato", variety: { ur: "درآمدی / مقامی تصدیق شدہ بیج", en: "imported or certified seed" },
    zones: { normal: 2, sem: 0, rait: 1 }, sow: [[10, 1, 10, 31], [1, 15, 2, 15]], temp: [14, 26],
    by: "Seed companies (import) · Punjab Seed Corporation", get: "imported",
    tags: ["virus-free"],
    note_ur: "خزاں کی فصل اکتوبر میں اور بہار کی فصل وسط جنوری تا وسط فروری۔ پاکستان میں آلو کا زیادہ تر بیج ہالینڈ سے درآمد ہوتا ہے؛ وائرس سے پاک (certified) بیج ہی لیں۔ ریتلی میرا زمین ٹھیک ہے، کلر والی نہیں۔",
    note_en: "Autumn crop in October, spring crop mid-January to mid-February. Most seed potato in Pakistan is imported from the Netherlands; use only certified virus-free seed. Sandy loam is fine, salty land is not.",
  },

  // ---------------- Kharif (summer) ----------------
  {
    id: "rice-ir6", crop: "rice", season: "kharif",
    crop_ur: "دھان (موٹا چاول)", crop_en: "Rice (coarse)", variety: "IR-6 (IRRI-6)",
    zones: { normal: 2, sem: 2, rait: 0 }, sow: [[6, 15, 7, 31]], temp: [24, 35],
    origin: "IRRI variety", by: "IRRI line released in Pakistan", get: "certified",
    tags: ["waterlogging"],
    note_ur: "سیم والی زمین پر دھان سب سے موزوں فصل ہے کیونکہ کھڑا پانی برداشت کرتا ہے؛ جپسم کے ساتھ کلر والی زمین کی بحالی میں بھی کاشت ہوتی ہے۔ تاریخ لاب (منتقلی) کی ہے، پنیری مئی کے آخر سے جون میں۔",
    note_en: "Rice is the best fit for waterlogged land because it tolerates standing water; it is also grown with gypsum to reclaim kallar soils. Dates are for transplanting; the nursery goes in late May to June.",
  },
  {
    id: "rice-shua92", crop: "rice", season: "kharif",
    crop_ur: "دھان (نمکین زمین)", crop_en: "Rice (saline land)", variety: "Shua-92",
    zones: { normal: 1, sem: 2, rait: 0 }, sow: [[6, 15, 7, 31]], temp: [24, 35],
    by: "Nuclear Institute of Agriculture (NIA), Tando Jam", get: "institute",
    tags: ["salt"],
    note_ur: "NIA ٹنڈو جام نے خاص طور پر نمکین زمینوں کے لیے جاری کی۔ بیج کے لیے NIA یا سندھ کے محکمہ زراعت سے رابطہ کریں۔",
    note_en: "Released by NIA Tando Jam specifically for saline lands. Ask NIA or the Sindh agriculture department for seed.",
  },
  {
    id: "maize-hybrid", crop: "maize", season: "kharif",
    crop_ur: "مکئی", crop_en: "Maize", variety: { ur: "گرمی برداشت ہائبرڈ", en: "heat-tolerant hybrids" },
    zones: { normal: 2, sem: 0, rait: 1 }, sow: [[2, 1, 3, 15], [7, 20, 8, 20]], temp: [17, 32],
    by: "MMRI Sahiwal · CCRI Nowshera · seed companies", get: "certified",
    tags: ["heat", "drought"],
    note_ur: "2017–2020 میں CIMMYT سے بنی 20 سے زیادہ اقسام اور ہائبرڈ پاکستان میں منظور ہوئے، جن میں گرمی اور خشکی برداشت کرنے والے بھی ہیں۔ بہاریہ: فروری تا وسط مارچ، موسمی: جولائی کے آخر تا اگست۔",
    note_en: "Over 20 CIMMYT-derived varieties and hybrids, including heat- and drought-tolerant ones, were released in Pakistan in 2017–2020. Spring crop: February to mid-March; autumn crop: late July to August.",
  },
  {
    id: "bajra", crop: "pearl millet", season: "kharif",
    crop_ur: "باجرہ", crop_en: "Pearl millet (bajra)", variety: { ur: "منظور شدہ اقسام / ہائبرڈ", en: "approved varieties or hybrids" },
    zones: { normal: 1, sem: 1, rait: 2 }, sow: [[6, 15, 8, 15]], temp: [24, 36],
    by: "Seed companies · AARI Faisalabad", get: "certified",
    tags: ["heat", "drought"],
    note_ur: "گرم، خشک ریتلی زمین کی سب سے مضبوط فصل؛ دانہ اور چارہ دونوں۔ ICRISAT کے ہائبرڈ والدین کئی کمپنیوں کے بیج میں استعمال ہوتے ہیں۔",
    note_en: "The hardiest crop for hot, dry sandy land; grain and fodder. ICRISAT hybrid parents are used in many companies' seed.",
  },
  {
    id: "sorghum", crop: "sorghum", season: "kharif",
    crop_ur: "جوار (چارہ / دانہ)", crop_en: "Sorghum (fodder / grain)", variety: { ur: "منظور شدہ اقسام", en: "approved varieties" },
    zones: { normal: 2, sem: 1, rait: 2 }, sow: [[3, 1, 8, 15]], temp: [21, 36],
    by: "Fodder Research Institute, Sargodha · seed companies", get: "certified",
    tags: ["heat", "salt"],
    note_ur: "جوار درمیانہ نمک اور گرمی برداشت کرتی ہے؛ ICBA نمکین پانی پر جوار کی اقسام آزماتا ہے۔ کچی جوار کا چارہ زہریلا ہو سکتا ہے، پھول آنے کے بعد کاٹیں۔",
    note_en: "Sorghum handles moderate salt and heat; ICBA tests sorghum lines on salty water. Young sorghum fodder can be toxic, so cut it after flowering.",
  },
  {
    id: "guar-br2017", crop: "guar", season: "kharif",
    crop_ur: "گوارہ", crop_en: "Guar (cluster bean)", variety: "BR-2017 · Thal Guara · BR-99",
    zones: { normal: 1, sem: 0, rait: 2 }, sow: [[6, 15, 7, 31]], temp: [24, 38],
    by: "Punjab Agriculture Department (Thal and south Punjab)", year: 2017, get: "certified",
    tags: ["drought", "heat"],
    note_ur: "بھکر، لیہ، خوشاب اور بہاول پور، ڈیرہ غازی خان، ملتان، سرگودھا ڈویژن کے لیے منظور۔ ریتلی زمین اور کم پانی میں کامیاب، زمین میں نائٹروجن بھی بڑھاتا ہے۔",
    note_en: "Approved for Bhakkar, Layyah, Khushab and the Bahawalpur, D.G. Khan, Multan and Sargodha divisions. Does well on sandy land with little water and adds nitrogen to the soil.",
  },
  {
    id: "mung-nm2021", crop: "mungbean", season: "kharif",
    crop_ur: "مونگ", crop_en: "Mungbean", variety: "NIAB Mung 2021",
    zones: { normal: 2, sem: 0, rait: 2 }, sow: [[3, 1, 4, 15], [6, 15, 7, 31]], temp: [21, 36],
    by: "NIAB, Faisalabad", year: 2021, get: "certified",
    tags: ["short"],
    note_ur: "بڑا دانہ، اچھی غذائیت۔ بہاریہ مونگ مارچ تا وسط اپریل، تھل میں خریف مونگ جون تا جولائی۔ گندم کے بعد کم دنوں کی فصل۔",
    note_en: "Large bold grain, good nutrition. Spring mung March to mid-April; kharif mung in Thal June to July. A short crop after wheat.",
  },
  {
    id: "tomato-heat", crop: "tomato", season: "kharif",
    crop_ur: "ٹماٹر", crop_en: "Tomato", variety: { ur: "گرمی برداشت ہائبرڈ", en: "heat-tolerant hybrids" },
    zones: { normal: 2, sem: 0, rait: 1 }, sow: [[2, 1, 3, 15], [8, 1, 9, 15]], temp: [17, 30],
    by: "Seed companies (mostly imported hybrid seed)", get: "imported",
    tags: ["heat"],
    note_ur: "تاریخیں پنیری کی منتقلی کی ہیں۔ پاکستان میں ٹماٹر کا زیادہ تر ہائبرڈ بیج درآمد ہوتا ہے؛ WorldVeg گرمی برداشت کرنے والی لائنیں تیار کرتا ہے۔",
    note_en: "Dates are for transplanting. Most hybrid tomato seed in Pakistan is imported; WorldVeg breeds heat-tolerant lines.",
  },

  // ---------------- Reclamation crops for sem / kallar land ----------------
  {
    id: "dhaincha", crop: "sesbania", season: "kharif",
    crop_ur: "ڈھینچہ (سبز کھاد)", crop_en: "Dhaincha / Sesbania (green manure)", variety: { ur: "مقامی بیج", en: "local seed" },
    zones: { normal: 1, sem: 2, rait: 1 }, sow: [[4, 15, 6, 30]], temp: [23, 38],
    by: "Soil Salinity Research Institute, Pindi Bhattian", get: "certified",
    tags: ["reclaim", "salt", "waterlogging"],
    note_ur: "کلر اور سیم والی زمین کی بحالی: 6–8 ہفتے بعد ہل چلا کر زمین میں ملا دیں، پھر دھان لگائیں۔ کھڑا پانی اور نمک دونوں برداشت کرتا ہے۔",
    note_en: "Reclaims kallar and waterlogged land: plough it in after 6–8 weeks, then plant rice. Tolerates both standing water and salt.",
  },
  {
    id: "kallar-grass", crop: "kallar grass", season: "kharif",
    crop_ur: "کلر گھاس (چارہ)", crop_en: "Kallar grass (Leptochloa fusca)", variety: { ur: "قلمیں / جڑ دار پودے", en: "rooted cuttings" },
    zones: { normal: 0, sem: 2, rait: 0 }, sow: [[3, 1, 8, 31]], temp: [20, 40],
    by: "NIAB, Faisalabad (biosaline research)", get: "institute",
    tags: ["reclaim", "salt", "waterlogging"],
    note_ur: "بہت زیادہ نمکین اور سوڈک (کلر) زمین پر بھی اگتی ہے اور جانوروں کا چارہ دیتی ہے؛ 2–3 سال میں زمین کی حالت بہتر کرتی ہے۔ بیج نہیں، قلمیں لگتی ہیں۔",
    note_en: "Grows even on very saline-sodic (kallar) land and gives animal fodder; improves the soil over 2–3 years. Planted from cuttings, not seed.",
  },
];

export const ZONES = {
  normal: { ur: "عام زمین", en: "Normal land" },
  sem: { ur: "سیم / تھور (کلر)", en: "Sem / kallar (waterlogged, salty)" },
  rait: { ur: "ریتلی زمین (تھل، چولستان، تھر)", en: "Sandy land (Thal, Cholistan, Thar)" },
};

export const GET_TEXT = {
  certified: {
    ur: "پاکستان میں دستیاب: پنجاب / سندھ سیڈ کارپوریشن یا رجسٹرڈ بیج کمپنی سے تصدیق شدہ بیج لیں۔ تھیلے پر سرٹیفکیشن ٹیگ اور لاٹ نمبر ضرور دیکھیں۔ درآمد کی ضرورت نہیں۔",
    en: "Available in Pakistan: buy certified seed from the Punjab / Sindh Seed Corporation or a registered seed company. Check the certification tag and lot number on the bag. No import needed.",
  },
  institute: {
    ur: "محدود مقدار: بیج تیار کرنے والے ادارے سے براہ راست رابطہ کریں۔ درآمد کی ضرورت نہیں۔",
    en: "Limited supply: contact the institute that developed it directly. No import needed.",
  },
  imported: {
    ur: "زیادہ تر بیج رجسٹرڈ کمپنیاں درآمد کرتی ہیں، اس لیے رجسٹرڈ ڈیلر سے لیں۔ خود درآمد کرنا ہو تو 'درآمد' والے حصے میں طریقہ دیکھیں۔",
    en: "Most seed is imported by registered companies, so buy from a registered dealer. To import yourself, see the import steps.",
  },
  research: {
    ur: "صرف تحقیقی مواد: تحقیقی ادارہ ہی پرمٹ کے ساتھ منگوا سکتا ہے۔",
    en: "Research material only: a research institute can bring it in with a permit.",
  },
};

// ---- Temperature + calendar logic ----
const dayOfYear = (m, d) => Math.floor((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / 864e5);

function windowStatus(sow, date) {
  const today = dayOfYear(date.getMonth() + 1, date.getDate());
  let best = { inWindow: false, daysToStart: 999, daysLeft: 0 };
  for (const [m1, d1, m2, d2] of sow) {
    const a = dayOfYear(m1, d1), b = dayOfYear(m2, d2);
    const inside = a <= b ? today >= a && today <= b : today >= a || today <= b;
    if (inside) {
      const left = (b - today + 365) % 365;
      return { inWindow: true, daysToStart: 0, daysLeft: left };
    }
    const until = (a - today + 365) % 365;
    if (until < best.daysToStart) best = { inWindow: false, daysToStart: until, daysLeft: 0 };
  }
  return best;
}

// Summarise the live forecast into the temperatures the advisor uses.
export function tempSummary(wx) {
  const fut = (wx?.days || []).filter((d) => !d.past && d.tmax != null && d.tmin != null).slice(0, 14);
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

// status: now | wait_cooler | wait_warmer | soon | later
export function rankSeeds({ zone = "normal", temps, date = new Date() }) {
  return SEEDS.map((s) => {
    const fit = s.zones[zone] ?? 0;
    const w = windowStatus(s.sow, date);
    const t = temps?.mean14;
    let status;
    if (w.inWindow) {
      if (t == null || (t >= s.temp[0] - 1 && t <= s.temp[1] + 1)) status = "now";
      else status = t > s.temp[1] ? "wait_cooler" : "wait_warmer";
    } else status = w.daysToStart <= 45 ? "soon" : "later";
    const order = { now: 0, wait_cooler: 1, wait_warmer: 1, soon: 2, later: 3 }[status];
    return { ...s, fit, status, daysToStart: w.daysToStart, daysLeft: w.daysLeft, score: order * 10 - fit * 3 };
  })
    .filter((s) => s.fit > 0)
    .sort((a, b) => a.score - b.score || a.daysToStart - b.daysToStart);
}

export const CROP_KEYS = [...new Set(SEEDS.map((s) => s.crop))];

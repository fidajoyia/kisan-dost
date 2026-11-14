// The research feed arrives as raw English titles and abstracts. These rules keep only items a Pakistani
// farmer can use and label each one in Urdu by crop and subject. Nothing is translated or invented: the
// original English title and the link stay with every item.
//
// Labels come from the TITLE. An abstract mentions many things in passing (a wheat paper compares with
// rice, a soil paper says "bacteria"), so it only counts when the title names no crop / subject at all
// and the abstract repeats the word at least twice.
// [id, pattern, Urdu, grown in Pakistan]
const CROPS = [
  ["wheat", /\bwheat\b/gi, "گندم", 1], ["rice", /\brice\b|\bpaddy\b/gi, "چاول (دھان)", 1], ["maize", /\bmaize\b|\bcorn\b/gi, "مکئی", 1],
  ["cotton", /\bcotton\b/gi, "کپاس", 1], ["sugarcane", /sugarcane|sugar cane/gi, "گنا", 1], ["potato", /\bpotato/gi, "آلو", 1],
  ["tomato", /\btomato/gi, "ٹماٹر", 1], ["onion", /\bonions?\b/gi, "پیاز", 1], ["chickpea", /chickpea/gi, "چنا", 1],
  ["mango", /\bmango/gi, "آم", 1], ["citrus", /citrus|\boranges?\b|kinnow|mandarin/gi, "کینو / ترشاوہ", 1],
  ["vegetables", /vegetable|pumpkin|squash|cucumber|\bpeppers?\b|chilli|okra|spinach|cabbage|cauliflower|\bmelon|muskmelon/gi, "سبزیاں", 1],
  ["oilseed", /canola|rapeseed|mustard|sunflower/gi, "تیل دار فصلیں", 1], ["pulses", /\blentil|mung ?bean|\bpulses\b/gi, "دالیں", 1],
  ["sorghum", /sorghum/gi, "جوار", 1], ["millet", /millet/gi, "باجرہ", 1], ["barley", /\bbarley/gi, "جو", 1],
  ["fodder", /fodder|forage|silage|alfalfa|\bclover\b/gi, "چارہ", 1],
  ["livestock", /\bcattle\b|\bdairy\b|\bcows?\b|heifer|buffalo|\bgoats?\b|\bsheep\b|poultry|livestock/gi, "مویشی", 1],
  ["apple", /\bapples?\b/gi, "سیب", 0], ["soybean", /soybean|soya/gi, "سویابین", 0],
];
// [id, pattern, Urdu, a problem farmers here face every season]
const TOPICS = [
  ["disease", /disease|pathogen|blight|\bblast\b|\brust\b|\bscab\b|mildew|\bwilt\b|\brot\b|\bsmut\b|\w+ spot\b|leaf curl|\bvirus|huanglongbing|greening/gi, "بیماری", 1],
  ["pest", /\bpests?\b|insect|aphid|greenbug|weevil|borer|locust|whitefly|bollworm|armyworm|caterpillar|\bmites?\b/gi, "کیڑے", 1],
  ["heat", /heat stress|heat[- ]toleran|thermotoleran|heat ?wave|high[- ]temperature|\bheat\b/gi, "گرمی", 1],
  ["water", /drought|irrigat|water[- ](stress|use|saving|scarcity|deficit|productivity)/gi, "پانی / خشکی", 1],
  ["climate", /climate change|climate-smart|changing climate|elevated (atmospheric )?co/gi, "موسمیاتی تبدیلی", 0],
  ["salt", /salin|salt[- ](toleran|stress|affected)|sodic/gi, "کلر (نمکین زمین)", 1],
  ["seed", /\bseeds?\b|germination|breeding|cultivar|variet|\bhybrids?\b/gi, "بیج / نئی اقسام", 1],
  ["soil", /\bsoils?\b|fertili[sz]|\bnitrogen\b|phosph|manure|compost/gi, "زمین / کھاد", 0],
  ["yield", /\byields?\b|productivity|\bharvest/gi, "پیداوار", 0],
  ["practice", /on-farm|field trials?|\bmanagement\b|sowing|planting|intercrop|tillage|mulch/gi, "کاشت کے طریقے", 0],
  ["storage", /storage|post-?harvest|shelf life/gi, "ذخیرہ", 0],
  ["tech", /drone|sensor|satellite|machine learning|deep learning|robot/gi, "ٹیکنالوجی", 0],
  ["feed", /feed intake|\brations?\b|\bfeeding\b/gi, "خوراک (مویشی)", 0],
];
// Not farming, not for farmers, or lab work with no field use yet.
const OFF = /\bMoUs?\b|memorand|ranking|\baward|fundrais|appoint|alumni|campus|\bdogs?\b|\bcats?\b|insur|\blakes?\b|\bforests?\b|agroforestry|energy crops?|biogas|methane production|bioremediation|contaminated|salmonella|packaging|\bmeat\b|wild animals|single-cell|scrna|scatac|arabidopsis|methylation|\bhuman|patients?|clinical|cancer|covid|tourism|football|concert|dough|bakery|baking|reputation|domestication|phylogen|epidemiology of|chickadee|\bbeech\b|meadow|vineyard|\bbison\b|arctic|hydrolysate|drosophila/i;
// Laboratory biology (genes, proteins, methods) and food processing: true research, but nothing a farmer can act on.
const LAB = /\bgenes?\b|transcript|hormonom|metabol|proteom|protein|phosphorylat|biosynthes|kinase|signal+ing|chromosom|meio|\b(Os|Zm|Ta|Sl|Gh|St)[A-Z]\w+|multi-omics|dataset|protocol|corrigendum|correction|erratum|in vitro|\brats?\b|\bwine\b|flavou?r|textile|nano|ultrasound|fortification|processing|\bflour\b|trichome|photosynthe|conductance|sink-source|microbiome|microbial communit/i;
const FARM = /\bcrops?\b|farm|agricultur|agronom|irrigat|fertili[sz]|\bsoil|\bseeds?\b|orchard|harvest/i;

const count = (re, s) => (s.match(re) || []).length;
const found = (list, title, body) => {
  const inTitle = list.filter(([, re]) => count(re, title));
  return inTitle.length ? inTitle : list.filter(([, re]) => count(re, body) >= 2).slice(0, 2);
};

export function tagResearch(x) {
  const title = x.title || "", body = x.summary || "";
  if (OFF.test(title) || LAB.test(title)) return null;
  // a feeding or herd study is about the animals, even when it names the fodder crop first
  const crops = found(CROPS, title, body).sort((a, b) => (b[0] === "livestock") - (a[0] === "livestock")).slice(0, 2);
  const topics = found(TOPICS, title, body).slice(0, 3);
  if (!topics.length) return null;
  const pkCrop = crops.some((c) => c[3]), need = topics.some((t) => t[3]);
  // without a crop it must plainly be about farming and about a real field problem; a news story must name a crop
  if (!crops.length && (!FARM.test(title) || !need || /news\.google\./.test(x.link || ""))) return null;
  if (crops.length && !pkCrop && !need) return null; // e.g. apple storage, soybean yield maps
  return {
    crop: crops[0]?.[0] || "other",
    title_ur: [crops.map((c) => c[2]).join("، "), topics.map((t) => t[2]).join("، ")].filter(Boolean).join(" · "),
    tags: topics.map((t) => t[0]),
    // crop grown here + a problem farmers face = top of the list
    relevance: 20 + (pkCrop ? 40 : crops.length ? 10 : 0) + (need ? 25 : 0) + Math.min(2, topics.length) * 5,
  };
}

export const CROP_UR = Object.fromEntries(CROPS.map((c) => [c[0], c[2]]));

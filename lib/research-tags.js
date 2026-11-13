// Without an AI key the research feed arrives as raw English titles from the institutions' feeds.
// These rules keep only farming research and describe each item in Urdu from what the title and
// abstract actually mention (crop + subject). Nothing is translated or invented: the original
// English title and the link stay with every item.
const CROPS = [
  ["wheat", /\bwheat\b/i, "گندم"], ["rice", /\brice\b|paddy/i, "چاول (دھان)"], ["maize", /\bmaize\b|\bcorn\b/i, "مکئی"],
  ["cotton", /\bcotton\b/i, "کپاس"], ["sugarcane", /sugarcane|sugar cane/i, "گنا"], ["potato", /\bpotato/i, "آلو"],
  ["tomato", /\btomato/i, "ٹماٹر"], ["onion", /\bonion/i, "پیاز"], ["chickpea", /chickpea|\bgram\b/i, "چنا"],
  ["mango", /\bmango/i, "آم"], ["citrus", /citrus|\borange|kinnow|mandarin/i, "کینو / ترشاوہ"], ["apple", /\bapples?\b/i, "سیب"],
  ["vegetables", /vegetable|pumpkin|squash|cucumber|pepper|chilli|okra|spinach|cabbage|cauliflower/i, "سبزیاں"],
  ["soybean", /soybean|soya/i, "سویابین"], ["sorghum", /sorghum/i, "جوار"], ["millet", /millet/i, "باجرہ"], ["barley", /\bbarley/i, "جو"],
  ["fodder", /fodder|forage|silage|alfalfa|clover|grass/i, "چارہ"], ["livestock", /\bcattle|dairy|\bcows?\b|heifer|buffalo|goat|sheep|poultry|livestock/i, "مویشی"],
];
const TOPICS = [
  ["heat", /\bheat\b|warm(th|ing)|high temperature|hot weather/i, "گرمی"], ["water", /drought|water (stress|use|saving|scarcity)|irrigat/i, "پانی / خشکی"],
  ["salt", /salin|salt[- ](toleran|stress|affected)|sodic/i, "کلر (نمکین زمین)"], ["pest", /\bpests?\b|insect|aphid|weevil|borer|locust|whitefly|caterpillar|\bmites?\b/i, "کیڑے"],
  ["disease", /disease|pathogen|fung|blight|\brust\b|\bscab\b|mildew|bacteri|virus|xanthomonas|burkholderia/i, "بیماری"],
  ["soil", /\bsoil|fertili[sz]|nitrogen|manure|compost|microbiome|rhizo/i, "زمین / کھاد"], ["yield", /\byield|productivity|harvest/i, "پیداوار"],
  ["seed", /\bseeds?\b|germination|breeding|cultivar|variet|hybrid/i, "بیج / نئی اقسام"], ["storage", /storage|post-?harvest|shelf life|browning/i, "ذخیرہ"],
  ["tech", /drone|sensor|satellite|machine learning|robot/i, "ٹیکنالوجی"], ["climate", /climate|emission|greenhouse gas/i, "موسمیاتی تبدیلی"],
  ["feed", /\bfeed intake|\bration|nutrition of (cows|cattle)/i, "خوراک (مویشی)"],
];
const OFF = /\bMoUs?\b|memorand|ranking|\baward|fundrais|appoint|alumni|campus|\bdogs?\b|german shepherd|insur|solar storm|\blakes?\b|energy storage|rock pores|salmonella|packaging|\bmeat\b|gps-collar|wild animals|single-cell|scrna|scatac|human|patients?|clinical|cancer|covid|tourism|football|concert|dough|bakery|baking/i;
const FARM = /crop|farm|plant|agri|field|harvest|seed|soil|livestock|cattle|dairy|orchard|fruit|vegetable/i;

export function tagResearch(x) {
  const text = `${x.title || ""} ${x.summary || ""}`;
  if (OFF.test(x.title || "")) return null;
  const crops = CROPS.filter(([, re]) => re.test(text));
  const topics = TOPICS.filter(([, re]) => re.test(text));
  const score = crops.length * 2 + topics.length;
  if (!topics.length || score < 2 || (!crops.length && !FARM.test(text))) return null;
  const c = crops.slice(0, 2), t = topics.slice(0, 3);
  return {
    crop: c[0]?.[0] || "other",
    title_ur: [c.map((k) => k[2]).join("، "), t.map((k) => k[2]).join("، ")].filter(Boolean).join(" · "),
    tags: t.map((k) => k[0]),
    temp: t.some((k) => k[0] === "heat") ? "heat" : "any",
    zones: [t.some((k) => k[0] === "salt") && "sem", t.some((k) => k[0] === "water") && "rait"].filter(Boolean),
    relevance: Math.min(90, 30 + score * 10),
  };
}

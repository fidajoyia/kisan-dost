// Where a variety was tested / released, read from its registration text, and that place's climate.
// Points are farming areas (not capitals). Climate: NASA POWER 2001–2020 monthly normals (data/place-climate.json).
export const PLACES = [
  // Texas sub-regions first (more specific wins)
  { id: "tx_hp", ur: "ٹیکساس ہائی پلینز", en: "Texas High Plains", lat: 33.6, lon: -101.9, rx: /(Texas|Southern) High Plains|West Texas|Lubbock|Bushland|Amarillo/i },
  { id: "tx_rp", ur: "ٹیکساس رولنگ پلینز", en: "Texas Rolling Plains", lat: 33.9, lon: -99.3, rx: /Rolling Plains|Vernon,? TX|Chillicothe/i },
  { id: "tx_bl", ur: "ٹیکساس بلیک لینڈز", en: "Texas Blacklands", lat: 31.5, lon: -97.1, rx: /Blackland|Central Texas|McGregor|College Station/i },
  { id: "tx_s", ur: "جنوبی ٹیکساس", en: "South Texas", lat: 27.5, lon: -98.0, rx: /South Texas|Rio Grande Valley|Weslaco|Corpus Christi|Beeville|Coastal Bend/i },
  { id: "fl_eaa", ur: "فلوریڈا (ایورگلیڈز)", en: "Florida (Everglades)", lat: 26.7, lon: -80.7, rx: /Everglades|Canal Point|Belle Glade|muck soils?|sand soils? in Florida|Florida sugarcane/i },
  { id: "us_gp", ur: "امریکی گریٹ پلینز", en: "US Great Plains", lat: 37.5, lon: -99.0, rx: /Great Plains/i },
  { id: "us_ms", ur: "امریکی مڈ ساؤتھ", en: "US Mid-South", lat: 34.5, lon: -90.5, rx: /Mid-?South|Mississippi Delta|\bDelta\b/i },
  { id: "us_pnw", ur: "بحرالکاہل شمال مغرب (امریکہ)", en: "US Pacific Northwest", lat: 46.6, lon: -118.4, rx: /Pacific Northwest|Palouse/i },
  { id: "us_cb", ur: "امریکی کارن بیلٹ", en: "US Corn Belt", lat: 41.5, lon: -91.0, rx: /Corn Belt/i },
  { id: "us_se", ur: "جنوب مشرقی امریکہ", en: "US Southeast", lat: 32.5, lon: -84.5, rx: /Southeast(ern)? (United States|USA|U\.S\.)|southeastern/i },
  // US states
  ...[
    ["tx", "ٹیکساس", "Texas", 31.5, -99.0, "TX"], ["ok", "اوکلاہوما", "Oklahoma", 35.5, -97.8, "OK"], ["ks", "کینساس", "Kansas", 38.4, -98.5, "KS"],
    ["ne", "نیبراسکا", "Nebraska", 41.0, -99.0, "NE"], ["co", "کولوراڈو", "Colorado", 39.8, -103.5, "CO"], ["fl", "فلوریڈا", "Florida", 29.2, -82.4, "FL"],
    ["la", "لوزیانا", "Louisiana", 30.6, -92.0, "LA"], ["ga", "جارجیا (امریکہ)", "Georgia (US)", 32.3, -83.6, "GA"], ["al", "الاباما", "Alabama", 32.6, -86.7, "AL"],
    ["ms", "مسیسیپی", "Mississippi", 33.3, -90.2, "MS"], ["ar", "آرکنساس", "Arkansas", 34.9, -91.5, "AR"], ["mo", "میزوری", "Missouri", 38.4, -92.5, "MO"],
    ["tn", "ٹینیسی", "Tennessee", 35.8, -86.4, "TN"], ["nc", "شمالی کیرولائنا", "North Carolina", 35.6, -78.8, "NC"], ["sc", "جنوبی کیرولائنا", "South Carolina", 33.9, -80.9, "SC"],
    ["va", "ورجینیا", "Virginia", 37.4, -77.8, "VA"], ["ky", "کینٹکی", "Kentucky", 37.5, -86.0, "KY"], ["il", "الینوائے", "Illinois", 40.0, -89.2, "IL"],
    ["in", "انڈیانا", "Indiana", 40.2, -86.4, "IN"], ["oh", "اوہائیو", "Ohio", 40.4, -83.0, "OH"], ["mi", "مشی گن", "Michigan", 42.9, -84.5, "MI"],
    ["ia", "آئیووا", "Iowa", 42.0, -93.5, "IA"], ["mn", "مینیسوٹا", "Minnesota", 44.9, -94.5, "MN"], ["wi", "وسکونسن", "Wisconsin", 44.0, -89.5, "WI"],
    ["nd", "شمالی ڈکوٹا", "North Dakota", 47.4, -99.8, "ND"], ["sd", "جنوبی ڈکوٹا", "South Dakota", 44.4, -99.5, "SD"], ["mt", "مونٹانا", "Montana", 47.5, -110.5, "MT"],
    ["id", "آئیڈاہو", "Idaho", 43.0, -114.5, "ID"], ["wa", "واشنگٹن (امریکہ)", "Washington (US)", 46.8, -118.7, "WA"], ["or", "اوریگن", "Oregon", 45.4, -119.0, "OR"],
    ["ca", "کیلیفورنیا", "California", 36.7, -119.8, "CA"], ["az", "ایریزونا", "Arizona", 33.0, -112.0, "AZ"], ["nm", "نیو میکسیکو", "New Mexico", 34.3, -106.5, "NM"],
    ["ut", "یوٹاہ", "Utah", 40.5, -111.9, "UT"], ["pa", "پنسلوانیا", "Pennsylvania", 40.8, -77.8, "PA"], ["ny", "نیو یارک", "New York", 42.8, -76.2, "NY"],
    ["md", "میری لینڈ", "Maryland", 39.0, -76.8, "MD"], ["de", "ڈیلاویئر", "Delaware", 38.9, -75.5, "DE"], ["nj", "نیو جرسی", "New Jersey", 40.0, -74.6, "NJ"],
  ].map(([id, ur, en, lat, lon, ab]) => ({ id, ur, en, lat, lon, rx: new RegExp(`\\b${en.replace(/ \(US\)/, "")}\\b(?! (wheat|cotton|rice) (variety|cultivar) [A-Z])|, ${ab}\\b`) })),
  // Canada and others
  { id: "on", ur: "اونٹاریو (کینیڈا)", en: "Ontario", lat: 43.3, lon: -80.6, rx: /\bOntario\b|Guelph|Ridgetown/i },
  { id: "sk", ur: "ساسکیچوان (کینیڈا)", en: "Saskatchewan", lat: 51.5, lon: -106.5, rx: /Saskatchewan|Saskatoon/i },
  { id: "ab", ur: "البرٹا (کینیڈا)", en: "Alberta", lat: 52.5, lon: -113.5, rx: /\bAlberta\b/i },
  { id: "mb", ur: "مینی ٹوبا (کینیڈا)", en: "Manitoba", lat: 49.9, lon: -98.0, rx: /Manitoba/i },
  { id: "bc", ur: "برٹش کولمبیا (کینیڈا)", en: "British Columbia", lat: 49.1, lon: -122.3, rx: /British Columbia/i },
  { id: "mx", ur: "میکسیکو", en: "Mexico", lat: 27.4, lon: -109.9, rx: /\bMexico\b(?!,? ?New)|Sonora|Obregon/i },
  { id: "pk", ur: "پاکستان", en: "Pakistan", lat: 30.8, lon: 72.8, rx: /Pakistan|Punjab,? Pakistan|Faisalabad/i },
  { id: "in", ur: "بھارت (پنجاب)", en: "India (Punjab)", lat: 30.9, lon: 75.8, rx: /\bIndia\b|Ludhiana/i },
  { id: "cn", ur: "چین (شمالی میدان)", en: "China (North Plain)", lat: 35.5, lon: 115.0, rx: /\bChina\b|Henan|Shandong|Hebei/i },
  { id: "nl", ur: "نیدرلینڈز", en: "Netherlands", lat: 52.2, lon: 5.5, rx: /Netherlands|Wageningen/i },
];

// places named in a registration; release / adaptation phrases count triple
const KEY = /(released|adapted|recommended|intended|targeted|grown|production|cultivation|for use|tested)[^.]{0,160}/gi;
export function placesOf(text = "") {
  const score = new Map();
  const add = (s, w) => {
    const hit = new Set();
    for (const p of PLACES) {
      if (p.rx.test(s)) {
        // a Texas sub-region already covers "Texas"
        if (p.id === "tx" && [...hit].some((h) => h.startsWith("tx_"))) continue;
        if (p.id === "fl" && hit.has("fl_eaa")) continue;
        hit.add(p.id); score.set(p.id, (score.get(p.id) || 0) + w);
      }
    }
  };
  add(text, 1);
  for (const m of text.matchAll(KEY)) add(m[0], 2);
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
export const placeById = (id) => PLACES.find((p) => p.id === id) || null;

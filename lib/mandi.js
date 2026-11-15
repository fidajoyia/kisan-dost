// Mandi rates: Punjab Agriculture Marketing Information Service (AMIS, amis.pk), the government's daily
// wholesale prices. One page per market lists every commodity: min, max and FQP (fair-quality price),
// in Rs per 100 kg unless the name says otherwise (dozen, 100 pieces). We show the price per maund (40 kg).
import { unstable_cache } from "next/cache";
import { DISTRICTS } from "./districts.js";

// AMIS market id → [name, the district whose coordinates place it]
const MARKETS = {
  1: ["Lahore", "Lahore"], 2: ["Faisalabad", "Faisalabad"], 3: ["Gujranwala", "Gujranwala"], 4: ["Okara", "Okara"],
  5: ["Sargodha", "Sargodha"], 6: ["Rawalpindi", "Rawalpindi"], 7: ["Multan", "Multan"], 8: ["Rahim Yar Khan", "Rahim Yar Khan"],
  9: ["Bhakkar", "Bhakkar"], 13: ["Sahiwal", "Sahiwal"], 14: ["Vehari", "Vehari"], 16: ["Layyah", "Layyah"], 17: ["Gujrat", "Gujrat"],
  18: ["Khanewal", "Khanewal"], 19: ["Muzaffargarh", "Muzaffargarh"], 20: ["Bahawalpur", "Bahawalpur"], 21: ["Toba Tek Singh", "Toba Tek Singh"],
  26: ["Pakpattan", "Pakpattan"], 28: ["Lodhran", "Lodhran"], 36: ["Dera Ghazi Khan", "Dera Ghazi Khan"], 57: ["Sialkot", "Sialkot"],
  58: ["Narowal", "Narowal"], 59: ["Chakwal", "Chakwal"], 60: ["Jhelum", "Jhelum"], 62: ["Mianwali", "Mianwali"], 63: ["Rajanpur", "Rajanpur"],
  64: ["Jhang", "Jhang"], 70: ["Nankana Sahib", "Nankana Sahib"], 104: ["Hafizabad", "Hafizabad"],
};
const MARKET_UR = { Lahore: "لاہور", Faisalabad: "فیصل آباد", Gujranwala: "گوجرانوالہ", Okara: "اوکاڑہ", Sargodha: "سرگودھا", Rawalpindi: "راولپنڈی", Multan: "ملتان",
  "Rahim Yar Khan": "رحیم یار خان", Bhakkar: "بھکر", Sahiwal: "ساہیوال", Vehari: "وہاڑی", Layyah: "لیہ", Gujrat: "گجرات", Khanewal: "خانیوال", Muzaffargarh: "مظفر گڑھ",
  Bahawalpur: "بہاولپور", "Toba Tek Singh": "ٹوبہ ٹیک سنگھ", Pakpattan: "پاکپتن", Lodhran: "لودھراں", "Dera Ghazi Khan": "ڈیرہ غازی خان", Sialkot: "سیالکوٹ",
  Narowal: "نارووال", Chakwal: "چکوال", Jhelum: "جہلم", Mianwali: "میانوالی", Rajanpur: "راجن پور", Jhang: "جھنگ", "Nankana Sahib": "ننکانہ صاحب", Hafizabad: "حافظ آباد" };
const coordsOf = (d) => { for (const p of Object.values(DISTRICTS)) if (p[d]) return p[d]; return null; };

export function nearestMarkets(lat, lon) {
  return Object.entries(MARKETS).map(([id, [name, d]]) => {
    const c = coordsOf(d); if (!c) return null;
    const km = Math.hypot((c[0] - lat) * 111, (c[1] - lon) * 111 * Math.cos((lat * Math.PI) / 180));
    return { id: +id, name, ur: MARKET_UR[name] || name, km: Math.round(km) };
  }).filter(Boolean).sort((a, b) => a.km - b.km);
}

// English AMIS name → Urdu (most specific first)
const NAMES = [
  [/^Wheat Straw/i, "توڑی"], [/^Wheat/i, "گندم"], [/^Paddy Basmati/i, "دھان باسمتی"], [/^Paddy \(IRRI\)/i, "دھان اری"], [/^Paddy Kainat/i, "دھان کائنات"],
  [/^Rice Basmati Super \(New\)/i, "چاول سپر باسمتی (نیا)"], [/^Rice Basmati Super \(Old\)/i, "چاول سپر باسمتی (پرانا)"], [/^Rice Basmati \(385\)/i, "چاول باسمتی 385"],
  [/^Rice \(IRRI\)/i, "چاول اری"], [/^Rice Kainat \(New\)/i, "چاول کائنات (نیا)"], [/^Rice Kainat Old/i, "چاول کائنات (پرانا)"],
  [/^Seed Cotton/i, "پھٹی (کپاس)"], [/^Banola Cake/i, "کھل بنولہ"], [/^Banola/i, "بنولہ"], [/^Maize/i, "مکئی"], [/^Millet/i, "باجرہ"], [/^Sorghum/i, "جوار"],
  [/^Sugar$/i, "چینی"], [/^Brown Sugar/i, "شکر"], [/^Jaggery/i, "گڑ"], [/^sugarcane/i, "گنڈیریاں"], [/^Suger Beet/i, "چقندر"],
  [/^Gram Flour/i, "بیسن"], [/^Gram White\s+Bareek/i, "سفید چنا (باریک)"], [/^Gram White\(Imported\)/i, "سفید چنا (درآمدی)"], [/^Gram Black Bareek/i, "کالا چنا (باریک)"],
  [/^Gram Black Mota/i, "کالا چنا (موٹا)"], [/^Gram Pulse\(Bareek\)/i, "دال چنا (باریک)"], [/^Gram Pulse\(Moti\)/i, "دال چنا (موٹی)"], [/^green chickpeas/i, "چھولیا"],
  [/^Moong Pulse/i, "دال مونگ"], [/^Moong/i, "مونگ"], [/^Mash Pulse\(Imported\) washed/i, "دال ماش (درآمدی، دھلی)"], [/^Mash Pulse\(imported\) Unwashed/i, "دال ماش (درآمدی)"],
  [/^Mash Pulse\(local\)/i, "دال ماش (مقامی)"], [/^Mash/i, "ماش"], [/^Masoor Whole\(local\)/i, "مسور (مقامی)"], [/^Masoor Whole \(Imported\)/i, "مسور (درآمدی)"],
  [/^Masoor Pulse\(local\)/i, "دال مسور (مقامی)"], [/^Masoor Pulse \(Imported\)/i, "دال مسور (درآمدی)"], [/^RapeSeed/i, "توریا"], [/^Mustard seed/i, "سرسوں"],
  [/^Mustard Greens/i, "ساگ سرسوں"], [/^Canola/i, "کینولا"], [/^Sunflower/i, "سورج مکھی"], [/^Sesame/i, "تل"], [/^Groundnut/i, "مونگ پھلی"], [/^Barley/i, "جو"],
  [/^Red Chilli/i, "سرخ مرچ (خشک)"], [/^Green Fodder/i, "سبز چارہ"], [/^Potato Fresh/i, "آلو (تازہ)"], [/^Potato Store/i, "آلو (سٹور)"], [/^Potato Sugar free/i, "آلو (شوگر فری)"],
  [/^Green Onion/i, "ہری پیاز"], [/^Onion/i, "پیاز"], [/^Garlic \(China\)/i, "لہسن (چینی)"], [/^Garlic \(Local\)/i, "لہسن (مقامی)"], [/^Ginger\s?\(?China/i, "ادرک (چینی)"],
  [/^Ginger \(Thai\)/i, "ادرک (تھائی)"], [/^Tomato/i, "ٹماٹر"], [/^Spinach/i, "پالک"], [/^Brinjal/i, "بینگن"], [/^Lady Finger/i, "بھنڈی"], [/^Bitter Gourd/i, "کریلا"],
  [/^Tinda/i, "ٹینڈا"], [/^Pumpkin/i, "کدو (حلوہ)"], [/^Cauliflower/i, "پھول گوبھی"], [/^Peas/i, "مٹر"], [/^Turnip/i, "شلجم"], [/^Radish/i, "مولی"],
  [/^Carrot China/i, "گاجر (چینی)"], [/^Carrot/i, "گاجر"], [/^Cabbage/i, "بند گوبھی"], [/^Cucumber/i, "کھیرا"], [/^Green Chilli/i, "ہری مرچ"], [/^Capsicum/i, "شملہ مرچ"],
  [/^Bottle Gourd/i, "کدو (لوکی)"], [/^Zucchini/i, "گھیا توری"], [/^Fenugreek/i, "میتھی"], [/^Coriander/i, "دھنیا"], [/^Mint/i, "پودینہ"], [/^Cocoyam/i, "اروی"],
  [/^Turmeric/i, "ہلدی"], [/^Sweet Potato/i, "شکر قندی"], [/^Water chestnut/i, "سنگھاڑا"], [/^Kinnow/i, "کینو"], [/^Orange/i, "مالٹا"], [/^Musambi/i, "موسمی"],
  [/^Grapefruit/i, "چکوترہ"], [/^Banana/i, "کیلا"], [/^Guava/i, "امرود"], [/^Apple/i, "سیب"], [/^Pomegranate/i, "انار"], [/^Grapes/i, "انگور"], [/^Mango/i, "آم"],
  [/^Watermelon/i, "تربوز"], [/^Sweet Musk Melon/i, "سردا"], [/^Melon/i, "خربوزہ"], [/^Dates/i, "کھجور"], [/^Lemon/i, "لیموں"], [/^Pear/i, "ناشپاتی"],
  [/^Peach/i, "آڑو"], [/^Plum/i, "آلو بخارا"], [/^Apricot/i, "خوبانی"], [/^Strawberry/i, "اسٹرابیری"], [/^Loquat/i, "لوکاٹ"], [/^Lychee/i, "لیچی"],
  [/^Jaman/i, "جامن"], [/^jujube/i, "بیر"], [/^Papaya/i, "پپیتا"], [/^Persimmon/i, "جاپانی پھل"], [/^Cocunut/i, "ناریل"],
];
// the field crops farmers sell, shown first
const FARM = /^(Wheat$|Paddy|Rice|Seed Cotton|Maize|Millet|Sorghum|Gram (White|Black)|Moong$|Mash$|Masoor Whole|RapeSeed|Mustard seed|Canola|Sunflower|Sesame|Groundnut|Barley|Potato (Fresh|Store)|Onion|Tomato|Garlic \(Local\)|Red Chilli|Jaggery|Green Fodder|Wheat Straw|Banola$|Kinnow|Guava)/i;

function unitOf(name) {
  if (/DOZEN/i.test(name)) return "dozen";
  if (/100\s?Pcs/i.test(name)) return "100pcs";
  return "maund";
}
// what is left of the English name after the part we translated (e.g. "Grapes Gola" → "Gola")
function variety(name, re) {
  const v = name.replace(re, "").replace(/\([^)]*[\u0600-\u06FF][^)]*\)|\(?\d*\s?Pcs\)?|\(?DOZEN\)?/gi, "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  return /^(Kheera|Other)$/i.test(v) ? "" : v;
}

export function parseMarketPage(html) {
  const date = html.match(/Dated:\s*(\d{2})-(\d{2})-(\d{4})/);
  const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const items = [];
  let group = null;
  for (const row of t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;?/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()).filter(Boolean);
    if (cells.length === 1 && /^(Grains|Vegetables|Fruits)$/i.test(cells[0])) { group = cells[0].toLowerCase(); continue; }
    if (!group || cells.length < 5) continue;
    const name = cells[0].replace(/^\d+\s*/, "").trim();
    const [min, max, fqp] = cells.slice(2, 5).map((v) => (/^\d+(\.\d+)?$/.test(v) ? +v : null));
    if (fqp == null) continue;
    const unit = unitOf(name), k = unit === "maund" ? 0.4 : 1;
    const hit = NAMES.find(([re]) => re.test(name));
    const ur = hit?.[1] || name;
    items.push({ name, ur, variety: !hit || /\(/.test(ur) ? "" : variety(name, hit[0]), group, farm: FARM.test(name), unit,
      price: Math.round((fqp * k) / 10) * 10, min: min != null ? Math.round((min * k) / 10) * 10 : null, max: max != null ? Math.round((max * k) / 10) * 10 : null });
  }
  return { date: date ? `${date[3]}-${date[2]}-${date[1]}` : null, items };
}

async function fetchMarket(id) {
  const r = await fetch(`http://www.amis.pk/ViewPrices.aspx?searchType=1&commodityId=${id}`, {
    headers: { "User-Agent": "Mozilla/5.0 (KisanDost farmer app)" }, signal: AbortSignal.timeout(20000), cache: "no-store", redirect: "follow",
  });
  if (!r.ok) throw new Error(`AMIS ${r.status}`);
  const p = parseMarketPage(await r.text());
  if (!p.items.length) throw new Error("no prices");
  return p;
}
// prices change once a day; keep each market 3 hours
const marketCached = unstable_cache(fetchMarket, ["amis-market-v1"], { revalidate: 3 * 3600, tags: ["mandi"] });

export async function mandiFor(lat, lon) {
  const near = nearestMarkets(lat, lon).slice(0, 4);
  for (const m of near) {
    try {
      const p = await marketCached(m.id);
      if (p.items.filter((x) => x.farm).length >= 2 || p.items.length >= 8) return { market: m, others: near.filter((x) => x.id !== m.id).slice(0, 3), ...p };
    } catch {}
  }
  throw new Error("mandi rates unavailable");
}

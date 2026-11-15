// River headworks, barrages and dams on the Indus system, with the main canals each one feeds.
// Flows come from the Flood Forecasting Division's daily bulletin (lib/water.js). At a barrage the water
// that comes in but does not go on down the river (inflow − outflow) is taken into these canals.
// Coordinates are approximate (±5 km).
export const HEADWORKS = [
  { id: "Tarbela", ur: "تربیلا ڈیم", river: "indus", kind: "dam", lat: 34.09, lon: 72.69, canals: [] },
  { id: "Kalabagh", ur: "جناح بیراج (کالا باغ)", river: "indus", kind: "barrage", lat: 32.96, lon: 71.55,
    canals: [["تھل کینال", "Thal Canal"]] },
  { id: "Chashma", ur: "چشمہ بیراج", river: "indus", kind: "barrage", lat: 32.43, lon: 71.38,
    canals: [["چشمہ رائٹ بینک کینال", "Chashma Right Bank Canal"], ["چشمہ جہلم لنک", "Chashma-Jhelum Link"]] },
  { id: "Taunsa", ur: "تونسہ بیراج", river: "indus", kind: "barrage", lat: 30.70, lon: 70.66,
    canals: [["مظفرگڑھ کینال", "Muzaffargarh Canal"], ["ڈیرہ غازی خان کینال", "D.G. Khan Canal"], ["تونسہ پنجند لنک", "Taunsa-Panjnad Link"]] },
  { id: "Guddu", ur: "گڈو بیراج", river: "indus", kind: "barrage", lat: 28.42, lon: 69.71,
    canals: [["گھوٹکی فیڈر", "Ghotki Feeder"], ["بیگاری سندھ فیڈر", "Begari Sindh Feeder"], ["ڈیزرٹ پٹ فیڈر", "Desert Pat Feeder"]] },
  { id: "Sukkur", ur: "سکھر بیراج", river: "indus", kind: "barrage", lat: 27.70, lon: 68.85,
    canals: [["روہڑی کینال", "Rohri Canal"], ["نارا کینال", "Nara Canal"], ["دادو کینال", "Dadu Canal"], ["رائس کینال", "Rice Canal"], ["خیرپور ایسٹ / ویسٹ", "Khairpur East / West"], ["نارتھ ویسٹرن کینال", "North Western Canal"]] },
  { id: "Kotri", ur: "کوٹری بیراج", river: "indus", kind: "barrage", lat: 25.37, lon: 68.33,
    canals: [["کلری بگھار فیڈر", "Kalri Baghar Feeder"], ["پھلیلی کینال", "Fuleli Canal"], ["پنیاری کینال", "Pinyari Canal"]] },
  { id: "Nowshera", ur: "نوشہرہ (دریائے کابل)", river: "kabul", kind: "gauge", lat: 34.02, lon: 71.98, canals: [] },
  { id: "Mangla", ur: "منگلا ڈیم", river: "jhelum", kind: "dam", lat: 33.13, lon: 73.64,
    canals: [["اپر جہلم کینال", "Upper Jhelum Canal"]] },
  { id: "Rasul", ur: "رسول بیراج", river: "jhelum", kind: "barrage", lat: 32.68, lon: 73.55,
    canals: [["لوئر جہلم کینال", "Lower Jhelum Canal"], ["رسول قادرآباد لنک", "Rasul-Qadirabad Link"]] },
  { id: "Marala", ur: "ہیڈ مرالہ", river: "chenab", kind: "barrage", lat: 32.67, lon: 74.46,
    canals: [["اپر چناب کینال", "Upper Chenab Canal"], ["مرالہ راوی لنک", "Marala-Ravi Link"]] },
  { id: "Khanki", ur: "ہیڈ خانکی", river: "chenab", kind: "barrage", lat: 32.40, lon: 73.97,
    canals: [["لوئر چناب کینال", "Lower Chenab Canal"]] },
  { id: "Qadirabad", ur: "قادرآباد بیراج", river: "chenab", kind: "barrage", lat: 32.32, lon: 73.70,
    canals: [["قادرآباد بلوکی لنک", "Qadirabad-Balloki Link"]] },
  { id: "Trimmu", ur: "ہیڈ تریموں", river: "chenab", kind: "barrage", lat: 31.15, lon: 72.15,
    canals: [["حویلی کینال", "Haveli Canal"], ["رنگپور کینال", "Rangpur Canal"], ["تریموں سدھنائی لنک", "Trimmu-Sidhnai Link"]] },
  { id: "Punjnad", ur: "ہیڈ پنجند", river: "chenab", kind: "barrage", lat: 29.35, lon: 71.00,
    canals: [["پنجند کینال", "Panjnad Canal"], ["عباسیہ کینال", "Abbasia Canal"]] },
  { id: "Jassar", ur: "جسڑ (دریائے راوی)", river: "ravi", kind: "gauge", lat: 32.06, lon: 74.98, canals: [] },
  { id: "Shahdara", ur: "شاہدرہ (لاہور)", river: "ravi", kind: "gauge", lat: 31.62, lon: 74.30, canals: [] },
  { id: "Balloki", ur: "ہیڈ بلوکی", river: "ravi", kind: "barrage", lat: 31.22, lon: 73.86,
    canals: [["لوئر باری دوآب کینال", "Lower Bari Doab Canal"], ["بلوکی سلیمانکی لنک", "Balloki-Sulemanki Link"]] },
  { id: "Sidhnai", ur: "ہیڈ سدھنائی", river: "ravi", kind: "barrage", lat: 30.57, lon: 72.12,
    canals: [["سدھنائی کینال", "Sidhnai Canal"], ["سدھنائی میلسی بہاول لنک", "Sidhnai-Mailsi-Bahawal Link"]] },
  { id: "G.S. Wala", ur: "گنڈا سنگھ والا (دریائے ستلج)", river: "sutlej", kind: "gauge", lat: 31.05, lon: 74.53, canals: [] },
  { id: "Sulemanki", ur: "ہیڈ سلیمانکی", river: "sutlej", kind: "barrage", lat: 30.37, lon: 73.87,
    canals: [["پاکپتن کینال", "Pakpattan Canal"], ["فورڈواہ کینال", "Fordwah Canal"], ["ایسٹرن صادقیہ کینال", "Eastern Sadiqia Canal"]] },
  { id: "Islam", ur: "ہیڈ اسلام", river: "sutlej", kind: "barrage", lat: 29.83, lon: 72.55,
    canals: [["بہاول کینال", "Bahawal Canal"], ["قائم کینال", "Qaim Canal"], ["میلسی کینال", "Mailsi Canal"]] },
];

export const RIVER_UR = { indus: "دریائے سندھ", kabul: "دریائے کابل", jhelum: "دریائے جہلم", chenab: "دریائے چناب", ravi: "دریائے راوی", sutlej: "دریائے ستلج" };
export const RIVER_EN = { indus: "Indus", kabul: "Kabul", jhelum: "Jhelum", chenab: "Chenab", ravi: "Ravi", sutlej: "Sutlej" };

const rad = (d) => (d * Math.PI) / 180;
export function kmTo(lat, lon, h) {
  const x = rad(h.lon - lon) * Math.cos(rad((lat + h.lat) / 2)), y = rad(h.lat - lat);
  return Math.round(Math.sqrt(x * x + y * y) * 6371);
}

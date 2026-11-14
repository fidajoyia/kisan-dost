// Area disease / pest warnings from the live 16-day forecast, by rule (no AI, no API key).
// Each rule = crop in the field this month (Punjab / Sindh calendar) + the weather the pathogen or pest
// needs, counted over the forecast days. The reason quotes the dates and numbers that triggered it.
const M = (m) => (now) => m.includes(now.getMonth() + 1);
const mean = (d) => (d.tmax != null && d.tmin != null ? (d.tmax + d.tmin) / 2 : null);
const wet = (d) => (d.humidity ?? 0) >= 85 || (d.wet_hours ?? 0) >= 6 || (d.rain_mm ?? 0) >= 1;
const fmt = (date) => new Date(date + "T00:00").toLocaleDateString("ur-PK", { day: "numeric", month: "short" });

const RULES = [
  { crop: "گندم", threat: "پیلی کنگی", season: M([12, 1, 2, 3]), day: (d) => mean(d) >= 8 && mean(d) <= 18 && wet(d), hi: 5, mid: 3,
    why: "ٹھنڈا (8 سے 18 ڈگری) اور نم موسم", action: "ہر دوسرے دن کھیت دیکھیں؛ پیلی دھاریاں نظر آئیں تو پروپیکونازول 25 ای سی اسپرے کریں۔" },
  { crop: "گندم", threat: "بھوری کنگی", season: M([1, 2, 3, 4]), day: (d) => mean(d) >= 15 && mean(d) <= 25 && ((d.humidity ?? 0) >= 75 || (d.wet_hours ?? 0) >= 4), hi: 6, mid: 3,
    why: "15 سے 25 ڈگری اور رات کی شبنم/نمی", action: "پتوں پر بھورے دانے دیکھیں؛ 10 فیصد پتوں پر ہوں تو ٹیبوکونازول یا پروپیکونازول اسپرے۔" },
  { crop: "گندم", threat: "سفوفی پھپھوندی", season: M([12, 1, 2, 3]), day: (d) => mean(d) >= 12 && mean(d) <= 22 && (d.humidity ?? 0) >= 70, hi: 6, mid: 4,
    why: "معتدل درجہ حرارت اور زیادہ نمی", action: "گھنے کھیتوں میں نچلے پتے دیکھیں؛ سفید پاؤڈر ہو تو گندھک یا پروپیکونازول۔" },
  { crop: "گندم", threat: "سٹے کا جھلساؤ (اسکیب)", season: M([3, 4]), day: (d) => mean(d) >= 18 && mean(d) <= 30 && (d.rain_mm ?? 0) >= 2, hi: 3, mid: 2,
    why: "پھول کے وقت بارش اور گرم نم موسم", action: "سٹہ نکلنے/پھول کے وقت بارش متوقع ہو تو ٹیبوکونازول کا بچاؤ اسپرے۔" },
  { crop: "آلو", threat: "پچھیتا جھلساؤ (لیٹ بلائٹ)", season: M([11, 12, 1, 2]), day: (d) => d.tmin != null && d.tmin >= 4 && d.tmax <= 24 && wet(d), hi: 3, mid: 2,
    why: "دھند، شبنم یا بارش کے ساتھ ٹھنڈا موسم", action: "7 دن کے وقفے سے مینکوزیب یا میٹالیکسل + مینکوزیب کا بچاؤ اسپرے؛ متاثرہ بوٹے نکال دیں۔" },
  { crop: "ٹماٹر", threat: "اگیتا جھلساؤ", season: M([10, 11, 2, 3, 4]), day: (d) => d.tmax >= 22 && d.tmax <= 32 && (d.humidity ?? 0) >= 65, hi: 7, mid: 4,
    why: "گرم دن اور نم راتیں", action: "نچلے پتوں پر دائروں والے دھبے دیکھیں؛ مینکوزیب اسپرے؛ پانی پتوں پر نہ ڈالیں۔" },
  { crop: "کپاس", threat: "سفید مکھی اور پتہ مروڑ وائرس", season: M([5, 6, 7, 8, 9]), day: (d) => d.tmax >= 32 && (d.humidity ?? 100) <= 70 && (d.rain_mm ?? 0) < 2, hi: 8, mid: 5,
    why: "گرم اور خشک موسم (سفید مکھی کی افزائش)", action: "پتوں کے نیچے سفید مکھی گنیں؛ فی پتہ 5 سے زیادہ ہوں تو پائیری پراکسیفین یا فلونیکامڈ۔ پیلے کارڈ لگائیں۔" },
  { crop: "کپاس", threat: "سبز تیلہ (جیسڈ)", season: M([5, 6, 7, 8]), day: (d) => d.tmax >= 30 && (d.humidity ?? 0) >= 60, hi: 6, mid: 4,
    why: "گرم مرطوب موسم", action: "فی پتہ ایک سے زیادہ تیلہ ہو تو فلونیکامڈ یا نائٹن پائرم اسپرے۔" },
  { crop: "دھان", threat: "بلاسٹ", season: M([7, 8, 9, 10]), day: (d) => mean(d) >= 22 && mean(d) <= 29 && ((d.humidity ?? 0) >= 85 || (d.wet_hours ?? 0) >= 8), hi: 5, mid: 3,
    why: "نم راتیں اور 22 سے 29 ڈگری", action: "نائٹروجن کی قسط روک لیں؛ آنکھ نما دھبے نظر آئیں تو ٹرائی سائکلازول اسپرے۔" },
  { crop: "دھان", threat: "بیکٹیریائی جھلساؤ", season: M([7, 8, 9]), day: (d) => (d.rain_mm ?? 0) >= 5 && d.tmax >= 25, hi: 3, mid: 2,
    why: "تیز بارش اور ہوا (پتوں پر زخم)", action: "یوریا روک لیں، متاثرہ کھیت کا پانی دوسرے کھیت میں نہ جانے دیں۔" },
  { crop: "گنا", threat: "سرخ سڑاند اور پوکاہ بوئنگ", season: M([7, 8, 9]), day: (d) => wet(d) && d.tmax >= 28, hi: 6, mid: 4,
    why: "گرم اور مسلسل نم موسم", action: "کھیت سے زائد پانی نکالیں؛ مڑی ہوئی چوٹیاں ہوں تو کاربنڈازم اسپرے۔" },
  { crop: "آم", threat: "سفوفی پھپھوندی (بور پر)", season: M([2, 3]), day: (d) => mean(d) >= 14 && mean(d) <= 26 && (d.humidity ?? 0) >= 60, hi: 5, mid: 3,
    why: "بور کے وقت معتدل نم موسم", action: "بور نکلتے ہی گندھک یا ہیکسا کونازول کا بچاؤ اسپرے۔" },
  { crop: "آم", threat: "اینتھراکنوز", season: M([2, 3, 4, 7, 8]), day: (d) => (d.rain_mm ?? 0) >= 2 && mean(d) >= 20, hi: 3, mid: 2,
    why: "بارش اور گرم نمی", action: "بارش کے بعد کاپر آکسی کلورائیڈ اسپرے؛ سوکھی شاخیں کاٹ دیں۔" },
];

export function weatherAlerts(wx, now = new Date()) {
  const days = (wx?.days || []).filter((d) => !d.past).slice(0, 16);
  const alerts = [];
  for (const r of RULES) {
    if (!r.season(now)) continue;
    const hits = days.filter(r.day);
    if (hits.length < r.mid) continue;
    const level = hits.length >= r.hi ? "high" : "medium";
    const span = `${fmt(hits[0].date)} تا ${fmt(hits[hits.length - 1].date)}`;
    alerts.push({ crop: r.crop, threat: r.threat, level, action: r.action,
      reason: `${span}: ${r.why}۔` });
  }
  // weather hazards for every crop
  const frost = days.filter((d) => d.tmin != null && d.tmin <= 2);
  if (frost.length) alerts.push({ crop: "تمام فصلیں", threat: "کورا (پالا)", level: frost.some((d) => d.tmin <= 0) ? "high" : "medium",
    reason: `${frost.map((d) => fmt(d.date)).slice(0, 4).join("، ")} کو رات بہت ٹھنڈی ہوگی۔`,
    action: "کورے والی رات سے پہلے ہلکا پانی لگائیں؛ نرسری اور سبزیاں ڈھانپ دیں۔" });
  const heat = days.filter((d) => d.tmax >= 40);
  if (heat.length) alerts.push({ crop: "تمام فصلیں", threat: "شدید گرمی", level: heat.some((d) => d.tmax >= 44) ? "high" : "medium",
    reason: `${heat.map((d) => fmt(d.date)).slice(0, 4).join("، ")} کو دن بہت گرم ہوگا۔`,
    action: "آبپاشی کا وقفہ کم کریں، پانی شام کو لگائیں؛ دوپہر میں اسپرے نہ کریں۔" });
  const order = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);

  const tips = [];
  const rainy = days.slice(0, 7).filter((d) => (d.rain_mm ?? 0) >= 2 || (d.rain_prob ?? 0) >= 60);
  tips.push(rainy.length ? `اگلے ہفتے بارش متوقع (${rainy.map((d) => fmt(d.date)).join("، ")})؛ بارش سے پہلے کے 24 گھنٹوں میں اسپرے نہ کریں، دوا دھل جاتی ہے۔`
    : "اگلے ہفتے بارش متوقع نہیں؛ اسپرے کے لیے صبح یا شام کا وقت بہتر ہے جب ہوا کم ہو۔");
  const wetN = days.slice(0, 7).filter((d) => (d.wet_hours ?? 0) >= 6).length;
  if (wetN >= 3) tips.push(`اگلے ہفتے کئی راتیں دھند یا شبنم والی ہوں گی؛ پھپھوندی کی بیماریوں کا خطرہ بڑھتا ہے، کھیت کا معائنہ بڑھا دیں۔`);
  const irr = wx?.irrigation?.need;
  const irrigation = irr === "irrigate_now" ? "زمین خشک ہو رہی ہے: ابھی آبپاشی کریں۔" : irr === "irrigate_soon" ? "2 سے 3 دن میں آبپاشی کی ضرورت ہوگی۔"
    : irr === "wait_rain" ? "بارش متوقع ہے، ابھی پانی نہ لگائیں۔" : irr === "not_needed" ? "ابھی آبپاشی کی ضرورت نہیں۔" : "";
  if (!alerts.length) tips.unshift("آنے والے دنوں کا موسم فصلوں کی بڑی بیماریوں کے لیے سازگار نہیں۔ معمول کے مطابق کھیت دیکھتے رہیں۔");
  return { alerts: alerts.slice(0, 6), farm_tips: tips, irrigation, source: "rules" };
}

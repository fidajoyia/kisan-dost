// How to bring a foreign seed variety into Pakistan, step by step.
// Rules changed in 2025–26: FSC&RD is being merged into the new National Seed Development and
// Regulatory Authority (NSDRA) under the Seed (Amendment) Act 2024. Re-check with NSDRA and DPP yearly.
export const IMPORT_UPDATED = "2026-11";

export const IMPORT_ROUTES = [
  {
    id: "trial",
    title_ur: "تھوڑی مقدار تجربے کے لیے (پہلا قدم)",
    title_en: "Small quantity for a trial (first step)",
    steps_ur: [
      "بیج کی سرکاری رپورٹ یا بیچنے والے کا لنک (ایپ میں \"بیج کہاں سے ملے گا\") محفوظ کریں، اور اسی سے قیمت اور مقدار طلب کریں۔ امریکی جامعات کی اقسام کا نمونہ USDA GRIN سے بھی مانگا جا سکتا ہے۔",
      "کسی زرعی یونیورسٹی، تحقیقی ادارے یا رجسٹرڈ بیج کمپنی کے ذریعے درخواست دیں؛ انہیں تجرباتی درآمد کا پرمٹ جلد ملتا ہے۔",
      "محکمہ تحفظ نباتات (DPP) سے امپورٹ پرمٹ، پاکستان سنگل ونڈو (PSW) پر۔",
      "بھیجنے والا ملک فائٹو سینیٹری سرٹیفکیٹ جاری کرے (بیج بیماری، مٹی اور جڑی بوٹیوں سے پاک)۔",
      "بندرگاہ / ایئرپورٹ پر DPP کا معائنہ اور کسٹمز کلیئرنس، پھر ایک سیزن کا تجرباتی کاشت۔",
    ],
    steps_en: [
      "Save the official report or seller link (\"Where to get it\" in the app) and ask the seller for price and quantity. Samples of US university varieties can also be requested from USDA GRIN.",
      "Apply through an agricultural university, research institute or registered seed company; they get trial import permits quickly.",
      "Import permit from the Department of Plant Protection (DPP), on Pakistan Single Window (PSW).",
      "The exporting country issues a phytosanitary certificate (seed free of disease, soil and weed seed).",
      "DPP inspection and customs clearance at the port / airport, then one season of trial sowing.",
    ],
  },
  {
    id: "commercial",
    title_ur: "بڑی مقدار (بیج کمپنی)",
    title_en: "Bulk import (seed company)",
    steps_ur: [
      "بیج کمپنی کی رجسٹریشن: NSDRA (سابق FSC&RD)۔",
      "قسم کی منظوری: پاکستان میں موافقت کے تجربات (عموماً دو سال) اور Variety Evaluation Committee۔",
      "پیسٹ رسک اینالیسس (PRA) اگر یہ فصل اس ملک سے پہلی بار آ رہی ہو (چند ماہ سے 1–2 سال)۔",
      "PSW پر DPP امپورٹ پرمٹ اور Seed Enlistment (LPCO)، فیس PSID پر، پھر Goods Declaration۔",
      "فائٹو سینیٹری سرٹیفکیٹ، بندرگاہ پر معائنہ، Release Order، پھر خالص پن اور اگاؤ کا ٹیسٹ۔",
      "جینیاتی تبدیل شدہ (GM) بیج: پاکستان بایوسیفٹی رولز 2005 کے تحت الگ منظوری۔",
    ],
    steps_en: [
      "Register as a seed company with NSDRA (formerly FSC&RD).",
      "Variety approval: adaptability trials in Pakistan (usually two years) and the Variety Evaluation Committee.",
      "Pest Risk Analysis (PRA) if the crop is coming from that country for the first time (a few months to 1–2 years).",
      "DPP import permit and Seed Enlistment (LPCO) on PSW, fee against the PSID, then the Goods Declaration.",
      "Phytosanitary certificate, port inspection, Release Order, then purity and germination tests.",
      "Genetically modified (GM) seed: separate approval under the Pakistan Biosafety Rules 2005.",
    ],
  },
];

export const IMPORT_CONTACTS = [
  { name: "National Seed Development and Regulatory Authority (NSDRA)", role_ur: "بیج کمپنی اور قسم کی رجسٹریشن", role_en: "Seed company and variety registration" },
  { name: "Department of Plant Protection (DPP)", role_ur: "امپورٹ پرمٹ، پلانٹ قرنطینہ", role_en: "Import permit, plant quarantine", web: "https://psw.gov.pk/dpp" },
  { name: "Pakistan Single Window (PSW)", role_ur: "آن لائن درخواست", role_en: "Online application", web: "https://www.psw.gov.pk" },
  { name: "USDA GRIN (USA)", role_ur: "امریکی اقسام کے تجرباتی نمونے", role_en: "Trial samples of US varieties", web: "https://npgsweb.ars-grin.gov/gringlobal/search" },
];

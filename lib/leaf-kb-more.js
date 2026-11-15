// Treatment guide for the crops, fruit trees, trees and roses added in leaf model v3.
// Same rules as lib/leaf-kb.js: sprays by ACTIVE INGREDIENT only, dose and waiting period as on the label.
const S = (ur, ai, target) => ({ ur, ai, target });
const HEALTHY = { ur: "صحت مند", en: "Healthy", kind: "healthy",
  signs: ["پتے پر بیماری یا کیڑے کی کوئی واضح علامت نظر نہیں آ رہی۔"], spray: [], organic: [],
  cultural: ["ہفتے میں ایک بار پودوں کا چکر لگا کر پتوں کے نیچے بھی دیکھیں۔", "پانی اور کھاد وقت پر اور ضرورت کے مطابق دیں۔"],
  note: "ابھی کسی اسپرے کی ضرورت نہیں۔ بلا ضرورت زہر نہ ڈالیں۔" };

// common sprays
const MANCOZEB = S("مینکوزیب 80 ڈبلیو پی", "Mancozeb 80% WP", "پتوں کے دھبے");
const COPPER = S("کاپر آکسی کلورائیڈ 50 ڈبلیو پی", "Copper oxychloride 50% WP", "بیکٹیریا / پھپھوندی");
const DIFENO = S("ڈائی فینوکونازول 25 ای سی", "Difenoconazole 25% EC", "دھبے اور جھلساؤ");
const AZOXY = S("ایزوکسی اسٹروبن 25 ایس سی", "Azoxystrobin 25% SC", "پھپھوندی");
const SULPHUR = S("گندھک 80 ڈبلیو پی", "Sulphur 80% WP", "سفوفی پھپھوندی");
const HEXA = S("ہیکسا کونازول 5 ایس سی", "Hexaconazole 5% SC", "سفوفی پھپھوندی");
const METALAXYL = S("میٹالیکسل + مینکوزیب 72 ڈبلیو پی", "Metalaxyl + Mancozeb 72% WP", "روئیں دار پھپھوندی / جھلساؤ");
const TEBU = S("ٹیبوکونازول 25 ای سی", "Tebuconazole 25% EC", "کنگی");
const PROPI = S("پروپیکونازول 25 ای سی", "Propiconazole 25% EC", "کنگی / دھبے");
const CHLOROTH = S("کلوروتھالونل 75 ڈبلیو پی", "Chlorothalonil 75% WP", "دھبے");
const THIOPH = S("تھائیو فینیٹ میتھائل 70 ڈبلیو پی", "Thiophanate-methyl 70% WP", "اکھیڑا / سڑن");
const STREP = S("اسٹریپٹومائسن سلفیٹ + ٹیٹرا سائیکلین", "Streptomycin sulphate + Tetracycline", "بیکٹیریا");
const IMIDA = S("امیڈا کلوپرڈ 20 ایس ایل", "Imidacloprid 20% SL", "تیلہ / سفید مکھی (وائرس پھیلانے والے)");
const THIAM = S("تھائیا میتھوکسم 25 ڈبلیو جی", "Thiamethoxam 25% WG", "تیلہ / سفید مکھی");
const ACETA = S("ایسیٹامی پرڈ 20 ایس پی", "Acetamiprid 20% SP", "تیلہ / تھرپس");
const ABAM = S("ایبامیکٹن 1.8 ای سی", "Abamectin 1.8% EC", "جوئیں (مائٹس) / تھرپس");
const SPIRO = S("اسپائرو میسیفن 240 ایس سی", "Spiromesifen 240 SC", "جوئیں (مائٹس)");
const LAMBDA = S("لیمبڈا سائہیلوتھرین 2.5 ای سی", "Lambda-cyhalothrin 2.5% EC", "پتے کھانے والے کیڑے");
const EMAM = S("ایمامیکٹن بینزویٹ 1.9 ای سی", "Emamectin benzoate 1.9% EC", "سنڈیاں / پتہ خور کیڑے");
const BUPRO = S("بپروفیزن 25 ڈبلیو پی", "Buprofezin 25% WP", "سکیل کیڑا / ملی بگ");

const fungusSpot = (ur, en, signs, extra = {}) => ({ ur, en, kind: "fungus", signs, spray: [MANCOZEB, DIFENO], organic: ["متاثرہ پتے توڑ کر کھیت سے باہر تلف کریں۔"], cultural: ["پودوں کے درمیان ہوا گزرنے کی جگہ رکھیں؛ پانی پتوں پر نہ ڈالیں۔"], note: "", ...extra });
const powdery = (ur = "سفوفی پھپھوندی (پاؤڈری ملڈیو)") => ({ ur, en: "Powdery mildew", kind: "fungus", signs: ["پتوں پر سفید یا سرمئی پاؤڈر جیسی تہہ۔"], spray: [SULPHUR, HEXA], organic: ["شروع میں متاثرہ پتے توڑ دیں۔"], cultural: ["گھنے پودوں کی چھٹائی کریں تاکہ دھوپ اور ہوا لگے۔"], note: "گرمی (35 ڈگری سے زیادہ) میں گندھک اسپرے نہ کریں، پتے جل سکتے ہیں۔" });
const downy = () => ({ ur: "روئیں دار پھپھوندی (ڈاؤنی ملڈیو)", en: "Downy mildew", kind: "fungus", signs: ["پتے کے اوپر پیلے کونے دار دھبے، نیچے کی طرف سرمئی / جامنی روئیں۔"], spray: [METALAXYL, AZOXY], organic: ["متاثرہ پتے نکال دیں۔"], cultural: ["صبح کے وقت آبپاشی کریں تاکہ پتے شام تک سوکھ جائیں۔"], note: "نم اور ٹھنڈے موسم میں تیزی سے پھیلتی ہے۔" });
const bacterial = (ur, en, signs) => ({ ur, en, kind: "bacteria", signs, spray: [COPPER, STREP], organic: ["متاثرہ پتے اور شاخیں کاٹ کر تلف کریں؛ اوزار صاف رکھیں۔"], cultural: ["پانی پتوں پر نہ چھڑکیں؛ بارش کے فوراً بعد پودوں میں کام نہ کریں۔"], note: "" });
const virus = (ur, en, signs, vector = "تیلہ / سفید مکھی") => ({ ur, en, kind: "virus", signs, spray: [IMIDA, THIAM], organic: ["متاثرہ پودے جڑ سے نکال کر تلف کریں تاکہ وائرس نہ پھیلے۔"], cultural: ["کھیت اور اردگرد سے جڑی بوٹیاں صاف رکھیں۔"], note: `وائرس کا اسپرے سے علاج نہیں؛ دوا صرف ${vector} (جو وائرس پھیلاتے ہیں) کے لیے ہے۔` });
const sooty = () => ({ ur: "کالی پھپھوندی (سوٹی مولڈ)", en: "Sooty mould", kind: "fungus", signs: ["پتوں پر کالی تہہ، جو رگڑنے سے اتر جاتی ہے۔"], spray: [IMIDA, BUPRO], organic: ["نشاستے (میدے) کا ہلکا محلول اسپرے کریں؛ سوکھ کر کالی تہہ کے ساتھ اتر جاتا ہے۔"], cultural: ["اصل علاج میٹھا مادہ چھوڑنے والے کیڑے (تیلہ، سکیل، ملی بگ) کو روکنا ہے۔"], note: "" });
const mites = (ur = "جوئیں (مائٹس)") => ({ ur, en: "Mites", kind: "pest", signs: ["پتوں پر باریک پیلے نقطے، نیچے کی طرف باریک جالا، پتے تانبے جیسے۔"], spray: [ABAM, SPIRO], organic: ["پتوں کے نیچے پانی کی تیز دھار ماریں؛ نیم کا تیل اسپرے۔"], cultural: ["خشک اور گرم موسم میں زیادہ؛ پودوں کو پانی کی کمی نہ ہونے دیں۔"], note: "" });
const deficiency = (ur, en, signs, fix) => ({ ur, en, kind: "disorder", signs, spray: [], organic: [], cultural: fix, note: "یہ بیماری نہیں، خوراک کی کمی ہے۔ زہر کا اسپرے نہ کریں؛ مٹی ٹیسٹ کروا کر کھاد دیں۔" });
const rust = (ur = "کنگی (رسٹ)") => ({ ur, en: "Rust", kind: "fungus", signs: ["پتے کے نیچے نارنجی یا بھورے پاؤڈر والے دانے۔"], spray: [TEBU, PROPI], organic: ["متاثرہ پتے توڑ کر تلف کریں۔"], cultural: ["اگلی بار مزاحم قسم کاشت کریں۔"], note: "" });
const treeHealthy = (name) => ({ ...HEALTHY, signs: [`یہ ${name} کا صحت مند پتا ہے؛ کوئی بیماری نہیں۔`] });

export const CROPS_UR_MORE = {
  onion: "پیاز", chili: "مرچ", lentil: "مسور", groundnut: "مونگ پھلی", brinjal: "بینگن", spinach: "پالک", radish: "مولی",
  blackgram: "ماش", sunflower: "سورج مکھی", apple: "سیب", grape: "انگور", guava: "امرود", datepalm: "کھجور", banana: "کیلا",
  jamun: "جامن", neem: "نیم (درخت)", arjun: "ارجن (درخت)", moringa: "سہانجنا (مورنگا)", mulberry: "شہتوت", rose: "گلاب",
};
export const CROPS_EN_MORE = {
  onion: "Onion", chili: "Chilli", lentil: "Lentil", groundnut: "Groundnut", brinjal: "Brinjal", spinach: "Spinach", radish: "Radish",
  blackgram: "Black gram (mash)", sunflower: "Sunflower", apple: "Apple", grape: "Grape", guava: "Guava", datepalm: "Date palm", banana: "Banana",
  jamun: "Jamun (java plum)", neem: "Neem tree", arjun: "Arjun tree", moringa: "Moringa", mulberry: "Mulberry", rose: "Rose",
};
// groups for the app's crop list
export const GROUPS = {
  field: ["wheat", "rice", "maize", "cotton", "sugarcane", "lentil", "blackgram", "groundnut", "sunflower"],
  veg: ["potato", "tomato", "onion", "chili", "brinjal", "spinach", "radish"],
  fruit: ["mango", "citrus", "guava", "datepalm", "banana", "apple", "grape", "jamun", "mulberry"],
  trees: ["neem", "arjun", "moringa", "rose"],
};

export const KB_MORE = {
  // onion
  "onion|Purple Blotch": fungusSpot("جامنی دھبہ (پرپل بلاچ)", "Purple blotch", ["پتوں پر بیضوی سفید دھبے جو بیچ سے جامنی ہو جاتے ہیں۔"], { spray: [MANCOZEB, DIFENO, AZOXY] }),
  "onion|Leaf Blight": fungusSpot("پتوں کا جھلساؤ (اسٹیمفیلیم / اینتھراکنوز)", "Leaf blight (Stemphylium / Colletotrichum)", ["پتوں پر پیلے بھورے لمبے دھبے، سرے سے سوکھنا۔"]),
  "onion|Iris Yellow Virus": virus("آئرس پیلا دھبہ وائرس", "Iris yellow spot virus", ["پتوں پر ہیرے نما پیلے یا سفید دھبے۔"], "تھرپس"),
  "onion|Healthy": HEALTHY,
  // chili
  "chili|Cercospora Leaf Spot": fungusSpot("پتوں کے دھبے (سرکوسپورا)", "Cercospora leaf spot", ["گول دھبے، بیچ میں سفید اور کنارہ بھورا (آنکھ جیسے)۔"]),
  "chili|Powdery Mildew": powdery(),
  "chili|Mites and Thrips": { ...mites("جوئیں اور تھرپس (چرمڑ)"), en: "Mites and thrips", signs: ["پتے اوپر یا نیچے کی طرف مڑ کر کشتی جیسے، کنارے کھردرے۔"], spray: [ABAM, ACETA] },
  "chili|Nutrient Deficiency": deficiency("خوراک کی کمی", "Nutrient deficiency", ["پتے پیلے یا رگوں کے درمیان پیلاہٹ، بڑھوتری کم۔"], ["نائٹروجن اور زنک / بوران کی کمی عام ہے؛ مٹی ٹیسٹ کے مطابق کھاد دیں۔"]),
  "chili|Healthy": HEALTHY,
  // lentil
  "lentil|Ascochyta Blight": fungusSpot("جھلساؤ (ایسکوکائٹا بلائٹ)", "Ascochyta blight", ["پتوں اور تنے پر بھورے دھبے جن میں باریک کالے نقطے ہوں۔"], { spray: [CHLOROTH, DIFENO] }),
  "lentil|Rust": rust(),
  "lentil|Powdery Mildew": powdery(),
  "lentil|Healthy": HEALTHY,
  // groundnut
  "groundnut|Leaf Spot": fungusSpot("ٹکا (پتوں کے دھبے)", "Tikka leaf spot", ["پتوں پر گول بھورے / کالے دھبے، گرد پیلا ہالہ۔"], { spray: [CHLOROTH, DIFENO] }),
  "groundnut|Alternaria Leaf Spot": fungusSpot("آلٹرنیریا دھبے", "Alternaria leaf spot", ["پتوں کے کناروں سے بھورے جھلسے ہوئے دھبے۔"]),
  "groundnut|Rust": rust(),
  "groundnut|Rosette Virus": virus("روزیٹ وائرس", "Rosette virus", ["پودا گچھے جیسا چھوٹا، پتے چھوٹے اور پیلے۔"], "تیلہ"),
  "groundnut|Healthy": HEALTHY,
  // brinjal
  "brinjal|Cercospora Leaf Spot": fungusSpot("پتوں کے دھبے (سرکوسپورا)", "Cercospora leaf spot", ["پتوں پر بے ترتیب بھورے دھبے۔"]),
  "brinjal|Powdery Mildew": powdery(),
  "brinjal|Phytophthora Blight": { ur: "جھلساؤ (فائٹوفتھورا)", en: "Phytophthora blight", kind: "fungus", signs: ["پتوں پر پانی جیسے بڑے دھبے جو جلد بھورے ہو جاتے ہیں۔"], spray: [METALAXYL, COPPER], organic: ["متاثرہ پودے نکال دیں۔"], cultural: ["کھیت میں پانی کھڑا نہ ہونے دیں؛ کھیلیوں پر کاشت کریں۔"], note: "" },
  "brinjal|Wilt": { ur: "اکھیڑا (پودا مرجھانا)", en: "Wilt", kind: "fungus", signs: ["پتے دن میں مرجھا جاتے ہیں، پودا آہستہ آہستہ سوکھتا ہے۔"], spray: [THIOPH], organic: ["متاثرہ پودا جڑ سمیت نکال دیں۔"], cultural: ["فصلوں کا ہیر پھیر کریں؛ ایک کھیت میں ہر سال بینگن نہ لگائیں۔"], note: "دوا جڑوں کے پاس ڈالیں۔" },
  "brinjal|Mosaic Virus": virus("موزیک وائرس", "Mosaic virus", ["پتوں پر ہلکے اور گہرے سبز دھبے، پتے سکڑے ہوئے۔"]),
  "brinjal|Aphids": { ur: "سست تیلا (ایفڈ)", en: "Aphids", kind: "pest", signs: ["پتوں کے نیچے سبز یا کالے چھوٹے کیڑوں کے جھنڈ، پتے چپچپے۔"], spray: [IMIDA, ACETA], organic: ["نیم کا تیل یا صابن والے پانی کا اسپرے۔"], cultural: ["دوست کیڑے (لیڈی برڈ) ہوں تو زہر سے پرہیز کریں۔"], note: "" },
  "brinjal|Flea Beetle": { ur: "پسو بھونڈی (فلی بیٹل)", en: "Flea beetle", kind: "pest", signs: ["پتوں میں بہت سے چھوٹے گول سوراخ۔"], spray: [LAMBDA, IMIDA], organic: ["نیم کا تیل اسپرے۔"], cultural: [], note: "" },
  "brinjal|Healthy": HEALTHY,
  // spinach
  "spinach|Anthracnose": fungusSpot("اینتھراکنوز", "Anthracnose", ["پتوں پر پانی جیسے دھبے جو بھورے ہو جاتے ہیں۔"]),
  "spinach|Bacterial Spot": bacterial("بیکٹیریائی دھبے", "Bacterial spot", ["پتوں پر چھوٹے کونے دار گہرے دھبے۔"]),
  "spinach|Downy Mildew": downy(),
  "spinach|Pest Damage": { ur: "کیڑوں کا نقصان", en: "Pest damage", kind: "pest", signs: ["پتے کھائے ہوئے یا سوراخ دار۔"], spray: [EMAM], organic: ["نیم کا تیل اسپرے؛ سنڈیاں ہاتھ سے چن لیں۔"], cultural: [], note: "پالک جلد کٹتی ہے؛ اسپرے کے بعد لیبل پر لکھے دن پورے ہونے سے پہلے نہ کاٹیں۔" },
  "spinach|Healthy": HEALTHY,
  // radish
  "radish|Black Leaf Spot": fungusSpot("کالے دھبے (آلٹرنیریا)", "Black leaf spot", ["پتوں پر گول کالے دھبے، دائروں والے۔"]),
  "radish|Downy Mildew": downy(),
  "radish|Mosaic Virus": virus("موزیک وائرس", "Mosaic virus", ["پتوں پر ہلکے گہرے سبز دھبے، پتے ٹیڑھے۔"], "تیلہ"),
  "radish|Flea Beetle": { ur: "پسو بھونڈی (فلی بیٹل)", en: "Flea beetle", kind: "pest", signs: ["پتوں میں بہت سے چھوٹے گول سوراخ۔"], spray: [LAMBDA], organic: ["نیم کا تیل اسپرے۔"], cultural: [], note: "" },
  "radish|Healthy": HEALTHY,
  // black gram (mash)
  "blackgram|Cercospora Leaf Spot": fungusSpot("پتوں کے دھبے (سرکوسپورا)", "Cercospora leaf spot", ["پتوں پر گول بھورے دھبے، کنارہ سرخی مائل۔"]),
  "blackgram|Yellow Mosaic": virus("پیلا موزیک وائرس", "Yellow mosaic virus", ["پتوں پر چمکدار پیلے اور سبز دھبے۔"], "سفید مکھی"),
  "blackgram|Leaf Crinkle Virus": virus("پتہ سکڑ وائرس", "Leaf crinkle virus", ["پتے بڑے، موٹے اور جھریوں والے۔"]),
  "blackgram|Insect Damage": { ur: "کیڑوں کا نقصان", en: "Insect damage", kind: "pest", signs: ["پتے کھائے ہوئے یا سوراخ دار۔"], spray: [EMAM, LAMBDA], organic: ["نیم کا تیل اسپرے۔"], cultural: [], note: "" },
  "blackgram|Healthy": HEALTHY,
  // sunflower
  "sunflower|Downy Mildew": downy(),
  "sunflower|Gray Mould": { ur: "سرمئی پھپھوندی", en: "Gray mould", kind: "fungus", signs: ["پتوں اور پھول پر سرمئی روئیں والی سڑن۔"], spray: [THIOPH, AZOXY], organic: ["متاثرہ حصے کاٹ دیں۔"], cultural: ["زیادہ گھنی کاشت نہ کریں۔"], note: "" },
  "sunflower|Leaf Scars": fungusSpot("پتوں پر داغ / دھبے", "Leaf scars", ["پتوں پر بھورے سوکھے دھبے اور نشان۔"]),
  "sunflower|Healthy": HEALTHY,
  // apple
  "apple|Alternaria": fungusSpot("آلٹرنیریا دھبے", "Alternaria leaf blotch", ["پتوں پر گول بھورے دھبے، بعد میں پتے گر جاتے ہیں۔"]),
  "apple|Mosaic": virus("موزیک وائرس", "Apple mosaic virus", ["پتوں پر کریم یا پیلے رنگ کے بے ترتیب دھبے۔"], "پیوند / متاثرہ قلم"),
  "apple|Healthy": HEALTHY,
  // grape
  "grape|Downy Mildew": downy(),
  "grape|Powdery Mildew": powdery(),
  "grape|Bacterial Leaf Spot": bacterial("بیکٹیریائی دھبے", "Bacterial leaf spot", ["پتوں پر چھوٹے گہرے دھبے، گرد پیلا ہالہ۔"]),
  "grape|Healthy": HEALTHY,
  // guava
  "guava|Anthracnose": fungusSpot("اینتھراکنوز", "Anthracnose", ["پتوں اور پھل پر گہرے دھنسے ہوئے دھبے۔"], { spray: [COPPER, DIFENO] }),
  "guava|Canker": bacterial("کینکر", "Canker", ["پتوں پر ابھرے ہوئے کھردرے بھورے دھبے۔"]),
  "guava|Dot": fungusSpot("دھبے (ڈاٹ)", "Leaf dot", ["پتوں پر بہت سے چھوٹے گہرے نقطے۔"], { spray: [COPPER, MANCOZEB] }),
  "guava|Rust": rust(),
  "guava|Scab": fungusSpot("اسکیب (کھرنڈ)", "Scab", ["پتوں اور پھل پر کھردرے ابھرے ہوئے دھبے۔"], { spray: [COPPER, DIFENO] }),
  "guava|Healthy": HEALTHY,
  // date palm
  "datepalm|Black Scorch": fungusSpot("کالا جھلساؤ (بلیک اسکارچ)", "Black scorch", ["پتوں اور گوبھ پر کالے جلے ہوئے حصے۔"], { spray: [THIOPH, COPPER] }),
  "datepalm|Fusarium Wilt": { ur: "اکھیڑا (فیوزیریم وِلٹ)", en: "Fusarium wilt (bayoud)", kind: "fungus", signs: ["ایک طرف کے پتے سفید ہو کر سوکھتے ہیں۔"], spray: [THIOPH], organic: ["شدید متاثرہ درخت نکال کر جلا دیں۔"], cultural: ["متاثرہ باغ سے پودے (پنیری) نہ لیں۔"], note: "" },
  "datepalm|Leaf Spot": fungusSpot("پتوں کے دھبے", "Leaf spot", ["پتوں پر بھورے دھبے۔"], { spray: [COPPER, MANCOZEB] }),
  "datepalm|Rachis Blight": fungusSpot("ڈنڈی کا جھلساؤ", "Rachis blight", ["پتے کی ڈنڈی پر بھوری لمبی پٹیاں، پتہ سوکھتا ہے۔"], { spray: [COPPER, THIOPH] }),
  "datepalm|Scale Insect": { ur: "سکیل کیڑا (پارلاتوریا)", en: "White scale (Parlatoria)", kind: "pest", signs: ["پتوں پر سفید چھوٹے ابھار جو چپکے رہتے ہیں۔"], spray: [BUPRO, IMIDA], organic: ["شدید متاثرہ پتے کاٹ کر جلا دیں۔"], cultural: [], note: "" },
  "datepalm|Magnesium Deficiency": deficiency("میگنیشیم کی کمی", "Magnesium deficiency", ["پرانے پتوں کے کنارے پیلے، بیچ سبز۔"], ["میگنیشیم سلفیٹ زمین میں ڈالیں (مقدار ماہر سے پوچھیں)۔"]),
  "datepalm|Manganese Deficiency": deficiency("مینگنیز کی کمی", "Manganese deficiency", ["نئے پتے چھوٹے، پیلی دھاریاں۔"], ["مینگنیز سلفیٹ کا پتوں پر اسپرے یا زمین میں۔"]),
  "datepalm|Potassium Deficiency": deficiency("پوٹاش کی کمی", "Potassium deficiency", ["پرانے پتوں پر نارنجی پیلے دھبے، سرے سوکھے۔"], ["پوٹاشیم سلفیٹ (ایس او پی) کھاد دیں۔"]),
  "datepalm|Healthy": HEALTHY,
  // banana
  "banana|Sigatoka": fungusSpot("سگاٹوکا (پتوں کے دھبے)", "Sigatoka leaf spot", ["پتوں پر لمبی پیلی پھر بھوری دھاریاں۔"], { spray: [PROPI, MANCOZEB] }),
  "banana|Xanthomonas Wilt": { ...bacterial("بیکٹیریائی اکھیڑا (زینتھوموناس)", "Xanthomonas wilt", ["پتے پیلے ہو کر مرجھاتے ہیں، تنا کاٹنے پر پیلا مادہ۔"]), spray: [], note: "اس کی کوئی دوا مؤثر نہیں۔ متاثرہ پودا جڑ سمیت نکال کر دبا دیں؛ اوزار جراثیم سے پاک کریں۔" },
  "banana|Healthy": HEALTHY,
  // jamun
  "jamun|Bacterial Spot": bacterial("بیکٹیریائی دھبے", "Bacterial spot", ["پتوں پر چھوٹے گہرے دھبے۔"]),
  "jamun|Brown Blight": fungusSpot("بھورا جھلساؤ", "Brown blight", ["پتوں کے کنارے بھورے ہو کر سوکھتے ہیں۔"], { spray: [COPPER, DIFENO] }),
  "jamun|Powdery Mildew": powdery(),
  "jamun|Sooty Mould": sooty(),
  "jamun|Healthy": HEALTHY,
  // citrus (from the lemon data)
  "citrus|Anthracnose": fungusSpot("اینتھراکنوز", "Anthracnose", ["پتوں پر بھورے دھنسے دھبے، شاخیں سرے سے سوکھتی ہیں۔"], { spray: [COPPER, DIFENO] }),
  "citrus|Bacterial Blight": bacterial("بیکٹیریائی جھلساؤ", "Bacterial blight", ["پتوں پر پانی جیسے دھبے جو کالے ہو جاتے ہیں۔"]),
  "citrus|Leaf Curl": virus("پتہ مروڑ", "Leaf curl", ["پتے مڑے ہوئے اور سکڑے ہوئے۔"], "تیلہ / سفید مکھی / لیف مائنر"),
  "citrus|Nutrient Deficiency": deficiency("خوراک کی کمی", "Nutrient deficiency", ["رگوں کے درمیان پیلاہٹ (اکثر زنک یا آئرن کی کمی)۔"], ["زنک سلفیٹ کا پتوں پر اسپرے بہار میں؛ مٹی ٹیسٹ کروائیں۔"]),
  "citrus|Sooty Mould": sooty(),
  "citrus|Spider Mites": mites(),
  // rose
  "rose|Black Spot": fungusSpot("کالے دھبے (بلیک اسپاٹ)", "Black spot", ["پتوں پر گول کالے دھبے جن کے کنارے پر دھاگے جیسے، پتے پیلے ہو کر گرتے ہیں۔"], { spray: [MANCOZEB, DIFENO, CHLOROTH], cultural: ["گرے ہوئے پتے روز اٹھائیں؛ پانی جڑ میں دیں، پتوں پر نہیں۔"] }),
  "rose|Downy Mildew": downy(),
  "rose|Healthy": HEALTHY,
  // moringa
  "moringa|Bacterial Leaf Spot": bacterial("بیکٹیریائی دھبے", "Bacterial leaf spot", ["پتیوں پر چھوٹے گہرے دھبے۔"]),
  "moringa|Cercospora Leaf Spot": fungusSpot("پتوں کے دھبے (سرکوسپورا)", "Cercospora leaf spot", ["پتیوں پر بھورے گول دھبے۔"]),
  "moringa|Yellowing": deficiency("پتوں کا پیلا ہونا", "Yellowing", ["پتیاں پیلی پڑ رہی ہیں۔"], ["پانی کھڑا نہ ہونے دیں؛ گوبر کی کھاد اور نائٹروجن دیں۔"]),
  "moringa|Healthy": HEALTHY,
  // trees, identification only
  "neem|Healthy": treeHealthy("نیم"),
  "arjun|Healthy": treeHealthy("ارجن"),
  "mulberry|Healthy": treeHealthy("شہتوت"),
};

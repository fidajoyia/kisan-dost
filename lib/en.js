// Language switch: the app is written in Urdu; EN maps each Urdu sentence to its English one.
// t("اردو") returns the Urdu text when Urdu is chosen and the English text otherwise.
import EN from "./en.json";

let cur = "ur";
export const setLang = (l) => { cur = l === "ur" ? "ur" : "en"; };
export const isUr = () => cur === "ur";
export const tr = (lang) => (s) => (lang === "ur" || s == null ? s : EN[s] ?? s);
export const t = (s) => tr(cur)(s);
export const locale = () => (cur === "ur" ? "ur-PK" : "en-GB");

export const DISTRICT_UR = {"Lahore": "لاہور", "Kasur": "قصور", "Okara": "اوکاڑہ", "Sahiwal": "ساہیوال", "Pakpattan": "پاکپتن", "Faisalabad": "فیصل آباد", "Jhang": "جھنگ", "Toba Tek Singh": "ٹوبہ ٹیک سنگھ", "Sargodha": "سرگودھا", "Khushab": "خوشاب", "Mandi Bahauddin": "منڈی بہاؤالدین", "Gujranwala": "گوجرانوالہ", "Sialkot": "سیالکوٹ", "Gujrat": "گجرات", "Sheikhupura": "شیخوپورہ", "Nankana Sahib": "ننکانہ صاحب", "Hafizabad": "حافظ آباد", "Narowal": "نارووال", "Multan": "ملتان", "Khanewal": "خانیوال", "Vehari": "وہاڑی", "Lodhran": "لودھراں", "Bahawalpur": "بہاولپور", "Bahawalnagar": "بہاولنگر", "Rahim Yar Khan": "رحیم یار خان", "Dera Ghazi Khan": "ڈیرہ غازی خان", "Muzaffargarh": "مظفرگڑھ", "Layyah": "لیہ", "Rajanpur": "راجن پور", "Bhakkar": "بھکر", "Mianwali": "میانوالی", "Rawalpindi": "راولپنڈی", "Attock": "اٹک", "Chakwal": "چکوال", "Jhelum": "جہلم", "Hyderabad": "حیدرآباد", "Mirpur Khas": "میرپور خاص", "Sanghar": "سانگھڑ", "Shaheed Benazirabad": "شہید بینظیر آباد", "Khairpur": "خیرپور", "Sukkur": "سکھر", "Larkana": "لاڑکانہ", "Dadu": "دادو", "Ghotki": "گھوٹکی", "Jacobabad": "جیکب آباد", "Thatta": "ٹھٹھہ", "Badin": "بدین", "Tando Allahyar": "ٹنڈو الہ یار", "Umerkot": "عمرکوٹ", "Matiari": "مٹیاری", "Karachi": "کراچی", "Tharparkar": "تھرپارکر", "Peshawar": "پشاور", "Mardan": "مردان", "Charsadda": "چارسدہ", "Swabi": "صوابی", "Nowshera": "نوشہرہ", "Swat": "سوات", "Dera Ismail Khan": "ڈیرہ اسماعیل خان", "Bannu": "بنوں", "Kohat": "کوہاٹ", "Abbottabad": "ایبٹ آباد", "Mansehra": "مانسہرہ", "Haripur": "ہری پور", "Lakki Marwat": "لکی مروت", "Quetta": "کوئٹہ", "Pishin": "پشین", "Killa Saifullah": "قلعہ سیف اللہ", "Loralai": "لورالائی", "Zhob": "ژوب", "Mastung": "مستونگ", "Kalat": "قلات", "Naseerabad": "نصیر آباد", "Jaffarabad": "جعفر آباد", "Kech": "کیچ", "Lasbela": "لسبیلہ", "Kharan": "خاران", "Chagai": "چاغی", "Gilgit": "گلگت", "Skardu": "سکردو", "Hunza": "ہنزہ", "Ghizer": "غذر", "Muzaffarabad": "مظفرآباد", "Mirpur": "میرپور", "Bagh": "باغ", "Poonch": "پونچھ", "Islamabad": "اسلام آباد"};
// a district / place name in the chosen language (names with no Urdu spelling on file stay as they are)
export const placeName = (n) => (cur === "ur" ? DISTRICT_UR[n] || n : n);

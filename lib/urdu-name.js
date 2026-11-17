// Variety names (English / codes) written in Urdu script for the Urdu screen.
// Codes are spelled letter by letter the way they are read out ("FL16045-25" -> "ایف ایل 16045-25");
// words use a small list of known names, otherwise a sound-alike spelling.
const LETTER = { A: "اے", B: "بی", C: "سی", D: "ڈی", E: "ای", F: "ایف", G: "جی", H: "ایچ", I: "آئی", J: "جے", K: "کے", L: "ایل", M: "ایم",
  N: "این", O: "او", P: "پی", Q: "کیو", R: "آر", S: "ایس", T: "ٹی", U: "یو", V: "وی", W: "ڈبلیو", X: "ایکس", Y: "وائی", Z: "زیڈ" };

const WORD = {
  trinity: "ٹرینیٹی", antonio: "انتونیو", colorado: "کولوراڈو", tamcot: "ٹیم کاٹ", excelsior: "ایکسلسیئر", gold: "گولڈ", alameda: "الامیڈا",
  red: "ریڈ", river: "ریور", runner: "رنر", kona: "کونا", black: "بلیک", pearl: "پرل", snowdon: "سنوڈن", ezra: "عزرا", tamval: "ٹیم ویل",
  alf: "الف", pers: "پرس", white: "وائٹ", green: "گرین", blue: "بلیو", star: "اسٹار", king: "کنگ", queen: "کوئین", sun: "سن", gem: "جیم",
  jasmine: "جیسمین", jupiter: "جوپیٹر", mercury: "مرکری", sabine: "سبین", rex: "ریکس", della: "ڈیلا", cheniere: "شینیئر", presidio: "پریسیڈیو",
  valley: "ویلی", prairie: "پریری", hudson: "ہڈسن", north: "نارتھ", south: "ساؤتھ", early: "ارلی", super: "سپر", giant: "جائنٹ", sweet: "سویٹ",
  georgia: "جارجیا", florida: "فلوریڈا", texas: "ٹیکساس", iowa: "آئیوا", cornell: "کارنیل", michigan: "مشی گن", california: "کیلیفورنیا",
  bean: "بین", pea: "پی", rose: "روز", ruby: "روبی", diamond: "ڈائمنڈ", silver: "سلور", spring: "اسپرنگ", winter: "ونٹر", summer: "سمر",
};

const DI = [["tch", "چ"], ["sh", "ش"], ["ch", "چ"], ["th", "تھ"], ["ph", "ف"], ["ck", "ک"], ["qu", "کو"], ["ee", "ی"], ["ea", "ی"], ["oo", "و"],
  ["ou", "او"], ["ow", "او"], ["ai", "ے"], ["ay", "ے"], ["ey", "ی"], ["ie", "ی"], ["oa", "و"], ["au", "ا"], ["aw", "ا"], ["ng", "نگ"]];
const ONE = { b: "ب", c: "ک", d: "ڈ", f: "ف", g: "گ", h: "ہ", j: "ج", k: "ک", l: "ل", m: "م", n: "ن", p: "پ", q: "ک", r: "ر", s: "س", t: "ٹ",
  v: "و", w: "و", x: "کس", y: "ی", z: "ز", a: "ا", e: "ے", i: "ی", o: "و", u: "ا" };
const FIRST = { a: "ا", e: "ا", i: "ا", o: "او", u: "ا" };

// a sound-alike Urdu spelling for an English word nobody has added to WORD yet
function soundAlike(w) {
  const s = w.toLowerCase();
  let out = "";
  for (let i = 0; i < s.length;) {
    const di = DI.find(([k]) => s.startsWith(k, i));
    if (di) { out += di[1]; i += di[0].length; continue; }
    const ch = s[i], next = s[i + 1] || "";
    if (i === 0 && FIRST[ch]) out += FIRST[ch];
    else if (ch === "c" && /[eiy]/.test(next)) out += "س";
    else if (ch === "e" && i === s.length - 1) out += ""; // silent final e
    else if (ch === "e" && i < s.length - 1) out += /[aeiou]/.test(s[i - 1]) ? "" : "ی".slice(0, next && /[aeiou]/.test(s[i + 2] || "") ? 0 : 1);
    else if (/[aeiou]/.test(ch) && i > 0 && i < s.length - 1 && !/[aeiou]/.test(next) && /[aeiou]/.test(s[i + 2] || "x")) out += ONE[ch];
    else if (/[aeiou]/.test(ch) && i > 0 && i < s.length - 1) out += ch === "a" ? "ا" : ch === "o" ? "و" : ch === "i" ? "ی" : ""; // short vowels mostly unwritten
    else out += ONE[ch] ?? ch;
    i++;
  }
  return out;
}

const spell = (letters) => letters.toUpperCase().split("").map((c) => LETTER[c] || c).join(" ");

function token(tok) {
  if (!/[A-Za-z]/.test(tok)) return tok;
  if (WORD[tok.toLowerCase()]) return WORD[tok.toLowerCase()];
  // camel case or letters glued to digits: split into pieces
  const parts = tok.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+(?:[.-]\d+)*|[^A-Za-z\d]+/g) || [tok];
  if (parts.length > 1) return parts.map(token).join(" ").replace(/\s+-\s+/g, "-");
  if (/^[A-Z]+$/.test(tok) || tok.length <= 2) return spell(tok); // a code: read letter by letter
  return soundAlike(tok);
}

export function urduName(name = "") {
  return String(name)
    .replace(/_/g, " ")
    .split(/(\s+)/)
    .map((t) => (/^\s+$/.test(t) ? " " : t.split(/(?<=[A-Za-z])-(?=[A-Za-z])/).map(token).join(" ")))
    .join("")
    .replace(/-(?=[\u0600-\u06FF])/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

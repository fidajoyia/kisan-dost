// Reads an official cultivar registration (Journal of Plant Registrations, via Crossref) and turns it
// into comparable facts: who bred it, crop, yield vs check varieties, maturity, disease resistance,
// heat / drought / salt / flood tolerance, and how seed is distributed. Pure functions, no network.
import { INSTITUTIONS } from "./institutions.js";
import { cropOf } from "./crops.js";

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export const clean = (s = "") => String(s)
  .replace(/<[^>]+>/g, " ")
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
  .replace(/[‐‑–—−]/g, "-").replace(/[‘’′]/g, "'").replace(/\s+/g, " ").trim();

// Names inside quotes: ‘Amigos’, 'CP 12-2035'
export function namesOf(title) {
  const t = clean(title);
  const out = [];
  for (const m of t.matchAll(/'([^']{2,40})'/g)) out.push(m[1].trim());
  return [...new Set(out)];
}

// Who developed / released it. Only those count, not every co-author.
const ABBR = /\b(Inc|Co|Ltd|Univ|Dep|Dept|St|Corp|Sta|Exp|Agric|Agr|Res|Ext|Mt|Ft|U\.S|No|spp|ssp|var|cv|L)\./g;
export function creditedInstitutions(abstract, authorsAff = []) {
  const a = clean(abstract).replace(ABBR, "$1");
  const phrases = [...a.matchAll(/\b(developed|released|bred|jointly released|research conducted|conducted)\b[^.]{0,260}/gi)].map((m) => m[0]);
  const hit = (txt) => INSTITUTIONS.filter((i) => i.credit?.test(txt)).map((i) => i.id);
  let ids = [...new Set(phrases.flatMap(hit))];
  if (!ids.length && !phrases.length && authorsAff[0]) ids = hit(clean(authorsAff[0])); // no "by" sentence: first author
  return ids;
}

const DISEASE_WORDS = /rust|blight|mildew|blast|smut|scald|mosaic|virus|wilt|rot|spot|blotch|nematode|scab|anthracnose|stunt|sheath|leaf curl|fusarium|septoria|bacterial|downy|powdery|fly|aphid|greenbug|weevil|borer|insect/i;
function listAfter(a, re) {
  const out = [];
  for (const m of a.matchAll(re)) {
    const seg = m[1].replace(/\([^)]*\)|\[[^\]]*\]/g, "").split(/;|\bbut\b|\bwhile\b|\bhas\b|\bis\b|\bmoderate(?:ly)?\b|\bsusceptib\w*/i)[0];
    const items = seg.split(/,|\band\b|\bor\b/).map((x) => x.replace(/caused by.*$/i, "").replace(/^(the|to|both)\s+/i, "").trim()).filter(Boolean);
    // "leaf, stripe, and stem rusts" → leaf rust, stripe rust, stem rust
    const last = items[items.length - 1] || "";
    const noun = (last.match(/\b(rusts?|blights?|mildews?|spots?|rots?|viruses|wilts?|mosaics?)$/i) || [])[1];
    items.forEach((x) => {
      let v = x;
      if (noun && !DISEASE_WORDS.test(v) && v.split(" ").length <= 2) v = `${v} ${noun}`;
      v = v.replace(/\b(rust|blight|mildew|spot|rot|wilt|mosaic)s\b/i, "$1");
      if (v.length < 60 && DISEASE_WORDS.test(v)) out.push(v);
    });
  }
  return out;
}
function uniqLower(xs) { const s = new Set(); return xs.filter((x) => { const k = x.toLowerCase(); if (s.has(k)) return false; s.add(k); return true; }); }

// "P. striiformis f. sp. tritici" → no sentence break inside (a period followed by a lowercase word is an abbreviation)
const unabbr = (s) => s.replace(ABBR, "$1").replace(/\b([A-Za-z]{1,3})\.(?=\s+[a-z(])/g, "$1");
export function traitsOf(abstractRaw, titleRaw = "") {
  const a = unabbr(clean(abstractRaw)), t = clean(titleRaw), all = `${t}. ${a}`;
  // yield vs checks
  let yieldPct = null, yieldNote = null;
  const pctList = all.match(/(\d+(?:\.\d+)?(?:\s*(?:,|,?\s*and)\s*\d+(?:\.\d+)?)*)\s*%\s*(?:higher|greater|more|above|increase)/i);
  if (pctList) { const nums = pctList[1].match(/\d+(?:\.\d+)?/g).map(Number).filter((n) => n > 0 && n < 100); if (nums.length) yieldPct = Math.min(...nums); }
  const pair = all.match(/(?:yield[^.]{0,80}?)averaged\s+([\d,]+(?:\.\d+)?)\s*(kg|mg|t|bu)[^.]{0,30}?compared with\s+([\d,]+(?:\.\d+)?)/i);
  if (yieldPct == null && pair) { const x = +pair[1].replace(/,/g, ""), y = +pair[3].replace(/,/g, ""); if (x > 0 && y > 0) yieldPct = Math.round(((x - y) / y) * 1000) / 10; }
  const absM = all.match(/(\d+(?:\.\d+)?)\s*(Mg|t)\s*ha\s*-?\s*1/i) || all.match(/averaged\s+([\d,]+)\s*kg\s*ha/i);
  if (absM) yieldNote = absM[2] ? `${absM[1]} t/ha` : `${(+absM[1].replace(/,/g, "") / 1000).toFixed(1)} t/ha`;
  let yieldClaim = null;
  if (yieldPct != null) yieldClaim = yieldPct > 0 ? "higher" : "comparable";
  else if (/(significantly higher|superior|higher|above[- ]average|increased)\s+(grain |lint |sugar |seed |tuber |cane |forage )?yield/i.test(all)) yieldClaim = "higher";
  else if (/high (grain |lint |sugar |seed )?yield/i.test(all)) yieldClaim = "high";
  else if (/(comparable|similar|equivalent|not different)[^.]{0,40}yield|yield[^.]{0,60}(comparable|similar|equivalent|not different)/i.test(all)) yieldClaim = "comparable";

  const maturity = /early[- ]maturing|early maturity|\bearly\b[^.]{0,20}(heading|maturity)/i.test(all) ? "early"
    : /late[- ]maturing|matures later|late maturity/i.test(all) ? "late" : /medium[- ]maturing|medium maturity|mid[- ]maturity/i.test(all) ? "medium" : null;
  const daysEarlier = all.match(/(\d+)\s*(?:to\s*\d+\s*)?d(?:ays?)?\s+earlier/i);

  const resistant = uniqLower(listAfter(a, /\bresist(?:ant|ance)\s+to\s+([^.]{3,220})/gi));
  const moderate = uniqLower(listAfter(a, /\bmoderate(?:ly)?\s+(?:level of\s+)?resist(?:ant|ance)\s+(?:to\s+)?([^.]{3,200})/gi));
  const strong = resistant.filter((r) => !moderate.some((m) => m.toLowerCase() === r.toLowerCase()));

  const tol = {
    heat: /heat[- ](tolerant|tolerance|stress)|high[- ]temperature/i.test(all),
    drought: /drought|water[- ]limited|limited[- ](water|irrigation)|dryland|rainfed|water[- ]use efficien/i.test(all),
    salt: /salin|salt[- ]toleran|sodic/i.test(all),
    flood: /flood[- ]toleran|waterlog|submergence/i.test(all),
    cold: /freeze|frost|winter[- ]?hard|cold[- ]toleran/i.test(all),
    acid: /acid soil/i.test(all),
    sand: /sand(y)? soils?/i.test(all),
  };
  const habit = /\bwinter\b/i.test(t) ? "winter" : /\bspring\b/i.test(t) ? "spring" : /\bwinter (wheat|barley|oat)/i.test(a) ? "winter" : /\bspring (wheat|barley|oat)/i.test(a) ? "spring" : null;
  const quality = [/bak(e|ing)|bread|milling/i.test(all) && "baking quality", /fib(er|re) (quality|package|strength|length)/i.test(all) && "fibre quality",
    /protein/i.test(all) && "protein", /oil (content|yield)|high[- ]oleic/i.test(all) && "oil", /sucrose|sugar (content|yield)/i.test(all) && "sugar content", /malting/i.test(all) && "malting"].filter(Boolean);
  const adapted = ((a.match(/\b(?:adapted to|for cultivating on|for commercial cultivation on|released for)\s+([^.]{4,140})/i) || [])[1] || "").split(/\s(?:after|through|with|due|because|based)\b/)[0].trim() || null;
  const pi = (a.match(/\bPI\s?(\d{6})/) || [])[1] || null;
  const regNo = (a.match(/Reg\.?\s*no\.?:?\s*(CV-?\s?\d+)/i) || [])[1]?.replace(/\s/g, "") || null;
  const released = +((a.match(/released[^.]{0,120}?\b(19|20)(\d{2})\b/i) || []).slice(1).join("") || 0) || null;
  const seedBy = (a.match(/(?:seed production and sales|seed[^.]{0,40}(?:handled|marketed|distributed|available))[^.]{0,20}by\s+([^.]{3,120})/i) || [])[1] || null;
  const pvp = /plant variety protection|\bPVP\b/i.test(a);
  const type = (`${t} ${a.slice(0, 300)}`.match(/\b((?:hard|soft) (?:red|white) (?:winter|spring)|two-row|six-row|upland|pima|sea island|hybrid|inbred|long-grain|medium-grain|short-grain|aromatic|jasmine)\b/i) || [])[1] || null;
  return { yieldPct, yieldClaim, yieldNote, maturity, daysEarlier: daysEarlier ? +daysEarlier[1] : null, resistant: strong, moderate, tol, habit, quality, adapted, pi, regNo, released, seedBy, pvp, type };
}

// Crossref work → candidate (or null if it isn't a released cultivar of a crop we track)
export function candidateFrom(work) {
  const title = clean(work?.title?.[0] || ""), abstract = work?.abstract || "";
  if (!title) return null;
  const a = clean(abstract);
  const isCultivar = /Reg\.?\s*no\.?:?\s*CV/i.test(a) || /\bcultivar\b|\bvariety\b/i.test(title);
  if (!isCultivar || /germplasm|mapping population|genetic stock|parental line/i.test(title)) return null;
  // crop from the title; the abstract only if the title names none (abstracts mention rotation crops)
  const crop = cropOf(title) || cropOf(a.slice(0, 200));
  if (!crop) return null;
  const aff = (work.author || []).flatMap((x) => (x.affiliation || []).map((y) => y.name));
  const inst = creditedInstitutions(abstract, aff);
  if (!inst.length) return null;
  const names = namesOf(title);
  const year = work.published?.["date-parts"]?.[0]?.[0] || null;
  const tr = traitsOf(abstract, title);
  return {
    id: work.DOI, doi: work.DOI, link: `https://doi.org/${work.DOI}`,
    name: names.join(" / ") || title.replace(/^Registration of\s*/i, "").slice(0, 60),
    crop, inst, year, released: tr.released || year, title, summary: a.slice(0, 600), source: "registration", ...tr,
  };
}

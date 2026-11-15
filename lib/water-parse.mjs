// Parses the FFD daily flood bulletin page (no Next.js imports, so scripts/update-ffd.mjs can use it too).
import { HEADWORKS } from "./headworks.js";

export const URL_BULLETIN = "https://ffd.pmd.gov.pk/bulletin";
const LEVELS = "Exceptionally High|Very High|Below Low|High|Medium|Low|Normal";
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function bulletinText(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/\s+/g, " ");
}

// Flows are printed in thousands of cusecs.
export function parseBulletin(text) {
  const t = String(text);
  const d = t.match(/DAILY FLOOD BULLETIN (\d{1,2})-([A-Z]{3})-(\d{4})/i);
  const date = d ? `${d[3]}-${String(MONTHS[d[2].toLowerCase()]).padStart(2, "0")}-${d[1].padStart(2, "0")}` : null;
  const no = t.match(/BULLETIN No:\s*([\d/]+)/i)?.[1] || null;
  const stations = {};
  for (const h of HEADWORKS) {
    const name = h.id === "Punjnad" ? "(?:Punjnad|Panjnad)" : esc(h.id).replace(/\\\. /, "\\.? ?");
    const m = t.match(new RegExp(`${h.river.toUpperCase()} ${name} (\\d+(?:\\.\\d+)?) (\\d+(?:\\.\\d+)?) (.{0,40}?) (${LEVELS})\\b`, "i"));
    if (m) stations[h.id] = { inflow: Math.round(+m[1] * 1000), outflow: Math.round(+m[2] * 1000), forecast: m[3].trim(), level: m[4] };
  }
  const res = {};
  for (const [k, n] of [["tarbela", "TARBELA"], ["mangla", "MANGLA"]]) {
    const m = t.match(new RegExp(`${n} Level ([\\d.]+) ft .{0,60}? Storage ([\\d.]+)%`));
    if (m) res[k] = { levelFt: +m[1], storagePct: +m[2] };
  }
  const season = /FLOOD SEASON \d{4} HAS BEEN CONCLUDED/i.test(t) ? "ended" : "on";
  const situation = t.match(/HYDROLOGICAL SITUATION at 0600 PST (.{10,240}?)(?: IV\.| HYDROLOGICAL OUTLOOK)/i)?.[1]?.trim() || null;
  return { date, no, stations, reservoirs: res, season, situation };
}


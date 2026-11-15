// Saves the newest FFD daily flood bulletin (river flows at every headworks) to data/ffd-latest.json,
// used when ffd.pmd.gov.pk cannot be reached. Run: node scripts/update-ffd.mjs
import fs from "node:fs";
import { bulletinText, parseBulletin } from "../lib/water-parse.mjs";

const r = await fetch("https://ffd.pmd.gov.pk/bulletin", { headers: { "User-Agent": "KisanDost/1.5 (farm advisory app; daily river flows)" } });
if (!r.ok) throw new Error(`ffd ${r.status}`);
const p = parseBulletin(bulletinText(await r.text()));
if (Object.keys(p.stations).length < 10) throw new Error("bulletin table not found");
fs.writeFileSync(new URL("../data/ffd-latest.json", import.meta.url), JSON.stringify({ ...p, saved: new Date().toISOString() }, null, 1));
console.log("saved bulletin", p.date, Object.keys(p.stations).length, "stations");

// Refresh data/ffc-latest.json from the Federal Flood Commission.
// ffc.gov.pk only answers connections from Pakistan, so run this on a computer in Pakistan:
//   node scripts/update-ffc.mjs && git add data/ffc-latest.json && git commit -m "FFC report update" && git push
// Vercel redeploys on push and the live app uses the new report whenever it can't reach FFC itself.
import fs from "node:fs";
import { fetchFFC } from "../lib/flood/sources.js";

const out = new URL("../data/ffc-latest.json", import.meta.url);
const old = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : null;
const r = await fetchFFC();
fs.writeFileSync(out, JSON.stringify(r) + "\n");
console.log(`FFC report ${r.date}${old?.date === r.date ? " (unchanged)" : ` (was ${old?.date || "none"})`} → data/ffc-latest.json`);

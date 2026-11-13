// Saves the current CWC series of the three Indian dams to data/india-dams.json (fallback snapshot).
import fs from "fs";
import { INDIA_DAMS, parseDamPage } from "../lib/flood/india-dams.js";
const dams = {};
for (const d of INDIA_DAMS) {
  const html = fs.existsSync(process.argv[2] + `/${d.slug}.html`) ? fs.readFileSync(process.argv[2] + `/${d.slug}.html`, "utf8")
    : await (await fetch(`https://reservoirs.earth/india/reservoirs/${d.slug}`)).text();
  dams[d.id] = parseDamPage(html);
  console.log(d.id, dams[d.id].series.length, "readings", dams[d.id].series.at(-1), "normal", dams[d.id].monthlyNormal);
}
fs.writeFileSync("data/india-dams.json", JSON.stringify({ saved: new Date().toISOString().slice(0, 10), dams }));

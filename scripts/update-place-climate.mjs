// NASA POWER 2001–2020 monthly normals (mean temperature °C, rain mm/day) for every place in places.js
import fs from "fs";
import { PLACES } from "../lib/seed-intel/places.js";
const M = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const out = {};
for (const p of PLACES) {
  const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${p.lon}&latitude=${p.lat}&format=JSON`;
  const j = await (await fetch(u)).json();
  const t = j.properties.parameter.T2M, r = j.properties.parameter.PRECTOTCORR;
  out[p.id] = { t: M.map((m) => t[m]), rain: M.map((m) => r[m]) };
  process.stdout.write(p.id + " ");
}
fs.writeFileSync("data/place-climate.json", JSON.stringify({ source: "NASA POWER climatology 2001-2020 (T2M, PRECTOTCORR)", places: out }));
console.log("\nsaved", Object.keys(out).length);

// River basins used by the flood outlook (Feature 3).
//  catchment: upstream points where rain / snow / heat decide how much water comes down.
//             All feed the 7-month seasonal forecast (ECMWF SEAS5); the FIRST TWO also feed the
//             ERA5 history (last year / normal), which is kept small to stay inside free API limits.
//  course:    the river's path through Pakistan's plains, used to find which river is near a farm.
//  glacier:   share of the river's summer flow that comes from snow + glacier melt (0–1, approximate).
//  dam:       reservoir key in the Federal Flood Commission (FFC) daily report.
//  stations:  FFC gauging stations (upstream → downstream) for the "today" flood class.
// Coordinates are approximate (±5 km): fine for a regional outlook, not for engineering.
export const BASINS = [
  {
    id: "indus", ur: "دریائے سندھ", en: "Indus", glacier: 0.6, dam: "tarbela",
    catchment: [[35.30, 75.63], [35.92, 74.31], [36.32, 74.65], [35.36, 74.86], [34.92, 72.87]],
    course: [[34.09, 72.69], [33.89, 72.25], [32.96, 71.55], [32.43, 71.38], [31.83, 70.93], [30.96, 70.80], [30.70, 70.66],
      [30.05, 70.85], [29.55, 70.72], [29.10, 70.52], [28.42, 69.71], [27.70, 68.85], [27.30, 68.30], [26.73, 68.00],
      [26.42, 67.88], [25.37, 68.33], [24.75, 68.00], [24.20, 67.70]],
    stations: [["Tarbela", 34.09, 72.69], ["Kalabagh", 32.96, 71.55], ["Chashma", 32.43, 71.38], ["Taunsa", 30.70, 70.66],
      ["Guddu", 28.42, 69.71], ["Sukkur", 27.70, 68.85], ["Kotri", 25.37, 68.33]],
  },
  {
    id: "jhelum", ur: "دریائے جہلم", en: "Jhelum", glacier: 0.25, dam: "mangla",
    catchment: [[34.37, 73.47], [34.08, 74.80], [34.58, 73.90], [33.73, 75.15]],
    course: [[34.37, 73.47], [34.10, 73.50], [33.13, 73.64], [32.93, 73.73], [32.68, 73.55], [32.45, 73.10], [32.30, 72.35],
      [31.70, 72.30], [31.15, 72.15]],
    stations: [["Mangla", 33.13, 73.64], ["Rasul", 32.68, 73.55]],
  },
  {
    id: "chenab", ur: "دریائے چناب", en: "Chenab", glacier: 0.25, dam: null,
    catchment: [[33.31, 75.77], [32.73, 74.86], [33.00, 75.70], [32.49, 74.53]],
    course: [[32.67, 74.46], [32.40, 73.97], [32.32, 73.70], [31.95, 73.30], [31.72, 72.98], [31.30, 72.40], [31.15, 72.15],
      [30.65, 71.85], [30.25, 71.35], [29.80, 71.15], [29.35, 71.00]],
    stations: [["Marala", 32.67, 74.46], ["Khanki", 32.40, 73.97], ["Qadirabad", 32.32, 73.70], ["Trimmu", 31.15, 72.15],
      ["Panjnad", 29.35, 71.00]],
  },
  {
    id: "ravi", ur: "دریائے راوی", en: "Ravi", glacier: 0.05, dam: null,
    catchment: [[32.55, 76.13], [32.37, 75.60], [32.10, 74.87]],
    course: [[32.06, 74.98], [31.62, 74.30], [31.22, 73.86], [30.85, 73.05], [30.75, 72.60], [30.57, 72.12], [30.65, 71.85]],
    stations: [["Jassar", 32.06, 74.98], ["Shahdara", 31.62, 74.30], ["Balloki", 31.22, 73.86], ["Sidhnai", 30.57, 72.12]],
  },
  {
    id: "sutlej", ur: "دریائے ستلج", en: "Sutlej", glacier: 0.15, dam: null,
    catchment: [[31.33, 76.75], [30.97, 76.53], [30.92, 74.61]],
    course: [[31.05, 74.53], [30.75, 74.10], [30.37, 73.87], [30.05, 73.20], [29.83, 72.55], [29.55, 72.00], [29.40, 71.68],
      [29.30, 71.30], [29.35, 71.00]],
    stations: [["G.S Wala", 31.05, 74.53], ["Sulemanki", 30.37, 73.87], ["Islam", 29.83, 72.55]],
  },
  {
    id: "kabul", ur: "دریائے کابل و سوات", en: "Kabul & Swat", glacier: 0.35, dam: null,
    catchment: [[35.85, 71.79], [34.77, 72.36], [35.48, 72.58], [34.43, 70.45]],
    course: [[34.17, 71.36], [34.15, 71.74], [34.02, 71.98], [33.91, 72.24]],
    course2: [[34.77, 72.36], [34.65, 72.03], [34.36, 71.56], [34.15, 71.74]], // River Swat
    stations: [["Warsak", 34.17, 71.36], ["Nowshera", 34.02, 71.98], ["Chakdara Bridge", 34.65, 72.03], ["Munda", 34.36, 71.56],
      ["Charsadda Road", 34.15, 71.74]],
  },
  {
    // Not a river: flash floods from the Koh-e-Suleman and Kirthar hill torrents. They hit the plains at the
    // foot of the hills, west of the Indus (DI Khan, Taunsa, DG Khan, Rajanpur, Kachhi, Jhal Magsi, Dadu west).
    id: "torrents", ur: "پہاڑی نالے (رود کوہی)", en: "Hill torrents", glacier: 0, dam: null, radiusKm: 40,
    catchment: [[29.95, 69.97], [27.80, 66.60], [29.90, 69.52], [31.40, 70.10]],
    course: [[31.83, 70.45], [31.20, 70.40], [30.70, 70.35], [30.05, 70.30], [29.55, 70.15], [29.10, 70.00], [28.60, 68.10],
      [28.30, 67.45], [27.50, 67.40], [26.90, 67.45]],
    stations: [],
  },
];

export const HISTORY_POINTS = 2; // per basin, from the start of `catchment`
export const basinById = (id) => BASINS.find((b) => b.id === id) || null;

// ---- geometry ----
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function km([a, b], [c, d]) {
  const x = rad(d - b) * Math.cos(rad((a + c) / 2)), y = rad(c - a);
  return Math.sqrt(x * x + y * y) * R;
}
// distance from point p to segment a–b (equirectangular, fine at these scales)
function segKm(p, a, b) {
  const kx = Math.cos(rad(p[0])) * 111.32, ky = 110.57;
  const ax = (a[1] - p[1]) * kx, ay = (a[0] - p[0]) * ky, bx = (b[1] - p[1]) * kx, by = (b[0] - p[0]) * ky;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
export function distanceToCourse(p, course) {
  let best = Infinity;
  for (let i = 0; i < course.length - 1; i++) {
    best = Math.min(best, segKm(p, course[i], course[i + 1]));
  }
  return best;
}

// Rivers that can flood this farm: within 35 km of the river (60 km for hill torrents), nearest first.
export function riversNear(lat, lon) {
  const p = [lat, lon];
  return BASINS.map((b) => ({ id: b.id, km: Math.round(Math.min(distanceToCourse(p, b.course), b.course2 ? distanceToCourse(p, b.course2) : Infinity)) }))
    .filter((x) => x.km <= (basinById(x.id).radiusKm || 35))
    .sort((a, b) => a.km - b.km);
}

export function nearestStation(basin, lat, lon) {
  let best = null;
  for (const [name, a, b] of basin.stations) {
    const d = km([lat, lon], [a, b]);
    if (!best || d < best.km) best = { name, km: Math.round(d) };
  }
  return best;
}

// Climatological flood hazard by calendar month (1 = peak monsoon August). Pakistan's big river
// floods come in July–September; spring brings snowmelt rises and flash floods.
export const MONTH_HAZARD = [0.1, 0.15, 0.25, 0.3, 0.35, 0.6, 0.9, 1.0, 0.8, 0.3, 0.1, 0.1];
export const MELT_MONTHS = [4, 5, 6, 7, 8, 9];
export const MONSOON_MONTHS = [6, 7, 8, 9];

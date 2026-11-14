# Kisan Dost (کسان دوست)

A phone app for Pakistani farmers, in Urdu. Take a photo of a leaf and it names the disease and the spray. It also shows the farm's weather and watering advice, disease warnings for the area, a 7-month flood outlook for the rivers (including water coming from India), seeds matched to the farm's weather, and new research from the world's top agricultural universities.

- **Live app:** https://kisan-dost-pk.vercel.app
- **Code:** https://github.com/fidajoyia/kisan-dost

**No AI service and no API key is used anywhere.** The leaf check is our own trained model running inside the phone's browser; the flood model for the eastern rivers is our own trained model; everything else is open public data plus fixed rules.

---

## 1. What each screen does

The app's seven features, reached from the home screen tiles and the five bottom tabs:

| # | Feature | Tab | Where the data comes from |
|---|---|---|---|
| 1 | **Leaf disease check + which spray** (refuses photos that are not one of our 9 crops) | معائنہ (home) | Our leaf model `public/models/kisan-leaf-v2.onnx` + `lib/leaf-kb.js` |
| 2 | **Weather warnings** (crop disease risk, frost, heat, spray timing) | موسم | Open-Meteo forecast + `lib/disease-rules.js` |
| 3 | **Rain and soil moisture** (last week, next week, when to water) | موسم | Open-Meteo forecast and soil moisture |
| 4 | **Flood warning, next 7 months** | پانی | ECMWF seasonal forecast, GloFAS river flow, our trained model for Chenab / Ravi / Sutlej |
| 5 | **Dam water report** (how full now vs last year) | پانی | Federal Flood Commission (Tarbela, Mangla), India CWC (Bhakra, Pong, Ranjit Sagar) |
| 6 | **Seed advice** for the farm's weather and land (+ new research, + how to import seed) | بیج | Official variety registrations (Crossref), NASA POWER climate |
| 7 | **Mandi rates + government schemes** | منڈی | Punjab government daily wholesale prices (AMIS, amis.pk), shown per maund; schemes from the Punjab Agriculture Department and Punjab Government pages (`lib/schemes.js`) |

---|---|---|
| **معائنہ** (leaf check, home) | Disease name, how sure, recommended spray (active ingredient), organic / field steps, safety. Refuses photos that are not a leaf of our 9 crops. Weather now, 7 days, watering advice, area disease warnings. | Our leaf model `public/models/kisan-leaf-v2.onnx` + `lib/leaf-kb.js`. Weather: Open-Meteo. Warnings: `lib/disease-rules.js` (crop calendar + 16-day forecast). |
| **سیلاب** (flood) | Danger for the farm and each river for the next 7 months, more or less water than last year, more or less rain, what to do. | ECMWF seasonal forecast, Federal Flood Commission (Tarbela, Mangla), India CWC (Bhakra, Pong, Ranjit Sagar), GloFAS river flow, our trained model for Chenab / Ravi / Sutlej. |
| **بیج** (seeds) | Varieties from the top institutions, compared by the weather where each was tested vs the farm's weather. "Best" only if proven in similar weather **and** higher yield than check varieties; otherwise it says so honestly. | Official variety registrations (Crossref), NASA POWER climate normals. |
| **تحقیق** (research) | New farming research, labelled in Urdu by crop and subject, with the original link. | Europe PMC, Google News, institution feeds. |
| **درآمد** (import) | The legal steps to import seed into Pakistan and who to contact. | `lib/import-guide.js` |

---

## 2. Run it on your own computer (Windows)

You need **Node.js 18 or newer** (https://nodejs.org, the LTS version) and internet for the first install.

**Easiest:** open the project folder and double-click `start-kisan-dost.bat`. It installs the packages the first time and opens the app at **http://localhost:3000**.

**From VS Code:** open the folder, then *Terminal → New Terminal* and type:

```bash
npm install        # first time only: downloads the packages into node_modules/ (about 2 minutes)
npm run dev        # starts the app at http://localhost:3000 (changes show up as you save)
```

For a fast, final version (the way it runs online):

```bash
npm run build      # checks and packs everything into .next/
npm start          # serves it at http://localhost:3000
```

Stop it with **Ctrl + C** in the terminal. No `.env` file is needed. Optional settings are listed in `.env.example`.

On a phone on the same Wi-Fi you can open `http://<your computer's IP>:3000`. GPS in the browser only works on `https://` or `localhost`, so on the phone pick the district by hand, or use the live link.

---

## 3. Does the GitHub link run the app?

**No.** GitHub only **stores the code**, like a folder in the cloud. Opening the GitHub link shows files, not the app. To *use* the app, someone opens the **live link** (Vercel). To *check the code* or run it themselves, they use the GitHub link:

```bash
git clone https://github.com/fidajoyia/kisan-dost.git     # or: Code → Download ZIP on GitHub
cd kisan-dost
npm install
npm run dev
```

Every time code is pushed to the `main` branch on GitHub, Vercel rebuilds the live app by itself in about a minute.

---

## 4. Running it somewhere else (another server)

It is a normal **Next.js** (Node.js) app. Any host that runs Node works.

| Where | How |
|---|---|
| **Vercel** (used now, free) | vercel.com → *Add New Project* → import the GitHub repo → *Deploy*. No settings needed. `vercel.json` adds daily refresh jobs and puts the server in Mumbai (closest to Pakistan). |
| **Render / Railway / any VPS** | Build command `npm ci && npm run build`, start command `npm start`. Set `PORT` if the host asks. |
| **Your own PC as a server** | `npm run build` then `npm start`. |

Outside Vercel the daily refresh jobs in `vercel.json` do not run. That is fine: every cache refreshes itself when it gets old. If you want them, call these URLs once a day with any scheduler: `/api/flood/refresh`, `/api/research/refresh`, `/api/seeds/refresh`.

---

## 5. Where the models are

| Model | File | Runs where | Size |
|---|---|---|---|
| **Leaf disease model** | `public/models/kisan-leaf-v2.onnx` | In the farmer's browser (phone), with `onnxruntime-web` from `public/ort/` | 25 MB (downloaded once, then cached; works offline) |
| Leaf model labels + check threshold | `public/models/kisan-leaf-v2-labels.json` | Browser | small |
| Leaf model report card (accuracy per disease) | `public/models/kisan-leaf-card.json` | – (documentation) | small |
| Treatment for each disease | `lib/leaf-kb.js` | Browser | – |
| **Flood model** (Chenab, Ravi, Sutlej) | `data/flood-model.json` | Server (`lib/flood/eastern.js`) | small |
| Climate normals for seed comparison | `data/place-climate.json` | Server | small |
| Saved copies used if a live source is down | `data/ffc-latest.json`, `data/india-dams.json` | Server | small |

**How the models were trained** (Python, not needed to run the app): `scripts/leaf-model/` and `scripts/flood-model/`. The training photos are not in the repo (several GB); `scripts/leaf-model/fetch.py` downloads them from Hugging Face.

Leaf model, end to end on 4,372 held-out photos (never seen in training):

| | |
|---|---|
| Accuracy | **95.17%** (photos it refused are counted as wrong) |
| Crop recognised correctly | 99.25% |
| Not-a-crop photos refused | 100% of 1,229 held-out everyday photos, backgrounds and other crops' leaves |
| Real crop photos refused (asked to retake) | 0.62% |
| Classes | 62 diseases / pests / healthy across wheat, rice, maize, cotton, sugarcane, tomato, potato, mango, citrus, plus "not one of our crops" |
| Method | DINOv2-small image features + our own classifier, int8 ONNX |

Flood model (each year held out in turn, 1997–2026): AUC 0.92 (season alone 0.80); caught 24 of 29 big flood months.

---

## 6. How the files fit together

```
kisan-dost/
├─ app/                      what the farmer sees + the server's answers
│  ├─ layout.jsx             page frame: fonts, Urdu right-to-left, phone settings
│  ├─ page.jsx               the app: top bar, 5 screens, bottom tabs, leaf result, weather card
│  ├─ leaf-local.js          loads the leaf model in the browser and turns its answer into a result
│  ├─ flood.jsx              flood screen
│  ├─ seeds.jsx              seed screen
│  ├─ advisor.jsx            research list + import guide (inside the seed screen)
│  ├─ mandi.jsx              mandi rates + government schemes
│  ├─ boundary.jsx, error.jsx  if one part fails, show a retry message instead of crashing
│  ├─ globals.css            all colours and layout (light + dark)
│  └─ api/                   server endpoints the screens call
│     ├─ weather/            Open-Meteo forecast, rain, soil moisture, watering need
│     ├─ location/           GPS → village / district name (OpenStreetMap)
│     ├─ soil/               normal / waterlogged-salty / sandy land guess
│     ├─ outlook/            area disease warnings (rules)
│     ├─ flood/              7-month flood outlook (+ refresh/)
│     ├─ seeds/              seed comparison for this farm (+ refresh/)
│     ├─ mandi/              today's rates at the nearest government market
│     └─ research/           research feed (+ refresh/)
├─ lib/                      the logic behind the endpoints
│  ├─ leaf-kb.js             every disease: Urdu name, signs, sprays, organic + field steps
│  ├─ disease-rules.js       weather rules for area warnings
│  ├─ flood/                 rivers, data sources, risk model, eastern-rivers model, Indian dams
│  ├─ seed-intel/            institutions, crops, reading registrations, test places, climate match, scoring
│  ├─ research-*.js          collecting, filtering and labelling research
│  ├─ mandi.js, schemes.js   market prices (AMIS) and the official schemes list
│  ├─ districts.js, soil-zones.js, import-guide.js, seeds.js   lists and small helpers
├─ data/                     model + saved data files (see section 5)
├─ public/models/            the leaf model
├─ public/ort/               the engine that runs the model in the browser
├─ scripts/                  training and data-update scripts (not used while the app runs)
├─ package.json              the packages the app needs and the run commands
├─ next.config.js            caching for the model files
├─ vercel.json               hosting region + daily refresh jobs
└─ start-kisan-dost.bat      double-click to run on Windows
```

**What happens when a farmer takes a photo:** `page.jsx` shrinks the photo → `leaf-local.js` runs `kisan-leaf-v2.onnx` on the phone → if it is not one of our crops it says so; otherwise it takes the disease → `lib/leaf-kb.js` gives the spray and steps → `page.jsx` shows the result. Nothing is sent to a server.

**What happens when the app opens:** GPS → `/api/location` (place name) and `/api/weather` → `/api/outlook` (area warnings) → the flood, seed and research screens fetch their own data when needed. Answers are cached so the next farmer gets them instantly.

---

## 7. Limits to know

- Leaf check covers 9 crops. For any other plant it refuses instead of guessing. Real field photos of other crops could occasionally get through, so every result names the crop and says not to spray if that is wrong.
- Sprays are named by active ingredient, never by brand or dose: "dose as on the label". Farmers should confirm with the agriculture extension office.
- The flood outlook is a guide, not a certainty. Official NDMA / PDMA / FFC warnings come first.
- Soil moisture is a weather-model estimate, not a field sensor.
- Seed recommendations are only made when the facts support them; for most areas the honest answer today is "keep your locally approved variety".
- Mandi rates cover Punjab markets only (that is what AMIS publishes); farmers elsewhere see the nearest Punjab market with its distance. Schemes listed are Punjab's.

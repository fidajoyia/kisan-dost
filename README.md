# Kisan Dost

Farmer app: take a leaf photo and everything else runs automatically.

## What runs automatically

| Step | Source | When |
|---|---|---|
| GPS location | Browser Geolocation API | On open (asks permission once; remembers last location) |
| District / province name | OpenStreetMap Nominatim reverse geocoding, with an offline nearest-district fallback | After GPS |
| Live weather: now, last 7 days, next 16 days | Open-Meteo forecast API (free, no key) | After GPS |
| Rain status (none / recent / forecast / continuous) | Computed from Open-Meteo rain data | After weather |
| Irrigation need | Soil moisture (9–27 cm) + ET₀ water balance + upcoming rain | After weather |
| Regional disease alerts + days 17–30 estimate | Claude (text), cached per district per day | After weather |
| Plant ID, disease diagnosis, early warning, crop-specific irrigation, treatment | Claude (vision) with live location + weather | As soon as a photo is taken |
| **Flood outlook, 7 months ahead (Feature 3)** | ECMWF SEAS5 seasonal forecast + ERA5 history + Federal Flood Commission dam report + NOAA ENSO; per river basin | "سیلاب وارننگ" tab |
| Land type: normal / sem (waterlogged, salty) / rait (sandy) | SoilGrids sand % + pH, plus district lists; farmer can override | After GPS |
| Best seed per crop from the world's top institutions, compared for this farm | Official variety registrations (Crossref) + weekly web research (Claude) + farm temperature, winter and land type | "بیج مشورہ" tab |
| How to get / import each seed in Pakistan | Built-in guide (NSDRA, DPP import permit, PSW, phytosanitary, research SMTA) | "بیج کی درآمد" tab |
| New research from the world top-10 agricultural institutions (QS 2026) | Europe PMC papers + Google News (+ OpenAlex with key, + any RSS you add), explained by Claude; cached, refreshed every 6 h + daily cron | "نئی تحقیق" tab |

## Leaf check: our own trained model (no API)

The leaf photo check runs **Kisan Dost's own model inside the farmer's browser**: no AI service, no API key, no cost per photo, and it keeps working without internet once loaded.

| | |
|---|---|
| Test accuracy | **95.47%** on 4,372 held-out photos (never used in training) |
| Crop identified correctly | 99.82% |
| Classes | 61 diseases / pests / healthy, across 9 crops |
| Training photos | 17,488 (+ mirrored copies) |
| Method | Frozen DINOv2-small image features + our MLP classifier (1024 hidden), exported to ONNX, int8 weights (26 MB) |
| Runtime | onnxruntime-web (WebAssembly), about 0.4 s per photo |

| Crop | Classes | Diseases / conditions |
|---|---|---|
| Citrus | 4 | Healthy, black_spot, canker, greening |
| Cotton | 10 | Alternaria, Bacterial Blight, Curl Virus, Fusarium Wilt, Healthy, Herbicide Growth Damage, Leaf Hopper Jassids, Leaf Redding, Leaf Variegation, Verticillium Wilt |
| Maize | 4 | Blight, Common Rust, Gray Leaf Spot, Healthy |
| Mango | 8 | Anthracnose, Bacterial Canker, Cutting Weevil, Die Back, Gall Midge, Healthy, Powdery Mildew, Sooty Mould |
| Potato | 2 | Healthy, Phytopthora |
| Rice | 6 | Bacterial_Leaf_Blight, Brown_Spot, Healthy, Leaf_Blast, Leaf_Scald, Sheath_Blight |
| Sugarcane | 10 | Banded Chlorosis, Brown Spot, BrownRust, Grassy shoot, Healthy, Pokkah Boeng, Sett Rot, Smut, Viral Disease, Yellow Leaf |
| Tomato | 10 | Bacterial Spot, Early Blight, Healthy, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites Two-spotted Spider Mite, Target Spot, Tomato Mosaic Virus, Tomato Yellow Leaf Curl Virus |
| Wheat | 7 | Fusarium Head Blight, Glume Blotch, Healthy Ear, Healthy Leaf, Leaf Rust, Powdery Mildew, Stripe Rust |

Every class maps to a treatment card in `lib/leaf-kb.js`: Urdu name, signs, first-choice and alternative spray by **active ingredient and formulation** (as on the pack in Pakistan), organic and field steps, and safety. Dose is always "as on the label".

Training data (public, Hugging Face): Spitblaze/Corn_or_Maize_Leaf_Disease_Dataset; Project-AgML/rice_leaf_disease_classification; Project-AgML/sugarcane_leaf_disease_classification; Project-AgML/cotton_leaf_disease_classification (raw); Project-AgML/cotton_leaf_disease_classification_bangladesh_2 (raw); Project-AgML/tomato_leaf_disease; Project-AgML/MangoLeafBD_disease_classification; Project-AgML/potato_leaf_disease_classification; Project-AgML/citrus_fruit_leaf_disease_classification (leaf); Project-AgML/wheat_disease_detection (boxes cut out).
Reproduce: `scripts/leaf-model/fetch.py` → `train.py extract` → `extract_flip.py` → `final.py` (writes `public/models/kisan-leaf.onnx` and `kisan-leaf-card.json` with per-class precision / recall).

Area disease warnings (`lib/disease-rules.js`) are rule based on the live 16-day forecast and the Punjab / Sindh crop calendar; they need no AI either.

## Run

```bash
cp .env.example .env.local     # add ANTHROPIC_API_KEY
npm install
npm run dev                    # http://localhost:3000
```

The browser only allows GPS on `https://` or `localhost`. To test on a phone, deploy (e.g. Vercel) or use an HTTPS tunnel.

## Limits to know

- **Days 17–30** are a climate estimate. Open-Meteo's forecast goes up to 16 days.
- **Soil moisture** is a weather-model estimate, not a field sensor. The irrigation thresholds are generic because the soil type (sand / loam / clay) is unknown.
- **Irrigation method** (flood / drip / sprinkler) can't be detected automatically. The advice covers *whether and when* to water.
- **Nominatim** asks for about 1 request per second and an identifying User-Agent. For heavy traffic, set `NOMINATIM_EMAIL` or self-host.
- **Treatment advice** names active ingredients only, never brands or doses. Farmers should confirm with the agriculture extension department.

## Flood outlook (Feature 3)

The outlook asks, for every river near the farm and every month of the next 7 months: **is this year more or less flood-prone than normal, and than last year?**

| Signal | Source (free, no key) | Compared with |
|---|---|---|
| Rain over the river's upper catchment | ECMWF SEAS5 monthly forecast (`seasonal-api.open-meteo.com`) | model normal; last year (ERA5) |
| Heat → snow and glacier melt | SEAS5 temperature anomaly; Skardu max/min from the FFC report | normal; last year |
| Snow and ice stored upstream | SEAS5 snow-water anomaly; ERA5 snowfall since 1 October | normal; last year |
| Water in Tarbela, Mangla, Chashma | Federal Flood Commission daily report (PDF on `ffc.gov.pk`) | same day last year (and 2 years ago) |
| El Niño / La Niña | NOAA CPC ONI | a year ago |
| Flood class at every barrage today, and the next 16 days of rain | FFC report; Open-Meteo forecast | — |

How the numbers are made (`lib/flood/model.js`):
- Each signal gets a score from 0 to 100, where 50 is a normal year.
- Heat and snow count for more on glacier-fed rivers (Indus 0.6, Kabul 0.35) and hardly at all on rain-fed ones.
- Dam storage counts on the Indus (Tarbela) and Jhelum (Mangla).
- ENSO counts only in monsoon months.
- **Monthly risk = that month's usual flood hazard (August = 1.0) × this year's combined score.** Levels: below 30 low, 30–54 moderate, 55–74 high, 75 and up severe.
- The same signals measured for last year give the **this year vs last year** verdict.
- Rivers near the farm (within 35 km of the river, or 40 km for hill torrents) come from GPS (`lib/flood/rivers.js`). The farm's own rain covers flash floods.
- The 7-month forecast reaches the monsoon only from about February. Before that, the app shows a low-confidence **early monsoon signal** from snowpack, spring heat and ENSO.

Data and free-tier limits:
- Open-Meteo's free tier allows 600 calls a minute and 10,000 a day, and history requests are expensive. Past seasons are therefore cached for a month, and only 2 history points per basin are used.
- An in-process budget (`OPEN_METEO_BUDGET_PER_MIN`, default 450) spaces the requests.
- A new server fills the full history within about 5 minutes, in the background. Until then the app says the "last year" columns are still loading.
- `vercel.json` runs `/api/flood/refresh` daily.
- FFC publishes daily only in flood season (mid-June to mid-October). Outside it, the newest report is used and its date is shown.

The outlook is guidance, not an official warning. The app always points to NDMA, PDMA and FFC.

## Seed advisor and research feed

**The 10 institutions** (`lib/research-centers.js`): the world top 10 in the *QS World University Rankings by Subject 2026, Agriculture & Forestry*:
1. Wageningen University & Research
2. UC Davis
3. Swedish University of Agricultural Sciences
4. Cornell
5. China Agricultural University
6. Purdue
7. Iowa State
8. ETH Zurich
9. Ghent University
10. Norwegian University of Life Sciences

When QS publishes a new year, edit this one file. The feed and the app follow it.

**Seed finder** (`/api/seeds`, `lib/seed-intel/`): this is the best seed for each crop from the world's top agricultural institutions, compared for each farm.
1. **Automatic research.** For each institution, the server reads every variety it officially registered in the *Journal of Plant Registrations*, via the free Crossref API, and caches it for 7 days.
   - From each registration it extracts trial yield vs check varieties, maturity, disease and pest resistance, heat / drought / salt / flood tolerance, spring or winter habit, quality, the USDA GRIN accession and the seller.
   - A variety counts only for the institution that *developed or released* it, not for a co-author.
2. **Web research by Claude, weekly per crop** (when `ANTHROPIC_API_KEY` is set; turn it off with `SEED_WEB_RESEARCH=0`).
   - It finds where each top variety is sold or licensed and whether it is in Pakistan.
   - It adds varieties from institutions that don't publish in that journal (China Agricultural University, Wageningen, SLU, ETH, Ghent, NMBU…).
   - A fact without a source URL is dropped.
3. **Comparison for this farm** (`score.js`). Each variety is scored on:
   - yield 35%
   - disease resistance 20%
   - fit 25% (spring/winter habit vs the farm's last winter temperature from ERA5, heat, and land type normal / sem / rait)
   - recency 10%
   - evidence 10%

   The app shows the best seed, the reasons, a comparison table and where to get it.

Institutions: QS 2026 top 10, plus ranks 11–15 (Texas A&M, Michigan State, Florida, UBC, Guelph), so cotton, sugarcane and peanut get options. The rank is always shown. A weekly cron (`/api/seeds/refresh`) adds newly registered varieties automatically.

**Land type** (`/api/soil`, `lib/soil-zones.js`): sand ≥ 65% means rait, and pH ≥ 8.5 means sem/kallar tendency. If SoilGrids is down, the district lists are used instead. Sem is patchy, so the app labels this as a guess and the farmer's own choice is saved and wins.

**New research, automatically** (`/api/research`, `lib/research-feed.js`, `lib/research-digest.js`):
1. For each institution, the server collects its newest crop, soil and seed papers from Europe PMC (no key needed), plus news from Google News. If `OPENALEX_API_KEY` is set, it also queries OpenAlex; any feeds in `RESEARCH_FEEDS` are added too.
2. Claude keeps the items that matter to Pakistani farmers. It rewrites each one in Urdu, Roman Urdu or English and tags it by crop, land type and heat or cold. The tags put new research on the matching seed cards.
3. The digest is cached and rebuilt every 6 hours. `vercel.json` also runs `/api/research/refresh` daily. Without Vercel, point any scheduler at it: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/research/refresh`.
4. The app marks items it has not shown before as **نیا (new)**, and the tab shows how many there are.
5. If every source is unreachable, Claude's web search is used as a fallback. Web search must be enabled for your key in the Anthropic Console; set `RESEARCH_WEB_SEARCH=0` to turn it off.

**Import guide** (`lib/import-guide.js`): farmer, commercial and research routes. The rules reflect the 2025–26 changes, including the FSC&RD merger into NSDRA. Re-check them with NSDRA and DPP before relying on them.

## Structure

```
app/page.jsx              UI + automatic flow (GPS → place → weather → alerts; photo → analysis)
app/api/location/route.js reverse geocoding (Nominatim) + nearest-district fallback
app/api/weather/route.js  Open-Meteo: current, 7 past + 16 forecast days, rain, soil moisture, ET₀, irrigation need
app/api/outlook/route.js  Claude: regional alerts, days 17–30 estimate, irrigation note, tips
app/api/analyze/route.js  Claude vision: plant ID, diseases, early warning, irrigation, treatment
lib/districts.js          approx. district HQ coordinates for Pakistan
lib/claude.js             Anthropic Messages API client
lib/weather-text.js       weather → prompt text
app/seeds.jsx             seed finder: best seed per crop + comparison + where to get it
app/advisor.jsx           research feed, research centres, import guide (UI)
app/api/seeds/route.js    ranked seeds for a crop and farm; /refresh = weekly cron
lib/seed-intel/           institutions, crops, registration extractor, scoring, research engine
app/api/soil/route.js     SoilGrids texture + pH → normal / sem / rait guess
app/api/research/route.js research digest (cached); /refresh rebuilds it (cron)
lib/research-centers.js   world top-10 agricultural institutions (QS 2026)
lib/seeds.js              seed catalogue + temperature / calendar ranking
lib/soil-zones.js         district lists + SoilGrids parsing
lib/research-feed.js      Europe PMC / Google News / OpenAlex / RSS collectors
lib/research-digest.js    Claude farmer summaries + cache
lib/import-guide.js       how to get / import seed in Pakistan
app/flood.jsx             flood outlook screen (Feature 3)
app/api/flood/route.js    7-month flood outlook for a location; /refresh = daily cron
lib/flood/rivers.js       river basins, catchment points, river paths, gauges, monthly hazard
lib/flood/sources.js      SEAS5, ERA5, FFC PDF parser, NOAA ONI, 16-day forecast (+ API budget)
lib/flood/model.js        scores, monthly risk, this year vs last year, early monsoon signal
lib/flood/index.js        layered caching, background history fill, Claude explanation
vercel.json               daily crons (research + flood)
```

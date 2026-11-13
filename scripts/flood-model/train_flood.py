# Kisan Dost eastern-rivers flood model (Chenab, Ravi, Sutlej).
# Label: in month m the river's daily peak at the border station (GloFAS reanalysis) reaches the river's
#        upper-quartile annual peak (about a 1-in-4-year flood).
# Inputs (all things the seasonal forecast gives us for the coming months, plus the river's state now):
#   rain this month and last month over the Indian catchment (ratio to that month's normal),
#   temperature anomaly this month (snow / glacier melt), winter snowfall before the monsoon,
#   river flow last month (ratio to normal), season (sin/cos of month), river.
# Validation: leave-one-YEAR-out (the model never sees the year it is scored on).
import json, math, numpy as np, pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, brier_score_loss

Q = json.load(open("discharge.json")); W = json.load(open("weather.json"))
RIVERS = ["chenab", "ravi", "sutlej"]
CATCH = {"chenab": ["chenab"], "ravi": ["ravi"], "sutlej": ["sutlej", "beas"]}

def monthly_weather(keys):
    frames = []
    for k in keys:
        d = pd.DataFrame(W[k]); d["time"] = pd.to_datetime(d["time"]); frames.append(d.set_index("time"))
    d = sum(frames) / len(frames)
    m = pd.DataFrame({"p": d["precipitation_sum"].resample("MS").sum(), "t": d["temperature_2m_mean"].resample("MS").mean(),
                      "s": d["snowfall_sum"].resample("MS").sum()})
    return m

rows = []
for r in RIVERS:
    q = pd.Series(Q[r]["q"], index=pd.to_datetime(Q[r]["time"]), dtype=float)
    q = q[q.index >= "1997-01-01"].dropna()  # the GloFAS series starts in 1997
    qm = pd.DataFrame({"qmax": q.resample("MS").max(), "qmean": q.resample("MS").mean()})
    ann = q[q.index < "2026-01-01"].resample("YS").max().dropna()
    thr = float(np.percentile(ann, 75))
    m = monthly_weather(CATCH[r]).join(qm)
    mo = m.index.month
    clim = m.groupby(mo).mean()
    m["p_ratio"] = m["p"] / clim.loc[mo, "p"].values
    m["t_anom"] = m["t"] - clim.loc[mo, "t"].values
    m["q_ratio"] = m["qmean"] / clim.loc[mo, "qmean"].values
    m["p_prev"] = m["p_ratio"].shift(1); m["q_prev"] = m["q_ratio"].shift(1)
    # snowfall Oct–Mar before this month's monsoon year, ratio to its normal (used Apr–Sep)
    win = m["s"].copy(); win[~win.index.month.isin([10, 11, 12, 1, 2, 3])] = 0
    snow = win.rolling(9, min_periods=1).sum()  # covers the preceding Oct–Mar for Apr–Sep months
    m["snow_ratio"] = snow / snow.groupby(mo).transform("mean")
    m["label"] = (m["qmax"] >= thr).astype(int)
    m["river"] = r; m["thr"] = thr
    rows.append(m[m.index >= "1997-02-01"].dropna(subset=["p_prev", "q_prev", "qmax"]))
D = pd.concat(rows)
D = D[D.index < "2026-11-01"]
D["year"] = D.index.year; D["month"] = D.index.month
D["ms"] = np.sin(2 * math.pi * D["month"] / 12); D["mc"] = np.cos(2 * math.pi * D["month"] / 12)
for r in RIVERS: D["is_" + r] = (D["river"] == r).astype(int)
# rain and its interaction with the monsoon season carry most of the signal
D["monsoon"] = D["month"].isin([7, 8, 9]).astype(int)
D["lp"] = np.log1p(D["p_ratio"].clip(0, 10)); D["lpp"] = np.log1p(D["p_prev"].clip(0, 10)); D["lq"] = np.log1p(D["q_prev"].clip(0, 10))
D["ls"] = np.log1p(D["snow_ratio"].fillna(1).clip(0, 10))
D["lp_m"] = D["lp"] * D["monsoon"]; D["lq_m"] = D["lq"] * D["monsoon"]
FEAT = ["lp", "lpp", "lq", "t_anom", "ls", "lp_m", "lq_m", "ms", "mc", "monsoon", "is_chenab", "is_ravi", "is_sutlej"]
X, y, years = D[FEAT].values, D["label"].values, D["year"].values
print("rows", len(y), "flood months", int(y.sum()), "per river", D.groupby("river")["label"].sum().to_dict())

C = 0.5
oof = np.zeros(len(y))
for yr in sorted(set(years)):
    tr, te = years != yr, years == yr
    mu, sd = X[tr].mean(0), X[tr].std(0) + 1e-9
    clf = LogisticRegression(C=C, max_iter=2000, class_weight="balanced").fit((X[tr] - mu) / sd, y[tr])
    oof[te] = clf.predict_proba((X[te] - mu) / sd)[:, 1]
auc = roc_auc_score(y, oof); brier = brier_score_loss(y, oof)
# climatology baseline: P(flood | river, month) from the other years
base = np.zeros(len(y))
for yr in sorted(set(years)):
    tr, te = years != yr, years == yr
    rate = D[tr].groupby(["river", "month"])["label"].mean()
    base[te] = [rate.get((r, mth), 0) for r, mth in zip(D[te]["river"], D[te]["month"])]
auc_b = roc_auc_score(y, base)
thr_p = 0.5
pred = oof >= thr_p
hits = int((pred & (y == 1)).sum()); miss = int((~pred & (y == 1)).sum()); fa = int((pred & (y == 0)).sum())
print(f"leave-one-year-out AUC {auc:.3f} (season-only baseline {auc_b:.3f})  Brier {brier:.3f}")
print(f"at p>={thr_p}: caught {hits}/{hits + miss} flood months ({hits / (hits + miss) * 100:.0f}%), false alarms {fa} of {int((y == 0).sum())} normal months ({fa / (y == 0).sum() * 100:.1f}%)")
D["p_oof"] = oof
for yr in [1988, 1992, 1997, 2010, 2014, 2019, 2022, 2023, 2025]:
    s = D[(D["year"] == yr) & D["month"].isin([7, 8, 9])][["river", "month", "label", "p_oof"]]
    print(yr, "; ".join(f"{a}-{b}:{'FLOOD' if l else '-'} p={p:.2f}" for a, b, l, p in s.values))

# final model on all years, exported for the app (JS): standardise -> logistic
mu, sd = X.mean(0), X.std(0) + 1e-9
clf = LogisticRegression(C=C, max_iter=2000, class_weight="balanced").fit((X - mu) / sd, y)
clim_p = {r: {int(k): float(v) for k, v in D[D.river == r].groupby("month")["p"].mean().items()} for r in RIVERS}
model = {"name": "Kisan Dost eastern rivers flood model v1", "trained_on": "1997-02 to 2026-10 (monthly)", "features": FEAT,
         "mu": mu.tolist(), "sd": sd.tolist(), "coef": clf.coef_[0].tolist(), "intercept": float(clf.intercept_[0]),
         "label": "monthly peak at the border station >= the river's upper-quartile annual peak (about 1-in-4-year flood)",
         "stations": {"chenab": "Marala", "ravi": "Jassar", "sutlej": "Ganda Singh Wala"},
         "validation": {"method": "leave-one-year-out", "auc": round(auc, 3), "auc_season_only": round(auc_b, 3), "brier": round(brier, 3),
                        "caught_flood_months": f"{hits}/{hits + miss}", "false_alarm_rate": round(fa / (y == 0).sum(), 3),
                        "rows": int(len(y)), "flood_months": int(y.sum())},
         "thr_m3s": {r: float(D[D.river == r]["thr"].iloc[0]) for r in RIVERS},
         "clim_qmean": {r: {int(k): float(v) for k, v in D[D.river == r].groupby("month")["qmean"].mean().items()} for r in RIVERS},
         "catchment_points": {"chenab": [[33.31, 75.77]], "ravi": [[32.55, 76.13]], "sutlej": [[31.33, 76.75], [31.70, 76.93]]},
         "station_cells": {"chenab": [32.675, 74.425], "ravi": [32.025, 74.825], "sutlej": [31.025, 74.525]},
         "sources": ["GloFAS v4 river discharge reanalysis (Copernicus EMS) via Open-Meteo Flood API", "ERA5 reanalysis via Open-Meteo archive"]}
json.dump(model, open("flood-model.json", "w"), indent=1)
print("saved flood-model.json; coef", dict(zip(FEAT, np.round(clf.coef_[0], 2))))

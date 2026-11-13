# 1984–2026 daily: GloFAS river discharge at the 3 border stations + ERA5 weather over the Indian catchments
import json, urllib.request
END = "2026-10-31"
ST = {"chenab": (32.675, 74.425), "ravi": (32.025, 74.825), "sutlej": (31.025, 74.525)}
CA = {"chenab": (33.31, 75.77), "ravi": (32.55, 76.13), "sutlej": (31.33, 76.75), "beas": (31.70, 76.93)}
def get(u):
    with urllib.request.urlopen(u, timeout=600) as r: return json.load(r)
q = get("https://flood-api.open-meteo.com/v1/flood?latitude=" + ",".join(str(v[0]) for v in ST.values()) + "&longitude=" + ",".join(str(v[1]) for v in ST.values())
        + f"&daily=river_discharge&start_date=1984-01-01&end_date={END}")
json.dump({k: {"time": x["daily"]["time"], "q": x["daily"]["river_discharge"]} for k, x in zip(ST, q)}, open("discharge.json", "w"))
print("discharge", {k: len(x["daily"]["time"]) for k, x in zip(ST, q)}, flush=True)
w = get("https://archive-api.open-meteo.com/v1/archive?latitude=" + ",".join(str(v[0]) for v in CA.values()) + "&longitude=" + ",".join(str(v[1]) for v in CA.values())
        + f"&daily=precipitation_sum,temperature_2m_mean,snowfall_sum&start_date=1984-01-01&end_date={END}")
json.dump({k: x["daily"] for k, x in zip(CA, w)}, open("weather.json", "w"))
print("weather", {k: len(x["daily"]["time"]) for k, x in zip(CA, w)}, flush=True)

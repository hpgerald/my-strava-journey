#!/usr/bin/env python3
"""Make every AGGREGATE distance (km) and elevation (m) figure foot-only.

Foot sports = Run, Walk, TrailRun, Hike. Rides and all other sports are dropped
from distance/elevation totals but stay in activity counts, moving time, calories
and every other metric. Per-sport tables (sport_breakdown, yearly_by_sport) are
left untouched on purpose: a sport's own page still reports its own distance.

Recomputes distance/elevation columns in: lifetime_totals, yearly_totals,
monthly_totals, countries, tanzania_regions, indoor_outdoor, weekday_patterns,
and the derived fun_journey comparisons. Everything else in each row is preserved
byte-for-byte. Re-run build_derived.py afterwards to refresh comparisons.csv.
"""
import csv, os
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
OUT = os.environ.get("STRAVA_OUTPUT", str(ROOT / "public" / "data"))
FOOT = {"Run", "Walk", "TrailRun", "Hike"}
EVEREST, KILI, EQUATOR, MOON, MARATHON = 8849, 5895, 40075, 384400, 42.195


def load(name):
    with open(os.path.join(OUT, name), newline="") as f:
        return list(csv.DictReader(f))


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def f1(v):
    """1 decimal, trailing .0 stripped (matches the existing tables)."""
    r = round(v, 1)
    return str(int(r)) if r == int(r) else f"{r:.1f}"


def i0(v):
    return str(int(round(v)))


def rewrite(name, fn):
    rows = load(name)
    with open(os.path.join(OUT, name)) as f:
        header = f.readline().strip().split(",")
    for r in rows:
        fn(r)
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)
    print(f"  {name:24} foot-only distance/elevation")


# ---- join activities <-> geo by activity_key -----------------------------
acts = load("activities.csv")
geo = {g["activity_key"]: g for g in load("activity_geo.csv")}

# foot aggregates
foot_km = foot_el = 0.0
yr_km, yr_el = defaultdict(float), defaultdict(float)
mo_km = defaultdict(float)
co_km, co_el = defaultdict(float), defaultdict(float)
rg_km, rg_el = defaultdict(float), defaultdict(float)
io_km = defaultdict(float)
wd_km = defaultdict(float)

for a in acts:
    if a["sport_type"] not in FOOT:
        continue
    d, e = num(a["distance_km"]), num(a["elevation_gain_m"])
    foot_km += d
    foot_el += e
    yr_km[a["year"]] += d
    yr_el[a["year"]] += e
    mo_km[(a["date"] or "")[:7]] += d
    setting = "Indoor / Trainer" if a["trainer"] == "Yes" else "Outdoor"
    io_km[setting] += d
    wd_km[a["weekday"]] += d
    g = geo.get(a["activity_key"], {})
    country = g.get("country") or "Indoor / no GPS"
    co_km[country] += d
    co_el[country] += e
    region = g.get("region") or ""
    if region:
        rg_km[region] += d
        rg_el[region] += e

print(f"foot totals: {foot_km:.0f} km, {foot_el:.0f} m  (was 15734 / 103726)")

# ---- rewrite the aggregate tables ----------------------------------------
def _life(r):
    if r["metric"] == "Total Km":
        r["value"] = i0(foot_km)
    elif r["metric"] == "Total Elevation (M)":
        r["value"] = i0(foot_el)
rewrite("lifetime_totals.csv", _life)

rewrite("yearly_totals.csv", lambda r: (r.update(distance_km=f1(yr_km[r["year"]]), elevation_m=i0(yr_el[r["year"]]))))
rewrite("monthly_totals.csv", lambda r: r.update(distance_km=f1(mo_km[r["month"]])))


# indoor_outdoor setting labels ("Indoor / Trainer", "Outdoor")
def _io(r):
    r["distance_km"] = f1(io_km.get(r["setting"], 0))
rewrite("indoor_outdoor.csv", _io)

rewrite("weekday_patterns.csv", lambda r: r.update(distance_km=f1(wd_km[r["weekday"]])))
rewrite("countries.csv", lambda r: r.update(distance_km=f1(co_km.get(r["country"], 0)), elevation_m=i0(co_el.get(r["country"], 0))))
rewrite("tanzania_regions.csv", lambda r: r.update(distance_km=f1(rg_km.get(r["region"], 0)), elevation_m=i0(rg_el.get(r["region"], 0))))

# ---- fun_journey: rebuild from foot totals -------------------------------
fun = load("fun_journey.csv")
vals = {
    "Marathons run": round(foot_km / MARATHON, 1),
    "Laps of the Earth": round(foot_km / EQUATOR, 4),
    "Fraction of the way to the Moon": round(foot_km / MOON, 4),
    "Mt. Everests climbed": round(foot_el / EVEREST, 2),
    "Mt. Kilimanjaros climbed": round(foot_el / KILI, 2),
}
for r in fun:
    for key, v in vals.items():
        if r["comparison"].startswith(key):
            r["value"] = str(v)
with open(os.path.join(OUT, "fun_journey.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["comparison", "value", "source_page"])
    w.writeheader()
    w.writerows(fun)
print("  fun_journey.csv          rebuilt from foot totals")
print("done. now run: python3 scripts/build_derived.py")

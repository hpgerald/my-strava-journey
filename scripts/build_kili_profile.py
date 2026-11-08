#!/usr/bin/env python3
"""Build public/data/kili_half_profile.csv from the four Kilimanjaro Half Marathon
GPS stream exports.

The per-kilometre pace texture and the course elevation profile cannot come from
the raw activity export (which has no time series), so they are pulled once from
the Strava activity streams API and cached under scripts/kili_streams/ as
k<year>.json (distance, time, altitude arrays). The four races are historical and
fixed, so this is a one-off enrichment, not part of the weekly rebuild.

Source activity ids: 2023=8623538896, 2024=10831534059,
2025=13701654964, 2026=17811226358.

The bins cover the same 21.1 km of road every year, anchored on the turn (the
highest point), and the half hour the 2023 watch ran before the start is taken
out, as in build_kili_half_detail.py, so the replay starts with the gun.
"""
import csv, json, os, statistics

HERE = os.path.dirname(__file__)
BINS = 42
YEARS = [2023, 2024, 2025, 2026]
CAP = 1100  # s/km cap so a long standing stop does not blow the colour scale

def interp(xs, ys, x):
    if x <= xs[0]: return ys[0]
    if x >= xs[-1]: return ys[-1]
    lo, hi = 0, len(xs) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if xs[mid] <= x: lo = mid
        else: hi = mid
    t = (x - xs[lo]) / (xs[hi] - xs[lo]) if xs[hi] != xs[lo] else 0
    return ys[lo] + t * (ys[hi] - ys[lo])

from build_kili_half_detail import load, UP_KM, DOWN_KM

rows = []
for y in YEARS:
    D, T, A, ti = load(y)
    a = D[ti] - UP_KM * 1000
    total = (UP_KM + DOWN_KM) * 1000
    a0 = interp(D, A, a)
    for i in range(BINS):
        d0, d1 = a + total * i / BINS, a + total * (i + 1) / BINS
        dt = interp(D, T, d1) - interp(D, T, d0)
        dd = (d1 - d0) / 1000.0
        pace = min(CAP, dt / dd) if dd > 0 else 0
        rel_alt = interp(D, A, (d0 + d1) / 2) - a0
        rows.append([y, i, round((i + 0.5) / BINS * 21.1, 2), round(rel_alt, 1), round(pace), "Goals"])

out = os.path.join(HERE, "..", "public", "data", "kili_half_profile.csv")
with open(out, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["year", "bin", "dist_km", "rel_alt_m", "pace_sec", "source_page"])
    w.writerows(rows)
for y in YEARS:
    ps = [r[4] for r in rows if r[0] == y]
    print(f"{y}: median pace {round(statistics.median(ps))} s/km")
print("wrote kili_half_profile.csv", len(rows), "rows")

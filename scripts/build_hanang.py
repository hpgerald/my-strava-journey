#!/usr/bin/env python3
"""Build public/data/hanang_2023.csv: the altitude of the Mount Hanang hike of
30 April 2023 against the clock, from the stream cached in
scripts/kili_streams/hanang_2023.json (pulled once from the Strava activity
streams API; the hike is historical and fixed, so this is a one-off enrichment,
not part of the weekly rebuild).

Columns: activity_key (the hike in activities.csv), start (local start time),
i, t_min (minutes since the start), alt_m, source_page.
"""
import csv, json, os

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "public", "data")
s = json.load(open(os.path.join(HERE, "kili_streams", "hanang_2023.json")))
acts = list(csv.DictReader(open(os.path.join(DATA, "activities.csv"), encoding="utf-8")))
start = s["start_local"].replace("T", " ")
key = next(a["activity_key"] for a in acts if a["date"].startswith(start[:16]))

with open(os.path.join(DATA, "hanang_2023.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["activity_key", "start", "i", "t_min", "alt_m", "source_page"])
    for i, (t, a) in enumerate(zip(s["time"], s["altitude"])):
        w.writerow([key, start[:16], i, round(t / 60, 2), round(a, 1), "Records"])
top = max(range(len(s["altitude"])), key=lambda k: s["altitude"][k])
print(f"wrote hanang_2023.csv: {len(s['time'])} points, activity {key}, top {s['altitude'][top]} m after {s['time'][top] / 3600:.2f} h, back after {s['time'][-1] / 3600:.2f} h")

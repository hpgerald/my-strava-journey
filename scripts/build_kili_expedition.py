#!/usr/bin/env python3
"""Build the two Kilimanjaro expedition tables (March 2023, Marangu route):

  public/data/kili_expedition.csv          one row per stage on foot
  public/data/kili_expedition_profile.csv  the altitude profile of each stage

The altitude profiles cannot come from the raw activity export (it has no time
series), so the streams were pulled once from the Strava activity streams API
and cached in scripts/kili_streams/expedition.json. The expedition is historical
and fixed, so this is a one-off enrichment, not part of the weekly rebuild.

On the summit push the watch's power saver stopped the recording near Gilman's
Point; the stream jumps from the last point on the way up straight back to Kibo
Hut. Only the points up to that jump are kept as recorded. The rest of the night
(the crater rim, Uhuru Peak and the way back to Kibo) is drawn by the chart as
not recorded.

Distance, climb and time for each stage come from activities.csv by key, so the
numbers on the page match the rest of the site.
"""
import csv, json, os

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "public", "data")

# stage, activity key, Strava id, from, to
STAGES = [
    (1, "a0902", "8670318900", "Marangu Gate", "Mandara Hut"),
    (2, "a0904", "8674956197", "Mandara Hut", "Horombo Hut"),
    (3, "a0906", "8680516349", "Horombo Hut", "Kibo Hut"),
    (4, "a0908", "8686890053", "Kibo Hut", "Uhuru Peak"),
    (5, "a0909", "8686970273", "Kibo Hut", "Horombo Hut"),
]
SUMMIT_ID = "8686890053"

streams = json.load(open(os.path.join(HERE, "kili_streams", "expedition.json")))
acts = {r["activity_key"]: r for r in csv.DictReader(open(os.path.join(DATA, "activities.csv"), encoding="utf-8"))}

stage_rows, prof_rows = [], []
for stage, key, sid, frm, to in STAGES:
    a = acts[key]
    s = streams[sid]
    D, A = s["distance"], s["altitude"]
    if sid == SUMMIT_ID:
        # keep the climb up to the last point before the jump back to Kibo Hut
        cut = next(i for i in range(1, len(A)) if A[i] < A[i - 1] - 300)
        D, A = D[:cut], A[:cut]
    total = D[-1]
    for i, (d, alt) in enumerate(zip(D, A)):
        prof_rows.append([stage, i, round(d / total, 4), round(alt, 1), "Records"])
    stage_rows.append([
        stage, key, a["date"][:16], frm, to,
        round(float(a["distance_km"]), 2), round(float(a["elevation_gain_m"])), round(float(a["elapsed_time_min"])),
        round(A[0]), round(A[-1]), round(max(A)), round(total / 1000, 2), "Records",
    ])

with open(os.path.join(DATA, "kili_expedition.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["stage", "activity_key", "date", "from_place", "to_place", "distance_km", "climb_m",
                "elapsed_min", "start_alt_m", "end_alt_m", "high_alt_m", "recorded_km", "source_page"])
    w.writerows(stage_rows)
with open(os.path.join(DATA, "kili_expedition_profile.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["stage", "i", "frac", "alt_m", "source_page"])
    w.writerows(prof_rows)

for r in stage_rows:
    print(f"  stage {r[0]}: {r[3]} to {r[4]}, {r[5]} km, {r[6]} m up, {r[8]} to {r[9]} m, high {r[10]} m")
print("wrote kili_expedition.csv and kili_expedition_profile.csv,", len(prof_rows), "profile points")

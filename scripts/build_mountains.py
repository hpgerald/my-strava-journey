#!/usr/bin/env python3
"""Build the tables behind the mountain chapters.

Reads scripts/mountain_streams/routes.json, pulled once from Strava:
  routes           the reduced GPS polyline of each mountain outing
  bondwa_profiles  distance and altitude along each trip to Bondwa Peak
  ngong_profile    distance, altitude and time along the ridge of the Ngong Hills

Writes
  public/data/mountain_routes.csv   one row per point of each route line
  public/data/mountain_trips.csv    one row per trip, tied to its activity, with
                                    Strava's weather at the start
  public/data/bondwa_profiles.csv   altitude along each trip to Bondwa Peak
  public/data/ngong_profile.csv     altitude and time along the Ngong Hills ridge

Privacy. The site publishes no exact location for any other outing. These
routes are the one exception, by choice: public mountain trails, far from home.
A trip that starts in a town has its first 500 m left off the line.

The outings are historical and fixed, so this is a one-off build, not part of
the weekly refresh. Distance, climb and time on the pages come from
activities.csv through the activity_key, so they follow the weekly data.
"""
import csv, json, math, os

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "public", "data")
TOWN_START = {"bondwa-2022"}  # these begin in town: trim the first 500 m
TRIM_KM = 0.5


def decode(s):
    i = lat = lng = 0
    out = []
    while i < len(s):
        for k in range(2):
            shift = res = 0
            while True:
                b = ord(s[i]) - 63
                i += 1
                res |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            d = ~(res >> 1) if res & 1 else res >> 1
            if k == 0:
                lat += d
            else:
                lng += d
        out.append((lat / 1e5, lng / 1e5))
    return out


def km(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    return 2 * 6371 * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def clean(pts):
    """Drop GPS spikes (a point far from both neighbours that are close to each
    other) and anything after a jump of more than 800 m (the watch resuming
    somewhere else)."""
    keep = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, p, b = keep[-1], pts[i], pts[i + 1]
        if km(a, p) > 0.35 and km(p, b) > 0.35 and km(a, b) < 0.3:
            continue
        keep.append(p)
    keep.append(pts[-1])
    out = [keep[0]]
    for p in keep[1:]:
        if km(out[-1], p) > 0.8:
            break
        out.append(p)
    return out


def main():
    src = json.load(open(os.path.join(HERE, "mountain_streams", "routes.json"), encoding="utf-8"))
    acts = list(csv.DictReader(open(os.path.join(DATA, "activities.csv"), encoding="utf-8")))
    routes, trips = [], []
    for r in src["routes"]:
        pts = clean(decode(r["poly"]))
        if r["trip"] in TOWN_START:
            d, k = 0.0, 0
            while k < len(pts) - 1 and d < TRIM_KM:
                d += km(pts[k], pts[k + 1])
                k += 1
            pts = pts[k:]
        length = sum(km(a, b) for a, b in zip(pts, pts[1:]))
        # the activity: same day, on foot, the closest distance
        same = [a for a in acts if a["date"].startswith(r["date"]) and a["sport_type"] in ("Hike", "TrailRun", "Walk", "Run")]
        a = min(same, key=lambda x: abs(float(x["distance_km"] or 0) - r["km"]))
        assert abs(float(a["distance_km"]) - r["km"]) < 0.2, (r["trip"], a["distance_km"])
        trips.append([r["mountain"], r["trip"], a["activity_key"], r["date"], r["label"], r.get("sky", ""), r.get("temp_c", ""), r.get("humidity", ""), "Mountains"])
        for i, (la, lo) in enumerate(pts):
            routes.append([r["mountain"], r["trip"], i, f"{la:.5f}", f"{lo:.5f}", "Mountains"])
        print(f"{r['trip']:<12} {a['activity_key']} {len(pts):>4} points, line {length:5.2f} km, logged {r['km']} km")

    with open(os.path.join(DATA, "mountain_routes.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["mountain", "trip", "i", "lat", "lng", "source_page"])
        w.writerows(routes)
    with open(os.path.join(DATA, "mountain_trips.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["mountain", "trip", "activity_key", "date", "label", "sky", "temp_c", "humidity", "source_page"])
        w.writerows(trips)
    with open(os.path.join(DATA, "bondwa_profiles.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["trip", "i", "d_km", "alt_m", "source_page"])
        for trip, s in src["bondwa_profiles"].items():
            d0 = s["distance"][0]
            for i, (d, alt) in enumerate(zip(s["distance"], s["altitude"])):
                w.writerow([trip, i, round((d - d0) / 1000, 3), round(alt), "Mountains"])
            print(f"{trip:<12} profile {len(s['distance'])} points, {min(s['altitude']):.0f} to {max(s['altitude']):.0f} m")
    with open(os.path.join(DATA, "ngong_profile.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["i", "d_km", "alt_m", "t_min", "source_page"])
        s = src["ngong_profile"]
        for i, (d, alt, t) in enumerate(zip(s["distance"], s["altitude"], s["time"])):
            w.writerow([i, round(d / 1000, 3), round(alt), round(t / 60, 1), "Mountains"])
        print(f"ngong        profile {len(s['distance'])} points, {min(s['altitude']):.0f} to {max(s['altitude']):.0f} m")


if __name__ == "__main__":
    main()

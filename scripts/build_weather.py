#!/usr/bin/env python3
"""Daily rain and heat for every region I have been out in (weather_daily.csv).

The weather is looked up for the middle of each region, never for a start
point, from Open-Meteo's free historical archive (no account needed):
https://archive-api.open-meteo.com. One request per region covers the whole
record. Run it in the weekly refresh after rebuild_from_raw.py:

    python3 scripts/build_weather.py

It needs network access to archive-api.open-meteo.com, so it can also be run
on your own computer (Windows: python scripts\build_weather.py). Output columns:
region, date, rain_mm, tmax_c, source_page
"""
import csv, datetime, json, os, sys, urllib.request, urllib.parse

OUT = "public/data/weather_daily.csv"
API = "https://archive-api.open-meteo.com/v1/archive"


def centroid(geom):
    """The middle of the largest ring of a (multi)polygon, as (lat, lon)."""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    best, area_best = None, -1
    for p in polys:
        ring = p[0]
        a = cx = cy = 0.0
        for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
            c = x0 * y1 - x1 * y0
            a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
        if abs(a) > area_best and a:
            area_best = abs(a); best = (cy / (3 * a), cx / (3 * a))
    return best


def main():
    acts = list(csv.DictReader(open("public/data/activities.csv", encoding="utf-8")))
    geo = {g["activity_key"]: g for g in csv.DictReader(open("public/data/activity_geo.csv", encoding="utf-8"))}
    first = min(a["date"][:10] for a in acts)
    # the archive runs about five days behind today, so stop a week back
    last = min(max(a["date"][:10] for a in acts), (datetime.date.today() - datetime.timedelta(days=7)).isoformat())
    regions = sorted({g["region"] for g in geo.values() if g.get("country") == "Tanzania" and g.get("region")})
    countries = sorted({g["country"] for g in geo.values() if g.get("country") and g["country"] not in ("Tanzania", "Other", "Indoor / no GPS")})
    tz = json.load(open("public/data/tz_regions.geojson", encoding="utf-8"))
    af = json.load(open("public/data/africa.geojson", encoding="utf-8"))
    places = {}
    for f in tz["features"]:
        if f["properties"]["region"] in regions:
            places[f["properties"]["region"]] = centroid(f["geometry"])
    for f in af["features"]:
        if f["properties"]["name"] in countries:
            places[f["properties"]["name"]] = centroid(f["geometry"])
    rows = []
    for name, (lat, lon) in sorted(places.items()):
        q = urllib.parse.urlencode({"latitude": round(lat, 3), "longitude": round(lon, 3), "start_date": first, "end_date": last,
                                    "daily": "precipitation_sum,temperature_2m_max", "timezone": "Africa/Dar_es_Salaam"})
        with urllib.request.urlopen(f"{API}?{q}", timeout=120) as r:
            d = json.load(r)["daily"]
        for day, rain, tmax in zip(d["time"], d["precipitation_sum"], d["temperature_2m_max"]):
            rows.append({"region": name, "date": day, "rain_mm": "" if rain is None else round(rain, 1),
                         "tmax_c": "" if tmax is None else round(tmax, 1), "source_page": "Open-Meteo archive, middle of the region"})
        print(f"  {name:28s} {len(d['time'])} days")
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["region", "date", "rain_mm", "tmax_c", "source_page"], lineterminator="\n")
        w.writeheader(); w.writerows(rows)
    print(f"wrote {OUT}: {len(rows)} rows for {len(places)} places, {first} to {last}")


if __name__ == "__main__":
    try:
        main()
    except OSError as e:
        sys.exit(f"weather not updated, the archive could not be reached: {e}")

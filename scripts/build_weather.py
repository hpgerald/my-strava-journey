#!/usr/bin/env python3
"""Daily rain and heat for every region I have been out in (weather_daily.csv).

The weather is looked up for the middle of each region, never for a start
point, from Open-Meteo's free historical archive (no account needed):
https://archive-api.open-meteo.com. The file keeps what it already has, so each
run asks only for the days since the last one (plus a week back, which the
archive may have corrected), one region at a time with a pause between, and
waits and tries again when the archive says it is busy (HTTP 429). A first run,
or --full, asks for the whole record. Run it in the weekly refresh after
rebuild_from_raw.py:

    python3 scripts/build_weather.py

It needs network access to archive-api.open-meteo.com, so it can also be run
on your own computer (Windows: python scripts\build_weather.py). Output columns:
region, date, rain_mm, tmax_c, source_page
"""
import csv, datetime, json, os, sys, time, urllib.error, urllib.request, urllib.parse

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


def fetch(lat, lon, start, end):
    """One region's days from the archive, waiting and trying again when it is busy."""
    q = urllib.parse.urlencode({"latitude": round(lat, 3), "longitude": round(lon, 3), "start_date": start, "end_date": end,
                                "daily": "precipitation_sum,temperature_2m_max", "timezone": "Africa/Dar_es_Salaam"})
    for wait in (0, 30, 60, 120, 240):
        if wait:
            print(f"    the archive is busy, waiting {wait} s")
            time.sleep(wait)
        try:
            with urllib.request.urlopen(f"{API}?{q}", timeout=120) as r:
                return json.load(r)["daily"]
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
    raise OSError("HTTP Error 429: Too Many Requests, still busy after five tries; run it again in an hour")


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
    # what the file already holds: keep it, and ask only for what is new
    have = {}
    if os.path.exists(OUT) and "--full" not in sys.argv:
        for r in csv.DictReader(open(OUT, encoding="utf-8")):
            have.setdefault(r["region"], {})[r["date"]] = r
    asked, failed = 0, None
    for name, (lat, lon) in sorted(places.items()):
        old = have.setdefault(name, {})
        start = first
        if old:
            start = max(first, (datetime.date.fromisoformat(max(old)) - datetime.timedelta(days=7)).isoformat())
        if start > last:
            print(f"  {name:28s} up to date"); continue
        if asked:
            time.sleep(2)
        try:
            d = fetch(lat, lon, start, last)
        except OSError as e:
            failed = e; print(f"  {name:28s} not reached, kept what the file had"); continue
        asked += 1
        for day, rain, tmax in zip(d["time"], d["precipitation_sum"], d["temperature_2m_max"]):
            old[day] = {"region": name, "date": day, "rain_mm": "" if rain is None else round(rain, 1),
                        "tmax_c": "" if tmax is None else round(tmax, 1), "source_page": "Open-Meteo archive, middle of the region"}
        print(f"  {name:28s} {len(d['time'])} days from {start}")
    rows = [have[n][day] for n in sorted(have) if n in places for day in sorted(have[n]) if first <= day <= last]
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["region", "date", "rain_mm", "tmax_c", "source_page"], lineterminator="\n")
        w.writeheader(); w.writerows(rows)
    print(f"wrote {OUT}: {len(rows)} rows for {len(places)} places, {first} to {last}")
    if failed:
        raise failed


if __name__ == "__main__":
    try:
        main()
    except OSError as e:
        sys.exit(f"some places were not updated, the archive could not be reached: {e}")

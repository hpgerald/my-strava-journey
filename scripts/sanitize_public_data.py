#!/usr/bin/env python3
"""Remove sensitive fields from the CSVs shipped to the public site.

Run this after the private extract/geo/derived pipeline and before committing
``public/data``. It retains daily-level fields used by the visualisations while
removing precise locations, Strava IDs, titles, and times of day.
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_rows(path: Path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_rows(path: Path, fields, rows):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def drop_columns(path: Path, columns):
    rows = read_rows(path)
    if not rows:
        return
    fields = [field for field in rows[0] if field not in columns]
    write_rows(path, fields, [{field: row[field] for field in fields} for row in rows])


# The site is about the four sports on foot and about Africa. Every other sport
# is published as "Other" and never named; every country outside Africa is
# published as "Other" and never named. Folding happens here, at the edge of the
# public data, so a weekly refresh can never bring a name back.
FOOT = {"Run", "Walk", "TrailRun", "Hike"}
AFRICA = {"Tanzania", "Kenya", "Malawi", "South Africa", "Rwanda", "Uganda", "Zambia",
          "Mozambique", "Burundi", "Democratic Republic of the Congo", "Ethiopia",
          "Zimbabwe", "Botswana", "Namibia", "Egypt", "Morocco", "Ghana", "Nigeria"}
OTHER = "Other"
INDOOR = "Indoor / no GPS"


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def tidy(v):
    r = round(v, 1)
    return str(int(r)) if r == int(r) else str(r)


def fold_sport(s):
    return s if s in FOOT or not s else OTHER


def fold_country(c):
    return c if (not c or c == INDOOR or c in AFRICA) else OTHER


def fold_others(data_dir: Path):
    # sport columns, row by row
    for name, col in (("activities", "sport_type"), ("activity_geo", "sport"), ("pr_activities", "sport"),
                      ("kudos_leaderboard", "sport"), ("tanzania_regions", "top_sport")):
        path = data_dir / f"{name}.csv"
        if not path.exists():
            continue
        rows = read_rows(path)
        if rows and col in rows[0]:
            for r in rows:
                r[col] = fold_sport(r[col])
            write_rows(path, list(rows[0].keys()), rows)

    # countries in the activity geography
    geo_path = data_dir / "activity_geo.csv"
    geo = read_rows(geo_path)
    for r in geo:
        r["country"] = fold_country(r["country"])
    write_rows(geo_path, list(geo[0].keys()), geo)

    # the country table: one Other row for everything outside Africa
    c_path = data_dir / "countries.csv"
    rows = read_rows(c_path)
    fields = list(rows[0].keys())
    keep, other = [], None
    for r in rows:
        if fold_country(r["country"]) != OTHER:
            keep.append(r)
            continue
        if other is None:
            other = {k: "" for k in fields}
            other.update(country=OTHER, activities="0", distance_km="0", moving_time_h="0", elevation_m="0",
                         first_activity_date=r["first_activity_date"], source_page=r["source_page"])
        for k in ("activities", "distance_km", "moving_time_h", "elevation_m"):
            other[k] = tidy(num(other[k]) + num(r[k]))
        other["first_activity_date"] = min(other["first_activity_date"], r["first_activity_date"])
    if other:
        other["activities"] = str(int(num(other["activities"])))
        other["elevation_m"] = str(int(round(num(other["elevation_m"]))))
        keep.append(other)
    write_rows(c_path, fields, keep)

    # per-sport totals: the four sports on foot, then one Other row
    b_path = data_dir / "sport_breakdown.csv"
    rows = read_rows(b_path)
    fields = list(rows[0].keys())
    foot = [r for r in rows if r["sport"] in FOOT]
    rest = [r for r in rows if r["sport"] not in FOOT]
    if rest:
        o = {k: "" for k in fields}
        o["sport"] = OTHER
        for k in ("activities", "distance_km", "moving_time_h", "elevation_m", "calories"):
            o[k] = tidy(sum(num(r[k]) for r in rest))
        o["activities"] = str(int(num(o["activities"])))
        o["avg_distance_km"] = tidy(num(o["distance_km"]) / max(1, num(o["activities"])))
        o["source_page"] = rest[0]["source_page"]
        foot.append(o)
    write_rows(b_path, fields, foot)

    # yearly distance by sport: the four on foot, plus one Other per year
    y_path = data_dir / "yearly_by_sport.csv"
    rows = read_rows(y_path)
    fields = list(rows[0].keys())
    out, acc = [], {}
    for r in rows:
        if r["sport"] in FOOT:
            out.append(r)
        else:
            a = acc.setdefault(r["year"], {"year": r["year"], "sport": OTHER, "distance_km": 0.0, "source_page": r["source_page"]})
            a["distance_km"] += num(r["distance_km"])
    for y, a in sorted(acc.items()):
        a["distance_km"] = tidy(a["distance_km"])
        out.append(a)
    out.sort(key=lambda r: (r["year"], r["sport"] == OTHER))
    write_rows(y_path, fields, out)

    # the longest and the highest single outings, on foot only
    acts = [a for a in read_rows(data_dir / "activities.csv") if a["sport_type"] in FOOT]
    for name, key, cols in (("pr_longest", "distance_km", ["rank", "distance_km", "date", "sport", "elevation_m", "kudos", "prs", "source_page"]),
                            ("pr_elevation", "elevation_gain_m", ["rank", "elevation_m", "date", "sport", "distance_km", "kudos", "prs", "source_page"])):
        top = sorted(acts, key=lambda a: num(a[key]), reverse=True)[:10]
        rows = [{"rank": i + 1, "distance_km": a["distance_km"], "elevation_m": a["elevation_gain_m"], "date": a["date"],
                 "sport": a["sport_type"], "kudos": a["kudos"], "prs": a["prs"], "source_page": "Personal Records"}
                for i, a in enumerate(top)]
        write_rows(data_dir / f"{name}.csv", cols, [{c: r[c] for c in cols} for r in rows])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=ROOT / "public" / "data")
    args = parser.parse_args()

    activities_path = args.data_dir / "activities.csv"
    activities = read_rows(activities_path)
    if activities and "id" not in activities[0]:
        for name in ("pr_longest", "pr_elevation", "pr_activities", "kudos_leaderboard", "most_repeated_titles"):
            drop_columns(args.data_dir / f"{name}.csv", {"name", "title"})
        fold_others(args.data_dir)
        print("Public data is already sanitised; checked derivative tables and folded others.")
        return
    keys = {row.get("id", ""): f"a{index:04d}" for index, row in enumerate(activities, 1)}
    activity_fields = [
        "activity_key", "date", "sport_type", "distance_km", "moving_time_min",
        "elapsed_time_min", "elevation_gain_m", "avg_speed_kmh", "max_speed_kmh",
        "avg_cadence", "calories", "relative_effort", "kudos", "achievements",
        "prs", "trainer", "gear_id", "tags", "year", "month", "weekday", "hour",
        "time_bucket", "source_page",
    ]
    public_activities = []
    for row in activities:
        public = {field: row.get(field, "") for field in activity_fields}
        public["activity_key"] = keys[row.get("id", "")]
        public["date"] = row.get("date", "")[:10]
        public_activities.append(public)
    write_rows(activities_path, activity_fields, public_activities)

    geo_path = args.data_dir / "activity_geo.csv"
    geo = read_rows(geo_path)
    geo_fields = ["activity_key", "date", "sport", "country", "region", "has_gps", "interior", "source_page"]
    public_geo = []
    for row in geo:
        public_geo.append({
            "activity_key": keys.get(row.get("id", ""), ""),
            "date": row.get("date", "")[:10],
            "sport": row.get("sport", ""),
            "country": row.get("country", ""),
            "region": row.get("region", ""),
            "has_gps": row.get("has_gps", ""),
            "interior": row.get("interior", ""),
            "source_page": row.get("source_page", ""),
        })
    write_rows(geo_path, geo_fields, public_geo)

    # These derivative tables are public too. Keep their metrics, but never ship
    # Strava's free-form activity titles.
    for name in ("pr_longest", "pr_elevation", "pr_activities", "kudos_leaderboard", "most_repeated_titles"):
        drop_columns(args.data_dir / f"{name}.csv", {"name", "title"})
    fold_others(args.data_dir)


if __name__ == "__main__":
    main()

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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=ROOT / "public" / "data")
    args = parser.parse_args()

    activities_path = args.data_dir / "activities.csv"
    activities = read_rows(activities_path)
    if activities and "id" not in activities[0]:
        for name in ("pr_longest", "pr_elevation", "pr_activities", "kudos_leaderboard", "most_repeated_titles"):
            drop_columns(args.data_dir / f"{name}.csv", {"name", "title"})
        print("Public data is already sanitised; checked derivative tables.")
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


if __name__ == "__main__":
    main()

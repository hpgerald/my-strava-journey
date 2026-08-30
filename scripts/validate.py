#!/usr/bin/env python3
"""Validate the public data bundle without private source files or third-party modules."""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_SOURCE_PAGE = {
    "activities", "activity_geo", "comparisons", "countries", "fun_journey", "gear",
    "hr_zones", "indoor_outdoor", "kudos_leaderboard", "lifetime_totals", "meta",
    "monthly_totals", "most_repeated_titles", "nav_index", "pace_zones", "power_zones",
    "pr_activities", "pr_elevation", "pr_longest", "relative_effort_by_year", "sport_breakdown",
    "streaks", "tanzania_regions", "time_of_day_patterns", "timeline", "weekday_patterns",
    "yearly_by_sport", "yearly_totals",
}


def load(path: Path):
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=ROOT / "public" / "data")
    args = parser.parse_args()
    failures = []
    files = sorted(args.data_dir.glob("*.csv"))
    tables = {}

    for path in files:
        rows = load(path)
        with path.open(encoding="utf-8", newline="") as handle:
            raw_rows = list(csv.reader(handle))
        width = len(raw_rows[0]) if raw_rows else 0
        ragged = [index for index, row in enumerate(raw_rows[1:], 2) if len(row) != width]
        print(f"{path.name:28} {len(rows):5} rows", "OK" if not ragged else f"RAGGED {ragged[:3]}")
        if ragged:
            failures.append(f"{path.name}: inconsistent column count")
        tables[path.stem] = rows
        if path.stem in REQUIRED_SOURCE_PAGE and rows and "source_page" not in rows[0]:
            failures.append(f"{path.name}: missing source_page")

    activities = tables.get("activities", [])
    expected = len(activities)
    for table, field in [
        ("sport_breakdown", "activities"), ("yearly_totals", "activities"),
        ("countries", "activities"), ("weekday_patterns", "activities"),
        ("time_of_day_patterns", "activities"), ("indoor_outdoor", "activities"),
    ]:
        actual = sum(float(row.get(field) or 0) for row in tables.get(table, []))
        if round(actual) != expected:
            failures.append(f"{table}: {actual:g} activities, expected {expected}")

    activity_columns = set(activities[0]) if activities else set()
    leaked = {"id", "name", "lat", "lon", "city"} & activity_columns
    if leaked:
        failures.append(f"activities.csv exposes private fields: {', '.join(sorted(leaked))}")
    geo = tables.get("activity_geo", [])
    geo_columns = set(geo[0]) if geo else set()
    leaked = {"id", "lat", "lon", "city", "iso3"} & geo_columns
    if leaked:
        failures.append(f"activity_geo.csv exposes private fields: {', '.join(sorted(leaked))}")
    for table in ("pr_longest", "pr_elevation", "pr_activities", "kudos_leaderboard", "most_repeated_titles"):
        rows = tables.get(table, [])
        columns = set(rows[0]) if rows else set()
        leaked = {"name", "title"} & columns
        if leaked:
            failures.append(f"{table}.csv exposes activity titles: {', '.join(sorted(leaked))}")

    if failures:
        print("\nFAILED")
        print("\n".join(f"- {failure}" for failure in failures))
        raise SystemExit(1)
    print(f"\nPASS: {len(files)} CSVs; {expected} public activity records; no precise location fields.")


if __name__ == "__main__":
    main()

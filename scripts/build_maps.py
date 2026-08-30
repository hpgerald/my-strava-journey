#!/usr/bin/env python3
"""Build two choropleth layers for the Where page, from real boundaries:
  africa.geojson     - African countries, tagged with activity counts
  tz_regions.geojson - Tanzania's real regions (Natural Earth admin-1), tagged
"""
import json, csv, os, re
from pathlib import Path
import geopandas as gpd
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parents[1]
OUT = os.environ.get("STRAVA_OUTPUT", str(ROOT / "public" / "data"))
# slim Tanzania admin-1 boundaries (Natural Earth 10m), shipped in scripts/ so the
# maps regenerate offline on each weekly refresh
NE_ADMIN1 = os.path.join(os.path.dirname(__file__), "ne_tz_admin1.geojson")

def round_coords(obj, nd):
    if isinstance(obj, list):
        if obj and isinstance(obj[0], (int, float)):
            return [round(obj[0], nd), round(obj[1], nd)]
        return [round_coords(x, nd) for x in obj]
    return obj

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())

# ---------------- Africa countries ----------------
world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
acts = {}
for r in csv.DictReader(open(os.path.join(OUT, "countries.csv"))):
    if r["iso_code"]:
        acts[r["iso_code"]] = int(float(r["activities"]))

africa = world[world["continent"] == "Africa"]
feats = []
for _, row in africa.iterrows():
    geom = row["geometry"].simplify(0.08, preserve_topology=True)
    if geom.is_empty:
        continue
    gj = mapping(geom)
    gj["coordinates"] = round_coords(gj["coordinates"], 2)
    feats.append({
        "type": "Feature",
        "properties": {"iso": row["iso_a3"], "name": row["name"], "act": acts.get(row["iso_a3"], 0)},
        "geometry": gj,
    })
with open(os.path.join(OUT, "africa.geojson"), "w") as f:
    json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
print("africa.geojson:", len(feats), "countries,",
      round(os.path.getsize(os.path.join(OUT, "africa.geojson")) / 1024), "KB")
print("  visited:", {r['properties']['name']: r['properties']['act'] for r in feats if r['properties']['act'] > 0})

# ---------------- Tanzania regions (real NE admin-1) ----------------
regions = {}
for r in csv.DictReader(open(os.path.join(OUT, "tanzania_regions.csv"))):
    regions[r["region"]] = {"act": int(float(r["activities"])), "dist": float(r["distance_km"])}
# lookup by normalised region name
reg_by_norm = {norm(k): k for k in regions}

ne = json.load(open(NE_ADMIN1))
tz = ne["features"]  # this source file already contains only Tanzania's regions

def match_region(props):
    cands = [props.get("name")]
    if props.get("name_alt"):
        cands += props["name_alt"].split("|")
    for c in cands:
        k = reg_by_norm.get(norm(c))
        if k:
            return k
    return None

import shapely.geometry as sg
rfeats = []
matched = set()
for f in tz:
    geom = sg.shape(f["geometry"]).simplify(0.02, preserve_topology=True)
    if geom.is_empty:
        continue
    reg = match_region(f["properties"])
    act = regions[reg]["act"] if reg else 0
    dist = regions[reg]["dist"] if reg else 0
    if reg:
        matched.add(reg)
    gj = mapping(geom)
    gj["coordinates"] = round_coords(gj["coordinates"], 3)
    rfeats.append({
        "type": "Feature",
        "properties": {"region": reg or f["properties"].get("name"), "act": act, "dist": dist},
        "geometry": gj,
    })
with open(os.path.join(OUT, "tz_regions.geojson"), "w") as f:
    json.dump({"type": "FeatureCollection", "features": rfeats}, f, separators=(",", ":"))
print("tz_regions.geojson:", len(rfeats), "regions,",
      round(os.path.getsize(os.path.join(OUT, "tz_regions.geojson")) / 1024), "KB")
print("  matched", len(matched), "/", len(regions), "; unmatched data regions:", set(regions) - matched)

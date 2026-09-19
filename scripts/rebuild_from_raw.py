#!/usr/bin/env python3
"""Full rebuild of public/data from a fresh raw Strava export (with GPS).

Regenerates every activity-derived table from scratch. Geography comes from
Strava's own start_country/start_locality; region for existing activities is
preserved from the current public activity_geo (matched by date order), new
activities are mapped from their locality. Authored/static tables (glossary,
nav_index, zones, pr_longest/pr_elevation, kudos_leaderboard,
most_repeated_titles) and gear metadata are preserved. Produces ALL-SPORT
distance/elevation; run apply_foot_only.py afterwards for the foot-only figures.
"""
import csv, datetime, re, os, sys

RAW = os.environ.get("STRAVA_RAW",
    "/root/.claude/uploads/b3a043bd-b3a9-5768-937e-095a6ffd4e38/26d5c9d9-1789800841676_strava_activities_raw.csv")
OUT = "public/data"
WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
GSRC = "Strava GPS + point-in-polygon (Natural Earth) / nearest TZ city"
CSRC = "Strava GPS + point-in-polygon (Natural Earth admin-0)"

def fnum(x):
    try: return float(str(x).strip())
    except: return None
def fmt(v, dp):
    if v is None: return ""
    r = round(v, dp); return str(int(r)) if r == int(r) else str(r)
def n1(v): return fmt(v, 1)
def n2(v): return fmt(v, 2)
def bucket(h):
    if 4 <= h < 7: return "Early Morning (4-7)"
    if 7 <= h < 11: return "Morning (7-11)"
    if 11 <= h < 14: return "Midday (11-14)"
    if 14 <= h < 17: return "Afternoon (14-17)"
    if 17 <= h < 20: return "Evening (17-20)"
    return "Night (20-4)"

PUB_COLS = ["activity_key", "date", "sport_type", "distance_km", "moving_time_min", "elapsed_time_min",
    "elevation_gain_m", "avg_speed_kmh", "max_speed_kmh", "avg_cadence", "calories", "relative_effort",
    "kudos", "achievements", "prs", "trainer", "gear_id", "tags", "year", "month", "weekday", "hour",
    "time_bucket", "source_page"]

def build_row(r):
    date = r['start_local'].replace("T", " "); d10 = date[:10]
    dt = datetime.date(int(d10[:4]), int(d10[5:7]), int(d10[8:10]))
    hour = int(date[11:13]) if len(date) >= 13 else 0
    g = lambda k: fnum(r[k])
    lat = (r.get('start_lat') or "").strip(); lng = (r.get('start_lng') or "").strip()
    return {
        "date": date, "sport_type": r['sport_type'],
        "distance_km": fmt(g('summary_distance') / 1000, 3) if g('summary_distance') is not None else "",
        "moving_time_min": fmt(g('summary_moving_time') / 60, 2) if g('summary_moving_time') is not None else "",
        "elapsed_time_min": fmt(g('summary_elapsed_time') / 60, 2) if g('summary_elapsed_time') is not None else "",
        "elevation_gain_m": fmt(g('summary_elevation_gain'), 1) if g('summary_elevation_gain') is not None else "",
        "avg_speed_kmh": fmt(g('summary_avg_speed') * 3.6, 2) if g('summary_avg_speed') is not None else "",
        "max_speed_kmh": fmt(g('summary_max_speed') * 3.6, 2) if g('summary_max_speed') is not None else "",
        "avg_cadence": fmt(g('summary_avg_cadence'), 1) if g('summary_avg_cadence') is not None else "",
        "calories": fmt(g('summary_total_calories'), 0) if g('summary_total_calories') is not None else "",
        "relative_effort": fmt(g('summary_relative_effort'), 0) if g('summary_relative_effort') is not None else "",
        "kudos": (r['summary_kudos_count'] or "").strip(), "achievements": (r['summary_achievement_count'] or "").strip(),
        "prs": (r['summary_pr_count'] or "").strip(),
        "trainer": "Yes" if (r['is_trainer'] or "").strip().lower() == "true" else "No",
        "gear_id": (r['gear_id'] or "").strip(),
        "tags": "; ".join(re.findall(r"'([^']+)'", r['activity_tags'])) if (r['activity_tags'] or "").startswith("[") else (r['activity_tags'] or ""),
        "year": d10[:4], "month": d10[:7], "weekday": WEEK[dt.weekday()], "hour": str(hour),
        "time_bucket": bucket(hour), "source_page": "Activity Log",
        # geo source fields (not written to activities.csv)
        "_country_raw": (r.get('start_country') or "").strip(),
        "_locality": (r.get('start_locality') or "").strip(),
        "_has_gps": 1 if (lat and lng) else 0,
    }

rows = [build_row(r) for r in csv.DictReader(open(RAW))]
rows.sort(key=lambda r: r['date'])
for i, r in enumerate(rows, 1):
    r['activity_key'] = f"a{i:04d}"
print("total activities:", len(rows))

def num(x):
    try: return float(str(x).replace(",", ""))
    except: return None
def N(r, k): return num(r.get(k)) or 0.0
def Wr(name, header, orows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(header)
        for r in orows: w.writerow(r)
    print(f"  {name:26} {len(orows)} rows")
def read(name): return list(csv.DictReader(open(os.path.join(OUT, name))))

# ---- validate order/transform vs current public (existing rows) ----
pub = read("activities.csv")
n_existing = len(pub)
mism = 0
for i, pr in enumerate(pub):
    br = rows[i]
    for f in ["date", "sport_type", "distance_km", "moving_time_min", "elevation_gain_m", "kudos", "trainer", "year", "weekday", "time_bucket"]:
        bv = br[f][:10] if f == "date" else br[f]
        if (pr.get(f) or "") != (bv or ""):
            if mism < 12: print(f"  MISMATCH row{i} {pr.get('activity_key')} {f}: public={pr.get(f)!r} built={bv!r}")
            mism += 1
print(f"order/transform mismatches on first {n_existing}:", mism)
assert mism <= 1, "unexpected transform mismatches - order may differ"
new = rows[n_existing:]
print("new activities:", len(new))

# ============ GEO ============
# preserve existing region/country; map new from locality
DAR_SUBURBS = {"Kawe", "Msasani", "Kipawa", "Goba", "Kivukoni", "Kijitonyama", "Magomeni", "Mikocheni",
    "Mbezi", "Tegeta", "Kinondoni", "Ubungo", "Ilala", "Temeke", "Kigamboni", "Upanga", "Oyster Bay"}
REGION_SET = {r['region'] for r in read("tanzania_regions.csv")}
COUNTRY_MAP = {"RSA": "South Africa", "TZ": "Tanzania", "KE": "Kenya"}
def map_country(sc): return COUNTRY_MAP.get(sc, sc)
def resolve_region(loc):
    if not loc: return "Unknown"
    base = re.sub(r"\s+(Region|National Park|City)$", "", loc).strip()
    if base in DAR_SUBURBS: return "Dar es Salaam"
    if base in REGION_SET: return base
    if loc in REGION_SET: return loc
    return "Unknown"

cur_geo = {g['activity_key']: g for g in read("activity_geo.csv")}
GEOCOLS = ["activity_key", "date", "sport", "country", "region", "has_gps", "interior", "source_page"]
geo_out = []
for r in rows:
    k = r['activity_key']
    if k in cur_geo:
        g = cur_geo[k]
        geo_out.append({"activity_key": k, "date": r['date'][:10], "sport": r['sport_type'],
            "country": g.get('country', ''), "region": g.get('region', ''),
            "has_gps": g.get('has_gps', ''), "interior": g.get('interior', ''), "source_page": GSRC})
    else:
        if r['_has_gps'] and r['_country_raw']:
            country = map_country(r['_country_raw'])
            region = resolve_region(r['_locality']) if country == "Tanzania" else ""
            geo_out.append({"activity_key": k, "date": r['date'][:10], "sport": r['sport_type'],
                "country": country, "region": region, "has_gps": "1", "interior": "1", "source_page": GSRC})
        else:
            geo_out.append({"activity_key": k, "date": r['date'][:10], "sport": r['sport_type'],
                "country": "", "region": "", "has_gps": "0", "interior": "0", "source_page": GSRC})
Wr("activity_geo.csv", GEOCOLS, [[g[c] for c in GEOCOLS] for g in geo_out])
geo_by_key = {g['activity_key']: g for g in geo_out}
print("new geo:", [(r['activity_key'], geo_by_key[r['activity_key']]['country'], geo_by_key[r['activity_key']]['region']) for r in new])

# ---- activities.csv (public) ----
Wr("activities.csv", PUB_COLS, [[r[c] for c in PUB_COLS] for r in rows])

# ============ AGGREGATES (all-sport; apply_foot_only fixes distance/elev after) ============
years = sorted({r['year'] for r in rows if r['year']})

# sport_breakdown
sports = sorted({r['sport_type'] for r in rows})
sb = []
for s in sorted(sports, key=lambda s: -len([r for r in rows if r['sport_type'] == s])):
    g = [r for r in rows if r['sport_type'] == s]; n = len(g)
    km = sum(N(r, 'distance_km') for r in g)
    sb.append([s, n, n1(km), n1(sum(N(r, 'moving_time_min') for r in g) / 60),
        fmt(sum(N(r, 'elevation_gain_m') for r in g), 0), fmt(sum(N(r, 'calories') for r in g), 0),
        n2(km / n if n else 0), "Overview"])
Wr("sport_breakdown.csv", ["sport", "activities", "distance_km", "moving_time_h", "elevation_m", "calories", "avg_distance_km", "source_page"], sb)

# yearly_totals
yt = []
for y in years:
    g = [r for r in rows if r['year'] == y]
    yt.append([y, len(g), n1(sum(N(r, 'distance_km') for r in g)), n1(sum(N(r, 'moving_time_min') for r in g) / 60),
        fmt(sum(N(r, 'elevation_gain_m') for r in g), 0), fmt(sum(N(r, 'calories') for r in g), 0), "Yearly Trends"])
Wr("yearly_totals.csv", ["year", "activities", "distance_km", "moving_time_h", "elevation_m", "calories", "source_page"], yt)

# yearly_by_sport (tracked sports, matching the derived-comparisons needs)
TRACK = ["Walk", "Run", "TrailRun", "GravelRide", "Ride", "Hike"]
ybs = []
for y in years:
    for s in TRACK:
        km = sum(N(r, 'distance_km') for r in rows if r['year'] == y and r['sport_type'] == s)
        if km > 0: ybs.append([y, s, n1(km), "Yearly Trends"])
Wr("yearly_by_sport.csv", ["year", "sport", "distance_km", "source_page"], ybs)

# monthly_totals
months = sorted({r['month'] for r in rows if r['month']})
mt = []
for m in months:
    g = [r for r in rows if r['month'] == m]
    mt.append([m, len(g), n1(sum(N(r, 'distance_km') for r in g)), n1(sum(N(r, 'moving_time_min') for r in g) / 60), "Monthly Trends"])
Wr("monthly_totals.csv", ["month", "activities", "distance_km", "moving_time_h", "source_page"], mt)

# relative_effort_by_year
re_rows = []
for y in years:
    g = [r for r in rows if r['year'] == y]
    res = [num(r['relative_effort']) for r in g if r['relative_effort'] != '']
    cad = [num(r['avg_cadence']) for r in g if r['avg_cadence'] != '' and (num(r['avg_cadence']) or 0) > 0]
    re_rows.append([y, fmt(sum(res), 0), fmt(sum(res) / len(res) if res else 0, 0), n1(sum(cad) / len(cad) if cad else 0), "Zones & Effort"])
Wr("relative_effort_by_year.csv", ["year", "total_relative_effort", "avg_relative_effort", "avg_cadence", "source_page"], re_rows)

# weekday_patterns
wd = []
for d in WEEK:
    g = [r for r in rows if r['weekday'] == d]
    wd.append([d, len(g), n1(sum(N(r, 'distance_km') for r in g)), "Fun Stats"])
Wr("weekday_patterns.csv", ["weekday", "activities", "distance_km", "source_page"], wd)

# time_of_day_patterns
BUCKETS = ["Early Morning (4-7)", "Morning (7-11)", "Midday (11-14)", "Afternoon (14-17)", "Evening (17-20)", "Night (20-4)"]
tod = [[b, len([r for r in rows if r['time_bucket'] == b]), "Fun Stats"] for b in BUCKETS]
Wr("time_of_day_patterns.csv", ["time_of_day", "activities", "source_page"], tod)

# indoor_outdoor
io = []
for label, is_ind in [("Outdoor", False), ("Indoor / Trainer", True)]:
    g = [r for r in rows if (r['trainer'] == "Yes") == is_ind]
    io.append([label, len(g), n1(sum(N(r, 'distance_km') for r in g)), "Fun Stats"])
Wr("indoor_outdoor.csv", ["setting", "activities", "distance_km", "source_page"], io)

# lifetime_totals + streaks
days = sorted({r['date'][:10] for r in rows})
best = cur_ = 0; bs = be = rs = None; prev = None
for ds in days:
    dd = datetime.date.fromisoformat(ds)
    if prev and (dd - prev).days == 1: cur_ += 1
    else: cur_ = 1; rs = ds
    if cur_ > best: best = cur_; bs = rs; be = ds
    prev = dd
cur_len = 1; i = len(days) - 1
while i > 0 and (datetime.date.fromisoformat(days[i]) - datetime.date.fromisoformat(days[i - 1])).days == 1:
    cur_len += 1; i -= 1
tot = lambda k: sum(N(r, k) for r in rows)
Wr("lifetime_totals.csv", ["metric", "value", "unit", "source_page"], [
    ["Total Activities", len(rows), "activities", "Overview"], ["Total Km", fmt(tot('distance_km'), 0), "km", "Overview"],
    ["Total Hours Moving", fmt(tot('moving_time_min') / 60, 0), "hours", "Overview"], ["Total Elevation (M)", fmt(tot('elevation_gain_m'), 0), "m", "Overview"],
    ["Total Calories", fmt(tot('calories'), 0), "kcal", "Overview"], ["Total Kudos", fmt(tot('kudos'), 0), "kudos", "Overview"],
    ["Personal Records", fmt(tot('prs'), 0), "PRs", "Overview"], ["Achievements", fmt(tot('achievements'), 0), "achievements", "Overview"],
    ["Current Streak (Days)", cur_len, "days", "Overview"], ["Longest Streak (Days)", best, "days", "Overview"]])
Wr("streaks.csv", ["metric", "value", "source_page"], [["Longest consecutive-day streak", f"{best} days", "Fun Stats"],
    ["Streak dates", f"{bs} → {be}", "Fun Stats"], ["Current streak (as of last activity)", f"{cur_len} days", "Fun Stats"]])
tkm = tot('distance_km'); tel = tot('elevation_gain_m')
Wr("fun_journey.csv", ["comparison", "value", "source_page"], [
    ["Marathons run (42.195 km each)", n1(tkm / 42.195), "Fun Stats"], ["Laps of the Earth's equator (40,075 km)", fmt(tkm / 40075, 4), "Fun Stats"],
    ["Fraction of the way to the Moon (384,400 km)", fmt(tkm / 384400, 4), "Fun Stats"], ["Mt. Everests climbed (8,849 m each)", n2(tel / 8849), "Fun Stats"],
    ["Mt. Kilimanjaros climbed (5,895 m each)", n2(tel / 5895), "Fun Stats"]])

# pr_activities (public: no name)
pra = [r for r in rows if (num(r['prs']) or 0) > 0]
pra.sort(key=lambda r: r['date'], reverse=True)
Wr("pr_activities.csv", ["date", "sport", "distance_km", "elevation_m", "pr_count", "achievements", "kudos", "source_page"],
    [[r['date'][:10], r['sport_type'], n2(N(r, 'distance_km')), r['elevation_gain_m'], r['prs'], r['achievements'], r['kudos'], "Personal Records"] for r in pra])

# gear: recompute distance_in_log from all rows; grow strava_total by new deltas
gear = read("gear.csv")
log_by_gear = {}
for r in rows:
    if r['gear_id']: log_by_gear[r['gear_id']] = log_by_gear.get(r['gear_id'], 0) + N(r, 'distance_km')
new_by_gear = {}
for r in new:
    if r['gear_id']: new_by_gear[r['gear_id']] = new_by_gear.get(r['gear_id'], 0) + N(r, 'distance_km')
grows = []
for g in gear:
    gid = g['gear_id']
    log = log_by_gear.get(gid, num(g['distance_in_log_km']) or 0)
    strava = (num(g['strava_total_km']) or 0) + new_by_gear.get(gid, 0)
    strava = max(strava, log)
    grows.append([g['brand'], g['model'], g['type'], g['retired'], n1(strava), n1(log), gid, "Gear"])
Wr("gear.csv", ["brand", "model", "type", "retired", "strava_total_km", "distance_in_log_km", "gear_id", "source_page"], grows)

# countries (from geo + all-sport metrics; apply_foot_only fixes distance/elev)
met = {r['activity_key']: r for r in rows}
countries = {}
for g in geo_out:
    key = g['country'] if g['has_gps'] == "1" and g['country'] else ("Indoor / no GPS" if g['has_gps'] != "1" else "Unknown")
    a = met[g['activity_key']]
    c = countries.setdefault(key, {"iso": "", "act": 0, "dist": 0.0, "mt": 0.0, "elev": 0.0, "first": "9999"})
    c["act"] += 1; c["dist"] += N(a, 'distance_km'); c["mt"] += N(a, 'moving_time_min'); c["elev"] += N(a, 'elevation_gain_m')
    if g['date'] and g['date'] < c["first"]: c["first"] = g['date']
ISO = {"Tanzania": "TZA", "Kenya": "KEN", "Malawi": "MWI", "South Africa": "ZAF", "Saudi Arabia": "SAU",
    "Rwanda": "RWA", "United Kingdom": "GBR", "Uganda": "UGA", "Zambia": "ZMB"}
crows = sorted(countries.items(), key=lambda kv: -kv[1]["act"])
Wr("countries.csv", ["country", "iso_code", "activities", "distance_km", "moving_time_h", "elevation_m", "first_activity_date", "source_page"],
    [[name, ISO.get(name, ""), c["act"], n1(c["dist"]), n1(c["mt"] / 60), fmt(c["elev"], 0),
      "" if c["first"] == "9999" else c["first"], CSRC] for name, c in crows])
print("countries:", [(n, c['act']) for n, c in crows])

# tanzania_regions
regions = {}
for g in geo_out:
    if g['has_gps'] != "1" or g['country'] != "Tanzania": continue
    reg = g['region'] or "Unknown"; a = met[g['activity_key']]
    rr = regions.setdefault(reg, {"act": 0, "dist": 0.0, "mt": 0.0, "elev": 0.0, "first": "9999", "last": "0000", "sports": {}})
    rr["act"] += 1; rr["dist"] += N(a, 'distance_km'); rr["mt"] += N(a, 'moving_time_min'); rr["elev"] += N(a, 'elevation_gain_m')
    if g['date'] and g['date'] < rr["first"]: rr["first"] = g['date']
    if g['date'] and g['date'] > rr["last"]: rr["last"] = g['date']
    rr["sports"][a['sport_type']] = rr["sports"].get(a['sport_type'], 0) + 1
rrows = sorted(regions.items(), key=lambda kv: -kv[1]["act"])
Wr("tanzania_regions.csv", ["region", "activities", "distance_km", "moving_time_h", "elevation_m", "first_activity_date", "last_activity_date", "top_sport", "source_page"],
    [[name, rr["act"], n1(rr["dist"]), n1(rr["mt"] / 60), fmt(rr["elev"], 0), rr["first"], rr["last"],
      max(rr["sports"].items(), key=lambda kv: kv[1])[0] if rr["sports"] else "", GSRC] for name, rr in rrows])
print("TZ regions:", [(n, rr['act']) for n, rr in rrows])

# meta
today = datetime.date.today().isoformat()
Wr("meta.csv", ["key", "value", "source_page"], [["coverage_start", "2019-08-17", "Notes"], ["coverage_end", days[-1], "Notes"],
    ["total_activities", str(len(rows)), "Notes"], ["units", "Metric (km, meters, km/h)", "Notes"],
    ["data_source", "Strava API via connected Strava MCP", "Notes"], ["last_refreshed", today, "Notes"],
    ["refresh_cadence", "Weekly automated rebuild", "Notes"]])
print(f"REBUILD DONE. {len(rows)} activities; last {days[-1]}; streak {best} longest / {cur_len} current")

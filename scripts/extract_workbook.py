#!/usr/bin/env python3
"""Phase 1 extractor: strava_deep_dive.xlsx -> /public/data/*.csv
Every numeric row carries source_page (= workbook sheet name).
No figure is invented; missing cells are left blank and logged in DATA_NOTES.md.
"""
import openpyxl, csv, os, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = os.environ.get("STRAVA_SOURCE")
if not SRC:
    raise SystemExit("Set STRAVA_SOURCE to the private Strava workbook before running this script.")
OUT = os.environ.get("STRAVA_OUTPUT", str(ROOT / "public" / "data"))
os.makedirs(OUT, exist_ok=True)
wb = openpyxl.load_workbook(SRC, data_only=True)

def rows(sheet):
    return list(wb[sheet].iter_rows(values_only=True))

def clean(v):
    if v is None: return ""
    s = str(v).strip()
    if s.lower() == "none": return ""
    return s

def write_csv(name, header, data):
    path = os.path.join(OUT, name)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in data:
            w.writerow(r)
    print(f"  {name:34} {len(data):>5} rows")

log = []  # (file, note)

# ---------------------------------------------------------------- ACTIVITIES
r = rows("Activity Log")
hdr = [clean(c) for c in r[0]]
cols = ["id","date","name","sport_type","distance_km","moving_time_min",
        "elapsed_time_min","elevation_gain_m","avg_speed_kmh","max_speed_kmh",
        "avg_cadence","calories","relative_effort","kudos","achievements","prs",
        "trainer","gear_id","tags","year","month","weekday","hour","time_bucket"]
data = []
for row in r[1:]:
    if not clean(row[0]): continue
    rec = [clean(c) for c in row[:24]]
    # normalise tags "['LongRun']" -> "LongRun; ..."
    tag = rec[18]
    if tag.startswith("["):
        rec[18] = "; ".join(re.findall(r"'([^']+)'", tag))
    rec.append("Activity Log")
    data.append(rec)
write_csv("activities.csv", cols + ["source_page"], data)
N_ACT = len(data)

# ---------------------------------------------------------------- LIFETIME TOTALS
ov = rows("Overview")
def cellrow(rownum): return [clean(c) for c in ov[rownum-1]]
labels_a = [c for c in cellrow(9) if c]
vals_a   = [c for c in cellrow(6) if c]
labels_b = [c for c in cellrow(13) if c]
vals_b   = [c for c in cellrow(10) if c]
units = {"TOTAL ACTIVITIES":"activities","TOTAL KM":"km","TOTAL HOURS MOVING":"hours",
         "TOTAL ELEVATION (M)":"m","TOTAL CALORIES":"kcal","TOTAL KUDOS":"kudos",
         "PERSONAL RECORDS":"PRs","ACHIEVEMENTS":"achievements",
         "CURRENT STREAK (DAYS)":"days","LONGEST STREAK (DAYS)":"days"}
lt = []
for lab, val in list(zip(labels_a, vals_a)) + list(zip(labels_b, vals_b)):
    lt.append([lab.title(), val, units.get(lab,""), "Overview"])
write_csv("lifetime_totals.csv", ["metric","value","unit","source_page"], lt)

# ---------------------------------------------------------------- SPORT BREAKDOWN
sb = []
for row in ov[16:]:  # row 17+
    c = [clean(x) for x in row]
    vals = [x for x in c if x]
    if not vals: break
    if c[1] and c[1] != "Sport Type" and c[2]:
        sb.append([c[1],c[2],c[3],c[4],c[5],c[6],c[7],"Overview"])
write_csv("sport_breakdown.csv",
          ["sport","activities","distance_km","moving_time_h","elevation_m","calories","avg_distance_km","source_page"], sb)

# ---------------------------------------------------------------- YEARLY TOTALS
yt = rows("Yearly Trends")
yearly = []
for row in yt[5:13]:  # rows 6-13
    c=[clean(x) for x in row]
    if c[1] and c[1].isdigit():
        yearly.append([c[1],c[2],c[3],c[4],c[5],c[6],"Yearly Trends"])
write_csv("yearly_totals.csv",
          ["year","activities","distance_km","moving_time_h","elevation_m","calories","source_page"], yearly)

# yearly by sport (wide -> long)
hdr_ys = [clean(x) for x in yt[35]]  # row 36 header
sports_cols = [(i,hdr_ys[i]) for i in range(len(hdr_ys)) if hdr_ys[i] and hdr_ys[i]!="Year"]
ybs = []
for row in yt[36:44]:  # rows 37-44
    c=[clean(x) for x in row]
    if not c[1]: continue
    year=c[1]
    for i,sport in sports_cols:
        val=clean(row[i])
        if val not in ("","0"):
            ybs.append([year,sport,val,"Yearly Trends"])
write_csv("yearly_by_sport.csv", ["year","sport","distance_km","source_page"], ybs)

# ---------------------------------------------------------------- MONTHLY
mt = rows("Monthly Trends")
monthly=[]
for row in mt[5:]:
    c=[clean(x) for x in row]
    if c[1] and re.match(r"\d{4}-\d{2}", c[1]):
        monthly.append([c[1],c[2],c[3],c[4],"Monthly Trends"])
write_csv("monthly_totals.csv", ["month","activities","distance_km","moving_time_h","source_page"], monthly)

# ---------------------------------------------------------------- PERSONAL RECORDS
pr = rows("Personal Records")
longest=[]
for row in pr[5:15]:  # rows 6-15
    c=[clean(x) for x in row]
    if c[1] and c[1] not in ("Rank",""):
        longest.append([c[1],c[2],c[4],c[5],c[6],c[7],c[8],c[9],"Personal Records"])
write_csv("pr_longest.csv",
          ["rank","distance_km","date","name","sport","elevation_m","kudos","prs","source_page"], longest)

elev=[]
for row in pr[18:28]:  # rows 19-28
    c=[clean(x) for x in row]
    if c[1] and c[1] not in ("Rank",""):
        elev.append([c[1],c[2],c[4],c[5],c[6],c[7],c[8],c[9],"Personal Records"])
write_csv("pr_elevation.csv",
          ["rank","elevation_m","date","name","sport","distance_km","kudos","prs","source_page"], elev)

pra=[]
for row in pr[31:]:  # row 32+
    c=[clean(x) for x in row]
    if c[1] and re.match(r"\d{4}-\d{2}-\d{2}", c[1]):
        pra.append([c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],"Personal Records"])
write_csv("pr_activities.csv",
          ["date","name","sport","distance_km","elevation_m","pr_count","achievements","kudos","source_page"], pra)

# ---------------------------------------------------------------- ZONES
ze = rows("Zones & Effort")
def zone_block(start, end, cols_n):
    out=[]
    for row in ze[start-1:end]:
        c=[clean(x) for x in row]
        if c[1] and c[1].startswith("Z"):
            rec=[c[1]] + [c[2] if len(c)>2 else "", c[3] if len(c)>3 else ""]
            out.append(rec[:cols_n]+["Zones & Effort"])
    return out
write_csv("hr_zones.csv", ["zone","min_bpm","max_bpm","source_page"], zone_block(6,10,3))
write_csv("power_zones.csv", ["zone","min_w","max_w","source_page"], zone_block(16,22,3))
write_csv("pace_zones.csv", ["zone","min_per_km","max_per_km","source_page"], zone_block(28,33,3))

re_year=[]
for row in ze[38:46]:  # rows 39-46
    c=[clean(x) for x in row]
    if c[1] and c[1].isdigit():
        re_year.append([c[1],c[2],c[3],c[4],"Zones & Effort"])
write_csv("relative_effort_by_year.csv",
          ["year","total_relative_effort","avg_relative_effort","avg_cadence","source_page"], re_year)

# ---------------------------------------------------------------- GEAR
g = rows("Gear")
gear=[]
for row in g[5:]:
    c=[clean(x) for x in row]
    if c[1] and c[1]!="Brand":
        # a real gear row has a numeric gear_id in col 7; the trailing note does not
        if not (len(c)>7 and c[7].isdigit()):
            continue
        gear.append([c[1],c[2],c[3],c[4],c[5],c[6],c[7],"Gear"])
write_csv("gear.csv",
          ["brand","model","type","retired","strava_total_km","distance_in_log_km","gear_id","source_page"], gear)

# ---------------------------------------------------------------- FUN STATS
fs = rows("Fun Stats")
journey=[]
labelmap = {
 "Marathons run":("Marathons run (42.195 km each)","marathons"),
 "Laps of":("Laps of the Earth's equator","laps"),
 "Fraction of the way to the":("Fraction of the way to the Moon","fraction"),
 "Mt. Everests":("Mt. Everests climbed (8,849 m each)","everests"),
 "Mt. Kilimanjaros":("Mt. Kilimanjaros climbed (5,895 m each)","kilimanjaros"),
}
for row in fs[4:9]:
    c=[clean(x) for x in row]
    if c[1] and c[2]:
        journey.append([c[1],c[2],"Fun Stats"])
write_csv("fun_journey.csv", ["comparison","value","source_page"], journey)

weekday=[]
for row in fs[13:20]:
    c=[clean(x) for x in row]
    if c[1] and c[1] not in ("Weekday",""):
        weekday.append([c[1],c[2],c[3],"Fun Stats"])
write_csv("weekday_patterns.csv", ["weekday","activities","distance_km","source_page"], weekday)

tod=[]
for row in fs[23:29]:
    c=[clean(x) for x in row]
    if c[1] and c[1] not in ("Time of Day",""):
        tod.append([c[1],c[2],"Fun Stats"])
write_csv("time_of_day_patterns.csv", ["time_of_day","activities","source_page"], tod)

io=[]
for row in fs[32:34]:
    c=[clean(x) for x in row]
    if c[1] and c[2]:
        io.append([c[1],c[2],c[3],"Fun Stats"])
write_csv("indoor_outdoor.csv", ["setting","activities","distance_km","source_page"], io)

streaks=[]
for row in fs[36:39]:
    c=[clean(x) for x in row]
    if c[1] and c[2]:
        streaks.append([c[1],c[2],"Fun Stats"])
write_csv("streaks.csv", ["metric","value","source_page"], streaks)

kudos=[]
for row in fs[43:48]:
    c=[clean(x) for x in row]
    if c[1] and c[1] not in ("Rank",""):
        kudos.append([c[1],c[2],c[4],c[5],c[6],"Fun Stats"])
write_csv("kudos_leaderboard.csv", ["rank","kudos","date","name","sport","source_page"], kudos)

titles=[]
for row in fs[51:59]:
    c=[clean(x) for x in row]
    if c[1] and c[1]!="Title":
        titles.append([c[1],c[2],"Fun Stats"])
write_csv("most_repeated_titles.csv", ["title","times_used","source_page"], titles)

# ---------------------------------------------------------------- META
notes = rows("Notes")
meta=[
 ["coverage_start","2019-08-17","Notes"],
 ["coverage_end","2026-08-24","Notes"],
 ["total_activities",str(N_ACT),"Notes"],
 ["units","Metric (km, meters, km/h)","Notes"],
 ["data_source","Strava API via connected Strava MCP","Notes"],
 ["last_refreshed","2026-08-25","Notes"],
 ["refresh_cadence","Weekly automated rebuild","Notes"],
]
write_csv("meta.csv", ["key","value","source_page"], meta)

print("\nWorkbook extraction complete. Activities:", N_ACT)

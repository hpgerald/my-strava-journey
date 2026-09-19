#!/usr/bin/env python3
"""Phase 1 derived CSVs: comparisons.csv (then->now), timeline.csv, nav_index.csv, glossary.csv.
Numeric rows trace to a workbook sheet or the geo pass. Glossary/nav are authored content
(source_page blank / 'authored') and are logged as such in DATA_NOTES.md.
"""
import csv, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = os.environ.get("STRAVA_OUTPUT", str(ROOT / "public" / "data"))
def load(name):
    return list(csv.DictReader(open(os.path.join(OUT,name))))
def fnum(x):
    try:return float(x)
    except:return 0.0
def write(name,header,rows):
    with open(os.path.join(OUT,name),"w",newline="") as f:
        w=csv.writer(f);w.writerow(header)
        for r in rows:w.writerow(r)
    print(f"  {name:24} {len(rows)} rows")

yearly={r['year']:r for r in load('yearly_totals.csv')}
re_year={r['year']:r for r in load('relative_effort_by_year.csv')}
y0,y1="2019","2026"

# ---------- comparisons.csv (then vs now) ----------
def cmp_row(metric,cat,dim,unit,b,t,plain,src):
    b=float(b);t=float(t)
    if b==0:
        direction="New"
    elif t>=b:
        f=t/b
        direction=f"Grow x{round(f,1)}" if f<=100 else "Sharp rise"  # tiny baselines make xN meaningless
    else:
        f=b/t
        direction=f"Reduce x{round(f,1)}" if f<=100 else "Sharp drop"
    return [metric,cat,dim,f"{y0} (Aug-Dec)",round(b,1),f"{y1} (Jan-Aug)",round(t,1),unit,direction,plain,src]

comp=[]
# --- Volume / terrain (from Yearly Trends) ---
comp.append(cmp_row("Activities logged in the year","Volume","count","activities",
    yearly[y0]['activities'],yearly[y1]['activities'],
    "27 in the debut half-year. Far more in 2026 alone.","Yearly Trends"))
comp.append(cmp_row("Distance in the year","Volume","distance","km",
    yearly[y0]['distance_km'],yearly[y1]['distance_km'],
    "Yearly foot distance now dwarfs the debut year.","Yearly Trends"))
comp.append(cmp_row("Moving time in the year","Volume","time","hours",
    yearly[y0]['moving_time_h'],yearly[y1]['moving_time_h'],
    "Far more moving hours now than at the start.","Yearly Trends"))
comp.append(cmp_row("Calories burned in the year","Volume","energy","kcal",
    yearly[y0]['calories'],yearly[y1]['calories'],
    "A bigger load, measured in energy spent.","Yearly Trends"))
comp.append(cmp_row("Elevation gained in the year","Terrain","elevation","m",
    yearly[y0]['elevation_m'],yearly[y1]['elevation_m'],
    "Far more climbing now than in the early years.","Yearly Trends"))
# --- Effort (from Zones & Effort) ---
comp.append(cmp_row("Total relative effort in the year","Effort","effort","score",
    re_year[y0]['total_relative_effort'],re_year[y1]['total_relative_effort'],
    "The season's total effort. Far higher now.","Zones & Effort"))
comp.append(cmp_row("Avg relative effort per activity","Effort","effort","score",
    re_year[y0]['avg_relative_effort'],re_year[y1]['avg_relative_effort'],
    "Each session costs less now. Fitness caught up.","Zones & Effort"))
comp.append(cmp_row("Avg cadence","Effort","cadence","spm",
    re_year[y0]['avg_cadence'],re_year[y1]['avg_cadence'],
    "Higher cadence. More running in the mix.","Zones & Effort"))
# --- Recognition (computed per-year from the Activity Log) ---
def year_sum(rows, year, field):
    return sum(fnum(r[field]) for r in rows if (r.get('year')==year))
acts_all=load('activities.csv')
comp.append(cmp_row("Kudos received in the year","Recognition","kudos","kudos",
    year_sum(acts_all,y0,'kudos'),year_sum(acts_all,y1,'kudos'),
    "A bigger following now. More kudos.","Activity Log"))
comp.append(cmp_row("Segment achievements in the year","Recognition","achievements","achievements",
    year_sum(acts_all,y0,'achievements'),year_sum(acts_all,y1,'achievements'),
    "More segment badges as the efforts piled up.","Activity Log"))
# --- By sport: distance then vs now (from Yearly Trends x Sport) ---
ybs_rows=load('yearly_by_sport.csv')
def sport_dist(year, sport):
    m=[r for r in ybs_rows if r['year']==year and r['sport']==sport]
    return fnum(m[0]['distance_km']) if m else 0.0
sport_plain={
 "Walk":"Walking is the single biggest source of distance now.",
 "Run":"Running distance climbed year on year.",
 "TrailRun":"No trail running in 2019. A staple now.",
 "GravelRide":"Gravel riding spiked mid-way, then eased off.",
 "Ride":"Road riding was an early focus. It faded as the work moved to feet.",
}
sport_pretty={"Walk":"Walk","Run":"Run","TrailRun":"Trail Run","GravelRide":"Gravel Ride","Ride":"Ride"}
for sp in ["Walk","Run","TrailRun","GravelRide","Ride"]:
    comp.append(cmp_row(f"{sport_pretty[sp]} distance in the year","By sport","distance","km",
        sport_dist(y0,sp),sport_dist(y1,sp),sport_plain.get(sp,""),"Yearly Trends"))
write("comparisons.csv",
      ["metric","category","dimension","baseline_label","baseline_value","target_label","target_value","unit","direction","plain_language","source_page"],comp)

# ---------- timeline.csv ----------
acts=sorted(load('activities.csv'),key=lambda r:r['date'])
def d10(s): return (s or "").split(" ")[0].split("T")[0]   # date only
def nth_date(n):  # date of the n-th activity (1-indexed)
    return d10(acts[n-1]['date']) if len(acts)>=n else ""
countries=load('countries.csv')
geo=load('activity_geo.csv')
# first CONFIDENTLY-INTERIOR activity per foreign country (avoids border-touch artifacts)
first_country={}
for r in sorted(geo,key=lambda r:r['date']):
    c=r['country']
    if c and c!="Tanzania" and c not in first_country and r['has_gps']=='1' and r.get('interior')=='1':
        first_country[c]=d10(r['date'])

tl=[]
def t(date,label,cat,note,src): tl.append([date,label,cat,note,src])
t("2019-08-17","First Strava activity","Milestone","The first upload. Day one.","Activity Log")
t(nth_date(500),"500th activity","Milestone","Five hundred logged.","Activity Log")
t(nth_date(1000),"1,000th activity","Milestone","Into four figures.","Activity Log")
t(nth_date(1500),"1,500th activity","Milestone","Fifteen hundred. Still building.","Activity Log")
t(nth_date(2000),"2,000th activity","Milestone","Two thousand. Logged on home ground in Dar es Salaam.","Activity Log")
t("2023-02-26","Most-kudoed activity","Record","A February 2023 run pulled 125 kudos. The all-time high.","Fun Stats")
t("2025-03-29","Highest climb: 1,979 m","Record","The biggest single-activity ascent. 1,979 metres, straight up.","Personal Records")
# international debuts
names={"Kenya":"First activity in Kenya","South Africa":"First activity in South Africa",
       "Rwanda":"First activity in Rwanda","Malawi":"First activity in Malawi",
       "Saudi Arabia":"Riyadh Challenge (Saudi Arabia)","United Kingdom":"First activity in the UK"}
SKIP_TRAVEL={"Saudi Arabia","United Kingdom"}
for c,d in sorted(first_country.items(),key=lambda kv:kv[1]):
    if c in SKIP_TRAVEL: continue
    t(d,names.get(c,f"First activity in {c}"),"Travel",f"The work crossed into {c}.","Strava GPS")
t("2025-12-29","Current streak begins","Streak","The current run of unbroken days starts here.","Fun Stats")
_total = len(acts)
_streak = next((r['value'] for r in load('streaks.csv') if 'Current' in r['metric']), '')
_streak_days = (_streak or '').split()[0] if _streak else ''
t(nth_date(_total), f"{_total:,} activities and counting", "Milestone",
  f"{_total:,} logged. {_streak_days} days unbroken and counting.", "Activity Log")
tl=sorted(tl,key=lambda r:r[0])
write("timeline.csv",["date","label","category","note","source_page"],tl)

# ---------- nav_index.csv (authored structure) ----------
nav=[
 ["01","The Journey","Seven years. One habit. The totals.","/","overview","authored"],
 ["02","By the Numbers","Then against now.","/numbers","dashboard","authored"],
 ["03","Sports","What the work is made of.","/sports","section","authored"],
 ["04","Records","The far edges. Longest, highest, hardest.","/records","section","authored"],
 ["05","Where","Seven countries. Seventeen regions.","/where","geography","authored"],
 ["06","Rhythm","When. And how hard.","/rhythm","section","authored"],
 ["07","Gear","The shoes that did the miles.","/gear","section","authored"],
 ["08","Timeline","In order. First upload to now.","/timeline","timeline","authored"],
 ["09","Goals","The targets, year by year.","/goals","dashboard","authored"],
 ["10","What It Means","What the numbers say to you.","/what-it-means","personas","authored"],
]
write("nav_index.csv",["number","title","subtitle","route","category","source_page"],nav)

# ---------- glossary.csv (authored definitions) ----------
gl=[
 ["Relative Effort","Strava's measure of how hard a session was, from heart-rate time-in-zone. Higher means more cardiovascular strain."],
 ["Kudos","A thumbs-up from another Strava athlete, the platform's version of a like."],
 ["PR","Personal Record: a best-ever time over a segment or standard distance."],
 ["Achievement","A Strava badge earned on a segment (for example a top-10 or a personal best)."],
 ["Elevation gain","Total metres climbed over an activity, summed over every uphill section."],
 ["Cadence","Steps per minute when running, or pedal revolutions per minute when cycling."],
 ["Moving time","Time spent actually moving, with auto-pauses removed. Elapsed time includes stops."],
 ["FTP","Functional Threshold Power: the highest power in watts a cyclist can hold for about an hour."],
 ["Heart-rate zones","Five bands from easy (Z1) to maximal (Z5), based on max heart rate, used to gauge intensity."],
 ["Pace zones","Running speed bands in minutes per kilometre, from easy to fastest."],
 ["Trainer","An indoor session (treadmill or stationary trainer) flagged by Strava; these carry no GPS."],
 ["Relative Effort score","Same as Relative Effort; shown as a single number per activity."],
]
write("glossary.csv",["term","definition"],[[t,d] for t,d in gl])
print("derived CSVs done")

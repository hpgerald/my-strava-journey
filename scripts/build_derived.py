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
# the latest month on record in y1, so the comparison label stays true each refresh
_MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
_last=max((r['month'] for r in load('monthly_totals.csv') if r['month'].startswith(y1)),default=f"{y1}-12")
y1_span=f"Jan-{_MON[int(_last[5:7])-1]}"

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
    return [metric,cat,dim,f"{y0} (Aug-Dec)",round(b,1),f"{y1} ({y1_span})",round(t,1),unit,direction,plain,src]

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
}
sport_pretty={"Walk":"Walk","Run":"Run","TrailRun":"Trail Run"}
for sp in ["Walk","Run","TrailRun"]:
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
 ["01","The Journey","Seven years of one habit","/","overview","authored"],
 ["02","Year in Sport","Pick a year and read it","/numbers","report","authored"],
 ["03","Sports","My four sports on foot","/sports","section","authored"],
 ["04","Records","My longest, highest and hardest days","/records","section","authored"],
 ["05","Where","Five countries. Seventeen regions.","/where","geography","authored"],
 ["06","Timeline","From my first upload to now","/timeline","timeline","authored"],
 ["07","Goals","What I aim for each year","/goals","dashboard","authored"],
 ["08","What It Means","What I have learned from it","/what-it-means","personas","authored"],
 ["09","My Book","The whole story, as a book","/book","book","authored"],
]
write("nav_index.csv",["number","title","subtitle","route","category","source_page"],nav)

# ---------- glossary.csv (authored definitions) ----------
gl=[
 ["Relative Effort","Strava's score for how hard a session was, based on the time spent in each heart-rate zone. The higher it is, the harder my heart worked."],
 ["Kudos","A thumbs-up from someone on Strava, the same idea as a like."],
 ["PR","Personal record: my best time on a segment or over a set distance."],
 ["Achievement","A badge Strava gives on a segment, for a top-10 time or a personal best."],
 ["Elevation gain","All the metres climbed in an activity, added up over every uphill stretch."],
 ["Cadence","Steps per minute when running."],
 ["Moving time","The time I was actually moving, with the pauses taken out. Elapsed time includes the stops."],
 ["Heart-rate zones","Five bands from easy (Z1) to all-out (Z5), based on maximum heart rate."],
 ["Pace zones","Running speed bands in minutes per kilometre, from easy to fastest."],
 ["Trainer","An indoor session, like a treadmill run, as marked by Strava. These have no GPS."],
 ["Relative Effort score","The same as Relative Effort, shown as one number per activity."],
]
write("glossary.csv",["term","definition"],[[t,d] for t,d in gl])
print("derived CSVs done")

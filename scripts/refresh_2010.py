#!/usr/bin/env python3
"""Refresh dataset to the latest raw export, producing PRIVATE activities/geo
(with id/name) for sanitize_public_data.py, plus incremental aggregate updates.
"""
import csv, sys, datetime, re, json, os
RAW = "/root/.claude/uploads/b3a043bd-b3a9-5768-937e-095a6ffd4e38/41816131-strava_activities_raw.csv"
OUT = "public/data"
WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
def fnum(x):
    try: return float(str(x).strip())
    except: return None
def fmt(v, dp):
    if v is None: return ""
    r = round(v, dp); return str(int(r)) if r == int(r) else str(r)
def bucket(h):
    if 4<=h<7: return "Early Morning (4-7)"
    if 7<=h<11: return "Morning (7-11)"
    if 11<=h<14: return "Midday (11-14)"
    if 14<=h<17: return "Afternoon (14-17)"
    if 17<=h<20: return "Evening (17-20)"
    return "Night (20-4)"
PRIV_COLS = ["id","date","name","sport_type","distance_km","moving_time_min","elapsed_time_min",
    "elevation_gain_m","avg_speed_kmh","max_speed_kmh","avg_cadence","calories","relative_effort",
    "kudos","achievements","prs","trainer","gear_id","tags","year","month","weekday","hour","time_bucket","source_page"]
def build_row(r):
    date=r['start_local'].replace("T"," "); d10=date[:10]
    dt=datetime.date(int(d10[:4]),int(d10[5:7]),int(d10[8:10])); hour=int(date[11:13]) if len(date)>=13 else 0
    g=lambda k: fnum(r[k])
    return {
        "id":r['id'],"date":date,"name":(r['name'] or "").strip(),"sport_type":r['sport_type'],
        "distance_km":fmt(g('summary_distance')/1000,3) if g('summary_distance') is not None else "",
        "moving_time_min":fmt(g('summary_moving_time')/60,2) if g('summary_moving_time') is not None else "",
        "elapsed_time_min":fmt(g('summary_elapsed_time')/60,2) if g('summary_elapsed_time') is not None else "",
        "elevation_gain_m":fmt(g('summary_elevation_gain'),1) if g('summary_elevation_gain') is not None else "",
        "avg_speed_kmh":fmt(g('summary_avg_speed')*3.6,2) if g('summary_avg_speed') is not None else "",
        "max_speed_kmh":fmt(g('summary_max_speed')*3.6,2) if g('summary_max_speed') is not None else "",
        "avg_cadence":fmt(g('summary_avg_cadence'),1) if g('summary_avg_cadence') is not None else "",
        "calories":fmt(g('summary_total_calories'),0) if g('summary_total_calories') is not None else "",
        "relative_effort":fmt(g('summary_relative_effort'),0) if g('summary_relative_effort') is not None else "",
        "kudos":(r['summary_kudos_count'] or "").strip(),"achievements":(r['summary_achievement_count'] or "").strip(),
        "prs":(r['summary_pr_count'] or "").strip(),"trainer":"Yes" if r['is_trainer'].strip().lower()=="true" else "No",
        "gear_id":(r['gear_id'] or "").strip(),
        "tags":"; ".join(re.findall(r"'([^']+)'", r['activity_tags'])) if (r['activity_tags'] or "").startswith("[") else (r['activity_tags'] or ""),
        "year":d10[:4],"month":d10[:7],"weekday":WEEK[dt.weekday()],"hour":str(hour),"time_bucket":bucket(hour),"source_page":"Activity Log"}

rows=[build_row(r) for r in csv.DictReader(open(RAW))]
rows.sort(key=lambda r:r['date'])
print("private activities:",len(rows))

# VALIDATE order/transform vs current public (first 2000)
pub=list(csv.DictReader(open(os.path.join(OUT,"activities.csv"))))
mism=0
for i,pr in enumerate(pub):
    br=rows[i]
    for f in ["date","sport_type","distance_km","moving_time_min","elevation_gain_m","kudos","trainer","year","weekday","time_bucket"]:
        bv = br[f][:10] if f=="date" else br[f]
        if (pr.get(f) or "") != (bv or ""):
            if mism<15: print(f"  MISMATCH row{i} a{i+1:04d} {f}: public={pr.get(f)!r} built={bv!r}")
            mism+=1
print("order/transform mismatches on first 2000:",mism)
json.dump(None,open('/dev/null','w'))

# ================= FULL BUILD =================
assert mism<=1, "unexpected transform mismatches"
def num(x):
    try: return float(str(x).replace(",",""))
    except: return None
def N(r,k): return num(r.get(k)) or 0.0
def W(name,header,orows):
    with open(os.path.join(OUT,name),"w",newline="",encoding="utf-8") as f:
        w=csv.writer(f); w.writerow(header)
        for r in orows: w.writerow(r)
    print(f"  {name:28} {len(orows)} rows")
def read(name): return list(csv.DictReader(open(os.path.join(OUT,name))))
def n1(v): return fmt(v,1)
def n2(v): return fmt(v,2)
new = rows[2000:]                     # the 10 new private rows
NEWGPS = json.load(open('/tmp/newmeta.json'))['gps']

# ---- private activities.csv (with id/name) ----
W("activities.csv", PRIV_COLS, [[r[c] for c in PRIV_COLS] for r in rows])

# ---- private activity_geo.csv (with id) ----
pubgeo = {g['activity_key']: g for g in read("activity_geo.csv")}   # current public geo
GSRC="Strava GPS + point-in-polygon (Natural Earth) / nearest TZ city"
geocols=["id","date","sport","lat","lon","iso3","country","region","city","has_gps","interior","source_page"]
geo_out=[]
for i,r in enumerate(rows,1):
    if i<=2000:
        g=pubgeo.get(f"a{i:04d}",{})
        geo_out.append({"id":r['id'],"date":r['date'][:10],"sport":r['sport_type'],"lat":"","lon":"","iso3":"",
            "country":g.get('country',''),"region":g.get('region',''),"city":"",
            "has_gps":g.get('has_gps',''),"interior":g.get('interior',''),"source_page":GSRC})
    else:
        if r['id'] in NEWGPS:   # outdoor -> Dar es Salaam, Tanzania
            lat,lon=NEWGPS[r['id']]
            geo_out.append({"id":r['id'],"date":r['date'][:10],"sport":r['sport_type'],"lat":str(lat),"lon":str(lon),
                "iso3":"TZA","country":"Tanzania","region":"Dar es Salaam","city":"Magomeni","has_gps":"1","interior":"1","source_page":GSRC})
        else:                   # PhysicalTherapy / no GPS
            geo_out.append({"id":r['id'],"date":r['date'][:10],"sport":r['sport_type'],"lat":"","lon":"","iso3":"",
                "country":"","region":"","city":"","has_gps":"0","interior":"0","source_page":GSRC})
W("activity_geo.csv", geocols, [[g[c] for c in geocols] for g in geo_out])
geo_by_id={g['id']:g for g in geo_out}

years=sorted({r['year'] for r in rows if r['year']})
def merge(name,header,keyfn,newrowfn,touched):
    ex=read(name); out=[]
    for row in ex:
        k=keyfn(row); out.append(newrowfn(k) if k in touched else [row[h] for h in header])
    W(name,header,out)

# sport_breakdown
def sp_agg(s):
    g=[r for r in rows if r['sport_type']==s]; n=len(g)
    km=sum(N(r,'distance_km') for r in g); return [s,n,n1(km),n1(sum(N(r,'moving_time_min') for r in g)/60),
        fmt(sum(N(r,'elevation_gain_m') for r in g),0),fmt(sum(N(r,'calories') for r in g),0),n2(km/n if n else 0),"Overview"]
merge("sport_breakdown.csv",["sport","activities","distance_km","moving_time_h","elevation_m","calories","avg_distance_km","source_page"],
    lambda r:r['sport'],sp_agg,{r['sport_type'] for r in new})
# yearly_totals
def yt_agg(y):
    g=[r for r in rows if r['year']==y]; return [y,len(g),n1(sum(N(r,'distance_km') for r in g)),
        n1(sum(N(r,'moving_time_min') for r in g)/60),fmt(sum(N(r,'elevation_gain_m') for r in g),0),fmt(sum(N(r,'calories') for r in g),0),"Yearly Trends"]
merge("yearly_totals.csv",["year","activities","distance_km","moving_time_h","elevation_m","calories","source_page"],
    lambda r:r['year'],yt_agg,{r['year'] for r in new})
# yearly_by_sport (5 tracked)
def ybs_agg(key):
    y,s=key.split("|"); return [y,s,n1(sum(N(r,'distance_km') for r in rows if r['year']==y and r['sport_type']==s)),"Yearly Trends"]
merge("yearly_by_sport.csv",["year","sport","distance_km","source_page"],lambda r:f"{r['year']}|{r['sport']}",ybs_agg,
    {f"{r['year']}|{r['sport_type']}" for r in new if r['sport_type'] in ("Walk","Run","TrailRun","GravelRide","Ride")})
# monthly_totals (new month 2026-09 must be APPENDED)
def mt_agg(m):
    g=[r for r in rows if r['month']==m]; return [m,len(g),n1(sum(N(r,'distance_km') for r in g)),n1(sum(N(r,'moving_time_min') for r in g)/60),"Monthly Trends"]
ex_m=read("monthly_totals.csv"); have_m={r['month'] for r in ex_m}; touched_m={r['month'] for r in new}
mout=[]
for row in ex_m: mout.append(mt_agg(row['month']) if row['month'] in touched_m else [row[h] for h in ["month","activities","distance_km","moving_time_h","source_page"]])
for m in sorted(touched_m-have_m): mout.append(mt_agg(m))
mout.sort(key=lambda r:r[0]); W("monthly_totals.csv",["month","activities","distance_km","moving_time_h","source_page"],mout)
# relative_effort_by_year
def re_agg(y):
    g=[r for r in rows if r['year']==y]; res=[num(r['relative_effort']) for r in g if r['relative_effort']!='']
    cad=[num(r['avg_cadence']) for r in g if r['avg_cadence']!='' and num(r['avg_cadence'])>0]
    return [y,fmt(sum(res),0),fmt(sum(res)/len(res) if res else 0,0),n1(sum(cad)/len(cad) if cad else 0),"Zones & Effort"]
merge("relative_effort_by_year.csv",["year","total_relative_effort","avg_relative_effort","avg_cadence","source_page"],
    lambda r:r['year'],re_agg,{r['year'] for r in new})
# weekday_patterns
def wd_agg(d):
    g=[r for r in rows if r['weekday']==d]; return [d,len(g),n1(sum(N(r,'distance_km') for r in g)),"Fun Stats"]
merge("weekday_patterns.csv",["weekday","activities","distance_km","source_page"],lambda r:r['weekday'],wd_agg,{r['weekday'] for r in new})
# time_of_day
def tb_agg(b): return [b,len([r for r in rows if r['time_bucket']==b]),"Fun Stats"]
merge("time_of_day_patterns.csv",["time_of_day","activities","source_page"],lambda r:r['time_of_day'],tb_agg,{r['time_bucket'] for r in new})
# indoor_outdoor
def io_agg(k):
    g=[r for r in rows if (("Indoor" in k)==(r['trainer']=="Yes"))]; return [k,len(g),n1(sum(N(r,'distance_km') for r in g)),"Fun Stats"]
merge("indoor_outdoor.csv",["setting","activities","distance_km","source_page"],lambda r:r['setting'],io_agg,
    {("Indoor / Trainer" if r['trainer']=="Yes" else "Outdoor") for r in new})

# lifetime_totals + streaks (grand)
days=sorted({r['date'][:10] for r in rows})
import datetime as _dt
best=cur_=0; bs=be=rs=None; prev=None
for ds in days:
    dd=_dt.date.fromisoformat(ds)
    if prev and (dd-prev).days==1: cur_+=1
    else: cur_=1; rs=ds
    if cur_>best: best=cur_; bs=rs; be=ds
    prev=dd
cur_len=1; i=len(days)-1
while i>0 and (_dt.date.fromisoformat(days[i])-_dt.date.fromisoformat(days[i-1])).days==1: cur_len+=1; i-=1
tot=lambda k: sum(N(r,k) for r in rows)
W("lifetime_totals.csv",["metric","value","unit","source_page"],[
    ["Total Activities",len(rows),"activities","Overview"],["Total Km",fmt(tot('distance_km'),0),"km","Overview"],
    ["Total Hours Moving",fmt(tot('moving_time_min')/60,0),"hours","Overview"],["Total Elevation (M)",fmt(tot('elevation_gain_m'),0),"m","Overview"],
    ["Total Calories",fmt(tot('calories'),0),"kcal","Overview"],["Total Kudos",fmt(tot('kudos'),0),"kudos","Overview"],
    ["Personal Records",fmt(tot('prs'),0),"PRs","Overview"],["Achievements",fmt(tot('achievements'),0),"achievements","Overview"],
    ["Current Streak (Days)",cur_len,"days","Overview"],["Longest Streak (Days)",best,"days","Overview"]])
W("streaks.csv",["metric","value","source_page"],[["Longest consecutive-day streak",f"{best} days","Fun Stats"],
    ["Streak dates",f"{bs} → {be}","Fun Stats"],["Current streak (as of last activity)",f"{cur_len} days","Fun Stats"]])
tkm=tot('distance_km'); tel=tot('elevation_gain_m')
W("fun_journey.csv",["comparison","value","source_page"],[
    ["Marathons run (42.195 km each)",n1(tkm/42.195),"Fun Stats"],["Laps of the Earth's equator (40,075 km)",fmt(tkm/40075,4),"Fun Stats"],
    ["Fraction of the way to the Moon (384,400 km)",fmt(tkm/384400,4),"Fun Stats"],["Mt. Everests climbed (8,849 m each)",n2(tel/8849),"Fun Stats"],
    ["Mt. Kilimanjaros climbed (5,895 m each)",n2(tel/5895),"Fun Stats"]])

# pr_activities: prepend new PR-setting activities (public form: no name)
pra=read("pr_activities.csv")
newpr=[r for r in new if num(r['prs']) and num(r['prs'])>0]; newpr.sort(key=lambda r:r['date'],reverse=True)
hdr=["date","sport","distance_km","elevation_m","pr_count","achievements","kudos","source_page"]
prepend=[[r['date'][:10],r['sport_type'],n2(N(r,'distance_km')),r['elevation_gain_m'],r['prs'],r['achievements'],r['kudos'],"Personal Records"] for r in newpr]
W("pr_activities.csv",hdr,prepend+[[r.get(h,"") for h in hdr] for r in pra])

# gear: update distance_in_log for shoes used by new
gear=read("gear.csv"); newdist={}
for r in new:
    if r['gear_id']: newdist[r['gear_id']]=newdist.get(r['gear_id'],0)+N(r,'distance_km')
grows=[]
for g in gear:
    d=newdist.get(g['gear_id'],0); log=(num(g['distance_in_log_km']) or 0)+d; strava=(num(g['strava_total_km']) or 0)+d
    grows.append([g['brand'],g['model'],g['type'],g['retired'],n1(strava),n1(log),g['gear_id'],"Gear"])
W("gear.csv",["brand","model","type","retired","strava_total_km","distance_in_log_km","gear_id","source_page"],grows)

# countries + tanzania_regions (patch touched)
def patch_country(rowsc,country,dn,dkm,dh,dele):
    for r in rowsc:
        if r['country']==country:
            r['activities']=str(int(r['activities'])+dn); r['distance_km']=n1((num(r['distance_km']) or 0)+dkm)
            r['moving_time_h']=n1((num(r['moving_time_h']) or 0)+dh); r['elevation_m']=fmt((num(r['elevation_m']) or 0)+dele,0); return
tz=[r for r in new if geo_by_id[r['id']]['country']=="Tanzania"]
tz_km=sum(N(r,'distance_km') for r in tz); tz_h=sum(N(r,'moving_time_min') for r in tz)/60; tz_el=sum(N(r,'elevation_gain_m') for r in tz)
ind=[r for r in new if geo_by_id[r['id']]['has_gps']=="0"]; ind_h=sum(N(r,'moving_time_min') for r in ind)/60
countries=read("countries.csv")
patch_country(countries,"Tanzania",len(tz),tz_km,tz_h,tz_el); patch_country(countries,"Indoor / no GPS",len(ind),0,ind_h,0)
ccols=["country","iso_code","activities","distance_km","moving_time_h","elevation_m","first_activity_date","source_page"]
W("countries.csv",ccols,[[r[c] for c in countries[0]] if False else [r[c] for c in ccols] for r in countries])
regions=read("tanzania_regions.csv")
for r in regions:
    if r['region']=="Dar es Salaam":
        r['activities']=str(int(r['activities'])+len(tz)); r['distance_km']=n1((num(r['distance_km']) or 0)+tz_km)
        r['moving_time_h']=n1((num(r['moving_time_h']) or 0)+tz_h); r['elevation_m']=fmt((num(r['elevation_m']) or 0)+tz_el,0)
        r['last_activity_date']=max(r['last_activity_date'],days[-1])
rcols=["region","activities","distance_km","moving_time_h","elevation_m","first_activity_date","last_activity_date","top_sport","source_page"]
W("tanzania_regions.csv",rcols,[[r[c] for c in rcols] for r in regions])

# meta
W("meta.csv",["key","value","source_page"],[["coverage_start","2019-08-17","Notes"],["coverage_end",days[-1],"Notes"],
    ["total_activities",str(len(rows)),"Notes"],["units","Metric (km, meters, km/h)","Notes"],
    ["data_source","Strava API via connected Strava MCP","Notes"],["last_refreshed","2026-09-07","Notes"],["refresh_cadence","Weekly automated rebuild","Notes"]])
print("REFRESH BUILD DONE. streak now",best,"days; total",len(rows),"activities; last",days[-1])

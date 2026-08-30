#!/usr/bin/env python3
"""Phase 1 geo pass (v2, boundary-based).
Country = point-in-polygon against Natural Earth admin-0 (authoritative, offline).
Region  = nearest Tanzanian city (GeoNames cities1000, admin1) for points inside Tanzania.
Fallback to nearest-city country only for points outside every country polygon.
Metrics come from the workbook (source of truth), joined by activity id.
"""
import json, glob, csv, os
from pathlib import Path
import numpy as np
import polyline
from scipy.spatial import cKDTree
import pycountry
import geopandas as gpd
from shapely.geometry import Point
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parents[1]
GEO = os.environ.get("STRAVA_GEO_RAW", str(ROOT / "scripts" / "geo_raw"))
OUT = os.environ.get("STRAVA_OUTPUT", str(ROOT / "public" / "data"))
CITIES = os.environ.get("STRAVA_CITIES")
if not CITIES:
    raise SystemExit("Set STRAVA_CITIES to reverse_geocoder's rg_cities1000.csv before running this script.")

# ---- country polygons (Natural Earth 110m admin-0) ----
world = gpd.read_file(gpd.datasets.get_path('naturalearth_lowres'))
SHORT={"Tanzania":"Tanzania","Kenya":"Kenya","Malawi":"Malawi","South Africa":"South Africa",
       "Rwanda":"Rwanda","Uganda":"Uganda","Zambia":"Zambia","United Kingdom":"United Kingdom",
       "Saudi Arabia":"Saudi Arabia","United Arab Emirates":"United Arab Emirates",
       "United States of America":"United States","Burundi":"Burundi",
       "Dem. Rep. Congo":"DR Congo","Mozambique":"Mozambique"}
BUF=0.02  # ~2 km inward buffer: points within this of a border are "margin", resolved by nearest city
polys=[]
for _,row in world.iterrows():
    geom=row['geometry']
    inner=geom.buffer(-BUF)
    polys.append((row['name'], row['iso_a3'], prep(geom), prep(inner) if not inner.is_empty else None, geom))
def country_of(lat,lon):
    """returns (name, iso3, interior_confident)"""
    pt=Point(lon,lat)
    inside=[(name,iso,pin,geom) for name,iso,pg,pin,geom in polys if pg.contains(pt)]
    if not inside:
        best=None;bd=1e9
        for name,iso,pg,pin,geom in polys:
            d=geom.distance(pt)
            if d<bd: bd=d;best=(SHORT.get(name,name),iso)
        return (best[0],best[1],False) if bd<=0.15 else (None,None,False)
    if len(inside)==1:
        name,iso,pin,geom=inside[0]
        if pin is not None and pin.contains(pt):
            return SHORT.get(name,name),iso,True       # deep interior: confident
        # in outer margin: is another COUNTRY within BUF (international border) or just coastline?
        near_intl=any(g.distance(pt)<BUF for nm,i2,pg2,pin2,g in polys if nm!=name)
        if not near_intl:
            return SHORT.get(name,name),iso,True       # coastline margin only -> still confident
        cc=nearest_city_cc(lat,lon)                     # true international-border margin
        return cc_to_name(cc), cc_to_iso3(cc), False
    cc=nearest_city_cc(lat,lon)
    return cc_to_name(cc), cc_to_iso3(cc), False

# ---- TZ-only city KDTree for region assignment ----
crows=list(csv.DictReader(open(CITIES)))
tz=[r for r in crows if r['cc']=='TZ']
tz_coords=np.array([[float(r['lat']),float(r['lon'])] for r in tz])
tz_tree=cKDTree(tz_coords)
def tz_region(lat,lon):
    _,i=tz_tree.query((lat,lon)); return tz[i]['admin1'] or "Unknown", tz[i]['name']
# all-city KDTree only for country fallback naming
all_coords=np.array([[float(r['lat']),float(r['lon'])] for r in crows])
all_tree=cKDTree(all_coords)
def nearest_city_cc(lat,lon):
    _,i=all_tree.query((lat,lon)); return crows[i]['cc']
def cc_to_name(cc):
    c=pycountry.countries.get(alpha_2=cc)
    sh={"TZ":"Tanzania","KE":"Kenya","ZA":"South Africa","MW":"Malawi","RW":"Rwanda",
        "ZM":"Zambia","GB":"United Kingdom","SA":"Saudi Arabia","UG":"Uganda"}
    return sh.get(cc, c.name if c else cc)
def cc_to_iso3(cc):
    c=pycountry.countries.get(alpha_2=cc)
    return c.alpha_3 if c else ""

# ---- workbook metrics ----
wb={str(r["id"]):r for r in csv.DictReader(open(os.path.join(OUT,"activities.csv")))}
def fnum(x):
    try:return float(x)
    except:return 0.0
def metrics(aid):
    w=wb.get(aid,{});return fnum(w.get("distance_km")),fnum(w.get("moving_time_min")),fnum(w.get("elevation_gain_m"))

# ---- decode + assign ----
geo_rows=[]; changed=0
for path in sorted(glob.glob(os.path.join(GEO,"page*.json"))):
    for a in json.load(open(path))["activities"]:
        aid=str(a["id"]); pl=a.get("reduced_polyline"); w=wb.get(aid,{})
        sport=a.get("sport_type",""); date=(w.get("date") or a.get("start_local","")).split(" ")[0].split("T")[0]
        pts=[]
        if pl:
            try:pts=polyline.decode(pl)
            except:pts=[]
        if pts:
            lat,lon=pts[0]
            cname,iso3,interior=country_of(lat,lon)
            if cname is None:      # far offshore fallback
                cc=nearest_city_cc(lat,lon); cname=cc_to_name(cc); iso3=""; interior=False
            region,city = tz_region(lat,lon) if cname=="Tanzania" else ("", "")
            nc=cc_to_name(nearest_city_cc(lat,lon))
            if nc!=cname: changed+=1
            geo_rows.append(dict(id=aid,date=date,sport=sport,lat=round(lat,5),lon=round(lon,5),
                iso=iso3 or "",country=cname,region=region,city=city,gps=1,
                interior=1 if interior else 0,nc_country=nc))
        else:
            geo_rows.append(dict(id=aid,date=date,sport=sport,lat="",lon="",iso="",
                country="",region="",city="",gps=0,interior=0,nc_country=""))

with_gps=sum(r['gps'] for r in geo_rows)
print(f"total {len(geo_rows)}  gps {with_gps}  no-gps {len(geo_rows)-with_gps}")
print(f"country reassigned vs nearest-city method: {changed} activities")

# ---- activity_geo.csv ----
with open(os.path.join(OUT,"activity_geo.csv"),"w",newline="") as f:
    w=csv.writer(f); w.writerow(["id","date","sport","lat","lon","iso3","country","region","city","has_gps","interior","source_page"])
    for r in geo_rows:
        w.writerow([r["id"],r["date"],r["sport"],r["lat"],r["lon"],r["iso"],r["country"],
                    r["region"],r["city"],r["gps"],r["interior"],"Strava GPS + point-in-polygon (Natural Earth) / nearest TZ city"])

# ---- countries.csv ----
countries={}
for r in geo_rows:
    key=r["country"] if r["gps"] and r["country"] else ("Indoor / no GPS" if not r["gps"] else "Unknown")
    dist,mt,elev=metrics(r["id"])
    c=countries.setdefault(key,dict(iso=r["iso"],act=0,dist=0.0,mt=0.0,elev=0.0,first="9999"))
    c["act"]+=1;c["dist"]+=dist;c["mt"]+=mt;c["elev"]+=elev
    if r["date"] and r["date"]<c["first"]:c["first"]=r["date"]
rows=sorted(countries.items(),key=lambda kv:-kv[1]["act"])
with open(os.path.join(OUT,"countries.csv"),"w",newline="") as f:
    w=csv.writer(f);w.writerow(["country","iso_code","activities","distance_km","moving_time_h","elevation_m","first_activity_date","source_page"])
    for name,c in rows:
        w.writerow([name,c["iso"],c["act"],round(c["dist"],1),round(c["mt"]/60,1),round(c["elev"]),
                    "" if c["first"]=="9999" else c["first"],"Strava GPS + point-in-polygon (Natural Earth admin-0)"])
print("countries:",[(n,c['act']) for n,c in rows])

# ---- tanzania_regions.csv ----
regions={}
for r in geo_rows:
    if not r["gps"] or r["country"]!="Tanzania":continue
    reg=r["region"] or "Unknown"; dist,mt,elev=metrics(r["id"])
    g=regions.setdefault(reg,dict(act=0,dist=0.0,mt=0.0,elev=0.0,first="9999",last="0000",sports={}))
    g["act"]+=1;g["dist"]+=dist;g["mt"]+=mt;g["elev"]+=elev
    if r["date"] and r["date"]<g["first"]:g["first"]=r["date"]
    if r["date"] and r["date"]>g["last"]:g["last"]=r["date"]
    g["sports"][r["sport"]]=g["sports"].get(r["sport"],0)+1
rr=sorted(regions.items(),key=lambda kv:-kv[1]["act"])
with open(os.path.join(OUT,"tanzania_regions.csv"),"w",newline="") as f:
    w=csv.writer(f);w.writerow(["region","activities","distance_km","moving_time_h","elevation_m","first_activity_date","last_activity_date","top_sport","source_page"])
    for name,g in rr:
        top=max(g["sports"].items(),key=lambda kv:kv[1])[0] if g["sports"] else ""
        w.writerow([name,g["act"],round(g["dist"],1),round(g["mt"]/60,1),round(g["elev"]),g["first"],g["last"],top,"Strava GPS + point-in-polygon (Natural Earth) / nearest TZ city"])
print("TZ regions:",[(n,g['act']) for n,g in rr])

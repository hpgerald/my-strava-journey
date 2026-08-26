#!/usr/bin/env python3
"""Phase 1 validation: parse every CSV, check source_page coverage, reconcile totals,
spot-check values against the workbook."""
import csv, os, glob, openpyxl
OUT="/home/claude/my-strava-journey/public/data"
SRC="/root/.claude/uploads/b3a043bd-b3a9-5768-937e-095a6ffd4e38/157114a7-strava_deep_dive.xlsx"
ok=True
def err(m):
    global ok; ok=False; print("  FAIL:",m)

print("== parse + column consistency ==")
files=sorted(glob.glob(os.path.join(OUT,"*.csv")))
for f in files:
    rows=list(csv.reader(open(f)))
    h=rows[0]; ncol=len(h)
    bad=[i for i,r in enumerate(rows[1:],2) if len(r)!=ncol]
    print(f"  {os.path.basename(f):26} {len(rows)-1:>5} rows x {ncol} cols", "OK" if not bad else f"RAGGED {bad[:3]}")
    if bad: err(f"{f} ragged rows {bad[:5]}")

print("== source_page present on data files ==")
NEED=["activities","lifetime_totals","sport_breakdown","yearly_totals","yearly_by_sport",
      "monthly_totals","pr_longest","pr_elevation","pr_activities","hr_zones","power_zones",
      "pace_zones","relative_effort_by_year","gear","fun_journey","weekday_patterns",
      "time_of_day_patterns","indoor_outdoor","streaks","kudos_leaderboard","most_repeated_titles",
      "meta","comparisons","timeline","countries","tanzania_regions","activity_geo"]
for name in NEED:
    p=os.path.join(OUT,name+".csv")
    rows=list(csv.DictReader(open(p)))
    if "source_page" not in rows[0]: err(f"{name}: no source_page column"); continue
    blank=sum(1 for r in rows if not r["source_page"].strip())
    if blank: err(f"{name}: {blank} rows with blank source_page")
print("  all data files carry source_page on every row" if ok else "  see failures above")

print("== reconcile totals to 1996 activities ==")
def load(n): return list(csv.DictReader(open(os.path.join(OUT,n))))
def s(rows,col): return sum(float(r[col]) for r in rows if r[col])
checks={
 "activities.csv rows": len(load("activities.csv")),
 "sum(sport_breakdown.activities)": int(s(load("sport_breakdown.csv"),"activities")),
 "sum(yearly_totals.activities)": int(s(load("yearly_totals.csv"),"activities")),
 "sum(countries.activities)": int(s(load("countries.csv"),"activities")),
 "sum(weekday_patterns.activities)": int(s(load("weekday_patterns.csv"),"activities")),
 "sum(time_of_day.activities)": int(s(load("time_of_day_patterns.csv"),"activities")),
 "sum(indoor_outdoor.activities)": int(s(load("indoor_outdoor.csv"),"activities")),
}
for k,v in checks.items():
    print(f"  {k:38} = {v}", "OK" if v==1996 else "  <-- != 1996")
    if v!=1996: err(f"{k}={v}")

print("== spot-checks vs workbook ==")
wb=openpyxl.load_workbook(SRC,data_only=True)
sp={r['sport']:r for r in load("sport_breakdown.csv")}
tests=[
 ("Walk activities", sp["Walk"]["activities"], "831"),
 ("Run distance_km", sp["Run"]["distance_km"], "8083.4"),
 ("2026 yearly activities", [r for r in load("yearly_totals.csv") if r["year"]=="2026"][0]["activities"], "258"),
 ("Longest ride km", load("pr_longest.csv")[0]["distance_km"], "121.344"),
 ("Highest climb m", load("pr_elevation.csv")[0]["elevation_m"], "1979.1"),
 ("Lifetime total activities", [r for r in load("lifetime_totals.csv") if "Activities" in r["metric"]][0]["value"], "1996"),
 ("Longest streak", [r for r in load("streaks.csv") if "Longest" in r["metric"]][0]["value"], "239 days"),
 ("Top kudos", load("kudos_leaderboard.csv")[0]["kudos"], "125"),
 ("Most repeated title", load("most_repeated_titles.csv")[0]["title"], "Evening Walk"),
 ("Everests climbed", [r for r in load("fun_journey.csv") if "Everest" in r["comparison"]][0]["value"], "11.69"),
]
for label,got,exp in tests:
    print(f"  {label:26} got={got!r} exp={exp!r}", "OK" if str(got)==exp else "  MISMATCH")
    if str(got)!=exp: err(f"{label}: {got}!={exp}")

print("\nRESULT:", "ALL CHECKS PASSED" if ok else "FAILURES ABOVE")

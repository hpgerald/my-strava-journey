#!/usr/bin/env python3
"""The weather of my days (weather_days.csv) and the rains of each place
(weather_months.csv), from weather_daily.csv and the activity log.

Every day of the record gets one place: the region (or African country) where
most of that day's kilometres on foot started. A day with no place on the map,
an indoor day or a zero day, takes the place of the nearest day that has one
(the day before wins a tie). Days outside Africa, and days the weather archive
does not reach yet, are left out. A wet day is a day with 1 mm of rain or more
at the middle of the region, a heavy day 10 mm or more.

Run it in the weekly refresh after build_derived.py, and after a new
weather_daily.csv from scripts/build_weather.py:

    python3 scripts/build_weather_days.py
"""
import csv, os
import numpy as np, pandas as pd

D_ = os.path.join("public", "data")
SRC = os.path.join(D_, "weather_daily.csv")
OUT_DAYS = os.path.join(D_, "weather_days.csv")
OUT_MONTHS = os.path.join(D_, "weather_months.csv")
FOOT = {"Run", "Walk", "TrailRun", "Hike"}


def main():
    if not os.path.exists(SRC):
        print(f"no {SRC} yet: run scripts/build_weather.py first"); return
    A = pd.read_csv(os.path.join(D_, "activities.csv"))
    G = pd.read_csv(os.path.join(D_, "activity_geo.csv"))
    W = pd.read_csv(SRC); W["date"] = pd.to_datetime(W["date"])
    A = A.merge(G[["activity_key", "country", "region"]], on="activity_key", how="left")
    A["day"] = pd.to_datetime(A["date"].str[:10])
    A["foot"] = A["sport_type"].isin(FOOT); A["tread"] = A["trainer"].eq("Yes")
    A["km"] = np.where(A["foot"], pd.to_numeric(A["distance_km"], errors="coerce").fillna(0), 0)
    A["place"] = np.where(A["country"].eq("Tanzania"), A["region"], A["country"])
    placed = A[A["place"].notna()]
    # the day's place: where most of its kilometres on foot started
    dayplace = (placed.assign(w=placed["km"] + 0.01).groupby(["day", "place"])["w"].sum().reset_index()
                .sort_values(["day", "w"]).groupby("day").tail(1).set_index("day")["place"])
    days = pd.date_range(A["day"].min(), A["day"].max(), freq="D")
    known = dayplace.sort_index(); kt = known.index.values
    pos = np.searchsorted(kt, days.values)
    place = []
    for i, d in enumerate(days.values):
        cand = [kt[j] for j in (pos[i], pos[i] - 1) if 0 <= j < len(kt)]
        best = min(cand, key=lambda t: (abs(t - d), 0 if t <= d else 1))
        place.append(known[best])
    T = pd.DataFrame({"date": days, "place": place})
    g = A.groupby("day")
    T["outings"] = g.size().reindex(days, fill_value=0).values
    T["km_foot"] = g["km"].sum().reindex(days, fill_value=0).round(2).values
    T["outdoor_foot"] = A[A["foot"] & ~A["tread"]].groupby("day").size().reindex(days, fill_value=0).values
    T["indoor_foot"] = A[A["foot"] & A["tread"]].groupby("day").size().reindex(days, fill_value=0).values
    T = T.merge(W.rename(columns={"region": "place"})[["place", "date", "rain_mm", "tmax_c"]], on=["place", "date"], how="inner")
    T = T[T["rain_mm"].notna()].sort_values("date")
    T["date"] = T["date"].dt.strftime("%Y-%m-%d")
    T["source_page"] = "Open-Meteo archive, middle of the region · Activity Log"
    cols = ["date", "place", "rain_mm", "tmax_c", "outings", "km_foot", "outdoor_foot", "indoor_foot", "source_page"]
    T[cols].to_csv(OUT_DAYS, index=False, lineterminator="\n")

    # the rains of each place, month by month, over every day in the archive
    W["month"] = W["date"].dt.month
    M = W.groupby(["region", "month"]).agg(wet_share=("rain_mm", lambda s: (s >= 1).mean()), rain_mm=("rain_mm", "sum"), days=("rain_mm", "size")).reset_index()
    # the month's rain is the average over the whole months only
    W["year"] = W["date"].dt.year
    YM = W.groupby(["region", "year", "month"]).agg(mm=("rain_mm", "sum"), n=("rain_mm", "size"), dim=("date", lambda s: s.iloc[0].days_in_month)).reset_index()
    YM = YM[YM["n"] == YM["dim"]]
    tot = YM.groupby(["region", "month"]).agg(mm=("mm", "mean"), years=("year", "size")).reset_index()
    M = M.drop(columns="rain_mm").merge(tot, on=["region", "month"]).rename(columns={"mm": "rain_mm"})
    M["rain_mm"] = M["rain_mm"].round(1); M["wet_share"] = M["wet_share"].round(3)
    M = M.rename(columns={"region": "place"})
    M["source_page"] = "Open-Meteo archive, middle of the region"
    M[["place", "month", "wet_share", "rain_mm", "days", "years", "source_page"]].to_csv(OUT_MONTHS, index=False, lineterminator="\n")
    print(f"wrote {OUT_DAYS}: {len(T)} days, {T['date'].iloc[0]} to {T['date'].iloc[-1]}; {OUT_MONTHS}: {M['place'].nunique()} places")


if __name__ == "__main__":
    main()

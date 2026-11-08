#!/usr/bin/env python3
"""Build the kilometre-by-kilometre detail of the four Kilimanjaro Half Marathons.

Reads the cached Strava streams in scripts/kili_streams/:
  k<year>.json          distance, time (elapsed s) and altitude, 160 samples
  k<year>_cadence.json  cadence at 220 even steps (2024 to 2026; 2023 has none)

Writes
  public/data/kili_half_parts.csv   one row per edition: minutes up to the turn,
                                    minutes back down, the two together, km run
  public/data/kili_half_km.csv      one row per edition and course kilometre:
                                    clock minutes and the share of it run
  public/data/kili_half_course.csv  the course altitude every 250 m (2024 track)

How the course is measured. Every edition is anchored on the turn, the highest
point of the track. The way up is the 9.5 km before it and the way down the
11.6 km after it, 21.1 km in all, the same stretch of road every year whatever
the watch did before the start or after the finish. Times are clock times.

In 2023 the watch ran for about half an hour within the first 140 m, before the
start. That wait is taken out: the 134 m it covered are given the pace of the
kilometre that followed.

A stretch counts as run when the step cadence is 65 or more (per leg, as Strava
gives it); walking on this course sits between 50 and 62.

The races are historical and fixed, so this is a one-off build, not part of the
weekly refresh.
"""
import bisect, csv, json, os

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "public", "data")
YEARS = [2023, 2024, 2025, 2026]
UP_KM, DOWN_KM = 9.5, 11.6
RUN_CADENCE = 65


def interp(xs, ys, x):
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    i = bisect.bisect_right(xs, x) - 1
    t = (x - xs[i]) / (xs[i + 1] - xs[i]) if xs[i + 1] != xs[i] else 0
    return ys[i] + t * (ys[i + 1] - ys[i])


def load(year):
    s = json.load(open(os.path.join(HERE, "kili_streams", f"k{year}.json")))
    D, T, A = s["distance"], list(s["time"]), s["altitude"]
    for i in range(len(T) - 1):
        # a long wait inside the first kilometre: keep the distance, drop the wait
        if D[i] < 1000 and T[i + 1] - T[i] > 600:
            j = next(k for k in range(i + 1, len(D)) if D[k] >= D[i + 1] + 1000)
            pace = (T[j] - T[i + 1]) / (D[j] - D[i + 1])
            wait = T[i + 1] - T[i] - pace * (D[i + 1] - D[i])
            T = T[: i + 1] + [t - wait for t in T[i + 1:]]
    turn = max(range(len(A)), key=lambda i: A[i])
    return D, T, A, turn


def cadence(year):
    p = os.path.join(HERE, "kili_streams", f"k{year}_cadence.json")
    if not os.path.exists(p):
        return None
    c = json.load(open(p))
    a, L = c["cadence"], c["distance_total"]
    step = L / (len(a) - 1)
    return [(i * step, v) for i, v in enumerate(a)], step


def main():
    parts, kms = [], []
    course = None
    for y in YEARS:
        D, T, A, ti = load(y)
        turn = D[ti]
        a, b = turn - UP_KM * 1000, turn + DOWN_KM * 1000
        up = (T[ti] - interp(D, T, a)) / 60
        down = (interp(D, T, b) - T[ti]) / 60
        cad = cadence(y)
        run_km = None
        if cad:
            pts, step = cad
            run_km = sum(step for d, v in pts if a <= d < b and v >= RUN_CADENCE) / 1000
        parts.append([y, round(up, 1), round(down, 1), round(up + down, 1), UP_KM, DOWN_KM,
                      "" if run_km is None else round(run_km, 1), round(turn / 1000, 2), round(A[ti]), "Goals"])
        for k in range(21):
            d0, d1 = a + k * 1000, a + (k + 1) * 1000
            mins = (interp(D, T, d1) - interp(D, T, d0)) / 60
            share = ""
            if cad:
                pts, step = cad
                inside = [v for d, v in pts if d0 <= d < d1]
                share = round(sum(1 for v in inside if v >= RUN_CADENCE) / max(1, len(inside)), 2)
            kms.append([y, k + 1, round(mins, 2), share, "Goals"])
        if y == 2024:
            course = [[round(i * 0.25, 2), round(interp(D, A, a + i * 250))] for i in range(int(21.1 / 0.25) + 1)]

    with open(os.path.join(OUT, "kili_half_parts.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["year", "up_min", "down_min", "course_min", "up_km", "down_km", "run_km", "turn_km", "turn_alt_m", "source_page"])
        w.writerows(parts)
    with open(os.path.join(OUT, "kili_half_km.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["year", "km", "min", "run_share", "source_page"])
        w.writerows(kms)
    with open(os.path.join(OUT, "kili_half_course.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["d_km", "alt_m", "source_page"])
        w.writerows([r + ["Goals"] for r in course])
    for p in parts:
        print(p)


if __name__ == "__main__":
    main()

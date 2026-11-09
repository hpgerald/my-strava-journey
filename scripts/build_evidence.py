#!/usr/bin/env python3
"""Statistical tests behind the chapter "The Habit on Trial".

Reads public/data/activities.csv and writes public/data/evidence.json: every
number, chart series and verdict the chapter shows. Run it after the weekly
rebuild (it needs numpy, pandas, scipy, statsmodels, scikit-learn, ruptures and
lifelines). Random steps use fixed seeds, so the output is reproducible.

Weeks run Sunday to Saturday. "Active day" = a day with at least one outing.
Most tests use the days from the comeback (the first outing after the longest
gap) to the last outing.
"""
import json, math, os, warnings
import numpy as np, pandas as pd
from scipy import stats
import statsmodels.api as sm, statsmodels.formula.api as smf
from statsmodels.stats.multitest import multipletests
from sklearn.mixture import GaussianMixture
import ruptures as rpt
from lifelines import WeibullFitter

warnings.filterwarnings("ignore")
OUT = os.path.join("public", "data", "evidence.json")
A = pd.read_csv(os.path.join("public", "data", "activities.csv"))
A["dt"] = pd.to_datetime(A["date"]); A["day"] = A["dt"].dt.normalize()
FOOT = {"Run", "Walk", "TrailRun", "Hike"}
A["foot"] = A["sport_type"].isin(FOOT)
for c in ["distance_km", "moving_time_min", "elevation_gain_m", "kudos", "prs"]:
    A[c] = pd.to_numeric(A[c], errors="coerce")
A["tread"] = A["trainer"].eq("Yes")
first, last = A["day"].min(), A["day"].max()
days = pd.date_range(first, last, freq="D")
act = (A.groupby("day").size().reindex(days, fill_value=0) > 0).astype(int)

def week_start(ix):  # Sunday of the week that holds each day
    return ix - pd.to_timedelta((ix.dayofweek + 1) % 7, unit="D")

# the comeback: the first active day after the longest run of rest days
on = act[act == 1].index
gaps = (on[1:] - on[:-1]).days
COMEBACK = on[1:][int(np.argmax(gaps))]
x = act[act.index >= COMEBACK]; v = x.values; n = len(v)
R = lambda f, d=3: None if f is None or (isinstance(f, float) and math.isnan(f)) else round(float(f), d)
P = lambda p: float(f"{float(p):.3g}")
E = {"meta": {"n": int(len(A)), "first": str(first.date()), "last": str(last.date()), "comeback": str(COMEBACK.date()),
              "daysSince": int(n), "activeShare": R(v.mean(), 4), "weekStart": "Sunday"}}

# ---- 1. memory ----
L = 7
X = np.column_stack([v[L - k - 1:n - k - 1] for k in range(L)]); y = v[L:]
m1 = sm.Logit(y, sm.add_constant(X[:, :1])).fit(disp=0)
m7 = sm.Logit(y, sm.add_constant(X)).fit(disp=0)
lr = 2 * (m7.llf - m1.llf)
n1 = v.sum(); n0 = n - n1; runs = 1 + int(np.sum(v[1:] != v[:-1]))
mu = 2 * n1 * n0 / n + 1; var = (mu - 1) * (mu - 2) / (n - 1); z = (runs - mu) / math.sqrt(var)

def dfa_curve(sig, scales):
    yy = np.cumsum(sig - sig.mean()); F = []
    for s in scales:
        k = len(yy) // s; rms = []
        for i in range(k):
            seg = yy[i * s:(i + 1) * s]; t = np.arange(s); c = np.polyfit(t, seg, 1)
            rms.append(np.sqrt(np.mean((seg - np.polyval(c, t)) ** 2)))
        F.append(float(np.mean(rms)))
    return F
sc = [int(s) for s in np.unique(np.logspace(np.log10(7), np.log10(180), 15).astype(int))]
slope = lambda F: float(np.polyfit(np.log(sc), np.log(F), 1)[0])
real = dfa_curve(v.astype(float), sc); alpha = slope(real)
rng = np.random.default_rng(1); shuf = [slope(dfa_curve(rng.permutation(v).astype(float), sc)) for _ in range(200)]
rng = np.random.default_rng(1); one_shuf = dfa_curve(rng.permutation(v).astype(float), sc)
ci = m1.conf_int()
E["c1"] = {"or": R(math.exp(m1.params[1]), 2), "orLo": R(math.exp(ci[1][0]), 2), "orHi": R(math.exp(ci[1][1]), 2),
           "lr": R(lr, 2), "lrP": P(stats.chi2.sf(lr, 6)),
           "lag": [[k + 1, R(m7.params[k + 1], 3), P(m7.pvalues[k + 1])] for k in range(L)],
           "runs": runs, "runsExp": R(mu, 1), "runsZ": R(z, 2), "runsP": P(2 * stats.norm.sf(abs(z))),
           "dfa": R(alpha, 2), "dfaShuf": R(np.mean(shuf), 2), "dfaLo": R(np.percentile(shuf, 2.5), 2), "dfaHi": R(np.percentile(shuf, 97.5), 2),
           "curve": {"scales": sc, "real": real, "shuffled": one_shuf}}

# ---- 2. momentum and rust ----
rows = []; off = 0; onn = 0
for i in range(1, n):
    if v[i - 1] == 0: off += 1; onn = 0; rows.append(("gap", off, v[i]))
    else: onn += 1; off = 0; rows.append(("streak", onn, v[i]))
Rw = pd.DataFrame(rows, columns=["kind", "len", "next"])
haz = {}
for k in ["gap", "streak"]:
    d = Rw[(Rw.kind == k) & (Rw.len <= 30)]
    m = sm.Logit(d["next"], sm.add_constant(np.log(d["len"]))).fit(disp=0)
    haz[k] = (R(m.params.iloc[1], 3), P(m.pvalues.iloc[1]))
streaks = []; cur = 0
for val in v:
    if val: cur += 1
    elif cur: streaks.append((cur, 1)); cur = 0
if cur: streaks.append((cur, 0))
dd = np.array([s[0] for s in streaks]); ee = np.array([s[1] for s in streaks])
wf = WeibullFitter().fit(dd, ee); wci = wf.summary.loc["rho_", ["coef lower 95%", "coef upper 95%"]].values
def after(k, onrun):
    hits = tot = 0
    for i in range(k + 1, n):
        seg = v[i - k:i]
        if (seg.sum() == k if onrun else seg.sum() == 0) and v[i - k - 1] == (0 if onrun else 1):
            tot += 1; hits += int(v[i])
    return [k, hits, tot]
memOn = [after(k, True) for k in range(1, 15)]; memOff = [after(k, False) for k in range(1, 7)]
E["c2"] = {"streakSlope": haz["streak"][0], "streakP": haz["streak"][1], "gapSlope": haz["gap"][0], "gapP": haz["gap"][1],
           "weibull": R(wf.rho_, 2), "weibullLo": R(wci[0], 2), "weibullHi": R(wci[1], 2), "nStreaks": int(len(dd)),
           "reach14": int((dd >= 14).sum()), "memOn": memOn, "memOff": memOff}

# ---- 3. eras (Sunday weeks, whole record, last partial week left out) ----
wk = act.groupby(week_start(act.index)).sum()
if (last - wk.index[-1]).days < 6: wk = wk.iloc[:-1]
sig = wk.values.astype(float).reshape(-1, 1)
bk = rpt.Pelt(model="l2", min_size=8).fit(sig).predict(pen=3 * np.var(sig) * np.log(len(sig)))
bk2 = rpt.Binseg(model="l2", min_size=8).fit(sig).predict(n_bkps=max(1, len(bk) - 1))
cs = np.cumsum(sig.ravel() - sig.mean())
edges = [0] + bk[:-1] + [len(sig)]
segs = [[str(wk.index[a].date()), str((wk.index[b - 1] + pd.Timedelta(days=7)).date()), R(sig[a:b].mean(), 2)] for a, b in zip(edges[:-1], edges[1:])]
pb = [str(wk.index[b].date()) for b in bk[:-1]]; bb = [str(wk.index[b].date()) for b in bk2[:-1]]
gapd = [abs((pd.Timestamp(a) - pd.Timestamp(b)).days) for a, b in zip(pb, bb)]
agree = len(pb) == len(bb) and all(d <= 14 for d in gapd)
tail = 0
for val in act.values[::-1]:
    if not val: break
    tail += 1
E["c3"] = {"weeks": int(len(sig)), "pelt": pb, "binseg": bb, "cusumLow": str(wk.index[int(np.argmin(cs))].date()),
           "segments": segs, "agree": bool(agree), "gapDays": [int(d) for d in gapd],
           "streak": int(tail), "streakFrom": str((last - pd.Timedelta(days=tail - 1)).date()), "weekly": [[str(i.date()), int(s)] for i, s in wk.items()]}

# ---- 4. weekday (Sunday first) ----
y4 = x.to_frame("a"); y4["wd"] = (y4.index.dayofweek + 1) % 7  # 0 = Sunday
y4["wk"] = week_start(y4.index)
tab = y4.groupby("wd")["a"].agg(["sum", "count"])
chi = stats.chi2_contingency(np.array([tab["sum"], tab["count"] - tab["sum"]]))
Xw = sm.add_constant(pd.get_dummies(y4["wd"], prefix="d", drop_first=True).astype(float))
mw = sm.Logit(y4["a"], Xw).fit(disp=0, cov_type="cluster", cov_kwds={"groups": y4["wk"].astype("int64")})
wt = mw.wald_test(", ".join(f"{c} = 0" for c in Xw.columns if c != "const"), scalar=True)
share = (tab["sum"] / tab["count"]); best, worst = int(share.idxmax()), int(share.idxmin())
rng = np.random.default_rng(7); wks = y4["wk"].unique(); g = {k: d for k, d in y4.groupby("wk")}; diffs = []
for _ in range(2000):
    s = pd.concat([g[k] for k in rng.choice(wks, len(wks))]); r = s.groupby("wd").a.mean(); diffs.append(r[best] - r[worst])
outs = A[A.day >= COMEBACK].groupby((A["dt"].dt.dayofweek + 1) % 7).size().reindex(range(7), fill_value=0)
gof = stats.chisquare(outs.values)
E["c4"] = {"days": [[int(d), int(r["sum"]), int(r["count"])] for d, r in tab.iterrows()], "best": best, "worst": worst,
           "chi2": R(chi[0], 2), "chiP": P(chi[1]), "wald": R(float(wt.statistic), 2), "waldP": P(float(wt.pvalue)),
           "diff": R(share[best] - share[worst], 4), "diffLo": R(np.percentile(diffs, 2.5), 4), "diffHi": R(np.percentile(diffs, 97.5), 4),
           "outChi2": R(gof.statistic, 2), "outP": P(gof.pvalue)}

# ---- 5. season (full calendar years after the comeback year, up to the last full year) ----
y0, y1 = COMEBACK.year + 1, last.year - 1 if last.month < 12 or last.day < 31 else last.year
z5 = act[(act.index >= f"{y0}-01-01") & (act.index <= f"{y1}-12-31")].to_frame("a")
z5["doy"] = z5.index.dayofyear; z5["y"] = z5.index.year; z5["m"] = z5.index.month; z5["wk"] = week_start(z5.index).astype("int64")
w = 2 * np.pi * z5["doy"] / 365.25
X5 = sm.add_constant(pd.get_dummies(z5["y"], prefix="y", drop_first=True).astype(float)); X5["s1"] = np.sin(w); X5["c1"] = np.cos(w)
m5 = sm.Logit(z5["a"], X5).fit(disp=0, cov_type="cluster", cov_kwds={"groups": z5["wk"]})
w5 = m5.wald_test("s1 = 0, c1 = 0", scalar=True)
X52 = X5.copy(); X52["s2"] = np.sin(2 * w); X52["c2"] = np.cos(2 * w)
m52 = sm.Logit(z5["a"], X52).fit(disp=0); m51 = sm.Logit(z5["a"], X5).fit(disp=0)
amp = math.hypot(m5.params["s1"], m5.params["c1"]); peak = (math.atan2(m5.params["s1"], m5.params["c1"]) % (2 * math.pi)) / (2 * math.pi) * 365.25
base = m5.params["const"] + X5.drop(columns=["const", "s1", "c1"]).mean().values @ m5.params.drop(["const", "s1", "c1"]).values
lg = lambda t: 1 / (1 + math.exp(-t))
curve = [[d, R(lg(base + m5.params["s1"] * math.sin(2 * math.pi * d / 365.25) + m5.params["c1"] * math.cos(2 * math.pi * d / 365.25)), 4)] for d in range(1, 366, 5)]
ms = z5.groupby("m").a.mean()
by_year = z5.groupby(["y", "m"]).a.mean().unstack()
low_in_each = all(any(mm in by_year.loc[yy].nsmallest(3).index for mm in ms.nsmallest(2).index) for yy in by_year.index)
E["c5"] = {"years": [int(y0), int(y1)], "nDays": int(len(z5)), "wald": R(float(w5.statistic), 2), "waldP": P(float(w5.pvalue)),
           "peakDoy": int(round(peak)), "lowDoy": int(round((peak + 182.6) % 365.25)), "hi": R(lg(base + amp), 3), "lo": R(lg(base - amp), 3),
           "semiP": P(stats.chi2.sf(2 * (m52.llf - m51.llf), 2)),
           "kwP": P(stats.kruskal(*[by_year[c].values for c in by_year.columns]).pvalue),
           "friedmanP": P(stats.friedmanchisquare(*by_year.values.T).pvalue),
           "months": [[int(m), R(s, 3)] for m, s in ms.items()], "lowMonths": [int(i) for i in ms.nsmallest(2).index],
           "lowInEachYear": bool(low_in_each), "curve": curve}

# ---- 6. round numbers on the treadmill ----
d6 = A[(A.sport_type == "Run") & A.tread].distance_km.dropna()
heap = []
for target in [5, 10, 15, 21.1]:
    near = int(((d6 - target).abs() < 0.06).sum()); band = int(((d6 - target).abs() < 0.56).sum()); p0 = 0.06 / 0.56
    heap.append([target, near, band, R(band * p0, 1), P(stats.binomtest(near, band, p0, alternative="greater").pvalue) if band else 1.0])
F = A[A.foot & (A.distance_km > 0.5)]; lk = np.log(F.distance_km.values).reshape(-1, 1)
bics = []; narrow = None
for k in [1, 2, 3, 4]:
    gm = GaussianMixture(k, random_state=1, n_init=5).fit(lk); bics.append([k, R(gm.bic(lk), 1)])
    if k == 3: j = int(np.argmin(gm.covariances_.ravel())); narrow = [R(math.exp(gm.means_.ravel()[j]), 2), R(math.sqrt(gm.covariances_.ravel()[j]), 4)]
h6, ed = np.histogram(d6, bins=np.arange(1.95, 22.06, 0.1))
E["c6"] = {"nTread": int(len(d6)), "heap": heap, "bic": bics, "narrow": narrow,
           "hist": [[R(e + 0.05, 2), int(c)] for e, c in zip(ed[:-1], h6)]}

# ---- 7. treadmill pace ----
FF = A[A.foot & (A.distance_km > 0.5) & (A.moving_time_min > 0)].copy()
FF["pace"] = FF.moving_time_min / FF.distance_km; FF["mpk"] = FF.elevation_gain_m / FF.distance_km
T = FF[(FF.sport_type == "Run") & FF.tread & FF.distance_km.between(3, 25) & FF.pace.between(3, 12)].copy(); T["yr"] = T.dt.dt.year
cy = int(last.year); py = cy - 1; y_from = int(COMEBACK.year)
Tt = T[T.yr.between(y_from, py)].copy(); Tt["t"] = (Tt.dt - Tt.dt.min()).dt.days / 365.25
ts = stats.theilslopes(Tt.pace, Tt.t); kt = stats.kendalltau(Tt.t, Tt.pace)
md = smf.ols("pace ~ t + np.log(distance_km)", Tt).fit(cov_type="HC3")
a7, b7 = T[T.yr == py].pace, T[T.yr == cy].pace
mwu = stats.mannwhitneyu(a7, b7) if len(a7) and len(b7) else None
E["c7"] = {"n": int(len(T)), "from": y_from, "prev": py, "cur": cy,
           "byYear": [[int(yy), R(g.pace.quantile(.25), 2), R(g.pace.median(), 2), R(g.pace.quantile(.75), 2), int(len(g))] for yy, g in T.groupby("yr")],
           "slope": R(ts.slope, 2), "slopeLo": R(ts.low_slope, 2), "slopeHi": R(ts.high_slope, 2), "tau": R(kt.statistic, 2), "tauP": P(kt.pvalue),
           "slopeHeld": R(md.params["t"], 2), "slopeHeldP": P(md.pvalues["t"]),
           "prevMed": R(a7.median(), 2), "curMed": R(b7.median(), 2), "nPrev": int(len(a7)), "nCur": int(len(b7)),
           "mwuP": P(mwu.pvalue) if mwu else None}

# ---- 8 and 9. climb and pace ----
def climb(df):
    df = df.copy(); df["yr"] = df.dt.dt.year.astype(str)
    m = smf.ols("pace ~ mpk + np.log(distance_km) + C(yr)", df).fit(cov_type="HC3")
    sp = stats.spearmanr(df.pace, df.mpk); d0 = df.copy(); d0["mpk"] = 0
    return m, sp, float(m.predict(d0).mean())
Wk = FF[FF.sport_type.isin(["Walk", "Hike"]) & ~FF.tread & FF.pace.between(6, 40) & (FF.mpk < 250)]
mw8, sp8, i8 = climb(Wk)
Ru = FF[FF.sport_type.isin(["Run", "TrailRun"]) & ~FF.tread & FF.pace.between(3, 20) & (FF.mpk < 150)].copy()
Ru2 = Ru.copy(); Ru2["trail"] = (Ru2.sport_type == "TrailRun").astype(int); Ru2["yr"] = Ru2.dt.dt.year.astype(str)
mr9 = smf.ols("pace ~ mpk + trail + np.log(distance_km) + C(yr)", Ru2).fit(cov_type="HC3"); sp9 = stats.spearmanr(Ru.pace, Ru.mpk)
c8 = mw8.conf_int().loc["mpk"]; c9 = mr9.conf_int().loc["mpk"]
E["c8"] = {"n": int(len(Wk)), "slope": R(mw8.params["mpk"], 4), "lo": R(c8[0], 4), "hi": R(c8[1], 4), "p": P(mw8.pvalues["mpk"]),
           "rho": R(sp8.statistic, 2), "rhoP": P(sp8.pvalue), "r2": R(mw8.rsquared, 2), "intercept": R(i8, 2),
           "flatMed": R(Wk[Wk.mpk < 10].pace.median(), 1), "steepMed": R(Wk[Wk.mpk >= 40].pace.median(), 1), "nSteep": int((Wk.mpk >= 40).sum()),
           "pts": [[R(a, 1), R(b, 2)] for a, b in zip(Wk.mpk, Wk.pace)]}
E["c9"] = {"n": int(len(Ru)), "slope": R(mr9.params["mpk"], 3), "lo": R(c9[0], 3), "hi": R(c9[1], 3), "p": P(mr9.pvalues["mpk"]),
           "rho": R(sp9.statistic, 2), "rhoP": P(sp9.pvalue), "trail": R(mr9.params["trail"], 2), "trailP": P(mr9.pvalues["trail"]),
           "pts": [[R(a, 1), R(b, 2), int(t)] for a, b, t in zip(Ru2.mpk, Ru2.pace, Ru2.trail)]}

# ---- 10. running and walking (Sunday weeks since the comeback) ----
W10 = A[(A.day >= COMEBACK) & A.foot].copy(); W10["wk"] = week_start(pd.DatetimeIndex(W10["day"]))
g10 = W10.pivot_table(index="wk", columns="sport_type", values="distance_km", aggfunc="sum", fill_value=0)
allw = pd.DatetimeIndex(sorted(set(week_start(x.index))))
g10 = g10.reindex(allw, fill_value=0)
if (last - g10.index[-1]).days < 6: g10 = g10.iloc[:-1]  # leave out a partial last week
run = (g10.get("Run", 0) + g10.get("TrailRun", 0)).astype(float); walk = g10.get("Walk", pd.Series(0, index=g10.index)).astype(float)
r_raw = stats.spearmanr(run, walk); r_d = stats.spearmanr(np.diff(run), np.diff(walk))
rr = run - run.rolling(13, center=True, min_periods=5).mean(); ww = walk - walk.rolling(13, center=True, min_periods=5).mean(); mm = rr.notna() & ww.notna()
r_t = stats.spearmanr(rr[mm], ww[mm])
E["c10"] = {"weeks": int(len(run)), "rho": R(r_raw.statistic, 2), "p": P(r_raw.pvalue), "rhoDiff": R(r_d.statistic, 2), "pDiff": P(r_d.pvalue),
            "rhoTrend": R(r_t.statistic, 2), "pTrend": P(r_t.pvalue), "detect": R(1.96 / math.sqrt(len(run)), 2),
            "pts": [[R(a, 1), R(b, 1)] for a, b in zip(run, walk)]}

# ---- 11. long days ----
dkm = A[A.foot].groupby("day").distance_km.sum().reindex(days, fill_value=0); k11 = dkm[dkm.index >= COMEBACK]; nx = x.shift(-1)
lgd = k11 >= 21; bs = (x == 1) & ~lgd
a1, a0 = nx[lgd].dropna(), nx[bs].dropna()
fe = stats.fisher_exact([[a1.sum(), len(a1) - a1.sum()], [a0.sum(), len(a0) - a0.sum()]])
nk = k11.shift(-1); kl, ko = nk[lgd & (nx == 1)].dropna(), nk[bs & (nx == 1)].dropna()
wkm = k11.groupby(week_start(k11.index)).sum().iloc[1:-1]
big = wkm >= wkm.quantile(0.9); nxt = wkm.shift(-1)
E["c11"] = {"km": 21, "long": [int(a1.sum()), int(len(a1))], "other": [int(a0.sum()), int(len(a0))], "or": R(fe.statistic, 2), "p": P(fe.pvalue),
            "kmLong": R(kl.median(), 1), "kmOther": R(ko.median(), 1), "kmP": P(stats.mannwhitneyu(kl, ko).pvalue),
            "ac1": R(np.corrcoef(wkm[:-1], wkm[1:])[0, 1], 2), "afterBig": R((nxt[big] / wkm[big]).median(), 2)}

# ---- 12. kudos ----
K = A[A.dt.dt.year >= 2022].copy(); K["lk"] = np.log1p(K.kudos); K["km"] = K.distance_km.fillna(0); K["el"] = K.elevation_gain_m.fillna(0)
K["sp"] = np.where(K.foot, K.sport_type, "Other"); K["yr"] = K.dt.dt.year.astype(str); K["pr"] = (K.prs > 0).astype(int); K["wkend"] = (K.dt.dt.dayofweek >= 5).astype(int)
mk = smf.ols('lk ~ np.log1p(km) + np.log1p(el) + C(sp, Treatment("Walk")) + pr + wkend + C(yr)', K).fit(cov_type="HC3"); ck = mk.conf_int()
names = [('C(sp, Treatment("Walk"))[T.TrailRun]', "Trail run against a walk"), ('C(sp, Treatment("Walk"))[T.Run]', "Run against a walk"),
         ('C(sp, Treatment("Walk"))[T.Hike]', "Hike against a walk"), ('C(sp, Treatment("Walk"))[T.Other]', "Others against a walk"),
         ("wkend", "On a weekend"), ("pr", "Set a PR"), ("np.log1p(km)", "Twice the distance"), ("np.log1p(el)", "Twice the climb")]
kud = []
for key, lab in names:
    if key not in mk.params: continue
    f = (lambda t: 2 ** t - 1) if "log1p" in key else (lambda t: math.exp(t) - 1)
    kud.append([lab, R(f(mk.params[key]) * 100, 1), R(f(ck.loc[key, 0]) * 100, 1), R(f(ck.loc[key, 1]) * 100, 1), P(mk.pvalues[key])])
med_k = A.groupby(A.dt.dt.year).kudos.median()
E["c12"] = {"n": int(len(K)), "r2": R(mk.rsquared, 3), "effects": kud, "medBefore": [R(med_k.get(yy, 0), 0) for yy in range(int(first.year), 2022)],
            "medFrom": [R(med_k[med_k.index >= 2022].min(), 0), R(med_k[med_k.index >= 2022].max(), 0)]}

# ---- correction for many tests, and verdicts ----
H = [("Habit memory, likelihood ratio", E["c1"]["lrP"]), ("Runs test", E["c1"]["runsP"]), ("Streak momentum", E["c2"]["streakP"]),
     ("Rust after breaks", E["c2"]["gapP"]), ("Weekday, clustered", E["c4"]["waldP"]), ("Season, clustered", E["c5"]["waldP"])]
H += [(f"{t[0]:g} km on the treadmill", t[4]) for t in E["c6"]["heap"]]
H += [("Treadmill pace trend", E["c7"]["tauP"]), (f"Treadmill {cy} against {py}", E["c7"]["mwuP"] or 1.0), ("Climb and walking pace", E["c8"]["p"]),
      ("Climb and running pace", E["c9"]["rhoP"]), ("Running and walking", E["c10"]["p"]), ("Running and walking, week to week", E["c10"]["pDiff"]), ("Out the day after a long day", E["c11"]["p"]),
      ("Distance the day after a long day", E["c11"]["kmP"]), ("Kudos, trail run against walk", next((k[4] for k in kud if k[0] == "Trail run against a walk"), 1.0))]
rej, padj, _, _ = multipletests([h[1] for h in H], method="holm")
E["holm"] = [[h[0], h[1], P(min(1, pa)), bool(r)] for h, pa, r in zip(H, padj, rej)]
adj = {h[0]: (P(min(1, pa)), bool(r)) for h, pa, r in zip(H, padj, rej)}
ok = lambda name: adj[name][1]
c = E
V = {}
V["c1"] = "proven" if ok("Habit memory, likelihood ratio") and ok("Runs test") and c["c1"]["dfa"] > c["c1"]["dfaHi"] else "supported" if ok("Habit memory, likelihood ratio") else "not"
V["c2"] = "proven" if ok("Streak momentum") and ok("Rust after breaks") and c["c2"]["streakSlope"] > 0 and c["c2"]["gapSlope"] < 0 and c["c2"]["weibullHi"] < 1 else "supported" if ok("Streak momentum") else "not"
V["c3"] = "proven" if c["c3"]["agree"] else "supported"
V["c4"] = "proven" if ok("Weekday, clustered") and c["c4"]["diffLo"] > 0 else "supported" if c["c4"]["chiP"] < 0.05 else "not"
V["c5"] = ("proven" if c["c5"]["kwP"] < 0.05 else "supported") if ok("Season, clustered") else "not"
heap_ok = [ok(f"{t:g} km on the treadmill") for t in [5, 10, 15]]
V["c6"] = "proven" if all(heap_ok) else "supported" if any(heap_ok) else "not"
V["c7"] = "proven" if ok("Treadmill pace trend") and ok(f"Treadmill {cy} against {py}") and c["c7"]["curMed"] < c["c7"]["prevMed"] and c["c7"]["slope"] > 0 else "supported" if ok("Treadmill pace trend") else "not"
V["c8"] = "proven" if ok("Climb and walking pace") and c["c8"]["slope"] > 0 and c["c8"]["rhoP"] < 0.05 else "not"
V["c9"] = "proven" if ok("Climb and running pace") and c["c9"]["rho"] > 0 and c["c9"]["slope"] > 0 else "not"
V["c10"] = "not" if (ok("Running and walking, week to week") and c["c10"]["rhoDiff"] < 0) or (ok("Running and walking") and c["c10"]["rho"] < 0) else "supported"
V["c11"] = "proven" if ok("Out the day after a long day") and ok("Distance the day after a long day") else "supported" if ok("Distance the day after a long day") or ok("Out the day after a long day") else "not"
kd = {k[0]: k for k in kud}
V["c12"] = "proven" if ok("Kudos, trail run against walk") and kd["Twice the distance"][4] >= 0.05 and kd["Twice the climb"][4] >= 0.05 else "supported" if ok("Kudos, trail run against walk") else "not"
E["verdicts"] = V
E["holmAdj"] = {k: v[0] for k, v in adj.items()}

with open(OUT, "w") as f:
    json.dump(E, f, separators=(",", ":"), default=lambda o: o.item() if hasattr(o, "item") else str(o))
print(f"wrote {OUT}: {E['meta']['n']} activities, comeback {E['meta']['comeback']}, verdicts {V}")

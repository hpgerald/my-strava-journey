import { toNum } from './format.js'

// Everything the Sports page says about the four sports on foot, computed in one
// pass over the activity log so every sentence built on it stays true on every
// refresh. Run is split by where it happened (treadmill or outdoors), because the
// two behave like different sports; walks, trail runs and hikes stay whole.
export const SPORTS = ['Run', 'Walk', 'TrailRun', 'Hike']
export const SPORT_NAME = { Run: 'Run', Walk: 'Walk', TrailRun: 'Trail run', Hike: 'Hike' }
export const MODES = ['tread', 'road', 'trail', 'walk', 'hike']
export const MODE_NAME = { tread: 'Treadmill run', road: 'Outdoor run', trail: 'Trail run', walk: 'Walk', hike: 'Hike' }
export const MODE_SHORT = { tread: 'Treadmill', road: 'Outdoors', trail: 'Trail', walk: 'Walk', hike: 'Hike' }
export const HALF = 21.0975
// a treadmill kilometre logged faster than 3:30 is almost certainly a belt or
// sensor misreading, so those runs stay in the counts and distances but are left
// out of every pace figure
export const TREAD_MIN = 3.5

const modeOf = (a) => (a.sport_type === 'Run' ? (a.trainer === 'Yes' ? 'tread' : 'road') : a.sport_type === 'TrailRun' ? 'trail' : a.sport_type === 'Walk' ? 'walk' : 'hike')
const median = (v) => q(v, 0.5)
function q(vals, p) {
  const s = vals.filter(Number.isFinite).sort((a, b) => a - b)
  if (!s.length) return 0
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i)
  return s[lo] + (s[hi] - s[lo]) * (i - lo)
}
function fit(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy }
  const slope = sxx ? sxy / sxx : 0
  return { n, slope, intercept: my - slope * mx, r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0 }
}
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)
const parseT = (s) => Date.parse(String(s).replace(' ', 'T') + (String(s).length > 10 ? 'Z' : 'T00:00:00Z'))

export function buildFootReport(activities) {
  const all = activities.filter((a) => a.date)
  const foot = []
  for (const a of all) {
    if (!SPORTS.includes(a.sport_type)) continue
    const km = toNum(a.distance_km) || 0, min = toNum(a.moving_time_min) || 0
    const t = parseT(a.date)
    foot.push({
      key: a.activity_key, sport: a.sport_type, mode: modeOf(a), date: a.date.slice(0, 10), t,
      year: Number(a.year), hour: Number(a.hour), weekday: a.weekday,
      km, min, elev: toNum(a.elevation_gain_m) || 0, pace: km > 0.2 && min > 0 ? min / km : null,
      kudos: toNum(a.kudos) || 0, prs: toNum(a.prs) || 0, effort: a.relative_effort === '' || a.relative_effort == null ? null : toNum(a.relative_effort),
    })
  }
  foot.sort((x, y) => x.t - y.t)
  const years = [...new Set(foot.map((f) => f.year))].sort((a, b) => a - b)
  const lastISO = all.reduce((m, a) => (a.date > m ? a.date : m), '').slice(0, 10)
  const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0)

  const total = { n: foot.length, all: all.length, km: sum(foot, 'km'), elev: sum(foot, 'elev'), hours: sum(foot, 'min') / 60, days: new Set(foot.map((f) => f.date)).size, kudos: sum(foot, 'kudos'), prs: sum(foot, 'prs') }

  // ---- the four sports ----
  const sport = {}
  for (const s of SPORTS) {
    const r = foot.filter((f) => f.sport === s)
    sport[s] = { n: r.length, km: sum(r, 'km'), elev: sum(r, 'elev'), hours: sum(r, 'min') / 60, kudos: sum(r, 'kudos'), prs: sum(r, 'prs'), medKm: median(r.map((f) => f.km)), medMin: median(r.map((f) => f.min)) }
  }

  // ---- the five ways of moving ----
  const mode = {}
  for (const k of MODES) {
    const r = foot.filter((f) => f.mode === k)
    const paces = r.map((f) => f.pace).filter((p) => p != null && p >= (k === 'tread' ? TREAD_MIN : 2) && p < 40)
    const rated = r.filter((f) => f.effort != null && f.min > 0)
    const hours24 = new Array(24).fill(0)
    for (const f of r) if (f.hour >= 0 && f.hour < 24) hours24[f.hour]++
    const longest = r.reduce((b, f) => (!b || f.km > b.km ? f : b), null)
    const steepest = r.reduce((b, f) => (!b || f.elev > b.elev ? f : b), null)
    mode[k] = {
      n: r.length, km: sum(r, 'km'), elev: sum(r, 'elev'), hours: sum(r, 'min') / 60,
      pace: { p25: q(paces, 0.25), med: q(paces, 0.5), p75: q(paces, 0.75), values: paces },
      medKm: median(r.map((f) => f.km)), medMin: median(r.map((f) => f.min)),
      mPerKm: sum(r, 'km') ? sum(r, 'elev') / sum(r, 'km') : 0,
      weekend: r.length ? r.filter((f) => f.weekday === 'Saturday' || f.weekday === 'Sunday').length / r.length : 0,
      night: r.length ? r.filter((f) => f.hour >= 20 || f.hour < 5).length / r.length : 0,
      hours24, longest, steepest,
      effortN: rated.length, effortPerHour: rated.length ? sum(rated, 'effort') / (sum(rated, 'min') / 60) : 0,
      kudosPer: r.length ? sum(r, 'kudos') / r.length : 0, prsPer: r.length ? sum(r, 'prs') / r.length : 0,
    }
  }

  // ---- year by year ----
  const byYear = years.map((y) => {
    const r = foot.filter((f) => f.year === y)
    const km = {}, n = {}
    for (const s of SPORTS) { const rs = r.filter((f) => f.sport === s); km[s] = sum(rs, 'km'); n[s] = rs.length }
    const tr = r.filter((f) => f.mode === 'tread'), rd = r.filter((f) => f.mode === 'road')
    const walks = r.filter((f) => f.sport === 'Walk')
    const long = {}
    for (const k of MODES) long[k] = r.filter((f) => f.mode === k && f.km >= HALF).length
    const trPace = tr.map((f) => f.pace).filter((p) => p != null && p >= TREAD_MIN && p < 20)
    return {
      year: y, km, n, treadKm: sum(tr, 'km'), roadKm: sum(rd, 'km'), treadN: tr.length, roadN: rd.length,
      treadPace: tr.length >= 10 ? { p25: q(trPace, 0.25), med: q(trPace, 0.5), p75: q(trPace, 0.75), n: trPace.length } : null,
      walkN: walks.length, walkMed: median(walks.map((f) => f.km)), walkShort: walks.length ? walks.filter((f) => f.km < 3).length / walks.length : 0,
      walkKms: walks.map((f) => f.km), long, longN: Object.values(long).reduce((s, v) => s + v, 0),
    }
  })

  // ---- the treadmill's round numbers ----
  const tread = foot.filter((f) => f.mode === 'tread')
  const near = (v, step) => Math.abs(v - Math.round(v / step) * step) <= 0.1
  const treadBins = []
  const treadMax = Math.ceil(Math.max(0, ...tread.map((f) => f.km)))
  for (let k = 1; k <= treadMax; k++) treadBins.push({ km: k, count: tread.filter((f) => Math.round(f.km) === k).length })
  const roundFive = tread.length ? tread.filter((f) => f.km >= 4.9 && near(f.km, 5)).length / tread.length : 0
  const roundOne = tread.length ? tread.filter((f) => near(f.km, 1)).length / tread.length : 0
  const roadRoundOne = foot.filter((f) => f.mode === 'road').length ? foot.filter((f) => f.mode === 'road' && near(f.km, 1)).length / foot.filter((f) => f.mode === 'road').length : 0

  // ---- run and walk on the same day ----
  const byDay = new Map()
  for (const f of foot) { if (!byDay.has(f.date)) byDay.set(f.date, []); byDay.get(f.date).push(f) }
  const doubles = { total: 0, runFirst: 0, walkFirst: 0, perYear: Object.fromEntries(years.map((y) => [y, 0])), gaps: [] }
  for (const [d, rows] of byDay) {
    const run = rows.filter((f) => f.sport === 'Run' || f.sport === 'TrailRun'), walk = rows.filter((f) => f.sport === 'Walk')
    if (!run.length || !walk.length) continue
    doubles.total++; doubles.perYear[Number(d.slice(0, 4))]++
    const r0 = run[0], w0 = walk[0]
    if (r0.t < w0.t) {
      doubles.runFirst++
      const w = walk.find((x) => x.t > r0.t)
      doubles.gaps.push((w.t - r0.t) / 60000 - r0.min)
    } else {
      doubles.walkFirst++
      const r = run.find((x) => x.t > w0.t)
      doubles.gaps.push((r.t - w0.t) / 60000 - w0.min)
    }
  }
  const gapBins = [
    { label: 'Under 30 min', short: '<30m', lo: -1e9, hi: 30 },
    { label: '30 to 90 min', short: '30-90m', lo: 30, hi: 90 },
    { label: '1.5 to 4 h', short: '1.5-4h', lo: 90, hi: 240 },
    { label: '4 to 8 h', short: '4-8h', lo: 240, hi: 480 },
    { label: '8 h or more', short: '8h+', lo: 480, hi: 1e9 },
  ].map((b) => ({ ...b, n: doubles.gaps.filter((g) => g >= b.lo && g < b.hi).length }))
  doubles.gapBins = gapBins
  doubles.medGap = median(doubles.gaps)

  // ---- climbs ----
  const climbs = foot.filter((f) => f.elev > 0).sort((a, b) => b.elev - a.elev).slice(0, 8)

  // ---- the maths: treadmill pace against distance, and weekly run against walk ----
  const tp = tread.filter((f) => f.pace != null && f.pace >= TREAD_MIN && f.pace < 12 && f.km >= 1)
  const oddTread = tread.filter((f) => f.pace != null && f.pace < TREAD_MIN).length
  // the median pace of the treadmill's favourite stopping points
  const treadAt = [5, 10, 15, 21].map((k) => { const r = tp.filter((f) => Math.round(f.km) === k); return { km: k, n: r.length, pace: median(r.map((f) => f.pace)) } })
  const treadFit = { ...fit(tp.map((f) => f.km), tp.map((f) => f.pace)), points: tp.map((f) => ({ x: f.km, y: f.pace })) }
  const wk = new Map()
  const habitStart = foot.find((f) => f.year >= 2021)
  const w0 = habitStart ? Math.floor((dayIdx(habitStart.date) - 4) / 7) : 0
  const wLast = Math.floor((dayIdx(lastISO) - 4) / 7)
  for (let w = w0; w <= wLast; w++) wk.set(w, { run: 0, walk: 0 })
  for (const f of foot) {
    const w = Math.floor((dayIdx(f.date) - 4) / 7)
    if (!wk.has(w)) continue
    if (f.sport === 'Run' || f.sport === 'TrailRun') wk.get(w).run += f.km
    else if (f.sport === 'Walk') wk.get(w).walk += f.km
  }
  const weeks = [...wk.values()]
  const weekFit = { ...fit(weeks.map((w) => w.run), weeks.map((w) => w.walk)), points: weeks.map((w) => ({ x: w.run, y: w.walk })) }

  // ---- streaks per sport ----
  const streakOf = (pred) => {
    const ds = [...new Set(foot.filter(pred).map((f) => dayIdx(f.date)))].sort((a, b) => a - b)
    let best = { len: 0, start: null, end: null }, run = 0, st = null
    for (let i = 0; i < ds.length; i++) {
      if (i && ds[i] - ds[i - 1] === 1) run++; else { run = 1; st = ds[i] }
      if (run > best.len) best = { len: run, start: st, end: ds[i] }
    }
    const iso = (d) => (d == null ? null : new Date(d * DAY).toISOString().slice(0, 10))
    return { len: best.len, startISO: iso(best.start), endISO: iso(best.end) }
  }
  const streak = { run: streakOf((f) => f.sport === 'Run' || f.sport === 'TrailRun'), walk: streakOf((f) => f.sport === 'Walk') }

  const mostKudos = foot.reduce((b, f) => (!b || f.kudos > b.kudos ? f : b), null)
  const mostPrs = foot.reduce((b, f) => (!b || f.prs > b.prs ? f : b), null)

  return { rows: foot, total, sport, mode, years, byYear, lastISO, treadBins, roundFive, roundOne, roadRoundOne, doubles, climbs, treadFit, treadAt, oddTread, weekFit, streak, mostKudos, mostPrs }
}

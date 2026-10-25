import { toNum } from './format.js'
import { MODES } from './footReport.js'

// Everything the Records page says, computed from the activity log on every
// load: how each record moved over time, the biggest single outings, days,
// weeks and months, the milestones, the streaks, the Kilimanjaro Half (kept for
// the record book; its story is on Goals), and how often a record broke against what chance would give.
// Distance and climb are on foot only (run, walk, trail run, hike).
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const DAY = 86400000
const EVEREST = 8849
const modeOf = (a) => (a.sport_type === 'Run' ? (a.trainer === 'Yes' ? 'tread' : 'road') : a.sport_type === 'TrailRun' ? 'trail' : a.sport_type === 'Walk' ? 'walk' : 'hike')
const parseT = (s) => Date.parse(String(s).replace(' ', 'T') + (String(s).length > 10 ? 'Z' : 'T00:00:00Z'))
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)
const isoOf = (i) => new Date(i * DAY).toISOString().slice(0, 10)
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// each time a running best was beaten, in order
function progression(rows, key) {
  let best = -Infinity
  const out = []
  for (const r of rows) if (r[key] > best) { best = r[key]; out.push(r) }
  return out
}
const harmonic = (n) => { let h = 0; for (let k = 1; k <= n; k++) h += 1 / k; return h }

function longestRun(days) {
  let best = { len: 0, start: null, end: null }, run = 0, st = null
  for (let i = 0; i < days.length; i++) {
    if (i && days[i] - days[i - 1] === 1) run++; else { run = 1; st = days[i] }
    if (run > best.len) best = { len: run, start: st, end: days[i] }
  }
  return best
}
// every unbroken run of days, longest first
function runsOf(days) {
  const out = []
  let st = days[0]
  for (let i = 1; i <= days.length; i++) {
    if (i < days.length && days[i] - days[i - 1] === 1) continue
    out.push({ start: st, end: days[i - 1], len: days[i - 1] - st + 1 })
    if (i < days.length) st = days[i]
  }
  return out.sort((a, b) => b.len - a.len)
}

export function buildRecordReport(activities, geo = {}, kili = []) {
  const all = activities.filter((a) => a.date).map((a) => ({ ...a, t: parseT(a.date) })).sort((a, b) => a.t - b.t)
  const foot = all.filter((a) => FOOT.has(a.sport_type)).map((a) => {
    const g = geo[a.activity_key] || {}
    return {
      key: a.activity_key, sport: a.sport_type, mode: modeOf(a), date: a.date.slice(0, 10), t: a.t, year: Number(a.year),
      km: toNum(a.distance_km) || 0, elev: toNum(a.elevation_gain_m) || 0, min: toNum(a.moving_time_min) || 0,
      kudos: toNum(a.kudos) || 0, prs: toNum(a.prs) || 0, region: g.country === 'Tanzania' ? g.region || null : null, country: g.country || null,
    }
  })
  const lastISO = all.length ? all[all.length - 1].date.slice(0, 10) : ''
  const n = foot.length

  // ---- record progressions and what chance would give ----
  const distProg = progression(foot, 'km')
  const climbProg = progression(foot.filter((f) => f.elev > 0), 'elev')
  const expected = harmonic(n)
  const climbN = foot.filter((f) => f.elev > 0).length
  const standing = (prog) => {
    const last = prog[prog.length - 1]
    return { since: last.date, days: dayIdx(lastISO) - dayIdx(last.date), outingsSince: foot.filter((f) => f.t > last.t).length }
  }
  // how long each record stood before the next beat it (the last is still standing)
  const stood = (prog) => prog.map((r, i) => ({ ...r, days: (i < prog.length - 1 ? dayIdx(prog[i + 1].date) : dayIdx(lastISO)) - dayIdx(r.date), standing: i === prog.length - 1 }))
  const sportRecords = Object.fromEntries(['Run', 'Walk', 'TrailRun', 'Hike'].map((s) => {
    const rows = foot.filter((f) => f.sport === s)
    return [s, { n: rows.length, broken: progression(rows, 'km').length, expected: harmonic(rows.length) }]
  }))

  // ---- the top of each list ----
  const longest = foot.slice().sort((a, b) => b.km - a.km).slice(0, 10)
  const climbs = foot.slice().sort((a, b) => b.elev - a.elev).slice(0, 10)
  const over30 = foot.filter((f) => f.km >= 30)
  const halfUp = foot.filter((f) => f.km >= 21.0975)

  // ---- days, weeks, months ----
  const byDay = new Map()
  for (const f of foot) {
    const d = byDay.get(f.date) || { date: f.date, km: 0, elev: 0, n: 0, min: 0, modes: new Set() }
    d.km += f.km; d.elev += f.elev; d.n++; d.min += f.min; d.modes.add(f.mode); byDay.set(f.date, d)
  }
  const days = [...byDay.values()]
  const topDaysKm = days.slice().sort((a, b) => b.km - a.km).slice(0, 6)
  const topDaysClimb = days.slice().sort((a, b) => b.elev - a.elev).slice(0, 6)
  const wkOf = (iso) => Math.floor((dayIdx(iso) - 4) / 7) // weeks run Monday to Sunday
  const byWeek = new Map()
  for (const f of foot) { const w = wkOf(f.date); const x = byWeek.get(w) || { w, km: 0, elev: 0, n: 0 }; x.km += f.km; x.elev += f.elev; x.n++; byWeek.set(w, x) }
  const weekStart = (w) => isoOf(w * 7 + 4)
  const topWeeksKm = [...byWeek.values()].sort((a, b) => b.km - a.km).slice(0, 6).map((x) => ({ ...x, start: weekStart(x.w) }))
  const byMonth = new Map()
  for (const f of foot) { const k = f.date.slice(0, 7); const x = byMonth.get(k) || { month: k, km: 0, elev: 0, n: 0 }; x.km += f.km; x.elev += f.elev; x.n++; byMonth.set(k, x) }
  const months = [...byMonth.values()]
  const topMonthsKm = months.slice().sort((a, b) => b.km - a.km).slice(0, 6)
  const topMonthsClimb = months.slice().sort((a, b) => b.elev - a.elev).slice(0, 6)
  const monthName = (k) => `${MON[parseInt(k.slice(5, 7), 10) - 1]} ${k.slice(0, 4)}`

  // ---- milestones: kilometres and Everests ----
  let ck = 0, ce = 0
  const kmMarks = [1000, 2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000]
  const kmHit = [], evHit = []
  const cum = []
  for (const f of foot) {
    ck += f.km; ce += f.elev
    cum.push({ t: f.t, km: ck, elev: ce })
    while (kmHit.length < kmMarks.length && ck >= kmMarks[kmHit.length]) kmHit.push({ mark: kmMarks[kmHit.length], date: f.date })
    while (ce >= EVEREST * (evHit.length + 1)) evHit.push({ k: evHit.length + 1, date: f.date })
  }
  const firstISO = foot.length ? foot[0].date : lastISO
  const kmMiles = kmHit.map((m, i) => ({ ...m, days: dayIdx(m.date) - dayIdx(i ? kmHit[i - 1].date : firstISO) }))
  const everests = evHit.map((m, i) => ({ ...m, days: dayIdx(m.date) - dayIdx(i ? evHit[i - 1].date : firstISO) }))

  // ---- firsts ----
  const firstOf = (pred) => foot.find(pred) || null
  const firsts = [
    { label: 'First 10 km', f: firstOf((f) => f.km >= 10) },
    { label: 'First half marathon', f: firstOf((f) => f.km >= 21.0975) },
    { label: 'First 30 km', f: firstOf((f) => f.km >= 30) },
    { label: 'First 500 m climbed', f: firstOf((f) => f.elev >= 500) },
    { label: 'First trail run', f: firstOf((f) => f.sport === 'TrailRun') },
    { label: 'First marathon', f: firstOf((f) => f.km >= 42.195) },
    { label: 'First hike', f: firstOf((f) => f.sport === 'Hike') },
    { label: 'First 1,000 m climbed', f: firstOf((f) => f.elev >= 1000) },
    { label: 'First outing abroad', f: firstOf((f) => f.country && f.country !== 'Tanzania') },
    { label: 'First outdoor half', f: firstOf((f) => f.km >= 21.0975 && f.mode !== 'tread') },
    { label: 'First walk of a half', f: firstOf((f) => f.sport === 'Walk' && f.km >= 21.0975) },
  ].filter((x) => x.f).sort((a, b) => a.f.t - b.f.t)

  // ---- streaks ----
  const allDays = [...new Set(all.map((a) => dayIdx(a.date)))].sort((a, b) => a - b)
  const footDays = [...new Set(foot.map((f) => dayIdx(f.date)))].sort((a, b) => a - b)
  const daysOf = (pred) => [...new Set(foot.filter(pred).map((f) => dayIdx(f.date)))].sort((a, b) => a - b)
  const lastDay = dayIdx(lastISO)
  const current = (ds) => { if (!ds.length || ds[ds.length - 1] < lastDay) return 0; let s = ds.length - 1; while (s > 0 && ds[s] - ds[s - 1] === 1) s--; return ds[ds.length - 1] - ds[s] + 1 }
  const weeks = [...new Set(all.map((a) => wkOf(a.date)))].sort((a, b) => a - b)
  const wkBest = longestRun(weeks)
  const gaps = []
  for (let i = 1; i < allDays.length; i++) gaps.push({ len: allDays[i] - allDays[i - 1] - 1, from: isoOf(allDays[i - 1]), to: isoOf(allDays[i]) })
  const longGap = gaps.reduce((b, g) => (g.len > b.len ? g : b), { len: 0 })
  const sOut = (b) => ({ len: b.len, startISO: b.start == null ? null : isoOf(b.start), endISO: b.end == null ? null : isoOf(b.end) })
  const streaks = {
    any: { ...sOut(longestRun(allDays)), current: current(allDays) },
    foot: { ...sOut(longestRun(footDays)), current: current(footDays) },
    run: sOut(longestRun(daysOf((f) => f.sport === 'Run' || f.sport === 'TrailRun'))),
    walk: sOut(longestRun(daysOf((f) => f.sport === 'Walk'))),
    week: { len: wkBest.len, startISO: weekStart(wkBest.start), endISO: isoOf(wkBest.end * 7 + 10), current: weeks[weeks.length - 1] === wkOf(lastISO) ? (() => { let s = weeks.length - 1; while (s > 0 && weeks[s] - weeks[s - 1] === 1) s--; return weeks.length - s })() : 0 },
    longGap,
    top: runsOf(allDays).slice(0, 8).map((r) => ({ len: r.len, startISO: isoOf(r.start), endISO: isoOf(r.end), current: r.end === lastDay })),
  }

  // ---- personal records (Strava segment bests) ----
  const years = [...new Set(foot.map((f) => f.year))].sort((a, b) => a - b)
  const prByYear = years.map((y) => { const r = foot.filter((f) => f.year === y); const p = r.reduce((s, f) => s + f.prs, 0); return { year: y, prs: p, n: r.length, rate: r.length ? p / r.length : 0 } })
  const prTotal = foot.reduce((s, f) => s + f.prs, 0)
  const prOutings = foot.filter((f) => f.prs > 0).length
  const topPr = foot.slice().sort((a, b) => b.prs - a.prs || b.t - a.t).slice(0, 6)
  const topKudos = foot.slice().sort((a, b) => b.kudos - a.kudos).slice(0, 6)

  // ---- the same race every year ----
  const race = kili.map((k) => ({ year: Number(k.year), date: k.date, km: toNum(k.distance_km), min: toNum(k.moving_min), elapsed: toNum(k.elapsed_min), elev: toNum(k.elevation_m), kudos: toNum(k.kudos) }))
    .filter((k) => k.min > 0).sort((a, b) => a.year - b.year)
  for (const r of race) { const f = foot.find((x) => x.date === r.date && Math.abs(x.km - r.km) < 0.3); r.prs = f ? f.prs : null }

  // ---- where: the biggest climb in each region of Tanzania ----
  const regionBest = new Map()
  for (const f of foot) if (f.region && (!regionBest.has(f.region) || f.elev > regionBest.get(f.region).elev)) regionBest.set(f.region, f)
  const regions = [...regionBest.values()].sort((a, b) => b.elev - a.elev)
  const top20 = foot.slice().sort((a, b) => b.elev - a.elev).slice(0, 20)
  const top20Regions = {}
  for (const f of top20) { const k = f.region || 'Other'; top20Regions[k] = (top20Regions[k] || 0) + 1 }

  return {
    n, lastISO, firstISO, foot, cum,
    distProg, climbProg, expected, climbExpected: harmonic(climbN), climbN, distStood: stood(distProg), climbStood: stood(climbProg),
    distStanding: standing(distProg), climbStanding: standing(climbProg), sportRecords,
    longest, climbs, over30, halfUp, topDaysKm, topDaysClimb, topWeeksKm, topMonthsKm, topMonthsClimb, monthName,
    kmMiles, everests, firsts, streaks, prByYear, prTotal, prOutings, topPr, topKudos, race, regions, top20Regions,
    modes: MODES,
  }
}

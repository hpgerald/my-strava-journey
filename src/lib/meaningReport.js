import { toNum } from './format.js'

// Everything the What It Means page says, computed from the activity log. The
// page reads the record back as lessons: what the habit costs in time, why the
// days matter more than the distance, the small days that kept it going, the
// weekly floor, how long days arrive, and the maths of a yearly distance.
// Distance is on foot only (run, walk, trail run, hike); any activity counts as
// a day out.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const RUN = new Set(['Run', 'TrailRun'])
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)
const isoOf = (i) => new Date(i * DAY).toISOString().slice(0, 10)
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
export const SMALL_KM = 2
export const LONG_KM = 21
export const LONG_RUN_KM = 15

export function buildMeaningReport(activities) {
  const acts = activities.filter((a) => a.date).map((a) => ({
    date: a.date.slice(0, 10), year: Number(a.year), sport: a.sport_type,
    km: FOOT.has(a.sport_type) ? toNum(a.distance_km) || 0 : 0,
    min: toNum(a.moving_time_min) || 0,
  })).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (!acts.length) return null
  const firstISO = acts[0].date
  const lastISO = acts[acts.length - 1].date
  const first = dayIdx(firstISO), last = dayIdx(lastISO)
  const lastYear = Number(lastISO.slice(0, 4))

  const byDay = new Map()
  for (const a of acts) { const i = dayIdx(a.date); if (!byDay.has(i)) byDay.set(i, []); byDay.get(i).push(a) }
  const kmOn = (i) => (byDay.get(i) || []).reduce((s, a) => s + a.km, 0)

  // the habit begins the day the longest silence ends
  const actDays = [...byDay.keys()].sort((a, b) => a - b)
  let gap = 0, habit = first
  for (let k = 1; k < actDays.length; k++) { const g = actDays[k] - actDays[k - 1]; if (g > gap) { gap = g; habit = actDays[k] } }
  const habitDays = last - habit + 1

  // ---- the cost: time on the move ----
  const totalMin = acts.reduce((s, a) => s + a.min, 0)
  const habitMin = acts.filter((a) => dayIdx(a.date) >= habit).reduce((s, a) => s + a.min, 0)
  const years = [...new Set(acts.map((a) => a.year))].sort((a, b) => a - b)
  const perYear = years.map((y) => {
    const rows = acts.filter((a) => a.year === y)
    const y0 = dayIdx(`${y}-01-01`)
    const ndays = y === lastYear ? last - y0 + 1 : isLeap(y) ? 366 : 365
    const days = new Set(rows.map((a) => a.date))
    const km = rows.reduce((s, a) => s + a.km, 0)
    const min = rows.reduce((s, a) => s + a.min, 0)
    const small = [...days].filter((d) => kmOn(dayIdx(d)) < SMALL_KM).length
    const long = [...days].filter((d) => kmOn(dayIdx(d)) >= LONG_KM).length
    return { year: y, ndays, partial: y === lastYear && ndays < (isLeap(y) ? 366 : 365), days: days.size, km, min, minPerDay: min / ndays, kmPerDay: km / ndays, kmPerActive: days.size ? km / days.size : 0, share: days.size / ndays, small, long }
  })

  // ---- the small days ----
  const habitAct = actDays.filter((i) => i >= habit)
  const dayKms = habitAct.map((i) => kmOn(i))
  const smallDays = habitAct.filter((i) => kmOn(i) < SMALL_KM)
  const habitKm = dayKms.reduce((s, v) => s + v, 0)
  const smallKm = smallDays.reduce((s, i) => s + kmOn(i), 0)
  const kindOf = (i) => {
    const r = byDay.get(i)
    if (r.some((a) => FOOT.has(a.sport))) return 'foot'
    if (r.some((a) => /Ride/.test(a.sport))) return 'ride'
    if (r.some((a) => a.sport === 'PhysicalTherapy')) return 'physio'
    if (r.some((a) => a.sport === 'Workout' || a.sport === 'WeightTraining')) return 'gym'
    return 'other'
  }
  const smallKinds = {}
  for (const i of smallDays) { const k = kindOf(i); smallKinds[k] = (smallKinds[k] || 0) + 1 }
  const nextAfterSmall = smallDays.filter((i) => i < last)
  const smallNextActive = nextAfterSmall.filter((i) => byDay.has(i + 1)).length / Math.max(1, nextAfterSmall.length)
  const smallNextKm = nextAfterSmall.reduce((s, i) => s + kmOn(i + 1), 0) / Math.max(1, nextAfterSmall.length)
  let rest = 0, restNext = 0
  for (let i = habit; i < last; i++) if (!byDay.has(i)) { rest++; if (byDay.has(i + 1)) restNext++ }
  const restNextActive = restNext / Math.max(1, rest)
  let habitAll = 0
  for (let i = habit; i <= last; i++) habitAll += kmOn(i)
  const avgDayKm = habitAll / habitDays

  // ---- weeks, Monday to Sunday, on foot ----
  const weeks = []
  const monday = (i) => { const d = new Date(i * DAY); return i - ((d.getUTCDay() + 6) % 7) }
  for (let w = monday(habit); w <= last; w += 7) {
    let km = 0
    for (let k = 0; k < 7; k++) km += kmOn(w + k)
    const full = w + 6 <= last && w >= habit
    weeks.push({ start: isoOf(w), year: Number(isoOf(w + 3).slice(0, 4)), km, full })
  }
  const fullWeeks = weeks.filter((w) => w.full)
  const q = (v, p) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))]
  const weekYears = years.filter((y) => fullWeeks.some((w) => w.year === y) && fullWeeks.filter((w) => w.year === y).length >= 20).map((y) => {
    const v = fullWeeks.filter((w) => w.year === y).map((w) => w.km).sort((a, b) => a - b)
    return { year: y, weeks: fullWeeks.filter((w) => w.year === y), n: v.length, min: v[0], max: v[v.length - 1], q25: q(v, 0.25), med: q(v, 0.5), q75: q(v, 0.75), under10: v.filter((x) => x < 10).length }
  })

  // ---- long days and what came after ----
  const longDays = habitAct.filter((i) => kmOn(i) >= LONG_KM && i < last)
  const echo = []
  for (let o = -3; o <= 7; o++) {
    const pts = longDays.filter((i) => i + o >= habit && i + o <= last)
    echo.push({ o, km: pts.reduce((s, i) => s + kmOn(i + o), 0) / Math.max(1, pts.length) })
  }
  const longNextActive = longDays.filter((i) => byDay.has(i + 1)).length
  const longRuns = habitAct.filter((i) => i < last && byDay.get(i).some((a) => RUN.has(a.sport) && a.km >= LONG_RUN_KM)).map((i) => {
    const t = byDay.get(i + 1) || []
    const next = !t.length ? 'rest' : t.some((a) => RUN.has(a.sport)) ? 'run' : t.some((a) => FOOT.has(a.sport)) ? 'walk' : 'other'
    return { date: isoOf(i), next }
  })

  return {
    firstISO, lastISO, lastYear, gap, habitISO: isoOf(habit), habitDays, totalMin, habitMin, perYear,
    habitActive: habitAct.length, dayKms, smallDays: smallDays.length, smallKm, habitKm, smallKinds, smallNextActive, smallNextKm, restNextActive, avgDayKm,
    weekYears, longDays: longDays.length, longNextActive, echo, longRuns,
  }
}

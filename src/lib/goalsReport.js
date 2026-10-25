import { toNum } from './format.js'

// Everything the Goals page says, from the activity log and the two race and
// challenge tables. The same three targets are held against every year: 1,000 km
// walked, 1,000 km run (road, treadmill and trail) and 24,000 m climbed on foot.
export const TARGETS = [
  { key: 'walk', label: 'Walking', unit: 'km', target: 1000, ring: 'gwalk' },
  { key: 'run', label: 'Running', unit: 'km', target: 1000, ring: 'grun' },
  { key: 'elev', label: 'Climbing', unit: 'm', target: 24000, ring: 'gelev' },
]
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const RUN = new Set(['Run', 'TrailRun'])
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

export function buildGoalsReport(activities, kili = [], profile = [], rasKilomoni = []) {
  const acts = activities.filter((a) => a.date).map((a) => ({
    date: a.date.slice(0, 10), year: Number(a.year), sport: a.sport_type,
    walk: a.sport_type === 'Walk' ? toNum(a.distance_km) || 0 : 0,
    run: RUN.has(a.sport_type) ? toNum(a.distance_km) || 0 : 0,
    elev: FOOT.has(a.sport_type) ? toNum(a.elevation_gain_m) || 0 : 0,
    km: FOOT.has(a.sport_type) ? toNum(a.distance_km) || 0 : 0,
    dist: toNum(a.distance_km) || 0, min: toNum(a.moving_time_min) || 0, prs: toNum(a.prs) || 0, trainer: a.trainer === 'Yes', kudos: toNum(a.kudos) || 0,
  })).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (!acts.length) return null
  const lastISO = acts[acts.length - 1].date
  const lastYear = Number(lastISO.slice(0, 4))

  // ---- each year, day by day, against the three targets ----
  const years = [...new Set(acts.map((a) => a.year))].sort((a, b) => a - b)
  const byYear = years.map((y) => {
    const ndays = isLeap(y) ? 366 : 365
    const d0 = dayIdx(`${y}-01-01`)
    const daily = { walk: new Array(ndays).fill(0), run: new Array(ndays).fill(0), elev: new Array(ndays).fill(0) }
    for (const a of acts) if (a.year === y) { const i = dayIdx(a.date) - d0; for (const k of ['walk', 'run', 'elev']) daily[k][i] += a[k] }
    const upTo = y === lastYear ? dayIdx(lastISO) - d0 + 1 : ndays
    const out = { year: y, ndays, upTo, partial: y === lastYear && upTo < ndays }
    for (const t of TARGETS) {
      const cum = []
      let s = 0, closed = null
      for (let i = 0; i < upTo; i++) { s += daily[t.key][i]; cum.push(s); if (closed == null && s >= t.target) closed = i }
      out[t.key] = { total: s, cum, closed, daily: daily[t.key].slice(0, upTo), share: s / t.target }
    }
    return out
  })
  const cur = byYear[byYear.length - 1]
  const daysLeft = cur.ndays - cur.upTo

  // ---- will the open rings close this year? a resampling of this year's days ----
  // each simulated finish adds `daysLeft` days drawn at random from the days of
  // the year so far (rest days included), many times over
  let seed = 20260101
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const sims = {}
  for (const t of TARGETS) {
    const c = cur[t.key]
    if (!cur.partial || c.total >= t.target) { sims[t.key] = null; continue }
    const pool = c.daily
    const N = 4000
    const finals = new Array(N)
    for (let k = 0; k < N; k++) { let s = c.total; for (let d = 0; d < daysLeft; d++) s += pool[Math.floor(rnd() * pool.length)]; finals[k] = s }
    finals.sort((a, b) => a - b)
    const hit = finals.filter((v) => v >= t.target).length / N
    sims[t.key] = { finals, hit, p10: finals[Math.floor(N * 0.1)], p50: finals[Math.floor(N * 0.5)], p90: finals[Math.floor(N * 0.9)], needPerDay: (t.target - c.total) / Math.max(1, daysLeft), perDay: c.total / Math.max(1, cur.upTo) }
  }

  // ---- the Kilimanjaro Half: each edition along the same course ----
  const race = kili.map((k) => ({ year: Number(k.year), date: k.date, km: toNum(k.distance_km), moving: toNum(k.moving_min), elapsed: toNum(k.elapsed_min), elev: toNum(k.elevation_m), kudos: toNum(k.kudos) }))
    .filter((r) => r.moving > 0).sort((a, b) => a.year - b.year)
  for (const r of race) {
    const bins = profile.filter((p) => Number(p.year) === r.year).map((p) => ({ d: toNum(p.dist_km), alt: toNum(p.rel_alt_m), sec: toNum(p.pace_sec) })).sort((a, b) => a.d - b.d)
    // time through each half-kilometre bin, scaled so the whole matches moving time
    const raw = bins.map((b) => b.sec * 0.5)
    const tot = raw.reduce((s, v) => s + v, 0) || 1
    let t = 0
    r.track = bins.map((b, i) => { t += (raw[i] / tot) * r.moving * 60; return { d: b.d + 0.25, alt: b.alt, t } })
    r.track.unshift({ d: 0, alt: bins.length ? bins[0].alt : 0, t: 0 })
    r.stopped = Math.max(0, r.elapsed - r.moving)
    const f = acts.find((x) => x.date === r.date && Math.abs(x.dist - r.km) < 0.3)
    r.prs = f ? f.prs : null
  }
  // an edition is raced only once its course profile is in
  for (let i = race.length - 1; i >= 0; i--) if (race[i].track.length < 3) race.splice(i, 1)
  // where every edition stood when the quickest one crossed the line
  const quickest = race.reduce((b, r) => (!b || r.moving < b.moving ? r : b), null)
  const posAt = (r, sec) => {
    const tr = r.track
    if (!tr || !tr.length) return 0
    if (sec >= tr[tr.length - 1].t) return tr[tr.length - 1].d
    for (let i = 1; i < tr.length; i++) if (tr[i].t >= sec) { const f = (sec - tr[i - 1].t) / (tr[i].t - tr[i - 1].t || 1); return tr[i - 1].d + f * (tr[i].d - tr[i - 1].d) }
    return 0
  }
  const courseKm = race.length && race[0].track.length ? race[0].track[race[0].track.length - 1].d : 21.1
  for (const r of race) r.atQuickest = quickest ? posAt(r, quickest.moving * 60) : 0

  // ---- Ras Kilomoni: fifty trips to one headland ----
  const rk = rasKilomoni.map((r) => ({ n: Number(r.day), roman: r.roman, date: r.date, sport: r.sport, km: toNum(r.distance_km) })).sort((a, b) => a.n - b.n)
  const sortedAll = acts.slice()
  const outingNo = (date) => sortedAll.filter((a) => a.date <= date).length

  // ---- every calendar month since the first ----
  const months = []
  const m0 = acts[0].date.slice(0, 7), m1 = lastISO.slice(0, 7)
  for (let y = Number(m0.slice(0, 4)), mo = Number(m0.slice(5, 7)); `${y}-${String(mo).padStart(2, '0')}` <= m1; mo === 12 ? (mo = 1, y++) : mo++) {
    const key = `${y}-${String(mo).padStart(2, '0')}`
    const rows = acts.filter((a) => a.date.slice(0, 7) === key)
    months.push({ key, year: y, mo, n: rows.length, km: rows.reduce((s, a) => s + a.km, 0) })
  }
  let streak = 0
  for (let i = months.length - 1; i >= 0 && months[i].n > 0; i--) streak++
  const streakFrom = months[months.length - streak]
  const century = months.filter((m) => m.km >= 100)

  // ---- two one-off goals: the marathon and the stage race ----
  const marathon = acts.filter((a) => RUN.has(a.sport) && a.dist >= 42.195).sort((a, b) => a.min - b.min)[0] || null
  // the longest run of back-to-back days that each held a run of 24.5 km or more
  const bigDays = [...new Set(acts.filter((a) => RUN.has(a.sport) && a.dist >= 24.5).map((a) => a.date))].sort()
  let stage = null
  for (let i = 0, j = 0; i < bigDays.length; i = j) {
    j = i + 1
    while (j < bigDays.length && dayIdx(bigDays[j]) - dayIdx(bigDays[j - 1]) === 1) j++
    if (j - i >= 3 && (!stage || j - i > stage.days.length)) {
      const days = bigDays.slice(i, j).map((d) => acts.filter((a) => a.date === d && RUN.has(a.sport) && a.dist >= 24.5).reduce((b, a) => (a.dist > b.dist ? a : b)))
      stage = { days, km: days.reduce((s2, a) => s2 + a.dist, 0), min: days.reduce((s2, a) => s2 + a.min, 0) }
    }
  }

  const topKudos = Math.max(0, ...acts.map((a) => a.kudos))

  return { topKudos, marathon, stage, lastISO, lastYear, years, byYear, cur, daysLeft, sims, race, quickest, courseKm, rk, outingNo, months, streak, streakFrom, century }
}

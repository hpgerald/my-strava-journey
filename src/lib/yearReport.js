import { toNum } from './format.js'
import { lorenz, topShare, mean, sd } from './stats.js'

// Everything the Year in Sport report needs beyond the shared year stats:
// the rhythm of the days, the spread of the distances, the habit's memory and
// where the year happened. One pass over the year's activities; every figure is
// computed, so the words built on top of it stay true on every refresh.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso + 'T00:00:00Z') / DAY)
const isoOf = (i) => new Date(i * DAY).toISOString().slice(0, 10)

export function buildYearReport(year, acts, geo, recordFirstISO, recordLastISO) {
  const ya = acts.filter((a) => Number(a.year) === year)
  const num = (a, k) => toNum(a[k]) || 0
  const foot = ya.filter((a) => FOOT.has(a.sport_type))

  // the window this year can be judged on: from Jan 1 (or the first ever day) to
  // Dec 31 (or the latest day on record, for the year still running)
  const y0 = Math.max(dayIdx(`${year}-01-01`), dayIdx(recordFirstISO))
  const y1 = Math.min(dayIdx(`${year}-12-31`), dayIdx(recordLastISO))
  const span = Math.max(1, y1 - y0 + 1)
  const perDay = new Map()
  for (const a of ya) { const d = (a.date || '').slice(0, 10); if (d) perDay.set(d, (perDay.get(d) || 0) + 1) }
  // how many outings each active day held: one, two, three or more
  const multi = { one: 0, two: 0, more: 0 }
  for (const c of perDay.values()) { if (c === 1) multi.one++; else if (c === 2) multi.two++; else multi.more++ }
  const active = new Array(span).fill(0)
  for (const d of perDay.keys()) { const i = dayIdx(d) - y0; if (i >= 0 && i < span) active[i] = 1 }

  // gaps between outings: the next day, two days later, three or more
  const days = [...perDay.keys()].sort()
  let g1 = 0, g2 = 0, g3 = 0
  let longGap = { len: 0, from: null, to: null }
  for (let i = 1; i < days.length; i++) {
    const d = dayIdx(days[i]) - dayIdx(days[i - 1])
    if (d === 1) g1++; else if (d === 2) g2++; else g3++
    if (d - 1 > longGap.len) longGap = { len: d - 1, from: days[i - 1], to: days[i] }
  }
  // the habit's memory inside the year: chance of a day out after a day out (p11)
  // and after a rest day (p01)
  let n11 = 0, n1 = 0, n01 = 0, n0 = 0
  for (let i = 0; i < span - 1; i++) {
    if (active[i]) { n1++; if (active[i + 1]) n11++ } else { n0++; if (active[i + 1]) n01++ }
  }
  const p11 = n1 ? n11 / n1 : 0
  const p01 = n0 ? n01 / n0 : 0

  // the spread of the distances: daily foot km, the decile split, the Gini
  const dayKm = new Map()
  for (const a of foot) { const d = (a.date || '').slice(0, 10); if (d) dayKm.set(d, (dayKm.get(d) || 0) + num(a, 'distance_km')) }
  const dk = [...dayKm.values()].filter((v) => v > 0)
  const lz = dk.length > 10 ? lorenz(dk) : null
  const sorted = dk.slice().sort((a, b) => a - b)
  const deciles = (() => {
    if (sorted.length < 20) return null
    const tot = sorted.reduce((s, v) => s + v, 0) || 1
    const sh = new Array(10).fill(0)
    sorted.forEach((v, i) => { sh[Math.min(9, Math.floor((i * 10) / sorted.length))] += v / tot })
    return sh
  })()

  // the year's longest outing on foot against every other one: how many standard
  // deviations out it sits
  const outings = foot.map((a) => num(a, 'distance_km')).filter((v) => v >= 0.5)
  const tail = (() => {
    if (outings.length < 25) return null
    const mu = mean(outings), s = sd(outings), mark = Math.max(...outings)
    const below = outings.filter((v) => v < mark).length
    const pc = (100 * below) / outings.length
    const best = foot.reduce((b, a) => (num(a, 'distance_km') > num(b, 'distance_km') ? a : b), foot[0])
    return { values: outings, mean: mu, sd: s, mark, z: s ? (mark - mu) / s : 0, pct: `${pc.toFixed(pc >= 99.9 ? 2 : 1)}th percentile`, sport: best.sport_type, date: (best.date || '').slice(0, 10) }
  })()

  // steadiness: how much the weekly distance swings around its own average
  const wk = new Map()
  for (const a of foot) { const i = dayIdx((a.date || '').slice(0, 10)); const w = Math.floor((i - 4) / 7); wk.set(w, (wk.get(w) || 0) + num(a, 'distance_km')) }
  const weeks = Math.max(1, Math.round(span / 7))
  const wkVals = [...wk.values()]
  while (wkVals.length < weeks) wkVals.push(0)
  const wkMean = mean(wkVals), wkCv = wkMean ? sd(wkVals) / wkMean : 0
  // the weekly series in order, for the chart of the year's steadiness
  const w0 = Math.floor((y0 - 4) / 7), w1 = Math.floor((y1 - 4) / 7)
  const wkSeries = []
  for (let w = w0; w <= w1; w++) wkSeries.push({ w, km: wk.get(w) || 0 })

  // sport mix, for the treemap and the distance-against-climb flip
  const sportRows = (() => {
    const m = new Map()
    for (const a of ya) m.set(a.sport_type, (m.get(a.sport_type) || 0) + 1)
    return [...m.entries()].map(([sport, activities]) => ({ sport, activities }))
  })()
  const flip = ['Run', 'Walk', 'TrailRun', 'Hike'].map((k) => {
    const rows = foot.filter((a) => a.sport_type === k)
    return { key: k, label: k === 'TrailRun' ? 'Trail' : k, dist: rows.reduce((s, a) => s + num(a, 'distance_km'), 0), elev: rows.reduce((s, a) => s + num(a, 'elevation_gain_m'), 0) }
  }).filter((d) => d.dist > 0 || d.elev > 0)

  // where: countries (as the countries table) and Tanzania regions (outings and climb)
  const cty = new Map(), reg = new Map()
  let located = 0
  for (const a of ya) {
    const g = geo[a.activity_key]
    if (!g || !g.country || /Indoor/.test(g.country)) continue
    located++
    const c = cty.get(g.country) || { country: g.country, activities: 0, first_activity_date: (a.date || '').slice(0, 10) }
    c.activities++; cty.set(g.country, c)
    if (g.country === 'Tanzania' && g.region) {
      const r = reg.get(g.region) || { region: g.region, activities: 0, elevation_m: 0 }
      r.activities++; if (FOOT.has(a.sport_type)) r.elevation_m += num(a, 'elevation_gain_m')
      reg.set(g.region, r)
    }
  }
  const regRows = (() => {
    const rows = [...reg.values()].sort((a, b) => b.activities - a.activities)
    if (rows.length < 2) return null
    const tA = rows.reduce((s, r) => s + r.activities, 0) || 1, tE = rows.reduce((s, r) => s + r.elevation_m, 0) || 1
    // name the busiest three and the two biggest climbs, so a mountain region
    // with few outings is never hidden inside "other regions"
    const byClimb = [...rows].sort((a, b) => b.elevation_m - a.elevation_m).slice(0, 2)
    const named = new Set([...rows.slice(0, 3), ...byClimb].map((r) => r.region))
    const top = rows.filter((r) => named.has(r.region)), rest = rows.filter((r) => !named.has(r.region))
    const out = top.map((r) => ({ label: r.region, a: r.activities / tA, b: r.elevation_m / tE }))
    if (rest.length) out.push({ label: `${rest.length} other region${rest.length > 1 ? 's' : ''}`, short: `${rest.length} other${rest.length > 1 ? 's' : ''}`, a: rest.reduce((s, r) => s + r.activities, 0) / tA, b: rest.reduce((s, r) => s + r.elevation_m, 0) / tE })
    return out
  })()

  return {
    span, startISO: isoOf(y0), endISO: isoOf(y1),
    activeShare: active.reduce((s, v) => s + v, 0) / span,
    gaps: { next: g1, two: g2, more: g3, total: g1 + g2 + g3 }, longGap,
    multi, p11, p01, restDays: active.length - active.reduce((t, v) => t + v, 0),
    gini: lz ? lz.gini : null, deciles, top10: dk.length > 10 ? topShare(dk, 0.1) : null,
    dayKmN: dk.length,
    tail,
    weekly: { mean: wkMean, cv: wkCv, weeks, series: wkSeries },
    sportRows, flip,
    countries: [...cty.values()], located, regRows, regionCount: reg.size,
  }
}

// Training load from time on the move. Strava's Relative Effort is missing on
// many days (no heart-rate reading), but every outing has its moving time, so
// time gives one fair line across the years. The usual coach's sums:
//   fatigue  my daily minutes, averaged with most weight on the last week (7-day)
//   fitness  the same over about six weeks (42-day)
//   form     fitness minus fatigue: above zero fresh, below zero carrying more
//            than I am used to
const DAY = 864e5
const isoOf = (t) => new Date(t).toISOString().slice(0, 10)

export function buildLoad(acts, fromISO, toISO) {
  const mins = new Map()
  for (const a of acts) { const d = (a.date || '').slice(0, 10); mins.set(d, (mins.get(d) || 0) + (Number(a.moving_time_min) || 0)) }
  const last = toISO || [...mins.keys()].sort().pop()
  const ka = 1 - Math.exp(-1 / 7), kc = 1 - Math.exp(-1 / 42)
  let atl = 0, ctl = 0
  const rows = []
  for (let t = Date.parse(fromISO + 'T00:00:00Z'); t <= Date.parse(last + 'T00:00:00Z'); t += DAY) {
    const iso = isoOf(t), m = mins.get(iso) || 0
    // the morning values: before the day's own outings
    rows.push({ iso, min: m, atl, ctl, form: ctl - atl })
    atl += ka * (m - atl); ctl += kc * (m - ctl)
  }
  return rows
}

// the morning of a given day
export const loadOn = (rows, iso) => rows.find((r) => r.iso === iso) || null

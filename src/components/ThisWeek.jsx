import { Link } from 'react-router-dom'
import { useBook } from './BookContext.js'
import { useTable } from '../context/DataContext.jsx'

// The last full week, Sunday to Saturday, as one band under the cold open. It is
// built from the log at every refresh: the numbers always, the extras only when
// they happened, and one plain line only when something stands out.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY = 864e5
const tOf = (iso) => Date.parse(iso + 'T00:00:00Z')
const isoOf = (t) => new Date(t).toISOString().slice(0, 10)
const d10 = (a) => (a.date || '').slice(0, 10)
const km = (a) => (FOOT.has(a.sport_type) ? Number(a.distance_km) || 0 : 0)
const el = (a) => (FOOT.has(a.sport_type) ? Number(a.elevation_gain_m) || 0 : 0)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const dayMon = (iso) => `${parseInt(iso.slice(8), 10)} ${MONF[parseInt(iso.slice(5, 7), 10) - 1]}`

export function weekReport(acts, geo, trips = []) {
  if (!acts.length) return null
  const last = acts.reduce((m, a) => (d10(a) > m ? d10(a) : m), '')
  // the Saturday on or before the last day in the log closes the week
  const sat = isoOf(tOf(last) - ((new Date(tOf(last)).getUTCDay() + 1) % 7) * DAY)
  const sun = isoOf(tOf(sat) - 6 * DAY)
  const inWk = (a, s = sun, e = sat) => d10(a) >= s && d10(a) <= e
  const wk = acts.filter((a) => inWk(a))
  const days = new Set(wk.map(d10)).size
  const wkKm = wk.reduce((t, a) => t + km(a), 0)
  // the average full week of the year, up to this one
  const Y = sat.slice(0, 4)
  const y0 = `${Y}-01-01`
  const firstSun = isoOf(tOf(y0) + ((7 - new Date(tOf(y0)).getUTCDay()) % 7) * DAY)
  const weeks = []
  for (let s = firstSun; s <= sun; s = isoOf(tOf(s) + 7 * DAY)) {
    const e = isoOf(tOf(s) + 6 * DAY)
    weeks.push({ s, km: acts.filter((a) => inWk(a, s, e)).reduce((t, a) => t + km(a), 0) })
  }
  const avg = weeks.length ? weeks.reduce((t, w) => t + w.km, 0) / weeks.length : 0
  // the streak as of the last day in the log
  const set = new Set(acts.map(d10))
  let streak = 0
  for (let t = tOf(last); set.has(isoOf(t)); t -= DAY) streak++
  const streakAtSat = (() => { let n = 0; for (let t = tOf(sat); set.has(isoOf(t)); t -= DAY) n++; return n })()
  const streakAtSun0 = streakAtSat - 7
  // extras, only when they happened
  const extras = []
  const prs = wk.reduce((t, a) => t + (Number(a.prs) || 0), 0)
  const before = acts.filter((a) => d10(a) < sun)
  const regionsBefore = new Set(before.map((a) => (geo[a.activity_key] || {}).region).filter(Boolean))
  const newRegions = [...new Set(wk.map((a) => (geo[a.activity_key] || {}).region).filter((r) => r && !regionsBefore.has(r)))]
  const bestKmBefore = Math.max(0, ...before.map(km)), bestElBefore = Math.max(0, ...before.map(el))
  const longest = wk.reduce((b, a) => (km(a) > (b ? km(b) : 0) ? a : b), null)
  const climb = wk.reduce((b, a) => (el(a) > (b ? el(b) : 0) ? a : b), null)
  const wkWeeksAll = (() => { const m = new Map(); for (const a of before) { const t = tOf(d10(a)); const s = isoOf(t - new Date(t).getUTCDay() * DAY); m.set(s, (m.get(s) || 0) + km(a)) } return Math.max(0, ...m.values()) })()
  const trip = trips.find((t) => t.date >= sun && t.date <= sat)
  const milestone = [365, 300, 250, 200, 150, 100, 50].find((m) => streakAtSat >= m && streakAtSun0 < m)
  if (milestone) extras.push(`${milestone} days in a row`)
  if (longest && km(longest) > bestKmBefore) extras.push('my longest outing ever')
  if (climb && el(climb) > bestElBefore) extras.push('my biggest climb ever')
  if (wkKm > wkWeeksAll) extras.push('my biggest week ever')
  if (newRegions.length) extras.push(`first time out in ${newRegions.join(' and ')}`)
  if (trip) extras.push(trip.label || 'a mountain day')
  if (prs) extras.push(`${n0(prs)} ${prs === 1 ? 'PR' : 'PRs'}`)
  // one plain line, when something stands out
  let line = ''
  const prev = weeks.slice(0, -1)
  if (milestone === 365) line = 'A whole year of days in a row.'
  else if (extras.length && (milestone || extras[0].startsWith('my '))) line = ''
  else if (prev.length && wkKm > Math.max(...prev.map((w) => w.km))) line = `My biggest week of ${Y}.`
  else if (avg && wkKm >= avg * 1.25) {
    const since = [...prev].reverse().find((w) => w.km >= wkKm)
    line = since ? `My biggest week since ${MONF[parseInt(since.s.slice(5, 7), 10) - 1]}.` : ''
  } else if (avg && wkKm < avg * 0.6 && prev.length && prev[prev.length - 1].km < avg * 0.6) {
    line = days === 7 ? 'A second short week in a row, and still out every day.' : 'A second short week in a row.'
  }
  return { sun, sat, days, n: wk.length, km: wkKm, avg, year: Y, streak, extras, line, last }
}

export default function ThisWeek({ acts, geo }) {
  const book = useBook()
  const trips = useTable('mountain_trips')
  if (book) return null
  const r = weekReport(acts, geo, trips)
  if (!r || !r.n) return null
  const sameMonth = r.sun.slice(5, 7) === r.sat.slice(5, 7)
  const range = sameMonth ? `${parseInt(r.sun.slice(8), 10)} to ${dayMon(r.sat)}` : `${dayMon(r.sun)} to ${dayMon(r.sat)}`
  return (
    <section className="tw" aria-label={`My last full week, ${range}`}>
      <Link to={`/numbers/${r.year}`} className="tw__in">
        <p className="tw__k">This week · {range}</p>
        <ul className="tw__nums">
          <li><b>{r.days} of 7</b> days out</li>
          <li><b>{n0(r.n)}</b> {r.n === 1 ? 'outing' : 'outings'}</li>
          <li><b>{n0(r.km)} km</b> on foot, against {n0(r.avg)} in my average week of {r.year}</li>
          <li className="is-hot"><b>{n0(r.streak)}</b> days in a row now</li>
          {r.extras.map((x) => <li key={x} className="tw__x">{x}</li>)}
        </ul>
        {r.line ? <p className="tw__line">{r.line}</p> : null}
        <span className="tw__go" aria-hidden="true">The year →</span>
      </Link>
    </section>
  )
}

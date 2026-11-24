import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBook } from './BookContext.js'
import { useTable } from '../context/DataContext.jsx'
import { YEAR_EVENTS } from '../lib/yearNotes.js'
import { isNamedCountry } from '../lib/geo.js'

// Any day of the record: what I did, where it sat in the habit, the week around
// it (Sunday to Saturday) and the same date in the other years. No names of
// outings and no places finer than the region.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WKF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY = 864e5
const tOf = (iso) => Date.parse(iso + 'T00:00:00Z')
const isoOf = (t) => new Date(t).toISOString().slice(0, 10)
const d10 = (a) => (a.date || '').slice(0, 10)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const WORD = { Run: 'run', Walk: 'walk', TrailRun: 'trail run', Hike: 'hike' }
const fmtDay = (iso) => `${WKF[new Date(tOf(iso)).getUTCDay()]}, ${parseInt(iso.slice(8), 10)} ${MONF[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const fmtH = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
const MTN = { kilimanjaro: '/kilimanjaro', hanang: '/hanang', uluguru: '/uluguru', ngong: '/ngong' }

export default function AnyDay({ acts, geo }) {
  const book = useBook()
  const trips = useTable('mountain_trips')
  const kili = useTable('kili_half')
  const D = useMemo(() => {
    const by = new Map()
    for (const a of acts) { const d = d10(a); if (!by.has(d)) by.set(d, []); by.get(d).push(a) }
    for (const xs of by.values()) xs.sort((p, q) => (p.date < q.date ? -1 : 1))
    const days = [...by.keys()].sort()
    return { by, first: days[0], last: days[days.length - 1], days }
  }, [acts])
  const [day, setDay] = useState(null)
  if (book || !D.first) return null
  const cur = day || D.last
  const move = (k) => { const t = isoOf(tOf(cur) + k * DAY); if (t >= D.first && t <= D.last) setDay(t) }
  const random = () => setDay(isoOf(tOf(D.first) + Math.floor(Math.random() * ((tOf(D.last) - tOf(D.first)) / DAY + 1)) * DAY))

  const place = (a) => {
    const g = geo[a.activity_key] || {}
    if (a.trainer === 'Yes') return 'indoors'
    if (g.country === 'Tanzania' && g.region) return g.region
    if (g.country && isNamedCountry(g.country)) return g.country
    return ''
  }
  const lineOf = (a) => {
    if (!FOOT.has(a.sport_type)) return { what: 'another activity', bits: [fmtH(parseInt(a.hour, 10) || 0)] }
    const km = Number(a.distance_km) || 0, el = Number(a.elevation_gain_m) || 0
    return { what: WORD[a.sport_type], bits: [fmtH(parseInt(a.hour, 10) || 0), `${k1(km)} km`, el >= 10 ? `${n0(el)} m up` : '', place(a)].filter(Boolean) }
  }
  const xs = D.by.get(cur) || []
  // the run of days, or the gap, the day sits in
  const run = (() => {
    const has = (iso) => D.by.has(iso)
    const on = has(cur)
    let a = cur, b = cur
    while (isoOf(tOf(a) - DAY) >= D.first && has(isoOf(tOf(a) - DAY)) === on) a = isoOf(tOf(a) - DAY)
    while (isoOf(tOf(b) + DAY) <= D.last && has(isoOf(tOf(b) + DAY)) === on) b = isoOf(tOf(b) + DAY)
    const k = Math.round((tOf(cur) - tOf(a)) / DAY) + 1, len = Math.round((tOf(b) - tOf(a)) / DAY) + 1
    return { on, k, len, going: on && b === D.last }
  })()
  // the week around it, Sunday to Saturday
  const sun = isoOf(tOf(cur) - new Date(tOf(cur)).getUTCDay() * DAY)
  const week = Array.from({ length: 7 }, (_, i) => {
    const iso = isoOf(tOf(sun) + i * DAY), ys = D.by.get(iso) || []
    return { iso, n: ys.length, km: ys.filter((a) => FOOT.has(a.sport_type)).reduce((t, a) => t + (Number(a.distance_km) || 0), 0), out: iso < D.first || iso > D.last }
  })
  const wkMax = Math.max(1, ...week.map((w) => w.km))
  // the same date in the other years
  const years = [...new Set(D.days.map((d) => d.slice(0, 4)))]
  const others = years.filter((y) => y !== cur.slice(0, 4)).map((y) => {
    const iso = `${y}${cur.slice(4)}`
    if (isNaN(tOf(iso)) || isoOf(tOf(iso)) !== iso || iso < D.first || iso > D.last) return null
    const ys = (D.by.get(iso) || [])
    const foot = ys.filter((a) => FOOT.has(a.sport_type)).sort((p, q) => (Number(q.distance_km) || 0) - (Number(p.distance_km) || 0))[0]
    const text = foot ? `${WORD[foot.sport_type]} of ${k1(Number(foot.distance_km) || 0)} km${place(foot) ? `, ${place(foot)}` : ''}${ys.length > 1 ? ` and ${ys.length - 1} more` : ''}` : ys.length ? 'another activity' : 'nothing'
    return { y, iso, text, none: !ys.length }
  }).filter(Boolean)
  // a marked moment: a mountain day, a Kilimanjaro Half, or a moment of its year
  const trip = trips.find((t) => t.date === cur)
  const half = kili.find((k) => String(k.date).slice(0, 10) === cur)
  const ev = (YEAR_EVENTS[cur.slice(0, 4)] || []).find(([iso]) => iso === cur)
  const links = [
    trip && MTN[trip.mountain] ? { to: MTN[trip.mountain], label: `${trip.label} →` } : null,
    half ? { to: '/goals', label: 'The Kilimanjaro Half →' } : null,
    { to: `/year-in-sport/${cur.slice(0, 4)}`, label: ev ? `${ev[1]}, in ${cur.slice(0, 4)} →` : `${cur.slice(0, 4)} in sport →` },
  ].filter(Boolean)

  return (
    <div className="aday">
      <div className="aday__pick" role="group" aria-label="Choose a day">
        <button type="button" className="aday__b" onClick={() => move(-1)} disabled={cur <= D.first} aria-label="The day before">←</button>
        <label className="aday__date">
          <span className="visually-hidden">Day</span>
          <input type="date" min={D.first} max={D.last} value={cur} onChange={(e) => e.target.value && e.target.value >= D.first && e.target.value <= D.last && setDay(e.target.value)} />
        </label>
        <button type="button" className="aday__b" onClick={() => move(1)} disabled={cur >= D.last} aria-label="The day after">→</button>
        <button type="button" className="aday__r" onClick={random}>A random day</button>
      </div>
      <div className="aday__grid" aria-live="polite">
        <div>
          <p className="aday__t">{fmtDay(cur)}</p>
          {xs.length ? (
            <ul className="aday__list">
              {xs.map((a) => { const l = lineOf(a); return <li key={a.activity_key}><b>{l.what}</b>{l.bits.join(' · ')}</li> })}
            </ul>
          ) : <p className="aday__none">No outing that day.</p>}
          <p className="aday__run">
            {run.on
              ? (run.len === 1 ? 'A single day out, between zero days.' : run.going ? (run.k === run.len ? `Day ${n0(run.k)} of the streak, and it is still going.` : `Day ${n0(run.k)} of the streak, which is still going at ${n0(run.len)} days.`) : `Day ${n0(run.k)} of ${n0(run.len)} days in a row.`)
              : `Day ${n0(run.k)} of ${n0(run.len)} ${run.len === 1 ? 'zero day' : 'zero days in a row'}.`}
          </p>
          <p className="aday__k aday__k--wk">The week, Sunday to Saturday</p>
          <ol className="aday__week">
            {week.map((w, i) => (
              <li key={w.iso} className={`${w.iso === cur ? 'is-on' : ''}${w.out ? ' is-out' : ''}`}>
                <button type="button" onClick={() => !w.out && setDay(w.iso)} disabled={w.out} aria-label={`${WKF[i]} ${w.iso}: ${w.n ? `${w.n} outing${w.n > 1 ? 's' : ''}, ${k1(w.km)} km on foot` : 'no outing'}`}>
                  <span className="aday__bar"><i style={{ height: `${w.n ? 8 + 92 * (w.km / wkMax) : 0}%` }} className={w.n && !w.km ? 'is-other' : ''} /></span>
                  <span className="aday__d">{WK[i]}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="aday__links">{links.map((l) => <Link key={l.to + l.label} to={l.to}>{l.label}</Link>)}</p>
        </div>
        <div>
          <p className="aday__k">The same date in other years</p>
          <ul className="aday__years">
            {others.map((o) => (
              <li key={o.y} className={o.none ? 'is-none' : ''}>
                <button type="button" onClick={() => setDay(o.iso)}><b>{o.y}</b>{o.text}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

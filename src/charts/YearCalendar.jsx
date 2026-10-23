import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// Every day of one year as a wall calendar: twelve small months, each a grid of
// days with Monday first. Days with an outing are orange, the longest unbroken
// run of the year is deep orange, rest days are faint and days not yet lived (a
// year still running) are left as outlines. Months wash in one after another.
// props: activeSet Set<'YYYY-MM-DD'>, year, endISO (last day on record), streak {startISO, endISO}
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function YearCalendar({ activeSet, year, endISO, streak, firstISO }) {
  const [ref, w] = useWidth(560)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)
  const W = Math.max(280, w)
  const perRow = W < 420 ? 3 : 4
  const gapX = W < 420 ? 10 : 16
  const blockW = (W - gapX * (perRow - 1)) / perRow
  const g = 2
  const cell = Math.floor(blockW / 7) - g
  const labelH = 18
  const blockH = labelH + 6 * (cell + g)
  const rows = Math.ceil(12 / perRow)
  const H = rows * blockH + (rows - 1) * 12 + 4
  const inStreak = (iso) => streak && streak.startISO && iso >= streak.startISO && iso <= streak.endISO

  const months = MON.map((name, mo) => {
    const first = new Date(Date.UTC(year, mo, 1))
    const n = new Date(Date.UTC(year, mo + 1, 0)).getUTCDate()
    const lead = (first.getUTCDay() + 6) % 7
    const days = []
    for (let d = 1; d <= n; d++) {
      const iso = `${year}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const k = lead + d - 1
      const before = firstISO && iso < firstISO
      days.push({ iso, d, col: k % 7, row: Math.floor(k / 7), active: activeSet.has(iso), future: iso > endISO || before, streak: inStreak(iso) })
    }
    return { name, mo, days, active: days.filter((x) => x.active).length }
  })

  return (
    <div ref={ref} className="ycal">
      <div ref={root} className={`ycal__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" style={{ display: 'block' }} onMouseLeave={() => setHi(null)}
          aria-label={`Calendar of ${year}: ${activeSet.size} days with an outing.${streak && streak.startISO ? ` The longest run of days in a row went from ${streak.startISO} to ${streak.endISO}.` : ''}`}>
          {months.map((m) => {
            const bx = (m.mo % perRow) * (blockW + gapX)
            const by = Math.floor(m.mo / perRow) * (blockH + 12)
            return (
              <g key={m.mo} className="ycal__month" style={{ '--d': `${m.mo * 70}ms` }}>
                <text x={bx} y={by + 11} className="ycal__mname">{m.name.slice(0, 3)}</text>
                <text x={bx + 7 * (cell + g) - g} y={by + 11} textAnchor="end" className="ycal__mn">{m.active}</text>
                {m.days.map((d) => (
                  <rect key={d.iso} x={bx + d.col * (cell + g)} y={by + labelH + d.row * (cell + g)} width={cell} height={cell} rx="1.5"
                    className={`ycal__d${d.future ? ' is-future' : d.streak ? ' is-streak' : d.active ? ' is-on' : ''}`}
                    onMouseEnter={() => setHi(d)} />
                ))}
              </g>
            )
          })}
        </svg>
        {hi && (
          <div className="chart-tip" style={{ left: 0, top: -6, position: 'absolute' }}>
            <strong>{hi.d} {MON[parseInt(hi.iso.slice(5, 7), 10) - 1]}</strong> · {hi.future ? 'not on the record' : hi.active ? 'an outing' : 'rest day'}
          </div>
        )}
      </div>
      <p className="ycal__key" aria-hidden="true">
        <i className="ycal__sw is-streak" /> longest run in a row <i className="ycal__sw is-on" /> outing <i className="ycal__sw" /> rest day
      </p>
    </div>
  )
}

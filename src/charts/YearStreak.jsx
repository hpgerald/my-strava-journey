import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// The year's consistency as a calendar grid: one cell per day, columns are weeks
// (Monday top), active days in accent, rest days faint. The longest unbroken run
// of the year is drawn in deep accent so it reads as one solid stretch. Cells
// wash in week by week when scrolled into view.
// activeSet: Set<'YYYY-MM-DD'>; year:number; endISO: last day to show;
// streak: { len, startISO, endISO }
const MON_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function mondayOnOrBefore(d) {
  const x = new Date(d)
  const wd = (x.getUTCDay() + 6) % 7 // Mon=0
  x.setUTCDate(x.getUTCDate() - wd)
  return x
}

export default function YearStreak({ activeSet, year, endISO, streak }) {
  const [ref, w] = useWidth(720)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)

  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(`${endISO}T00:00:00Z`)
  const gridStart = mondayOnOrBefore(start)
  const sStart = streak && streak.startISO ? new Date(`${streak.startISO}T00:00:00Z`) : null
  const sEnd = streak && streak.endISO ? new Date(`${streak.endISO}T00:00:00Z`) : null

  const days = []
  for (let t = new Date(gridStart); t <= end; t.setUTCDate(t.getUTCDate() + 1)) {
    const iso = t.toISOString().slice(0, 10)
    const inYear = t >= start
    days.push({
      iso,
      col: Math.floor((t - gridStart) / (7 * 86400000)),
      row: (t.getUTCDay() + 6) % 7,
      active: inYear && activeSet.has(iso),
      inYear,
      inStreak: sStart && sEnd && t >= sStart && t <= sEnd,
      month: t.getUTCMonth(),
      dom: t.getUTCDate(),
    })
  }
  const cols = (days[days.length - 1]?.col ?? 0) + 1

  const W = Math.max(300, w)
  const gap = 2
  const cell = Math.max(5, Math.min(14, Math.floor((W - 24) / cols) - gap))
  const left = 2
  const top = 16
  const H = top + 7 * (cell + gap) + 6
  const x = (c) => left + c * (cell + gap)
  const y = (r) => top + r * (cell + gap)

  // month labels at the first week whose Monday is in that month
  const monthTicks = []
  let lastMonth = -1
  for (const d of days) {
    if (d.row === 0 && d.inYear && d.month !== lastMonth) {
      monthTicks.push({ col: d.col, label: MON_LABELS[d.month] })
      lastMonth = d.month
    }
  }

  const hd = hi != null ? days[hi] : null

  return (
    <div ref={ref} className="ystreak">
      <div ref={root} className={`ystreak__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Calendar of ${year}: ${activeSet.size} active days, longest unbroken run ${streak ? streak.len : 0} days.`}
          style={{ display: 'block' }} onMouseLeave={() => setHi(null)}>
          {monthTicks.map((m) => (
            <text key={m.label + m.col} x={x(m.col)} y={10} className="chart-tick" textAnchor="start">{m.label}</text>
          ))}
          {days.map((d, i) => {
            if (!d.inYear) return null
            const fill = d.active
              ? (d.inStreak ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, var(--paper))')
              : 'var(--grey-10)'
            return (
              <rect key={d.iso} className="ystreak__cell" x={x(d.col)} y={y(d.row)} width={cell} height={cell} rx="1.5"
                fill={fill} style={{ transitionDelay: `${d.col * 14}ms` }}
                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
            )
          })}
        </svg>
        {hd && hd.inYear && (
          <div className="chart-tip" style={{ left: `${Math.min(88, Math.max(4, (x(hd.col) / W) * 100))}%`, top: 0 }}>
            <strong>{hd.active ? 'Active' : 'Rest'}</strong>
            <br />{MON_LABELS[hd.month]} {hd.dom}
          </div>
        )}
      </div>
      <div className="ystreak__key chart-legend" aria-hidden="true">
        <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> longest streak</span>
        <span><i className="chart-swatch" style={{ background: 'color-mix(in srgb, var(--accent) 55%, var(--paper))' }} /> other active day</span>
        <span><i className="chart-swatch" style={{ background: 'var(--grey-10)' }} /> rest</span>
      </div>
    </div>
  )
}

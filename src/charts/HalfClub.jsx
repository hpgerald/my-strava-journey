import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The road to 83. Every outing of 21.1 km or more, stacked in the order they
// happened, so the line is a running tally of a habit forming. It rockets through
// 2021 and 2022, levels off in the lean years, and climbs hard again lately. The
// lone marathon and the four-in-four-days of the stage race show as a mark and a
// near-vertical jump. props: activities (the full log).
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const HALF = 21.0975
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const t = (d) => Date.parse(d + 'T00:00:00Z')

export default function HalfClub({ activities }) {
  const [ref, width] = useWidth(700)
  const [hover, setHover] = useState(null)
  if (!activities || !activities.length) return <div ref={ref} />

  const N = (x) => Number(x) || 0
  const efforts = activities
    .filter((a) => FOOT.has(a.sport_type) && N(a.distance_km) >= HALF)
    .map((a) => ({ km: N(a.distance_km), sport: a.sport_type, date: (a.date || '').slice(0, 10) }))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (efforts.length < 2) return <div ref={ref} />
  const total = efforts.length
  const maraI = efforts.findIndex((e) => e.km >= 42)

  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 26, r: 14, b: 28, l: narrow ? 30 : 36 }
  const H = narrow ? 280 : 320
  const t0 = t(efforts[0].date), t1 = t(efforts[total - 1].date)
  const sx = linScale([t0, t1], [m.l, W - m.r])
  const sy = linScale([0, total], [H - m.b, m.t])

  // stepped cumulative path
  let d = `M${sx(t0).toFixed(1)},${sy(0).toFixed(1)}`
  efforts.forEach((e, i) => { const x = sx(t(e.date)); d += ` L${x.toFixed(1)},${sy(i).toFixed(1)} L${x.toFixed(1)},${sy(i + 1).toFixed(1)}` })
  d += ` L${sx(t1).toFixed(1)},${sy(total).toFixed(1)}`
  const area = d + ` L${sx(t1).toFixed(1)},${sy(0).toFixed(1)} L${sx(t0).toFixed(1)},${sy(0).toFixed(1)} Z`

  const y0 = new Date(efforts[0].date).getUTCFullYear(), y1 = new Date(efforts[total - 1].date).getUTCFullYear()
  const years = []; for (let y = y0 + 1; y <= y1; y++) years.push(y)
  const countTicks = [0, 20, 40, 60, 80].filter((c) => c <= total)

  return (
    <div ref={ref} className="road">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="A running tally of every 21.1 km or longer outing, climbing to 83." style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        {countTicks.map((c) => (
          <g key={c}>
            <line x1={m.l} y1={sy(c)} x2={W - m.r} y2={sy(c)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 6} y={sy(c) + 3} textAnchor="end" className="chart-tick">{c}</text>
          </g>
        ))}
        {years.map((y) => (
          <g key={y}>
            <line x1={sx(t(`${y}-01-01`))} y1={m.t} x2={sx(t(`${y}-01-01`))} y2={H - m.b} className="road__grid" />
            <text x={sx(t(`${y}-01-01`))} y={H - 10} textAnchor="middle" className="road__yr">{y}</text>
          </g>
        ))}
        <path d={area} fill="var(--accent-soft)" opacity="0.5" />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" />

        {/* the lone marathon */}
        {maraI >= 0 && (
          <g>
            <circle cx={sx(t(efforts[maraI].date))} cy={sy(maraI + 1)} r="4.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
            <text x={sx(t(efforts[maraI].date))} y={sy(maraI + 1) - 9} textAnchor="middle" className="road__mark">the marathon</text>
          </g>
        )}
        {/* the finish count */}
        <circle cx={sx(t1)} cy={sy(total)} r="5" fill="var(--accent)" />
        <text x={sx(t1) - 6} y={sy(total) - 8} textAnchor="end" className="road__end">{total} and counting</text>
      </svg>
      <div className="road__legend chart-legend">
        <span>a running tally &middot; each step is one outing past 21.1 km</span>
        <span className="road__note">steep = a burst of long days &middot; flat = a quiet spell</span>
      </div>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(t(efforts[hover].date)) - 60, 8), W - 150), top: m.t }}>
          <strong>No. {hover + 1} &middot; {efforts[hover].km.toFixed(1)} km</strong>
          <br />
          {(() => { const dd = new Date(efforts[hover].date); return `${MON[dd.getUTCMonth()]} ${dd.getUTCDate()}, ${dd.getUTCFullYear()}` })()}
        </div>
      )}
      {/* invisible hover hit-targets */}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}>
        {efforts.map((e, i) => (
          <rect key={i} x={sx(t(e.date)) - 3} y={m.t} width="6" height={H - m.b - m.t} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
    </div>
  )
}

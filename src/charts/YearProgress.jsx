import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, niceTicks, smoothLinePath, smoothAreaPath } from './primitives.js'

// How the year's kilometres stacked up: cumulative foot distance at each month
// end, climbing from zero in January to the year's total. The line draws itself
// left to right when it scrolls in; for a year still in progress it simply stops
// at the last month with activity instead of running flat to December.
// cum: [{ m:1-12, cum, inRange }]  lastMonth: index 0-11 of final active month.
const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function YearProgress({ cum, lastMonth = 11, total = 0 }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)
  if (!cum || !cum.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 210 : 250
  const m = { t: 20, r: 16, b: 28, l: narrow ? 34 : 44 }
  const last = Math.max(0, Math.min(11, lastMonth))
  const peak = Math.max(1, ...cum.map((d) => d.cum))
  const { max, ticks } = niceTicks(peak, 4)
  const x = linScale([0, 11], [m.l, W - m.r])
  const y = linScale([0, max], [H - m.b, m.t])
  const pts = cum.filter((d) => d.inRange).map((d) => [x(d.m - 1), y(d.cum)])
  const endPt = pts[pts.length - 1]

  return (
    <div ref={ref} className="yprog">
      <div ref={root} className={`yprog__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Cumulative kilometres on foot, climbing to ${Math.round(total).toLocaleString()} km by ${MONL[last]}.`}
          style={{ display: 'block' }} onMouseLeave={() => setHi(null)}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={m.l} y1={y(t)} x2={W - m.r} y2={y(t)} stroke="var(--rule-faint)" strokeWidth="1" opacity={i === 0 ? 1 : 0.6} />
              <text x={m.l - 6} y={y(t) + 3} textAnchor="end" className="chart-tick">{Math.round(t).toLocaleString()}</text>
            </g>
          ))}
          {pts.length > 1 && (
            <>
              <path className="yprog__area" d={smoothAreaPath(pts, H - m.b)} fill="color-mix(in srgb, var(--accent) 12%, var(--paper))" stroke="none" />
              <path className="yprog__line" d={smoothLinePath(pts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
          {endPt && <circle className="yprog__dot" cx={endPt[0]} cy={endPt[1]} r="4" fill="var(--accent)" />}
          {cum.filter((d) => d.inRange).map((d) => {
            const px = x(d.m - 1)
            return (
              <rect key={d.m} x={px - (W - m.l - m.r) / 24} y={m.t} width={(W - m.l - m.r) / 12} height={H - m.b - m.t}
                fill="transparent" onMouseEnter={() => setHi(d.m - 1)} onMouseLeave={() => setHi(null)} />
            )
          })}
          {Array.from({ length: 12 }, (_, i) => (
            <text key={i} x={x(i)} y={H - 9} textAnchor="middle" className="chart-tick" opacity={i <= last ? 1 : 0.4}>{MON[i]}</text>
          ))}
        </svg>
        {hi !== null && cum[hi] && cum[hi].inRange && (
          <div className="chart-tip" style={{ left: `${Math.min(88, Math.max(10, (x(hi) / W) * 100))}%`, top: 0 }}>
            <strong>through {MONL[hi]}</strong>
            <br />{Math.round(cum[hi].cum).toLocaleString()} km on foot
          </div>
        )}
      </div>
    </div>
  )
}

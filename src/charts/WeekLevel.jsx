import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// The shape of a week, as proof of a habit rather than a hobby: seven bars,
// Monday to Sunday, against a dashed line at a perfectly even week (one seventh
// each). The bars barely clear it, and the two weekend bars are tinted so the
// eye can check for a weekend bulge that is not really there. Bars grow from the
// baseline when the chart scrolls in. counts: [Mon..Sun] activity totals.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeekLevel({ counts }) {
  const [ref, width] = useWidth(520)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)
  const safe = counts && counts.length === 7 ? counts : Array(7).fill(0)
  const total = safe.reduce((a, b) => a + b, 0) || 1

  const W = Math.max(300, width)
  const narrow = W < 460
  const H = narrow ? 240 : 300
  const m = { t: 30, r: 10, b: 34, l: 10 }
  const slot = (W - m.l - m.r) / 7
  const barW = Math.min(slot * 0.64, 62)
  const base = H - m.b
  const peak = Math.max(1, ...safe)
  const even = total / 7
  const y = linScale([0, peak * 1.08], [base, m.t])
  const busiest = safe.indexOf(peak)
  const pct = (v) => Math.round((v / total) * 100)

  return (
    <div ref={ref} className="wklvl">
      <div ref={root} className={`wklvl__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Activities by weekday: every day holds between ${pct(Math.min(...safe))} and ${pct(peak)} percent of the total, close to the even ${Math.round(100 / 7)} percent a flat week would give.`}
          style={{ display: 'block' }} onMouseLeave={() => setHi(null)}>
          {/* the "even week" reference line */}
          <line x1={m.l} y1={y(even)} x2={W - m.r} y2={y(even)} stroke="var(--ink)" strokeWidth="1" strokeDasharray="4 3" opacity="0.55" />
          <text x={m.l} y={y(even) - 8} textAnchor="start" className="wklvl__ref">a perfectly even week · {Math.round(100 / 7)}% each</text>
          <line x1={m.l} y1={base + 0.5} x2={W - m.r} y2={base + 0.5} stroke="var(--rule-faint)" strokeWidth="1" />
          {safe.map((v, i) => {
            const cx = m.l + slot * i + slot / 2
            const h = Math.max(1, base - y(v))
            const weekend = i >= 5
            const on = hi === null || hi === i
            const fill = i === busiest ? 'var(--accent)' : weekend ? 'color-mix(in srgb, var(--accent) 34%, var(--paper))' : 'var(--grey-30)'
            return (
              <g key={i} opacity={on ? 1 : 0.55} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
                <rect className="wklvl__bar" x={cx - barW / 2} y={y(v)} width={barW} height={h} rx="2"
                  fill={fill} style={{ transitionDelay: `${i * 80}ms` }} />
                <text x={cx} y={base + 16} textAnchor="middle" className="wklvl__day">{DAYS[i]}</text>
              </g>
            )
          })}
        </svg>
        {hi !== null && (
          <div className="chart-tip" style={{ left: `${Math.min(88, Math.max(10, ((m.l + slot * hi + slot / 2) / W) * 100))}%`, top: 0 }}>
            <strong>{DAYS[hi]}</strong><br />{safe[hi]} activities · {pct(safe[hi])}%
          </div>
        )}
      </div>
    </div>
  )
}

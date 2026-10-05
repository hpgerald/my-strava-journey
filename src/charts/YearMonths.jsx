import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { niceTicks } from './primitives.js'

// The selected year month by month: one bar per calendar month, height = the
// metric (activities or foot kilometres). Bars grow from the baseline in a
// left-to-right stagger when the chart scrolls into view; the busiest month is
// labelled. Sequential single-hue accent by magnitude, text in ink tokens.
// months: [{ m:1-12, label, activities, km }]
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function YearMonths({ months, metric = 'activities', unit = 'activities' }) {
  const [ref, w] = useWidth(640)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)
  const W = Math.max(300, w)
  const narrow = W < 520
  const H = narrow ? 200 : 236
  const pad = { t: 26, r: 6, b: 30, l: 6 }
  const vals = months.map((d) => (metric === 'km' ? d.km : d.activities))
  const peak = Math.max(1, ...vals)
  const { max } = niceTicks(peak, 4)
  const slot = (W - pad.l - pad.r) / 12
  const barW = Math.min(slot * 0.58, 30)
  const base = H - pad.b
  const scaleY = (v) => (v / max) * (base - pad.t)
  const busiest = vals.indexOf(peak)
  const fmt = (v) => (metric === 'km' ? `${Math.round(v)} km` : String(Math.round(v)))
  const shade = (v) => {
    const t = peak ? v / peak : 0
    // white -> accent-soft -> accent -> deep, by magnitude
    if (t <= 0) return 'var(--grey-10)'
    if (t < 0.5) return `color-mix(in srgb, var(--accent) ${Math.round(28 + t * 90)}%, var(--paper))`
    return `color-mix(in srgb, var(--accent) 100%, #7a2300 ${Math.round((t - 0.5) * 40)}%)`
  }

  return (
    <div ref={ref} className="ymon">
      <div ref={root} className={`ymon__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`${unit} by month: busiest is ${MONTHS_FULL[busiest]} with ${fmt(vals[busiest])}.`}
          style={{ display: 'block' }} onMouseLeave={() => setHi(null)}>
          <line x1={pad.l} y1={base + 0.5} x2={W - pad.r} y2={base + 0.5} stroke="var(--rule-faint)" strokeWidth="1" />
          {months.map((d, i) => {
            const v = vals[i]
            const h = Math.max(v > 0 ? 2 : 0, scaleY(v))
            const cx = pad.l + slot * i + slot / 2
            const on = hi === null || hi === i
            return (
              <g key={d.m} opacity={on ? 1 : 0.5}
                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
                {h > 0 ? (
                  <rect className="ymon__bar" x={cx - barW / 2} y={base - h} width={barW} height={h} rx="2"
                    fill={i === busiest ? 'var(--accent)' : shade(v)}
                    style={{ transitionDelay: `${i * 45}ms` }} />
                ) : (
                  <circle cx={cx} cy={base} r="1.5" fill="var(--grey-25)" />
                )}
                <text x={cx} y={base + 15} textAnchor="middle" className="chart-tick">{d.label}</text>
                {i === busiest && v > 0 ? (
                  <text x={cx} y={base - h - 7} textAnchor="middle" className="ymon__peak">{fmt(v)}</text>
                ) : null}
              </g>
            )
          })}
        </svg>
        {hi !== null && (
          <div className="chart-tip" style={{ left: `${Math.min(90, Math.max(10, ((pad.l + slot * hi + slot / 2) / W) * 100))}%`, top: 0 }}>
            <strong>{MONTHS_FULL[months[hi].m - 1]}</strong>
            <br />{fmt(vals[hi])}
          </div>
        )}
      </div>
    </div>
  )
}

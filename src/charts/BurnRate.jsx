import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// How fast each pair was used up. The bar is kilometres burned per month of its
// life; a sprinter tears through a set in a season, a slow-burner is nursed for
// years. The dot marks total distance, so a short fast bar on a small dot is a
// pair devoured whole. rows: [{ model, kmMo, km, life, retired }], fastest first.
export default function BurnRate({ rows }) {
  const [ref, width] = useWidth(600)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const short = (s) => s.replace(/\s*\(.*\)$/, '').replace(/^(Air Zoom|Zoom|Nike)\s+/, '').replace(/\s+XT\s+\d+$/, '')
  const W = Math.max(320, width)
  const narrow = W < 560
  const rowH = 34
  const m = { t: 10, r: narrow ? 82 : 96, b: 26, l: narrow ? 112 : 120 }
  const H = m.t + rows.length * rowH + m.b
  const maxRate = Math.max(...rows.map((r) => r.kmMo))
  const sx = linScale([0, maxRate], [m.l, W - m.r])

  return (
    <div ref={ref} className="burn">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Kilometres run per month of each pair's life, fastest-burning first."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {rows.map((r, i) => {
          const y = m.t + i * rowH + rowH / 2
          const on = hover === null || hover === i
          const bx = sx(r.kmMo)
          return (
            <g key={i} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <text x={m.l - 10} y={y + 4} textAnchor="end" className={`burn__name${narrow ? ' burn__name--sm' : ''}`}>{short(r.model)}</text>
              <line x1={m.l} y1={y} x2={W - m.r} y2={y} className="burn__track" />
              <line x1={m.l} y1={y} x2={bx} y2={y} className="burn__bar" strokeWidth={hover === i ? 9 : 7} />
              <circle cx={bx} cy={y} r={r.retired ? 4 : 5} fill={r.retired ? 'var(--accent)' : 'var(--paper)'} stroke="var(--accent)" strokeWidth="2" />
              <text x={bx + 10} y={y + 4} className="burn__val mono">{Math.round(r.kmMo)}<tspan className="burn__unit"> km/mo</tspan></text>
            </g>
          )
        })}
        <text x={m.l} y={H - 8} className="burn__axis">bar = km run per month of the pair&rsquo;s life &middot; hollow dot = still in rotation</text>
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(sx(rows[hover].kmMo) + 20, W - 120), top: m.t + hover * rowH }}>
          <strong>{rows[hover].model}</strong>
          <br />
          {Math.round(rows[hover].kmMo)} km/mo &middot; {Math.round(rows[hover].km)} km over {rows[hover].life > 60 ? `${Math.round(rows[hover].life / 30.44)} months` : `${rows[hover].life} days`}
        </div>
      )}
    </div>
  )
}

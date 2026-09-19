import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { niceTicks } from './primitives.js'

// A starburst of applause: the most-cheered activities as rays leaving a single
// centre, each ray as long as the kudos it drew, tipped with the count and
// labelled outside. Faint rings mark the kudos scale. data: [{ label, value, display }].
export default function KudosStarburst({ data }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 520
  const H = 400
  const cx = W / 2
  const cy = H / 2 + 6
  const rMin = 26
  const rMax = Math.min(W, H) / 2 - (narrow ? 58 : 74)
  const maxK = Math.max(...data.map((d) => d.value)) || 1
  const rings = niceTicks(maxK, 3)
  const rOf = (v) => rMin + (v / rings.max) * (rMax - rMin)

  const n = data.length
  // sweep clockwise, offset half a sector so straight up stays clear for the scale
  const ang = (i) => -Math.PI / 2 + Math.PI / n + (i / n) * Math.PI * 2
  const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]

  return (
    <div ref={ref} className="burst">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="The most-cheered activities as rays from a centre, each as long as the kudos it drew."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* scale rings */}
        {rings.ticks.filter((t) => t > 0).map((t) => (
          <g key={'r' + t}>
            <circle cx={cx} cy={cy} r={rOf(t)} fill="none" className="burst__ring" />
            <text x={cx} y={cy - rOf(t) - 3} textAnchor="middle" className="chart-tick">{t}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const [tx, ty] = pt(i, rOf(d.value))
          const [lx, ly] = pt(i, rOf(d.value) + 16)
          const c = Math.cos(ang(i))
          const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle'
          const on = hover === null || hover === i
          return (
            <g key={i} opacity={on ? 1 : 0.3} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="var(--accent)" strokeWidth={hover === i ? 3.5 : 2.5} strokeLinecap="round" />
              <circle cx={tx} cy={ty} r={hover === i ? 6 : 5} fill="var(--accent)" />
              <text x={lx} y={ly} dy="0.32em" textAnchor={anchor} className="burst__lbl">
                {narrow ? d.label.split('·')[0].trim() : d.label} <tspan className="burst__val">{d.display}</tspan>
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="4" fill="var(--ink)" />
      </svg>
    </div>
  )
}

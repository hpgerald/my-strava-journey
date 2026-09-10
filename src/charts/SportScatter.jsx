import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks } from './primitives.js'

// A sport-personality plot: each foot sport placed by its typical outing, how far
// (x) against how much it climbs (y), the bubble sized by how many times it is
// logged. Running lands long and flat; the trails and hikes sit high; walking is
// the busy middle. points: [{ key, label, x(km), y(m), n }].
export default function SportScatter({ points }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!points || !points.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 320
  const m = { t: 20, r: 20, b: 40, l: 48 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const xN = niceTicks(Math.max(...points.map((p) => p.x)), 4)
  const yN = niceTicks(Math.max(...points.map((p) => p.y)), 4)
  const sx = linScale([0, xN.max], [m.l, m.l + iw])
  const sy = linScale([0, yN.max], [m.t + ih, m.t])
  const nMax = Math.max(...points.map((p) => p.n))
  const rOf = (n) => 8 + Math.sqrt(n / nMax) * 26

  return (
    <div ref={ref} className="scat">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Each foot sport by typical distance against typical climb, bubble sized by count."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {yN.ticks.map((t, i) => (
          <g key={'y' + i}>
            <line x1={m.l} y1={sy(t)} x2={m.l + iw} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" className="chart-tick">{t}</text>
          </g>
        ))}
        {xN.ticks.map((t, i) => (
          <text key={'x' + i} x={sx(t)} y={H - 24} textAnchor="middle" className="chart-tick">{t}</text>
        ))}
        <text x={m.l + iw / 2} y={H - 6} textAnchor="middle" className="scat__axis">typical distance (km)</text>
        <text transform={`translate(12 ${m.t + ih / 2}) rotate(-90)`} textAnchor="middle" className="scat__axis">typical climb (m)</text>
        {points.map((p, i) => {
          const on = hover === null || hover === i
          const hot = p.key === 'TrailRun' || p.key === 'Hike'
          return (
            <g key={i} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(i)}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={rOf(p.n)} fill={hot ? 'var(--accent-mute)' : 'var(--grey-10)'} stroke={hot ? 'var(--accent)' : 'var(--grey-55)'} strokeWidth="1.5" />
              <text x={sx(p.x)} y={sy(p.y) - rOf(p.n) - 5} textAnchor="middle" className="scat__lbl">{p.label}</text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(points[hover].x), 70), W - 70), top: sy(points[hover].y) - rOf(points[hover].n) - 44 }}>
          <strong>{points[hover].label}</strong>
          <br />
          {points[hover].x} km · {points[hover].y} m · {points[hover].n} logged
        </div>
      )}
    </div>
  )
}

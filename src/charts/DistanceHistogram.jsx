import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The distribution of foot outings by distance, one thin bar per kilometre. The
// eye lands on the two spikes the body keeps returning to: a clean 5 km and a
// clean 10 km. bins: [{ km, count }] ascending; capKm folds the long tail.
export default function DistanceHistogram({ bins, peaks = [5, 10] }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!bins || !bins.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 280
  const m = { t: 24, r: 14, b: 40, l: 36 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const maxC = Math.max(...bins.map((b) => b.count))
  const bw = iw / bins.length
  const sy = linScale([0, maxC], [m.t + ih, m.t])

  return (
    <div ref={ref} className="dhist">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Foot outings by distance in one-kilometre bins, with spikes at 5 and 10 km."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {bins.map((b, i) => {
          const x = m.l + i * bw
          const y = sy(b.count)
          const hot = peaks.includes(b.km)
          const on = hover === null || hover === i
          return (
            <g key={i} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x + bw * 0.14} y={y} width={bw * 0.72} height={m.t + ih - y} fill={hot ? 'var(--accent)' : 'var(--grey-35)'} />
              {hot && <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="dhist__peak">{b.count}</text>}
              {(b.km % 5 === 0 || b.km === 1) && <text x={x + bw / 2} y={H - 22} textAnchor="middle" className="chart-tick">{b.km}{b.cap ? '+' : ''}</text>}
            </g>
          )
        })}
        <line x1={m.l} y1={m.t + ih} x2={m.l + iw} y2={m.t + ih} stroke="var(--rule-faint)" strokeWidth="1" />
        <text x={m.l + iw / 2} y={H - 6} textAnchor="middle" className="dhist__axis">distance of a single outing (km)</text>
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(m.l + hover * bw + bw / 2, 40), W - 50), top: sy(bins[hover].count) - 44 }}>
          <strong>{bins[hover].km}{bins[hover].cap ? '+' : ''} km</strong>
          <br />
          {bins[hover].count} outings
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// The typical outing: foot activities grouped by rounded kilometre, one bar each,
// the long tail folded into a final 25+ column. The tallest bars are the distances
// the body kept coming back to; they are picked out in accent. Bars grow from the
// baseline when the chart scrolls in. bins: [{ km, count, cap }]; peaks: km values
// to highlight.
export default function YearDistances({ bins, peaks = [] }) {
  const [ref, width] = useWidth(560)
  const [root, inView] = useInView()
  const [hover, setHover] = useState(null)
  if (!bins || !bins.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 250
  const m = { t: 24, r: 14, b: 40, l: 34 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const maxC = Math.max(1, ...bins.map((b) => b.count))
  const bw = iw / bins.length
  const sy = linScale([0, maxC], [m.t + ih, m.t])
  const hotKm = new Set(peaks)

  return (
    <div ref={ref} className="ydist">
      <div ref={root} className={`ydist__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label="Foot outings grouped by distance; the tallest bars are the outing lengths that recur most."
          style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
          {bins.map((b, i) => {
            const x = m.l + i * bw
            const y = sy(b.count)
            const hot = hotKm.has(b.km)
            const on = hover === null || hover === i
            const h = m.t + ih - y
            return (
              <g key={i} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect className="ydist__bar" x={x + bw * 0.14} y={y} width={bw * 0.72} height={Math.max(0, h)} rx="1"
                  fill={hot ? 'var(--accent)' : 'var(--grey-35)'} style={{ transitionDelay: `${i * 22}ms` }} />
                {hot && b.count > 0 && <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="dhist__peak">{b.count}</text>}
                {(b.km % 5 === 0 || b.km === 1) && <text x={x + bw / 2} y={H - 22} textAnchor="middle" className="chart-tick">{b.km}{b.cap ? '+' : ''}</text>}
              </g>
            )
          })}
          <line x1={m.l} y1={m.t + ih} x2={m.l + iw} y2={m.t + ih} stroke="var(--rule-faint)" strokeWidth="1" />
          <text x={m.l + iw / 2} y={H - 6} textAnchor="middle" className="dhist__axis">distance of a single outing (km)</text>
        </svg>
        {hover != null && bins[hover] && (
          <div className="chart-tip" style={{ left: Math.min(Math.max(m.l + hover * bw + bw / 2, 40), W - 60), top: sy(bins[hover].count) - 44 }}>
            <strong>{bins[hover].km}{bins[hover].cap ? '+' : ''} km</strong>
            <br />{bins[hover].count} {bins[hover].count === 1 ? 'outing' : 'outings'}
          </div>
        )}
      </div>
    </div>
  )
}

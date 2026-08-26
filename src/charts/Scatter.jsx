import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, extent, niceTicks } from './primitives.js'

// Scatter plot. Every point is an activity; highlighted points (records) are
// drawn larger and in accent. Recessive axes, hover tooltip.
// points: [{ x, y, hi?, label? }]
export default function Scatter({ points, height = 360, xUnit = '', yUnit = '', formatX = (v) => v, formatY = (v) => v, xTitle, yTitle }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  const m = { t: 16, r: 16, b: 40, l: 52 }
  const iw = Math.max(10, width - m.l - m.r)
  const ih = height - m.t - m.b
  if (!points || !points.length) return <div ref={ref} />

  const [, xMax] = extent(points, (p) => p.x)
  const [, yMax] = extent(points, (p) => p.y)
  const nx = niceTicks(xMax, 4)
  const ny = niceTicks(yMax, 4)
  const sx = linScale([0, nx.max], [m.l, m.l + iw])
  const sy = linScale([0, ny.max], [m.t + ih, m.t])

  const base = points.filter((p) => !p.hi)
  const hi = points.filter((p) => p.hi)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Scatter plot" style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {ny.ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 8} y={sy(t) + 3} textAnchor="end" className="chart-tick">{formatY(t)}</text>
          </g>
        ))}
        {nx.ticks.map((t, i) => (
          <text key={i} x={sx(t)} y={height - 22} textAnchor="middle" className="chart-tick">{formatX(t)}</text>
        ))}
        {yTitle && <text x={m.l - 40} y={m.t + ih / 2} transform={`rotate(-90 ${m.l - 40} ${m.t + ih / 2})`} textAnchor="middle" className="chart-tick">{yTitle}</text>}
        {xTitle && <text x={m.l + iw / 2} y={height - 4} textAnchor="middle" className="chart-tick">{xTitle}</text>}
        <line x1={m.l} x2={m.l + iw} y1={sy(0)} y2={sy(0)} stroke="var(--ink)" strokeWidth="1" />
        {base.map((p, i) => (
          <circle key={i} cx={sx(p.x).toFixed(1)} cy={sy(p.y).toFixed(1)} r="2.4" fill="var(--ink)" opacity="0.28"
            onMouseEnter={() => setHover({ p, x: sx(p.x), y: sy(p.y) })} />
        ))}
        {hi.map((p, i) => (
          <circle key={'h' + i} cx={sx(p.x).toFixed(1)} cy={sy(p.y).toFixed(1)} r="4.5" fill="var(--accent)" stroke="var(--paper)" strokeWidth="1"
            onMouseEnter={() => setHover({ p, x: sx(p.x), y: sy(p.y) })} />
        ))}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(hover.x, 70), width - 70), top: Math.max(hover.y - 46, 0) }}>
          {hover.p.label ? <><strong>{hover.p.label}</strong><br /></> : null}
          {formatX(hover.p.x)} {xUnit} · {formatY(hover.p.y)} {yUnit}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, extent, niceTicks, smoothLinePath, smoothAreaPath, bisectNearest } from './primitives.js'

// Responsive area + line for a single series over time. Accent for the mark,
// recessive grey axes, hover crosshair + tooltip.
// points: [{ x:number, y:number, label:string }]  (x usually a timestamp)
export default function AreaLine({ points, height = 260, yUnit = '', formatX = (p) => p.label, formatY = (v) => v }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)

  const m = { t: 14, r: 14, b: 26, l: 48 }
  const iw = Math.max(10, width - m.l - m.r)
  const ih = height - m.t - m.b

  if (!points || points.length < 2) return <div ref={ref} />

  const xs = points.map((p) => p.x)
  const [x0, x1] = extent(points, (p) => p.x)
  const [, yMax] = extent(points, (p) => p.y)
  const { max: nyMax, ticks: yTicks } = niceTicks(yMax, 4)

  const sx = linScale([x0, x1], [m.l, m.l + iw])
  const sy = linScale([0, nyMax], [m.t + ih, m.t])
  const pts = points.map((p) => [sx(p.x), sy(p.y)])

  // year ticks
  const xTicks = []
  const firstYear = new Date(x0).getUTCFullYear()
  const lastYear = new Date(x1).getUTCFullYear()
  for (let y = firstYear; y <= lastYear; y++) {
    const t = Date.UTC(y, 0, 1)
    if (t >= x0 && t <= x1) xTicks.push({ x: t, label: String(y) })
  }

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const tx = sx.invert(px)
    const i = bisectNearest(xs, tx)
    if (i >= 0) setHover(i)
  }

  const h = hover != null ? points[hover] : null
  const hp = hover != null ? pts[hover] : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Line chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block', touchAction: 'none' }}
      >
        {/* y gridlines + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 8} y={sy(t) + 3} textAnchor="end" className="chart-tick">
              {formatY(t)}
            </text>
          </g>
        ))}
        {/* area + line */}
        <path d={smoothAreaPath(pts, sy(0))} fill="var(--accent-mute)" />
        <path d={smoothLinePath(pts)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* x ticks */}
        {xTicks.map((t, i) => (
          <text key={i} x={sx(t.x)} y={height - 8} textAnchor="middle" className="chart-tick">
            {t.label}
          </text>
        ))}
        {/* baseline */}
        <line x1={m.l} x2={m.l + iw} y1={sy(0)} y2={sy(0)} stroke="var(--ink)" strokeWidth="1" />
        {/* hover */}
        {h && (
          <g>
            <line x1={hp[0]} x2={hp[0]} y1={m.t} y2={sy(0)} stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={hp[0]} cy={hp[1]} r="4.5" fill="var(--accent)" stroke="var(--paper)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div
          className="chart-tip"
          style={{
            left: Math.min(Math.max(hp[0], 60), width - 60),
            top: m.t,
          }}
        >
          <strong>{formatX(h)}</strong>
          <br />
          {formatY(h.y)} {yUnit}
        </div>
      )}
    </div>
  )
}

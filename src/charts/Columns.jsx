import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, extent, niceTicks } from './primitives.js'

// Vertical bar chart. Accent bars by default, rounded tops, recessive axis.
// data: [{ label, value }]
export default function Columns({ data, height = 240, unit = '', formatY = (v) => v, accent = true }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)

  const m = { t: 16, r: 8, b: 26, l: 48 }
  const iw = Math.max(10, width - m.l - m.r)
  const ih = height - m.t - m.b
  if (!data || !data.length) return <div ref={ref} />

  const [, yMax] = extent(data, (d) => d.value)
  const { max: nyMax, ticks } = niceTicks(yMax, 4)
  const sy = linScale([0, nyMax], [m.t + ih, m.t])
  const band = iw / data.length
  const bw = Math.min(band - 8, 64)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart" style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 8} y={sy(t) + 3} textAnchor="end" className="chart-tick">
              {formatY(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = m.l + i * band + (band - bw) / 2
          const y = sy(d.value)
          const barH = Math.max(0, sy(0) - y)
          const on = hover === i
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={y} width={bw} height={barH} rx="3" fill={accent ? 'var(--accent)' : 'var(--ink)'} opacity={hover == null || on ? 1 : 0.55} />
              <text x={x + bw / 2} y={height - 8} textAnchor="middle" className="chart-tick">
                {d.label}
              </text>
              {/* invisible hit area full height */}
              <rect x={m.l + i * band} y={m.t} width={band} height={ih} fill="transparent" />
            </g>
          )
        })}
        <line x1={m.l} x2={m.l + iw} y1={sy(0)} y2={sy(0)} stroke="var(--ink)" strokeWidth="1" />
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(m.l + hover * band + band / 2, 60), width - 60), top: m.t }}>
          <strong>{data[hover].label}</strong>
          <br />
          {formatY(data[hover].value)} {unit}
        </div>
      )}
    </div>
  )
}

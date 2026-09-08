import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks } from './primitives.js'

// A lollipop timeline: one stem-and-dot per year at its average kudos. The two
// near-silent early years sit in gray on the floor; the year the following
// arrives and everything after carries the accent, with that arrival annotated.
// points: [{ label(year), value, n }], inflection: the label where it turns.
export default function CrowdStems({ points, inflection }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!points || !points.length) return <div ref={ref} />

  const height = 300
  const m = { t: 40, r: 16, b: 28, l: 34 }
  const iw = Math.max(10, width - m.l - m.r)
  const ih = height - m.t - m.b
  const n = points.length
  const band = iw / n
  const xAt = (i) => m.l + (i + 0.5) * band

  const yMaxRaw = Math.max(...points.map((p) => p.value))
  const { max: yMax, ticks } = niceTicks(yMaxRaw, 3)
  const sy = linScale([0, yMax], [m.t + ih, m.t])
  const baseY = m.t + ih
  const infIdx = points.findIndex((p) => String(p.label) === String(inflection))
  const on = (i) => infIdx < 0 || i >= infIdx

  return (
    <div ref={ref} className="stems">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Average kudos per activity by year, as a lollipop timeline"
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" className="chart-tick">{t}</text>
          </g>
        ))}
        {/* annotation for the arrival year */}
        {infIdx >= 0 && (
          <g className="stems__note">
            <text x={xAt(infIdx)} y={m.t - 22} textAnchor="middle" className="stems__notelbl">the crowd arrives</text>
            <line x1={xAt(infIdx)} x2={xAt(infIdx)} y1={m.t - 16} y2={sy(points[infIdx].value) - 9} className="stems__noteline" />
          </g>
        )}
        {points.map((p, i) => {
          const hot = on(i)
          const col = hot ? 'var(--accent)' : 'var(--grey-35)'
          const isHover = hover === i
          const r = Math.max(5, Math.min(9, 5 + (p.n / 500) * 4))
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <line x1={xAt(i)} x2={xAt(i)} y1={baseY} y2={sy(p.value)} stroke={col} strokeWidth="2" opacity={hover == null || isHover ? 1 : 0.5} />
              <circle cx={xAt(i)} cy={sy(p.value)} r={isHover ? r + 1.5 : r} fill={col} stroke="var(--paper)" strokeWidth="1.5" opacity={hover == null || isHover ? 1 : 0.5} />
              <text x={xAt(i)} y={height - 8} textAnchor="middle" className="chart-tick">{p.label}</text>
              <rect x={m.l + i * band} y={m.t} width={band} height={ih} fill="transparent" />
            </g>
          )
        })}
        <line x1={m.l} x2={m.l + iw} y1={baseY} y2={baseY} stroke="var(--ink)" strokeWidth="1" />
      </svg>
      <div className="chart-legend" style={{ marginTop: 'var(--sp-3)' }}>
        <span><i className="chart-swatch" style={{ background: 'var(--grey-35)' }} /> before the crowd</span>
        <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> after 2021 (dot size = activities that year)</span>
      </div>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(xAt(hover), 64), width - 64), top: m.t }}>
          <strong>{points[hover].label}</strong>
          <br />
          {points[hover].value} avg kudos
        </div>
      )}
    </div>
  )
}

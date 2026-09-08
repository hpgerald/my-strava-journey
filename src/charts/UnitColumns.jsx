import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Isotype-style unit columns (Neurath): each day is a tower of blocks, one block
// per `unit` activities, so seven near-equal towers make the "no day off" point
// by sheer repetition. The busiest day carries the accent; the rest are ink.
// data: [{ label, value, display }]
export default function UnitColumns({ data, unit = 25, height = 300 }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const maxVal = Math.max(...data.map((d) => d.value))
  const maxIdx = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0)
  const maxBlocks = Math.ceil(maxVal / unit)

  const m = { t: 24, b: 26 }
  const ih = height - m.t - m.b
  const gap = 3
  const band = width / data.length
  const blockH = (ih - (maxBlocks - 1) * gap) / maxBlocks
  const blockW = Math.min(band - 12, blockH * 1.35, 46)
  const baseY = m.t + ih

  return (
    <div ref={ref} className="unitcol">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Activities per weekday, each block one unit of activities"
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {data.map((d, i) => {
          const cx = i * band + band / 2
          const full = Math.floor(d.value / unit)
          const frac = d.value / unit - full
          const on = hover === i
          const isMax = i === maxIdx
          const fill = isMax ? 'var(--accent)' : 'var(--ink)'
          const blocks = []
          for (let b = 0; b < full; b++) {
            const y = baseY - (b + 1) * blockH - b * gap
            blocks.push(
              <rect key={b} x={cx - blockW / 2} y={y} width={blockW} height={blockH} rx="2" fill={fill} opacity={hover == null || on ? 1 : 0.32} />
            )
          }
          if (frac > 0.06) {
            const fh = blockH * frac
            const y = baseY - full * blockH - full * gap - fh
            blocks.push(
              <rect key="p" x={cx - blockW / 2} y={y} width={blockW} height={fh} rx="2" fill={fill} opacity={(hover == null || on ? 1 : 0.32) * 0.5} />
            )
          }
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              {blocks}
              <text x={cx} y={baseY - (full + (frac > 0.06 ? 1 : 0)) * (blockH + gap) - 8} textAnchor="middle" className={`unitcol__num${isMax ? ' is-max' : ''}`}>
                {d.display}
              </text>
              <text x={cx} y={height - 8} textAnchor="middle" className="chart-tick">{d.label}</text>
              <rect x={i * band} y={m.t} width={band} height={ih} fill="transparent" />
            </g>
          )
        })}
      </svg>
      <div className="chart-legend" style={{ marginTop: 'var(--sp-3)' }}>
        <span><i className="chart-swatch" style={{ background: 'var(--ink)' }} /> each block = {unit} activities</span>
        <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> busiest day</span>
      </div>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(hover * band + band / 2, 60), width - 60), top: 4 }}>
          <strong>{data[hover].label}</strong>
          <br />
          {data[hover].display} activities
        </div>
      )}
    </div>
  )
}

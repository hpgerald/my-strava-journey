import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Heatmap matrix (e.g. weekday x time-of-day). Grey ramp by value, the single
// peak cell drawn in the accent. rows/cols are label arrays; get(r,c) -> number.
export default function Matrix({ rowLabels, colLabels, get, unit = '', rowH }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)

  const gutterL = 96
  const gutterT = 22
  const gap = 3
  const nCols = colLabels.length
  // cell width tracks the container; cell height is fixed when rowH is given, so
  // the matrix has a deterministic total height (lets a neighbour chart match it)
  const cellW = Math.max(20, Math.min(58, (width - gutterL - (nCols - 1) * gap) / nCols))
  const cellH = rowH ?? cellW
  const contentW = Math.min(width, gutterL + nCols * cellW + (nCols - 1) * gap)
  const h = gutterT + rowLabels.length * (cellH + gap)

  let max = 0
  let peak = null
  rowLabels.forEach((_, r) =>
    colLabels.forEach((__, c) => {
      const v = get(r, c) || 0
      if (v > max) {
        max = v
        peak = [r, c]
      }
    })
  )
  const shade = (v) => {
    if (v <= 0) return 'var(--grey-06)'
    const t = v / (max || 1)
    if (t > 0.75) return 'var(--grey-85)'
    if (t > 0.5) return 'var(--grey-70)'
    if (t > 0.28) return 'var(--grey-45)'
    if (t > 0.12) return 'var(--grey-25)'
    return 'var(--grey-15)'
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={contentW} height={h} viewBox={`0 0 ${contentW} ${h}`} role="img" aria-label="Heatmap matrix" style={{ display: 'block', maxWidth: '100%' }} onMouseLeave={() => setHover(null)}>
        {colLabels.map((cl, c) => (
          <text key={c} x={gutterL + c * (cellW + gap) + cellW / 2} y={14} textAnchor="middle" className="chart-tick">
            {cl}
          </text>
        ))}
        {rowLabels.map((rl, r) => (
          <g key={r}>
            <text x={gutterL - 10} y={gutterT + r * (cellH + gap) + cellH / 2 + 3} textAnchor="end" className="chart-tick">
              {rl}
            </text>
            {colLabels.map((_, c) => {
              const v = get(r, c) || 0
              const isPeak = peak && peak[0] === r && peak[1] === c
              const x = gutterL + c * (cellW + gap)
              const y = gutterT + r * (cellH + gap)
              return (
                <rect
                  key={c}
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  rx="2"
                  fill={isPeak ? 'var(--accent)' : shade(v)}
                  onMouseEnter={() => setHover({ x: x + cellW / 2, y, r, c, v })}
                />
              )
            })}
          </g>
        ))}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(hover.x, 70), contentW - 70), top: hover.y - 44 }}>
          <strong>
            {rowLabels[hover.r]} · {colLabels[hover.c]}
          </strong>
          <br />
          {hover.v} {unit}
        </div>
      )}
    </div>
  )
}

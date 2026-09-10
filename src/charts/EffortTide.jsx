import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks, smoothAreaPath, smoothLinePath } from './primitives.js'

// The season's cardiovascular load drawn as a tide: total relative effort per
// year swelling and ebbing off a shore line, high tide marked at the peak year.
// A single filled curve reads as a rhythm rather than a row of bars.
// data: [{ label(year), value }], chronological.
export default function EffortTide({ data, fmt = (v) => String(Math.round(v)) }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 340
  const m = { t: 26, r: 16, b: 34, l: 44 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const n = data.length
  const yN = niceTicks(Math.max(...data.map((d) => d.value)), 4)
  const sx = linScale([0, n - 1], [m.l, m.l + iw])
  const sy = linScale([0, yN.max], [m.t + ih, m.t])
  const pts = data.map((d, i) => [sx(i), sy(d.value)])
  const base = m.t + ih
  const peakI = data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0)
  const mean = data.reduce((s, d) => s + d.value, 0) / n

  return (
    <div ref={ref} className="tide">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Total relative effort per year, drawn as a rising and ebbing tide."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {yN.ticks.map((t, i) => (
          <g key={'y' + i}>
            <line x1={m.l} y1={sy(t)} x2={m.l + iw} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" className="chart-tick">{fmt(t)}</text>
          </g>
        ))}

        {/* the tide body + its surface line */}
        <path d={smoothAreaPath(pts, base)} className="tide__fill" />
        <path d={smoothLinePath(pts)} className="tide__line" />

        {/* mean waterline */}
        <line x1={m.l} y1={sy(mean)} x2={m.l + iw} y2={sy(mean)} className="tide__mean" />
        <text x={m.l + iw} y={sy(mean) - 5} textAnchor="end" className="tide__meanlbl">mean {fmt(mean)}</text>

        {/* year markers */}
        {data.map((d, i) => {
          const on = hover === null || hover === i
          const isPeak = i === peakI
          return (
            <g key={i} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <line x1={sx(i)} y1={sy(d.value)} x2={sx(i)} y2={base} stroke="var(--accent)" strokeWidth="1" opacity={isPeak ? 0.45 : 0.15} />
              <circle cx={sx(i)} cy={sy(d.value)} r={isPeak ? 6 : hover === i ? 5 : 3.5} fill={isPeak ? 'var(--accent)' : 'var(--paper)'} stroke="var(--accent)" strokeWidth="2" />
              {isPeak && (
                <text x={sx(i)} y={sy(d.value) - 12} textAnchor="middle" className="tide__peak">high tide</text>
              )}
              <text x={sx(i)} y={H - 12} textAnchor="middle" className="chart-tick">{d.label}</text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(hover), 54), W - 60), top: sy(data[hover].value) - 46 }}>
          <strong>{data[hover].label}</strong>
          <br />
          {fmt(data[hover].value)} effort
        </div>
      )}
    </div>
  )
}

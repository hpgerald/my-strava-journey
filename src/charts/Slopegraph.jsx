import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// A then-vs-now slopegraph fan. Every metric is indexed to its 2019 baseline and
// its line fans out to its 2026 multiple on a log axis, so a single image shows
// the whole story: almost everything multiplies, a few things fall. rows are the
// filtered comparison records. fmt formats the raw values.
const fmtNum = (v) => {
  const n = Math.abs(v)
  if (n >= 10000) return Math.round(v / 1000) + 'k'
  if (n >= 1000) return Math.round(v).toLocaleString('en-US')
  if (n >= 10) return String(Math.round(v))
  return v.toFixed(1)
}
const shorten = (m) =>
  m.replace(/^Avg relative effort per activity$/, 'Avg effort / session')
    .replace(/^Total relative effort$/, 'Total effort')
    .replace(/^Segment achievements$/, 'Achievements')

export default function Slopegraph({ rows }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const items = rows.map((r) => {
    const b = Number(r.baseline_value)
    const t = Number(r.target_value)
    const isNew = b === 0
    const ratio = isNew ? t / 1 : t / b // "new": treat baseline as 1 for placement
    return { metric: shorten(r.metric.replace(/ in the year$/, '')), b, t, ratio: Math.max(ratio, 0.001), isNew, up: t >= b, unit: r.unit }
  })

  const W = Math.max(width || 720, 320)
  const narrow = W < 560
  const labelW = narrow ? 116 : 250
  const m = { t: 28, b: 24, l: narrow ? 30 : 44, r: labelW }
  const H = Math.max(360, items.length * 26 + m.t + m.b)
  const ih = H - m.t - m.b
  const xL = m.l
  const xR = W - m.r

  const lnOf = (r) => Math.log(r)
  const lnVals = items.map((d) => lnOf(d.ratio))
  const lnMax = Math.max(...lnVals, Math.log(2))
  const lnMin = Math.min(...lnVals, Math.log(0.5))
  const pad = (lnMax - lnMin) * 0.08
  const sy = linScale([lnMin - pad, lnMax + pad], [m.t + ih, m.t])
  const yOne = sy(0) // the x1 (no change) line

  // gridline ratios that fall inside the range
  const gridR = [0.25, 0.5, 1, 2, 5, 10, 50, 200, 1000, 5000].filter((r) => {
    const y = lnOf(r)
    return y >= lnMin - pad && y <= lnMax + pad
  })

  // de-collide labels: sort by end-y, enforce a minimum gap
  const order = items.map((d, i) => ({ i, y: sy(lnOf(d.ratio)) })).sort((a, b) => a.y - b.y)
  const minGap = 17
  const labelY = new Array(items.length)
  let prev = -Infinity
  for (const o of order) {
    let y = Math.max(o.y, prev + minGap)
    labelY[o.i] = y
    prev = y
  }

  return (
    <div ref={ref} className="slope">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Then-versus-now: each metric indexed to its 2019 baseline, fanning to its 2026 multiple."
        style={{ display: 'block', maxWidth: '100%' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* gridlines at ratio levels */}
        {gridR.map((r) => {
          const y = sy(lnOf(r))
          const one = r === 1
          return (
            <g key={r}>
              <line x1={xL} y1={y} x2={xR} y2={y} className={one ? 'slope__ref' : 'slope__grid'} />
              <text x={xL - 6} y={y + 3} textAnchor="end" className="chart-tick">{one ? '1×' : `${r < 1 ? r : r + '×'}`}</text>
            </g>
          )
        })}
        <text x={xL} y={H - 6} textAnchor="middle" className="slope__axislbl">2019</text>
        <text x={xR} y={H - 6} textAnchor="middle" className="slope__axislbl">2026</text>

        {items.map((d, i) => {
          const yEnd = sy(lnOf(d.ratio))
          const on = hover === null || hover === i
          const col = d.up ? 'var(--accent)' : 'var(--grey-55)'
          return (
            <g key={i} opacity={on ? 1 : 0.25} onMouseEnter={() => setHover(i)}>
              <line x1={xL} y1={yOne} x2={xR} y2={yEnd} stroke={col} strokeWidth={hover === i ? 2.5 : 1.5} strokeDasharray={d.isNew ? '3 3' : 'none'} />
              <circle cx={xR} cy={yEnd} r="3.5" fill={col} />
              {/* leader to the de-collided label */}
              <line x1={xR + 4} y1={yEnd} x2={xR + 14} y2={labelY[i]} className="slope__lead" />
              <text x={xR + (narrow ? 12 : 18)} y={labelY[i]} dy="0.32em" className={`slope__lbl${narrow ? ' slope__lbl--sm' : ''}`}>
                {d.metric}{narrow ? '' : ' '}<tspan className="slope__vals">{narrow ? '' : `${fmtNum(d.b)} → ${fmtNum(d.t)}`}</tspan>
              </text>
            </g>
          )
        })}
        <circle cx={xL} cy={yOne} r="4" fill="var(--ink)" />
      </svg>
    </div>
  )
}

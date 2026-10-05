import { useState } from 'react'
import { useWidth } from './useWidth.js'

// The double thousand, as wingspans. Each year runs to the right, walks to the
// left, on one shared scale. Dashed marks stand at a thousand kilometres on each
// side. The big years throw a long running arm but a stubby walking one; only the
// newest stretches past a thousand on both, the first year to span the full width.
// props: activities (the full log).
const RUN = new Set(['Run', 'TrailRun'])
const K = 1000

export default function DoubleThousand({ activities }) {
  const [ref, width] = useWidth(640)
  const [hover, setHover] = useState(null)
  if (!activities || !activities.length) return <div ref={ref} />

  const N = (x) => Number(x) || 0
  const agg = {}
  for (const a of activities) {
    const y = a.year; if (!y) continue
    const e = (agg[y] = agg[y] || { run: 0, walk: 0 })
    if (RUN.has(a.sport_type)) e.run += N(a.distance_km)
    if (a.sport_type === 'Walk') e.walk += N(a.distance_km)
  }
  const years = Object.keys(agg).filter((y) => agg[y].run + agg[y].walk >= 200).sort()
  if (!years.length) return <div ref={ref} />
  const rows = years.map((y) => ({ y, run: agg[y].run, walk: agg[y].walk, both: agg[y].run >= K && agg[y].walk >= K }))
  const maxRun = Math.max(...rows.map((r) => r.run)), maxWalk = Math.max(...rows.map((r) => r.walk))

  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 30, r: 12, b: 16, l: 12 }
  const rowH = narrow ? 30 : 34
  const H = m.t + rows.length * rowH + m.b
  const labelPad = narrow ? 30 : 46
  const u = (W - m.l - m.r - 2 * labelPad) / (maxRun + maxWalk)
  const cx = m.l + labelPad + maxWalk * u
  const barH = Math.min(16, rowH * 0.5)
  const rowY = (i) => m.t + i * rowH + rowH / 2

  return (
    <div ref={ref} className="dt2">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Each year's running distance to the right and walking to the left; only the newest passes a thousand on both." style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        {/* headers */}
        <text x={cx + 8} y={16} className="dt2__hdr">&larr; walked &nbsp;&middot;&nbsp; ran &rarr;</text>
        {/* 1,000 marks */}
        <line x1={cx + K * u} y1={m.t - 6} x2={cx + K * u} y2={H - m.b} stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.8" />
        <line x1={cx - K * u} y1={m.t - 6} x2={cx - K * u} y2={H - m.b} stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.8" />
        <text x={cx + K * u} y={m.t - 10} textAnchor="middle" className="dt2__kmark">1,000 km</text>
        <text x={cx - K * u} y={m.t - 10} textAnchor="middle" className="dt2__kmark">1,000 km</text>
        {/* center spine */}
        <line x1={cx} y1={m.t - 6} x2={cx} y2={H - m.b} stroke="var(--rule)" strokeWidth="1" />

        {rows.map((r, i) => {
          const y = rowY(i)
          const on = hover === null || hover === i
          const runFill = r.both ? 'var(--accent)' : 'var(--grey-45)'
          const walkFill = r.both ? 'var(--accent-ink)' : 'var(--grey-25)'
          return (
            <g key={r.y} opacity={on ? 1 : 0.45} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx} y={y - barH / 2} width={Math.max(1, r.run * u)} height={barH} rx="2" fill={runFill} />
              <rect x={cx - Math.max(1, r.walk * u)} y={y - barH / 2} width={Math.max(1, r.walk * u)} height={barH} rx="2" fill={walkFill} />
              <text x={cx} y={y - barH / 2 - 4} textAnchor="middle" className={`dt2__yr${r.both ? ' dt2__yr--hot' : ''}`}>{r.y}</text>
              <text x={cx + r.run * u + 5} y={y + 3} className="dt2__val">{Math.round(r.run)}</text>
              <text x={cx - r.walk * u - 5} y={y + 3} textAnchor="end" className="dt2__val">{Math.round(r.walk)}</text>
              {r.both && <text x={cx} y={y + barH / 2 + 11} textAnchor="middle" className="dt2__badge">both past 1,000: the double thousand</text>}
            </g>
          )
        })}
      </svg>
      {hover != null && rows[hover] && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(cx - 70, 8), W - 150), top: rowY(hover) + 14 }}>
          <strong>{rows[hover].y}</strong>{rows[hover].both ? ' · double thousand' : ''}
          <br />
          {Math.round(rows[hover].run)} km run &middot; {Math.round(rows[hover].walk)} km walked
        </div>
      )}
    </div>
  )
}

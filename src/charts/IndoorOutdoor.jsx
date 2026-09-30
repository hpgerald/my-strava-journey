import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, linePath, areaPath } from './primitives.js'

// Off the treadmill. Every year's activities split into two bands - indoors on a
// machine, or out in the world - stacked to a full hundred percent so only the
// balance shows. The waterline climbs steadily: in the first years nearly two of
// every three sessions were indoor, and by the last barely one in six. The habit
// did not just grow, it moved outside.
// props: activities (the full log, each with a `trainer` flag and a `date`)
const truthy = (v) => { const s = String(v).trim().toLowerCase(); return s === '1' || s === 'true' || s === 'yes' }

export default function IndoorOutdoor({ activities }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!activities || !activities.length) return <div ref={ref} />

  const agg = {}
  for (const a of activities) {
    const y = (a.date || '').slice(0, 4)
    if (!/^\d{4}$/.test(y)) continue
    const e = (agg[y] = agg[y] || { indoor: 0, n: 0 })
    if (truthy(a.trainer)) e.indoor += 1
    e.n += 1
  }
  const years = Object.keys(agg).sort()
  if (years.length < 2) return <div ref={ref} />
  const pts = years.map((y) => ({ y, n: agg[y].n, indoor: Math.round((agg[y].indoor / agg[y].n) * 100) }))
  const first = pts[0], last = pts[pts.length - 1]

  const W = Math.max(300, width)
  const narrow = W < 520
  const m = { t: 20, r: narrow ? 40 : 52, b: 26, l: narrow ? 40 : 52 }
  const H = narrow ? 220 : 250
  const x = linScale([0, pts.length - 1], [m.l, W - m.r])
  const y = linScale([0, 100], [H - m.b, m.t]) // 0% bottom, 100% top; outdoor from bottom
  const outdoorTop = pts.map((p, i) => [x(i), y(100 - p.indoor)]) // waterline
  const line = linePath(outdoorTop)
  const outdoorArea = areaPath(outdoorTop, H - m.b)
  const indoorArea = areaPath(outdoorTop, m.t) // above the waterline, up to 100%
  const midI = Math.floor(pts.length / 2)

  return (
    <div ref={ref} className="io">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Indoor share of activities falls from ${first.indoor} percent in ${first.y} to ${last.indoor} percent in ${last.y}.`}
        style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        <path d={indoorArea} fill="var(--grey-15)" />
        <path d={outdoorArea} fill="color-mix(in srgb, var(--accent) 30%, var(--paper))" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" />

        {/* band labels */}
        <text x={x(midI)} y={H - m.b - 12} textAnchor="middle" className="io__band">OUTDOORS</text>
        <text x={x(midI)} y={m.t + 16} textAnchor="middle" className="io__band io__band--mute">INDOORS</text>

        {/* endpoint indoor-share callouts */}
        <g>
          <circle cx={x(0)} cy={y(100 - first.indoor)} r="3.5" fill="var(--accent)" />
          <text x={x(0)} y={y(100 - first.indoor) - 9} textAnchor="start" className="io__call">{first.indoor}% indoor</text>
          <circle cx={x(pts.length - 1)} cy={y(100 - last.indoor)} r="3.5" fill="var(--accent)" />
          <text x={x(pts.length - 1)} y={y(100 - last.indoor) - 9} textAnchor="end" className="io__call">{last.indoor}%</text>
        </g>

        {/* hover markers */}
        {pts.map((p, i) => (
          <g key={p.y} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={x(i) - (W - m.l - m.r) / (pts.length * 2)} y={m.t} width={(W - m.l - m.r) / pts.length} height={H - m.t - m.b} fill="transparent" />
            {hover === i && <line x1={x(i)} y1={m.t} x2={x(i)} y2={H - m.b} stroke="var(--ink)" strokeWidth="1" opacity="0.25" />}
            <text x={x(i)} y={H - 8} textAnchor="middle" className="chart-tick">&rsquo;{p.y.slice(2)}</text>
          </g>
        ))}
      </svg>
      {hover != null && pts[hover] && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover) - 60, 8), W - 150), top: 6 }}>
          <strong>{pts[hover].y}</strong>
          <br />
          {100 - pts[hover].indoor}% outdoor · {pts[hover].indoor}% indoor
          <br />
          {pts[hover].n} activities
        </div>
      )}
    </div>
  )
}

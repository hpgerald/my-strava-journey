import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// A single spectrum from all-road to all-trail, every pair placed by the share of
// its distance actually run off-road, the bubble sized by distance. The reveal is
// what sits where: pairs with "Trail" in the name that never left the tarmac land
// on the road end anyway. rows: [{ label, trailPct, km, named }].
export default function TerrainAxis({ rows }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const m = { t: 44, b: 20, l: 56, r: 56 }
  const iw = W - m.l - m.r
  const sx = linScale([0, 100], [m.l, m.l + iw])
  const maxKm = Math.max(...rows.map((r) => r.km), 1)
  const rOf = (km) => 5 + Math.sqrt(km / maxKm) * 13
  const laneStep = 40

  // greedy anti-collision, stacking downward only so nothing rides into the axis
  const laneY = m.t + 18
  const placed = rows
    .map((r, i) => ({ r, i, x: sx(r.trailPct), rad: rOf(r.km) }))
    .sort((a, b) => a.x - b.x)
  const nodes = []
  for (const p of placed) {
    let lane = 0
    for (;;) {
      const y = laneY + lane * laneStep
      const clash = nodes.some((n) => n.y === y && Math.abs(n.x - p.x) < n.rad + p.rad + 6)
      if (!clash || lane > 8) { p.y = y; break }
      lane += 1
    }
    nodes.push(p)
  }
  const maxLaneY = Math.max(...nodes.map((n) => n.y), laneY)

  // label layout for named pairs: shorten, edge-anchor, and pack onto rows so
  // labels that sit close on the axis stagger vertically instead of overlapping
  const shortName = (s) => s.replace(/\s*\(.*\)$/, '')
  const labels = nodes.filter((n) => n.r.named).map((n) => {
    const txt = shortName(n.r.label)
    const halfW = txt.length * 3.3 + 6
    let anchor = 'middle', lx = n.x
    if (n.x - halfW < 2) { anchor = 'start'; lx = 2 }
    else if (n.x + halfW > W - 2) { anchor = 'end'; lx = W - 2 }
    const left = anchor === 'start' ? lx : anchor === 'end' ? lx - 2 * halfW : lx - halfW
    return { n, txt, anchor, lx, left, right: left + 2 * halfW }
  }).sort((a, b) => a.left - b.left)
  const rowRight = []
  for (const L of labels) {
    let r = 0
    while (r < rowRight.length && rowRight[r] > L.left - 4) r += 1
    L.row = r; rowRight[r] = L.right
  }
  const labelByI = Object.fromEntries(labels.map((L) => [L.n.i, L]))
  const H = maxLaneY + 22 + Math.max(1, rowRight.length) * 15 + m.b

  return (
    <div ref={ref} className="taxis">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Each pair of shoes placed on a road-to-trail spectrum by its off-road share."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* the spectrum line */}
        <line x1={m.l} y1={laneY - 26} x2={m.l + iw} y2={laneY - 26} className="taxis__line" />
        <text x={m.l} y={laneY - 32} textAnchor="start" className="taxis__end">ALL ROAD</text>
        <text x={m.l + iw} y={laneY - 32} textAnchor="end" className="taxis__end">ALL TRAIL</text>
        {[25, 50, 75].map((t) => (
          <line key={t} x1={sx(t)} y1={laneY - 30} x2={sx(t)} y2={H - m.b} className="taxis__grid" />
        ))}

        {nodes.map((p) => {
          const on = hover === null || hover === p.i
          const named = p.r.named
          return (
            <g key={p.i} opacity={on ? 1 : 0.35} onMouseEnter={() => setHover(p.i)} onMouseLeave={() => setHover(null)}>
              <line x1={p.x} y1={laneY - 26} x2={p.x} y2={p.y} className="taxis__stem" />
              <circle cx={p.x} cy={p.y} r={p.rad} fill={named ? 'var(--accent-mute)' : 'var(--grey-10)'} stroke={named ? 'var(--accent)' : 'var(--grey-55)'} strokeWidth="1.5" />
              {named && labelByI[p.i] && (
                <text x={labelByI[p.i].lx} y={p.y + p.rad + 12 + labelByI[p.i].row * 14} textAnchor={labelByI[p.i].anchor} className="taxis__lbl taxis__lbl--named">{labelByI[p.i].txt}</text>
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(nodes.find((n) => n.i === hover).x, 70), W - 90), top: 4 }}>
          <strong>{rows[hover].label}</strong>
          <br />
          {Math.round(rows[hover].trailPct)}% trail &middot; {Math.round(rows[hover].km)} km
        </div>
      )}
    </div>
  )
}

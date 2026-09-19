import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// Every pair as an iceberg. Above the waterline is the distance this log actually
// saw; below it, faint and submerged, are the miles the pair ran before the
// record begins (its Strava odometer minus what shows here). Most pairs float
// high; a few hide a deep past. rows: [{ label, logged, hidden }], biggest total first.
export default function GhostMiles({ rows }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const m = { t: 22, b: 74, l: 30, r: 12 }
  const maxAbove = Math.max(...rows.map((r) => r.logged), 1)
  const maxBelow = Math.max(...rows.map((r) => r.hidden), 1)
  const aboveH = 150
  const belowH = 150
  const H = m.t + aboveH + belowH + m.b
  const waterY = m.t + aboveH
  const sAbove = linScale([0, maxAbove], [0, aboveH])
  const sBelow = linScale([0, maxBelow], [0, belowH - 24])
  const band = (W - m.l - m.r) / rows.length
  const bw = Math.min(band * 0.5, 72)
  const cx = (i) => m.l + band * i + band / 2

  return (
    <div ref={ref} className="ghost">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Each pair's logged distance above a waterline and its earlier, hidden miles below."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="ghostHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--grey-10)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--grey-35)" strokeWidth="1.5" />
          </pattern>
        </defs>

        {rows.map((r, i) => {
          const on = hover === null || hover === i
          const aH = sAbove(r.logged)
          const bH = sBelow(r.hidden)
          const x = cx(i) - bw / 2
          return (
            <g key={i} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* logged, above the water */}
              <rect x={x} y={waterY - aH} width={bw} height={Math.max(1, aH)} fill="var(--accent)" />
              {/* hidden, submerged */}
              {r.hidden > 0 && <rect x={x} y={waterY} width={bw} height={Math.max(1, bH)} fill="url(#ghostHatch)" stroke="var(--grey-35)" strokeWidth="0.5" />}
              {/* the tip value */}
              <text x={cx(i)} y={waterY - aH - 5} textAnchor="middle" className="ghost__tip mono">{Math.round(r.logged)}</text>
              {/* the submerged value */}
              {r.hidden > 0 && <text x={cx(i)} y={waterY + bH + 14} textAnchor="middle" className="ghost__hidden mono">{Math.round(r.hidden)} km hidden</text>}
              {/* the pair label, rotated under the axis */}
              <text x={cx(i)} y={H - m.b + 16} textAnchor="end" transform={`rotate(-40 ${cx(i)} ${H - m.b + 16})`} className="ghost__lbl">{r.label}</text>
            </g>
          )
        })}

        {/* the waterline (the dashed rule; explained in the figure note) */}
        <line x1={m.l - 6} y1={waterY} x2={W - m.r} y2={waterY} className="ghost__water" />
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(cx(hover), 70), W - 90), top: 4 }}>
          <strong>{rows[hover].label}</strong>
          <br />
          {Math.round(rows[hover].logged)} km here
          {rows[hover].hidden > 0 ? ` · ${Math.round(rows[hover].hidden)} km before` : ' · all miles accounted for'}
        </div>
      )}
    </div>
  )
}

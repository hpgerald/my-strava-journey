import { useState } from 'react'
import { useWidth } from './useWidth.js'

// The fleet by distance, as footprints: one print for every 200 km run in a pair,
// the last one part-filled for the remainder. The workhorse (longest trail, row
// one) carries the accent, a ring marks the pairs still in rotation. An isotype
// row reads the mileage at a glance. rows: [{ label, km, trail, current }], longest first.
const PER = 200

function Print({ x, y, s, fill, opacity = 1 }) {
  // a minimal footprint: forefoot pad + heel
  return (
    <g opacity={opacity}>
      <ellipse cx={x} cy={y - s * 0.28} rx={s * 0.42} ry={s * 0.52} fill={fill} />
      <ellipse cx={x} cy={y + s * 0.5} rx={s * 0.26} ry={s * 0.32} fill={fill} />
    </g>
  )
}

const short = (s) => s
  .replace(/\s*\(.*\)$/, '')
  .replace(/^(Nike|Under Armour|Saucony|Adidas|Asics|Hoka|Brooks)\s+/i, '')
  .replace(/^(Air Zoom|Zoom)\s+/, '')
  .replace(/\s+XT\s+\d+$/, '')

export default function FleetPrints({ rows }) {
  const [ref, width] = useWidth(600)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 560
  const labelW = narrow ? 104 : 150
  const valW = 62
  const avail = W - labelW - valW
  const maxPrints = Math.max(...rows.map((r) => Math.ceil(r.km / PER)))
  const step = Math.min(narrow ? 22 : 30, avail / maxPrints)
  const gs = Math.min(step * 0.62, 15) // glyph scale
  const rowH = narrow ? 40 : 46
  const H = rows.length * rowH + 34

  return (
    <div ref={ref} className="prints">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Distance run in each pair, one footprint per 200 kilometres."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {rows.map((r, i) => {
          const cy = i * rowH + rowH / 2 + 6
          const full = Math.floor(r.km / PER)
          const frac = (r.km % PER) / PER
          const on = hover === null || hover === i
          const fill = i === 0 ? 'var(--accent)' : 'var(--ink)'
          const n = full + (frac > 0.05 ? 1 : 0)
          return (
            <g key={i} opacity={on ? 1 : 0.45} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <text x={labelW - 12} y={cy + 4} textAnchor="end" className={`prints__name${narrow ? ' prints__name--sm' : ''}`}>{short(r.label)}</text>
              {Array.from({ length: n }).map((_, k) => {
                const isLast = k === n - 1 && frac > 0.05 && frac < 0.95
                return <Print key={k} x={labelW + step * (k + 0.5)} y={cy} s={gs} fill={fill} opacity={isLast ? 0.4 : 1} />
              })}
              {r.current && <circle cx={labelW + step * (n - 0.5)} cy={cy} r={gs * 0.95} fill="none" stroke="var(--accent-ink)" strokeWidth="1.5" />}
              <text x={W - 6} y={cy + 4} textAnchor="end" className="prints__val mono">{Math.round(r.km).toLocaleString('en-US')}<tspan className="prints__unit"> km</tspan></text>
            </g>
          )
        })}
        <text x={labelW} y={H - 8} className="prints__key">each footprint = {PER} km &middot; ring = still in rotation</text>
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(labelW + 20, W - 120), top: hover * rowH }}>
          <strong>{rows[hover].label}</strong>
          <br />
          {Math.round(rows[hover].km).toLocaleString('en-US')} km &middot; {rows[hover].trail ? 'trail' : 'road'}
        </div>
      )}
    </div>
  )
}

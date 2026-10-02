import { useState } from 'react'
import { useWidth } from './useWidth.js'

// The seven years as rings. Each ring is a year, innermost the first; each ring is
// cut into twelve months, shaded by how many activities that month held. Read from
// the centre out and the two pale inner rings (2019, 2020) give way to dense outer
// ones. Pick a year to read its busiest month and a line about it. rows:
// monthly_totals [{ month:'YYYY-MM', activities }].
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FACT = {
  2019: 'The first upload is a 31 km bike ride in August. Twenty-seven activities, then it goes quiet.',
  2020: 'A near-dormant year. Thirty-five activities, most of them in one short summer run.',
  2021: 'July flips the switch: two activities in June become fifty-eight in July, and it never fully stops again.',
  2022: 'The biggest year on record, 443 activities and close to 2,900 km on foot.',
  2023: 'March holds the 100 km stage race, four nights back to back.',
  2024: 'Quieter by distance, but not one calendar month goes unlogged.',
  2025: 'The climb back. Distance rises again, week after week.',
  2026: 'Still going, already near three hundred activities with months to spare.',
}

function seg(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r1} ${r1} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${r0} ${r0} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`
}

export default function HabitAtlas({ rows }) {
  const [ref, width] = useWidth(760)
  const [hover, setHover] = useState(null)
  const N = (x) => Number(x) || 0
  if (!rows || !rows.length) return <div ref={ref} />

  const byYM = {}
  let maxN = 1
  for (const r of rows) {
    const y = r.month.slice(0, 4), m = +r.month.slice(5, 7) - 1
    ;(byYM[y] = byYM[y] || Array(12).fill(null))[m] = N(r.activities)
    if (N(r.activities) > maxN) maxN = N(r.activities)
  }
  const years = Object.keys(byYM).sort()
  const [sel, setSel] = useState(years[years.length - 1])

  const yearTot = (y) => byYM[y].reduce((a, v) => a + (v || 0), 0)
  const busiest = (y) => {
    let bi = 0, bv = -1
    byYM[y].forEach((v, i) => { if ((v || 0) > bv) { bv = v || 0; bi = i } })
    return { month: MON[bi], n: bv }
  }

  const W = Math.max(300, width)
  const narrow = W < 620
  const dia = narrow ? Math.min(W, 340) : 360
  const cx = dia / 2, cy = dia / 2
  const r0 = dia * 0.13
  const ringW = (dia / 2 - r0 - 6) / years.length
  const shade = (v) => v == null ? 'var(--grey-06)' : `color-mix(in srgb, var(--accent) ${Math.round(14 + (v / maxN) * 86)}%, var(--paper))`
  const A = (m) => -Math.PI / 2 + (m / 12) * Math.PI * 2

  const selIdx = years.indexOf(sel)
  const b = busiest(sel)

  const atlas = (
    <svg width={dia} height={dia} viewBox={`0 0 ${dia} ${dia}`} role="img"
      aria-label={`Seven years of activity as concentric rings, ${years[0]} innermost to ${years[years.length - 1]} outermost, each month shaded by how busy it was.`}
      style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
      {years.map((y, yi) => {
        const ri = r0 + yi * ringW
        const ro = ri + ringW - 1.5
        const dim = sel && y !== sel ? 0.32 : 1
        return (
          <g key={y} opacity={dim}>
            {byYM[y].map((v, m) => (
              <path key={m} d={seg(cx, cy, ri, ro, A(m) + 0.012, A(m + 1) - 0.012)}
                fill={shade(v)}
                onMouseEnter={() => setHover({ y, m, v })} onMouseLeave={() => setHover(null)}
                onClick={() => setSel(y)} style={{ cursor: 'pointer' }} />
            ))}
          </g>
        )
      })}
      {/* selected year label at centre */}
      <text x={cx} y={cy - 2} textAnchor="middle" className="atlas__cyr">{sel}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="atlas__csub">{yearTot(sel)} acts</text>
      {/* month ticks around the outside */}
      {MON.map((mn, m) => {
        const a = A(m + 0.5), rr = dia / 2 - 1
        return <text key={m} x={cx + rr * Math.cos(a)} y={cy + rr * Math.sin(a) + 3} textAnchor="middle" className="atlas__mon">{mn[0]}</text>
      })}
    </svg>
  )

  return (
    <div ref={ref} className="atlas">
      <div className={`atlas__grid${narrow ? ' is-narrow' : ''}`}>
        <div className="atlas__ring" style={{ position: 'relative' }}>
          {atlas}
          {hover && (
            <div className="chart-tip" style={{ left: cx, top: 0 }}>
              <strong>{MON[hover.m]} {hover.y}</strong><br />
              {hover.v == null ? 'no activity' : `${hover.v} activities`}
            </div>
          )}
        </div>
        <div className="atlas__panel">
          <div className="atlas__years" role="tablist" aria-label="Choose a year">
            {years.map((y) => (
              <button key={y} role="tab" aria-selected={y === sel}
                className={`atlas__ybtn${y === sel ? ' is-on' : ''}`} onClick={() => setSel(y)}>{y}</button>
            ))}
          </div>
          <p className="atlas__read">
            <span className="atlas__big">{sel}</span>
            <span className="atlas__meta">{yearTot(sel)} activities · busiest {b.month} ({b.n})</span>
          </p>
          <p className="atlas__fact">{FACT[sel] || ''}</p>
        </div>
      </div>
    </div>
  )
}

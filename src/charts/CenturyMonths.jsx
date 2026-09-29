import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The century months. Each month's distance on foot as a slim column against a
// bold 100 km waterline. The stretch of every column that breaks the surface is
// the part that cleared the century; those caps, read left to right, are the 48
// months that made it, and the longest unbroken run of them is bracketed.
// props: months [{ month:'YYYY-MM', distance_km, activities }], line (default 100).
const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CenturyMonths({ months, line = 100 }) {
  const [ref, width] = useWidth(700)
  const [hover, setHover] = useState(null)
  if (!months || !months.length) return <div ref={ref} />

  const N = (x) => Number(x) || 0
  const km = {}; const acts = {}
  for (const m of months) { km[m.month] = N(m.distance_km); acts[m.month] = N(m.activities) }
  const all = months.map((m) => m.month).sort()
  // full calendar span so inactive months break the chains
  const cal = []
  { let [y, mo] = [+all[0].slice(0, 4), +all[0].slice(5, 7)]
    const [ey, em] = [+all[all.length - 1].slice(0, 4), +all[all.length - 1].slice(5, 7)]
    while (y < ey || (y === ey && mo <= em)) { cal.push(`${y}-${String(mo).padStart(2, '0')}`); mo += 1; if (mo > 12) { mo = 1; y += 1 } } }
  const over = cal.map((c) => (km[c] || 0) >= line)
  const total = over.filter(Boolean).length
  // longest run of consecutive century months
  let best = 0, bestEnd = -1, cur = 0
  over.forEach((o, i) => { if (o) { cur += 1; if (cur > best) { best = cur; bestEnd = i } } else cur = 0 })
  const bestStart = bestEnd - best + 1

  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 22, r: 12, b: 30, l: narrow ? 30 : 38 }
  const H = narrow ? 250 : 290
  const sx = linScale([0, cal.length], [m.l, W - m.r])
  const slotW = (W - m.l - m.r) / cal.length
  const barW = Math.max(2, slotW * 0.78)
  const maxKm = Math.max(...cal.map((c) => km[c] || 0))
  const sy = linScale([0, maxKm * 1.05], [H - m.b, m.t])
  const yLine = sy(line)

  const years = [...new Set(cal.map((c) => c.slice(0, 4)))]

  return (
    <div ref={ref} className="cent">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Monthly distance on foot against a 100 km waterline; 48 months break the surface." style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        {/* year ticks */}
        {years.map((y) => {
          const i = cal.indexOf(cal.find((c) => c.slice(0, 4) === y))
          return <text key={y} x={sx(i) + 2} y={H - 8} className="cent__yr">{y}</text>
        })}
        {/* the longest-chain bracket */}
        {best >= 3 && (
          <g>
            <line x1={sx(bestStart) + slotW * 0.1} y1={m.t - 4} x2={sx(bestEnd + 1) - slotW * 0.1} y2={m.t - 4} stroke="var(--accent-ink)" strokeWidth="1.5" />
            <line x1={sx(bestStart) + slotW * 0.1} y1={m.t - 4} x2={sx(bestStart) + slotW * 0.1} y2={m.t} stroke="var(--accent-ink)" strokeWidth="1.5" />
            <line x1={sx(bestEnd + 1) - slotW * 0.1} y1={m.t - 4} x2={sx(bestEnd + 1) - slotW * 0.1} y2={m.t} stroke="var(--accent-ink)" strokeWidth="1.5" />
            <text x={(sx(bestStart) + sx(bestEnd + 1)) / 2} y={m.t - 8} textAnchor="middle" className="cent__chain">{best} in a row</text>
          </g>
        )}
        {/* columns */}
        {cal.map((c, i) => {
          const v = km[c] || 0
          if (v <= 0) return null
          const x = sx(i) + (slotW - barW) / 2
          const on = hover === null || hover === c
          const inBest = i >= bestStart && i <= bestEnd
          const capTop = sy(Math.max(v, line))
          const below = v >= line ? line : v
          return (
            <g key={c} opacity={on ? 1 : 0.45} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
              {/* below-waterline part */}
              <rect x={x} y={sy(below)} width={barW} height={(H - m.b) - sy(below)} fill="var(--grey-15)" />
              {/* above-waterline cap */}
              {v > line && <rect x={x} y={capTop} width={barW} height={yLine - capTop} rx="1" fill={inBest ? 'var(--accent-ink)' : 'var(--accent)'} />}
            </g>
          )
        })}
        {/* the waterline */}
        <line x1={m.l} y1={yLine} x2={W - m.r} y2={yLine} stroke="var(--ink)" strokeWidth="1.5" />
        <text x={m.l - 6} y={yLine + 3} textAnchor="end" className="cent__wl">{line}</text>
        <text x={m.l - 6} y={yLine - 8} textAnchor="end" className="cent__wlk">km</text>
      </svg>
      <div className="cent__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> broke 100 km</span>
        <span><i className="chart-swatch" style={{ background: 'var(--accent-ink)' }} /> the longest run</span>
        <span><i className="chart-swatch" style={{ background: 'var(--grey-15)' }} /> under the line</span>
        <span className="cent__note">{total} of {cal.length} months cleared the century</span>
      </div>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(cal.indexOf(hover)) - 60, 8), W - 150), top: m.t }}>
          <strong>{MFULL[+hover.slice(5, 7) - 1]} {hover.slice(0, 4)}</strong>
          <br />
          {Math.round(km[hover] || 0)} km on foot &middot; {(km[hover] || 0) >= line ? 'century' : 'under'}
        </div>
      )}
    </div>
  )
}

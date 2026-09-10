import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, smoothAreaPath, smoothLinePath } from './primitives.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The Switch: monthly activity across the whole history, gaps filled with zero so
// the two flat years read honestly, then the July-2021 wall. Everything before
// the switch is drawn in gray, everything after in the accent, with the moment
// annotated. rows: monthly_totals [{ month 'YYYY-MM', activities }]. switchMonth
// is the 'YYYY-MM' where the habit turns on.
export default function IgnitionStream({ rows, switchMonth = '2021-07' }) {
  const [ref, width] = useWidth(900)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  // fill every month from first to last with 0 where missing
  const byMonth = Object.fromEntries(rows.map((r) => [r.month, Number(r.activities) || 0]))
  const keys = rows.map((r) => r.month).sort()
  const [y0, m0] = keys[0].split('-').map(Number)
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number)
  const months = []
  let y = y0
  let mo = m0
  while (y < y1 || (y === y1 && mo <= m1)) {
    const key = `${y}-${String(mo).padStart(2, '0')}`
    months.push({ key, y, mo, n: byMonth[key] || 0 })
    mo += 1
    if (mo > 12) { mo = 1; y += 1 }
  }

  const W = Math.max(360, width)
  const H = 260
  const m = { t: 30, r: 12, b: 26, l: 30 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const N = months.length
  const maxN = Math.max(...months.map((d) => d.n), 1)
  const xAt = (i) => m.l + (i / (N - 1)) * iw
  const sy = linScale([0, maxN], [m.t + ih, m.t])
  const baseY = m.t + ih
  const switchIdx = Math.max(0, months.findIndex((d) => d.key === switchMonth))

  const pts = months.map((d, i) => [xAt(i), sy(d.n)])
  const before = pts.slice(0, switchIdx + 1)
  const after = pts.slice(switchIdx)

  // year gridlines
  const yearTicks = []
  for (let yr = y0 + (m0 === 1 ? 0 : 1); yr <= y1; yr++) {
    const idx = months.findIndex((d) => d.y === yr && d.mo === 1)
    if (idx >= 0) yearTicks.push({ yr, x: xAt(idx) })
  }
  const switchX = xAt(switchIdx)

  return (
    <div ref={ref} className="ignition">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Activities per month across the whole history, flat for two years then surging from July 2021."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(ev) => {
          const rect = ev.currentTarget.getBoundingClientRect()
          const x = ((ev.clientX - rect.left) / rect.width) * W
          const i = Math.max(0, Math.min(N - 1, Math.round(((x - m.l) / iw) * (N - 1))))
          setHover({ i, x: xAt(i), ...months[i] })
        }}
      >
        {yearTicks.map((t) => (
          <g key={t.yr}>
            <line x1={t.x} y1={m.t} x2={t.x} y2={baseY} className="ignition__grid" />
            <text x={t.x} y={H - 8} textAnchor="middle" className="chart-tick">{t.yr}</text>
          </g>
        ))}
        {/* the two eras */}
        <path d={smoothAreaPath(before, baseY)} className="ignition__before" />
        <path d={smoothAreaPath(after, baseY)} className="ignition__after" />
        <path d={smoothLinePath(after)} className="ignition__line" />
        {/* the switch marker */}
        <line x1={switchX} y1={m.t - 6} x2={switchX} y2={baseY} className="ignition__switch" />
        <text x={switchX + 6} y={m.t + 4} className="ignition__switchlbl">July 2021 · the switch</text>
        <line x1={m.l} y1={baseY} x2={m.l + iw} y2={baseY} stroke="var(--ink)" strokeWidth="1" />
        {hover && (
          <circle cx={hover.x} cy={sy(hover.n)} r="4" fill="var(--ink)" stroke="var(--paper)" strokeWidth="1.5" />
        )}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(hover.x, 70), W - 70), top: 2 }}>
          <strong>{MON[hover.mo - 1]} {hover.y}</strong>
          <br />
          {hover.n} {hover.n === 1 ? 'activity' : 'activities'}
        </div>
      )}
    </div>
  )
}

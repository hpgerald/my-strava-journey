import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// Seven years as a pulse: every month a beat mirrored around a central spine,
// its height the month's activity count. Read left to right it is a heartbeat
// that barely registers for two years, then quickens the month the switch is
// thrown and never settles back. rows: monthly_totals [{month, activities}].
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function PulseYears({ rows, switchMonth = '2021-07' }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  // build a continuous month axis, filling gaps with 0 so quiet stretches flatline
  const byMonth = {}
  for (const r of rows) byMonth[r.month] = (byMonth[r.month] || 0) + (Number(r.activities) || 0)
  const keys = Object.keys(byMonth).sort()
  const [y0, m0] = keys[0].split('-').map(Number)
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number)
  const months = []
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m++) {
    if (m > 12) { m = 1; y++ }
    const key = `${y}-${String(m).padStart(2, '0')}`
    months.push({ key, y, m, v: byMonth[key] || 0 })
  }

  const W = Math.max(320, width)
  const H = 240
  const pad = { t: 24, b: 30, l: 8, r: 8 }
  const mid = pad.t + (H - pad.t - pad.b) / 2
  const halfMax = (H - pad.t - pad.b) / 2 - 4
  const maxV = Math.max(...months.map((d) => d.v)) || 1
  const sx = linScale([0, months.length - 1], [pad.l + 6, W - pad.r - 6])
  const barW = Math.max(1.5, ((W - pad.l - pad.r) / months.length) * 0.6)
  const switchIdx = months.findIndex((d) => d.key >= switchMonth)

  // year boundary ticks
  const yearTicks = months.map((d, i) => (d.m === 1 ? { i, y: d.y } : null)).filter(Boolean)

  return (
    <div ref={ref} className="pulse">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Monthly activity across seven years as a pulse, faint before July 2021 and strong after."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* year gridlines */}
        {yearTicks.map((t) => (
          <g key={t.y}>
            <line x1={sx(t.i)} y1={pad.t - 4} x2={sx(t.i)} y2={H - pad.b + 4} className="pulse__yr" />
            <text x={sx(t.i)} y={H - 10} textAnchor="middle" className="chart-tick">{t.y}</text>
          </g>
        ))}

        {/* the spine */}
        <line x1={pad.l} y1={mid} x2={W - pad.r} y2={mid} className="pulse__spine" />

        {/* the switch */}
        {switchIdx >= 0 && (
          <>
            <line x1={sx(switchIdx)} y1={pad.t - 8} x2={sx(switchIdx)} y2={H - pad.b + 4} className="pulse__switch" />
            <text x={sx(switchIdx) + 5} y={pad.t - 1} className="pulse__switchlbl">July 2021 · the switch</text>
          </>
        )}

        {/* the beats */}
        {months.map((d, i) => {
          const h = (d.v / maxV) * halfMax
          const before = i < switchIdx
          const on = hover === null || hover === i
          return (
            <rect
              key={d.key}
              x={sx(i) - barW / 2}
              y={mid - h}
              width={barW}
              height={Math.max(0.6, h * 2)}
              rx={barW > 3 ? 1 : 0}
              fill={before ? 'var(--grey-45)' : 'var(--accent)'}
              opacity={on ? (before ? 0.7 : 1) : 0.3}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(hover), 60), W - 60), top: mid - (months[hover].v / maxV) * halfMax - 44 }}>
          <strong>{MON[months[hover].m - 1]} {months[hover].y}</strong>
          <br />
          {months[hover].v} {months[hover].v === 1 ? 'activity' : 'activities'}
        </div>
      )}
    </div>
  )
}

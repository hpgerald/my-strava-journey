import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The Ras Kilomoni challenge: fifty trips to one headland across 2026, each one
// titled in sequence, I to L. Two readings of the same fifty. Above, a stamp wall
// - one numbered tile per trip, run or walk, the full grid the goal met exactly.
// Below, a cadence ribbon placing each trip on the calendar, its bar the distance
// covered, so the bursts and the long gaps show. rows: [{ day, roman, date, sport,
// distance_km, elevation_m }], in order.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const t = (d) => Date.parse(d + 'T00:00:00Z')
const MILE = { 50: '2,000th activity' } // curated finale note

export default function RasKilomoni({ rows }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const data = [...rows].sort((a, b) => Number(a.day) - Number(b.day))
  const W = Math.max(320, width)
  const narrow = W < 480
  const cols = narrow ? 5 : 10
  const nrows = Math.ceil(data.length / cols)
  const gap = narrow ? 8 : 9
  // sized to fill its column at a tasteful tile size, bounded so it never bloats
  const s = Math.min(narrow ? 60 : 64, (W - (cols - 1) * gap) / cols)
  const gridW = cols * s + (cols - 1) * gap
  const gx = (W - gridW) / 2
  const gridTop = 6
  const gridH = nrows * s + (nrows - 1) * gap

  // cadence ribbon geometry
  const ribGap = 34
  const ribTop = gridTop + gridH + ribGap
  const kmMax = Math.max(...data.map((d) => Number(d.distance_km) || 0))
  const ribH = narrow ? 58 : 68
  const rx = { l: 4, r: 4 }
  const d0 = data[0].date, d1 = data[data.length - 1].date
  const y0 = new Date(d0).getUTCFullYear(), m0 = new Date(d0).getUTCMonth()
  const y1 = new Date(d1).getUTCFullYear(), m1 = new Date(d1).getUTCMonth()
  const axMin = t(`${y0}-${String(m0 + 1).padStart(2, '0')}-01`)
  const axMaxD = new Date(Date.UTC(y1, m1 + 1, 1))
  const axMax = axMaxD.getTime()
  const sx = linScale([axMin, axMax], [rx.l, W - rx.r])
  const sBar = linScale([0, kmMax], [0, ribH - 14])
  const months = []
  for (let d = new Date(Date.UTC(y0, m0, 1)); d.getTime() < axMax; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push({ x: sx(d.getTime()), label: MON[d.getUTCMonth()] })
  }
  const ribBase = ribTop + ribH
  const H = ribBase + 22

  const romanFont = (roman) => Math.max(9, Math.min(s * 0.34, (s * 0.82) / (roman.length * 0.6)))
  const isRun = (sp) => sp === 'Run' || sp === 'TrailRun'

  const tip = hover != null ? data[hover] : null

  return (
    <div ref={ref} className="rask">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Fifty numbered trips to Ras Kilomoni as a stamp wall, and a calendar ribbon of when each happened and how far it went."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* ---- stamp wall ---- */}
        {data.map((d, i) => {
          const col = i % cols, row = Math.floor(i / cols)
          const x = gx + col * (s + gap), y = gridTop + row * (s + gap)
          const run = isRun(d.sport)
          const on = hover === null || hover === i
          const mile = MILE[d.day]
          return (
            <g key={d.day} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect
                x={x} y={y} width={s} height={s} rx="7"
                fill={run ? 'var(--accent)' : 'var(--paper)'}
                stroke={run ? 'var(--accent)' : 'var(--rule)'}
                strokeWidth={run ? 1 : 1.4}
              />
              {mile && <rect x={x + 1.5} y={y + 1.5} width={s - 3} height={s - 3} rx="6" fill="none" stroke="var(--ink)" strokeWidth="2" />}
              <text
                x={x + s / 2} y={y + s / 2 + romanFont(d.roman) * 0.35}
                textAnchor="middle" className="rask__roman"
                style={{ fontSize: romanFont(d.roman), fill: run ? 'var(--paper)' : 'var(--ink)' }}
              >{d.roman}</text>
              {mile && <circle cx={x + s - 7} cy={y + 7} r="3.2" fill="var(--ink)" />}
            </g>
          )
        })}

        {/* ---- cadence ribbon ---- */}
        {months.map((mo, i) => (
          <g key={'m' + i}>
            <line x1={mo.x} y1={ribTop - 4} x2={mo.x} y2={ribBase} className="rask__grid" />
            <text x={mo.x + 4} y={ribBase + 14} className="rask__mon">{mo.label}</text>
          </g>
        ))}
        <line x1={rx.l} y1={ribBase} x2={W - rx.r} y2={ribBase} stroke="var(--rule)" strokeWidth="1" />
        {data.map((d, i) => {
          const km = Number(d.distance_km) || 0
          const bx = sx(t(d.date))
          const bh = Math.max(3, sBar(km))
          const run = isRun(d.sport)
          const on = hover === null || hover === i
          return (
            <rect
              key={'b' + d.day} x={bx - 2.1} y={ribBase - bh} width={4.2} height={bh} rx="1.4"
              fill={run ? 'var(--accent)' : 'var(--grey-45)'}
              opacity={on ? 1 : 0.4}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            />
          )
        })}
        <text x={rx.l} y={ribTop - 12} className="rask__ribttl">EACH TRIP ON THE CALENDAR &middot; BAR = DISTANCE</text>
      </svg>

      <div className="rask__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> Run &middot; {data.filter((d) => isRun(d.sport)).length}</span>
        <span><i className="chart-swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1.4px var(--rule)' }} /> Walk &middot; {data.filter((d) => !isRun(d.sport)).length}</span>
        <span><i className="chart-swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 2px var(--ink)' }} /> the 50th, also the 2,000th activity</span>
      </div>

      {tip && (() => {
        const col = hover % cols, row = Math.floor(hover / cols)
        const cx = gx + col * (s + gap) + s / 2
        const yTop = gridTop + row * (s + gap)
        const left = Math.min(Math.max(cx - 72, 4), W - 148)
        const top = row > 0 ? yTop - 60 : yTop + s + 8
        return (
          <div className="chart-tip" style={{ left, top }}>
            <strong>Ras Kilomoni {tip.roman}</strong>
            <br />
            {MON[new Date(tip.date).getUTCMonth()]} {new Date(tip.date).getUTCDate()}, {new Date(tip.date).getUTCFullYear()} &middot; {tip.sport}
            <br />
            {Number(tip.distance_km).toFixed(1)} km{MILE[tip.day] ? ` · ${MILE[tip.day]}` : ''}
          </div>
        )
      })()}
    </div>
  )
}

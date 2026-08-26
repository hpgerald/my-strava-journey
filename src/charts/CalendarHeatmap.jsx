import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Per-year consistency calendar (GitHub-style). Cells shade by activity count
// on the grey ramp; days inside the current streak are drawn in the accent.
// counts: { 'YYYY-MM-DD': n }, streakStart/streakEnd: 'YYYY-MM-DD'
const RAMP = ['var(--grey-06)', 'var(--grey-25)', 'var(--grey-45)', 'var(--grey-70)', 'var(--ink)']
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function iso(d) {
  return d.toISOString().slice(0, 10)
}

export default function CalendarHeatmap({ counts, years, streakStart, streakEnd }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)

  const gutter = 30
  const gap = 2
  const cell = Math.max(6, Math.min(14, (width - gutter - 53 * gap) / 53))
  const step = cell + gap
  const rowH = 7 * step
  const yearGap = 26

  const shade = (n) => (n <= 0 ? RAMP[0] : RAMP[Math.min(4, n)])
  const inStreak = (d) => streakStart && streakEnd && d >= streakStart && d <= streakEnd

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width="100%"
        height={years.length * (rowH + yearGap)}
        viewBox={`0 0 ${width} ${years.length * (rowH + yearGap)}`}
        role="img"
        aria-label="Calendar of active days by year"
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {years.map((year, yi) => {
          const yTop = yi * (rowH + yearGap) + 16
          const start = new Date(Date.UTC(year, 0, 1))
          const startDow = start.getUTCDay()
          const cells = []
          const monthMarks = []
          let lastMonth = -1
          for (let doy = 0; doy < 366; doy++) {
            const d = new Date(Date.UTC(year, 0, 1 + doy))
            if (d.getUTCFullYear() !== year) break
            const key = iso(d)
            const col = Math.floor((doy + startDow) / 7)
            const row = d.getUTCDay()
            const x = gutter + col * step
            const y = yTop + row * step
            const n = counts[key] || 0
            const streak = inStreak(key)
            cells.push(
              <rect
                key={key}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx="1.5"
                fill={streak ? 'var(--accent)' : shade(n)}
                onMouseEnter={() => setHover({ x: x + cell / 2, y, key, n, streak })}
              />
            )
            const mo = d.getUTCMonth()
            if (mo !== lastMonth && d.getUTCDate() <= 7) {
              monthMarks.push(
                <text key={'m' + mo} x={x} y={yTop - 4} className="chart-tick">
                  {MONTHS[mo]}
                </text>
              )
              lastMonth = mo
            }
          }
          return (
            <g key={year}>
              <text x={0} y={yTop + rowH / 2} dominantBaseline="middle" className="chart-tick" style={{ fontWeight: 600 }}>
                {year}
              </text>
              {monthMarks}
              {cells}
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(hover.x, 70), width - 70), top: hover.y - 44 }}>
          <strong>{hover.key}</strong>
          <br />
          {hover.n} {hover.n === 1 ? 'activity' : 'activities'}
          {hover.streak ? ' · streak' : ''}
        </div>
      )}
    </div>
  )
}

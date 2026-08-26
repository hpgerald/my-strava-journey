import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { prettySport } from '../lib/slug.js'

// A unit chart: one dot per activity, laid out in reading order (left to right,
// top to bottom) from the very first upload to the latest. Colour deepens with
// the year, so the thin pale start and the dense recent seasons read at a glance.
// items: [{ year:number, date:string, sport:string, name:string }] (chronological)
// years: sorted unique years present.
const STOPS = [
  [255, 178, 140], // earliest year (light warm)
  [252, 76, 2], //    accent
  [150, 42, 0], //    latest year (deep)
]
function ramp(t) {
  const x = Math.max(0, Math.min(1, t))
  const seg = 1 / (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(x / seg))
  const u = (x - i * seg) / seg
  const a = STOPS[i]
  const b = STOPS[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`
}

export default function DotGrid({ items, years }) {
  const [ref, w] = useWidth(560)
  const [hi, setHi] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const cell = 9
  const r = 3
  const cols = Math.max(10, Math.floor((w - r * 2) / cell))
  const n = items.length
  const rows = Math.ceil(n / cols)
  const height = rows * cell + r * 2
  const y0 = years[0]
  const y1 = years[years.length - 1]
  const shade = (y) => ramp(y1 > y0 ? (y - y0) / (y1 - y0) : 0.5)

  const yearColor = {}
  const yearCount = {}
  for (const y of years) { yearColor[y] = shade(y); yearCount[y] = 0 }
  for (const it of items) yearCount[it.year] = (yearCount[it.year] || 0) + 1

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const yy = e.clientY - rect.top
    const c = Math.floor((x - r) / cell)
    const rw = Math.floor((yy - r) / cell)
    const idx = rw * cols + c
    if (c >= 0 && c < cols && idx >= 0 && idx < n) { setHi(idx); setPos({ x, y: yy }) }
    else setHi(null)
  }

  const h = hi != null ? items[hi] : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${Math.max(w, 1)} ${height}`}
        role="img"
        aria-label="Every activity as one dot, coloured by year"
        style={{ display: 'block' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHi(null)}
      >
        {items.map((it, i) => {
          const c = i % cols
          const rw = Math.floor(i / cols)
          return (
            <circle
              key={i}
              cx={r + c * cell + cell / 2 - r}
              cy={r + rw * cell + cell / 2 - r}
              r={r}
              fill={yearColor[it.year]}
              opacity={hi == null || hi === i ? 1 : 0.5}
            />
          )
        })}
        {h && (
          <circle
            cx={r + (hi % cols) * cell + cell / 2 - r}
            cy={r + Math.floor(hi / cols) * cell + cell / 2 - r}
            r={r + 2}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {h && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(pos.x, 70), w - 70), top: Math.max(pos.y - 46, 0) }}>
          <strong>{prettySport(h.sport)}</strong>
          <br />
          {(h.date || '').slice(0, 10)}
        </div>
      )}

      <ul className="dotgrid__legend">
        {years.map((y) => (
          <li key={y}>
            <span className="dotgrid__swatch" style={{ background: yearColor[y] }} />
            <span className="mono">{y}</span>
            <span className="dotgrid__count mono">{yearCount[y]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

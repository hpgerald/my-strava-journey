import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { prettySport } from '../lib/slug.js'

// A unit chart: one dot per activity, but grouped into a band per year so the
// arrangement itself carries the story. Years run oldest at the top to newest at
// the foot; inside a band the dots fill left to right in date order and wrap onto
// as many rows as that year needs. The two-year hobby is two thin stubs; the habit
// years are thick blocks of their own. Colour still deepens with the year as a
// second cue. Hover any dot for its date.
// items: [{ year:number, date:string, sport:string }] (chronological)
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

  // nothing to draw until the data arrives (avoids a negative-height SVG)
  if (!items || !items.length || !years || !years.length) return <div ref={ref} />

  const cell = 9
  const r = 3
  const W = Math.max(w, 1)
  const narrow = W < 520
  const gutter = narrow ? 48 : 66 // left labels (year + count)
  const padR = narrow ? 6 : 14 // keep the last column clear of the edge
  const bandGap = 10
  const LABEL_H = 26 // min band height so the year + count label never collides
  const plotW = Math.max(cell * 8, W - gutter - padR)
  const cols = Math.max(8, Math.floor(plotW / cell))

  const y0 = years[0]
  const y1 = years[years.length - 1]
  const shade = (y) => ramp(y1 > y0 ? (y - y0) / (y1 - y0) : 0.5)

  // lay out one band per year, oldest first (top) to newest (bottom)
  const byYear = {}
  for (const y of years) byYear[y] = []
  for (const it of items) if (byYear[it.year]) byYear[it.year].push(it)

  const placed = [] // { cx, cy, item }
  const bands = []
  let yCur = r
  for (const y of years) {
    const list = byYear[y]
    const nRows = Math.max(1, Math.ceil(list.length / cols))
    const contentH = nRows * cell
    const bandH = Math.max(contentH, LABEL_H)
    const dotTop = yCur + (bandH - contentH) / 2 // centre a thin year's dots in its slot
    const color = shade(y)
    list.forEach((it, i) => {
      const c = i % cols
      const rw = Math.floor(i / cols)
      placed.push({ cx: gutter + c * cell + cell / 2, cy: dotTop + rw * cell + cell / 2, color, item: it })
    })
    bands.push({ y, color, mid: yCur + bandH / 2, count: list.length })
    yCur += bandH + bandGap
  }
  const height = yCur - bandGap + r

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = rect.width / W
    const x = (e.clientX - rect.left) / scale
    const yy = (e.clientY - rect.top) / scale
    let best = null
    let bestD = (cell * 0.75) ** 2
    for (let i = 0; i < placed.length; i++) {
      const dx = placed[i].cx - x
      const dy = placed[i].cy - yy
      const d = dx * dx + dy * dy
      if (d < bestD) { bestD = d; best = i }
    }
    if (best != null) { setHi(best); setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }) }
    else setHi(null)
  }

  const h = hi != null ? placed[hi] : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Every activity as one dot, grouped into a band per year from 2019 at the top to 2026 at the foot; the first two years are thin, every year since fills rows of its own."
        style={{ display: 'block' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHi(null)}
      >
        {/* year labels down the left edge, year over count, centred on the band */}
        {bands.map((b) => (
          <g key={b.y}>
            <text x={gutter - 14} y={b.mid - 5} textAnchor="end" dominantBaseline="middle" className="dotgrid__ylbl">{b.y}</text>
            <text x={gutter - 14} y={b.mid + 9} textAnchor="end" dominantBaseline="middle" className="dotgrid__ycount">{b.count.toLocaleString()}</text>
          </g>
        ))}
        {placed.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={r} fill={p.color} opacity={hi == null || hi === i ? 1 : 0.45} />
        ))}
        {h && (
          <circle cx={h.cx} cy={h.cy} r={r + 2} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        )}
      </svg>

      {h && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(pos.x, 70), W - 70), top: Math.max(pos.y - 46, 0) }}>
          <strong>{prettySport(h.item.sport)}</strong>
          <br />
          {(h.item.date || '').slice(0, 10)}
        </div>
      )}

      <div className="dotgrid__legend">
        <span className="dotgrid__legkey">
          <span className="dotgrid__legdot" aria-hidden="true" />
          one dot, one activity
        </span>
        <span className="dotgrid__legkey">
          colour by year
          <span className="dotgrid__ramplbl">{y0}</span>
          <span className="dotgrid__ramp" aria-hidden="true" />
          <span className="dotgrid__ramplbl">{y1}</span>
        </span>
      </div>
    </div>
  )
}

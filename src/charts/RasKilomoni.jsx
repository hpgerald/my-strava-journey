import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// The Ras Kilomoni target as a wall of stamps: one tile for each trip, numbered
// in Roman numerals the way I counted them, I to L. A run is an orange tile, a
// walk a plain one. `mark` can ring one trip and name it in the key, for a trip
// that was also a milestone of the whole record.
// rows: [{ n, roman, date, sport, km }] in order; mark: { n, note } | null
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]}`
const isRun = (sp) => sp === 'Run' || sp === 'TrailRun'

export default function RasKilomoni({ rows, mark = null, aria, H: Hfit }) {
  const [ref, width] = useWidth(620)
  const [root, inView] = useInView()
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 460
  const cols = narrow ? 5 : 10
  const nrows = Math.ceil(rows.length / cols)
  const gap = narrow ? 6 : 8
  const s = Math.min(68, (W - (cols - 1) * gap) / cols)
  const gx = (W - (cols * s + (cols - 1) * gap)) / 2
  // tiles are square, unless a height is asked for (to sit level with the chart
  // beside it), when each row takes its share of that height
  const th = Hfit && !narrow ? Math.max(24, (Hfit - (nrows - 1) * gap - 2) / nrows) : s
  const H = nrows * th + (nrows - 1) * gap + 2
  // one size for every numeral; the few long ones are narrowed to fit their tile
  const size = Math.max(11, s * 0.3)
  const fit = (r) => (r.length * 0.5 * size > s * 0.8 ? s * 0.8 : undefined)
  const tip = hover != null ? rows[hover] : null

  return (
    <div ref={ref} className="rask">
      <div ref={root} className={`rask__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
          {rows.map((r, i) => {
            const x = gx + (i % cols) * (s + gap), y = 1 + Math.floor(i / cols) * (th + gap)
            const run = isRun(r.sport)
            const marked = mark && mark.n === r.n
            return (
              <g key={r.n} className={`rask__tile${run ? ' is-run' : ''}${hover != null && hover !== i ? ' is-dim' : ''}`} style={{ '--i': i }}
                onMouseEnter={() => setHover(i)}>
                <rect x={x} y={y} width={s} height={th} rx="5" className="rask__box" />
                {marked && <rect x={x + 3} y={y + 3} width={s - 6} height={th - 6} rx="3" className="rask__ring" />}
                <text x={x + s / 2} y={y + th / 2} dy="0.36em" textAnchor="middle" className="rask__roman" style={{ fontSize: size }} textLength={fit(r.roman)} lengthAdjust={fit(r.roman) ? 'spacingAndGlyphs' : undefined}>{r.roman}</text>
              </g>
            )
          })}
        </svg>
        {tip && (() => {
          const i = hover, x = gx + (i % cols) * (s + gap) + s / 2, y = 1 + Math.floor(i / cols) * (th + gap)
          return (
            <div className="chart-tip" style={{ left: Math.min(Math.max(x - 75, 0), W - 160), top: Math.floor(i / cols) ? y - 58 : y + th + 8 }}>
              <strong>Trip {tip.roman}</strong><br />
              {fmtDay(tip.date)} · {isRun(tip.sport) ? 'run' : 'walk'} · {tip.km.toFixed(1)} km
              {mark && mark.n === tip.n ? <><br />{mark.note}</> : null}
            </div>
          )
        })()}
      </div>
      <p className="chr__key rask__key" aria-hidden="true">
        <span><i className="rask__sw is-run" />run</span>
        <span><i className="rask__sw" />walk</span>
        {mark ? <span><i className="rask__sw is-ring" />{mark.note}</span> : null}
      </p>
    </div>
  )
}

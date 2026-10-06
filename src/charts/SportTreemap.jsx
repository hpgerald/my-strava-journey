import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Every way the seven years moved. Only the four foot sports get a tile and a
// name; everything else the log holds is gathered into one neutral "Other
// activities" tile, counted but never broken out. Two warm tiles swallow the
// frame - walking and running - and the eye reads the answer before the labels:
// this is a life on foot.
// props: rows (sport_breakdown table: { sport, activities })
const FOOT = new Set(['Walk', 'Run', 'TrailRun', 'Hike'])
const OTHER = '__other'
const NICE = { TrailRun: 'Trail run' }
const nm = (s) => (s === OTHER ? 'Other activities' : NICE[s] || s)

function squarify(items, x, y, w, h) {
  const result = []
  const total = items.reduce((s, d) => s + d.value, 0) || 1
  const scaled = items.map((d) => ({ d, v: (d.value / total) * (w * h) }))
  let cx = x, cy = y, cw = w, ch = h
  const worst = (row, side) => {
    const sum = row.reduce((s, r) => s + r.v, 0)
    const mx = Math.max(...row.map((r) => r.v)), mn = Math.min(...row.map((r) => r.v))
    return Math.max((side * side * mx) / (sum * sum), (sum * sum) / (side * side * mn))
  }
  const place = (row) => {
    const sum = row.reduce((s, r) => s + r.v, 0)
    if (cw >= ch) {
      const rw = sum / ch; let ry = cy
      for (const r of row) { const rh = r.v / rw; result.push({ ...r.d, x: cx, y: ry, w: rw, h: rh }); ry += rh }
      cx += rw; cw -= rw
    } else {
      const rh = sum / cw; let rx = cx
      for (const r of row) { const rww = r.v / rh; result.push({ ...r.d, x: rx, y: cy, w: rww, h: rh }); rx += rww }
      cy += rh; ch -= rh
    }
  }
  let row = [], idx = 0
  while (idx < scaled.length) {
    const side = Math.min(cw, ch), next = scaled[idx]
    if (row.length === 0) { row.push(next); idx++; continue }
    const wn = row.concat(next)
    if (worst(wn, side) <= worst(row, side)) { row = wn; idx++ } else { place(row); row = [] }
  }
  if (row.length) place(row)
  return result
}

export default function SportTreemap({ rows }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  const N = (x) => Number(x) || 0
  if (!rows || !rows.length) return <div ref={ref} />

  const all = rows
    .map((r) => ({ sport: r.sport, value: N(r.activities) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
  const total = all.reduce((s, d) => s + d.value, 0)
  const footN = all.filter((d) => FOOT.has(d.sport)).reduce((s, d) => s + d.value, 0)
  const footPct = total ? Math.round((footN / total) * 100) : 0
  const distinctN = all.length

  // one tile per foot sport, plus a single aggregated "Other activities" tile
  const footTiles = all.filter((d) => FOOT.has(d.sport))
  const otherVal = total - footN
  const items = (otherVal > 0 ? [...footTiles, { sport: OTHER, value: otherVal }] : footTiles)
    .sort((a, b) => b.value - a.value)

  const W = Math.max(300, width)
  const H = W < 520 ? 260 : 300
  const tiles = squarify(items, 0, 0, W, H)

  return (
    <div ref={ref} className="tm">
      <p className="tm__readout">
        <span className="mono tm__readout-n">{distinctN}</span> sports in all, yet{' '}
        <strong>{footPct}%</strong> of every outing is on foot.
      </p>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`The four foot sports sized by how often they were done, with everything else gathered into one other-activities tile. ${footPct} percent of all outings are on foot.`}
        style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {tiles.map((t, i) => {
          const foot = FOOT.has(t.sport)
          const on = hover === null || hover === i
          const base = foot
            ? (hover === i ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 34%, var(--paper))')
            : (hover === i ? 'var(--grey-45)' : 'var(--grey-15)')
          const showName = t.w >= 58 && t.h >= 34
          const showN = t.w >= 40 && t.h >= 22
          const dark = foot && hover === i
          return (
            <g key={t.sport} opacity={on ? 1 : 0.55} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={t.x + 0.75} y={t.y + 0.75} width={Math.max(0, t.w - 1.5)} height={Math.max(0, t.h - 1.5)} rx="2"
                fill={base} stroke="var(--paper)" strokeWidth="1.5" />
              {showName && (
                <text x={t.x + 7} y={t.y + 17} className={`tm__name${dark ? ' tm__name--on' : ''}`}>{nm(t.sport)}</text>
              )}
              {showN && (
                <text x={t.x + 7} y={t.y + (showName ? 33 : 16)} className={`tm__n mono${dark ? ' tm__n--on' : ''}`}>{t.value.toLocaleString()}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="tm__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: 'color-mix(in srgb, var(--accent) 34%, var(--paper))' }} /> on foot</span>
        <span><i className="chart-swatch" style={{ background: 'var(--grey-15)' }} /> everything else</span>
      </div>
      {hover != null && tiles[hover] && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(tiles[hover].x + tiles[hover].w / 2 - 60, 8), W - 150), top: Math.max(4, tiles[hover].y + 6) }}>
          <strong>{nm(tiles[hover].sport)}</strong>
          <br />
          {tiles[hover].value.toLocaleString()} activities · {Math.round((tiles[hover].value / total) * 100)}% of all
        </div>
      )}
    </div>
  )
}

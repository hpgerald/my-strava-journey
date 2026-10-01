import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Tanzania as the ground underfoot, not a map. Each region is a hill on one
// shared horizon: its height is how steep that ground is (metres climbed per
// kilometre covered), its width is how much training happened there. Read left to
// right, flat to steep. Home - Dodoma and Dar es Salaam - sits low and broad, a lot
// of ground with little vertical. The climbing is earned away: Kilimanjaro rises
// both busy and steep, and the Uluguru hills behind Morogoro are the sharpest
// spikes of all, visited rarely. rows: tanzania_regions [{ region, activities,
// distance_km, elevation_m }].
const HOME = new Set(['Dodoma', 'Dar es Salaam'])
// steepness -> fill, pale sand (flat) to volcanic brown (steep)
const RAMP = [[216, 201, 163], [176, 122, 71], [110, 59, 30]]
function terrainFill(t) {
  const x = Math.max(0, Math.min(1, t))
  const seg = 1 / (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(x / seg))
  const u = (x - i * seg) / seg
  const a = RAMP[i], b = RAMP[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`
}

export default function TerrainLand({ rows }) {
  const [ref, width] = useWidth(820)
  const [hover, setHover] = useState(null)
  const N = (x) => Number(x) || 0
  if (!rows || !rows.length) return <div ref={ref} />

  const regions = rows
    .map((r) => {
      const dist = N(r.distance_km), act = N(r.activities), elev = N(r.elevation_m)
      return { region: r.region, act, dist, elev, steep: dist > 0 ? elev / dist : 0 }
    })
    .filter((r) => r.act > 0)
    .sort((a, b) => a.steep - b.steep) // flat -> steep, left -> right

  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 34, r: 8, b: 42, l: 8 }
  const H = narrow ? 300 : 340
  const iw = W - m.l - m.r
  const baseY = H - m.b
  const peakMax = H - m.b - m.t

  const steepMax = Math.max(...regions.map((r) => r.steep))
  const steepNorm = (s) => (steepMax > 0 ? s / steepMax : 0)
  // width by sqrt(activities) so busy home dominates but rare peaks stay visible
  const wUnits = regions.map((r) => Math.sqrt(r.act))
  const wSum = wUnits.reduce((a, b) => a + b, 0) || 1
  const gap = narrow ? 2 : 3
  const avail = iw - gap * (regions.length - 1)
  let cx = m.l
  const laid = regions.map((r, i) => {
    const w = Math.max(narrow ? 9 : 12, (wUnits[i] / wSum) * avail)
    const x0 = cx, x1 = cx + w
    cx = x1 + gap
    const peak = 8 + Math.sqrt(steepNorm(r.steep)) * (peakMax - 8)
    return { ...r, x0, x1, xc: (x0 + x1) / 2, w, peakY: baseY - peak }
  })
  // rescale if we overran (floors pushed total past avail)
  const used = cx - gap - m.l
  if (used > iw) {
    const k = iw / used
    let c = m.l
    for (const d of laid) { const w = d.w * k; d.x0 = c; d.x1 = c + w; d.xc = c + w / 2; d.w = w; c = d.x1 + gap * k }
  }

  const hill = (d) => {
    const c1 = d.x0 + d.w * 0.30, c2 = d.x1 - d.w * 0.30
    return `M${d.x0.toFixed(1)} ${baseY} C${c1.toFixed(1)} ${baseY} ${c1.toFixed(1)} ${d.peakY.toFixed(1)} ${d.xc.toFixed(1)} ${d.peakY.toFixed(1)} C${c2.toFixed(1)} ${d.peakY.toFixed(1)} ${c2.toFixed(1)} ${baseY} ${d.x1.toFixed(1)} ${baseY} Z`
  }
  const named = new Set(['Dodoma', 'Dar es Salaam', 'Kilimanjaro', 'Morogoro'])
  const short = (r) => (r === 'Dar es Salaam' ? 'Dar' : r)

  return (
    <div ref={ref} className="terr">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Tanzania's regions as a range of hills, flat home ground on the left rising to the steep, rarely visited mountains on the right."
        style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        <text x={m.l} y={16} className="terr__axlbl">FLATTER GROUND</text>
        <text x={W - m.r} y={16} textAnchor="end" className="terr__axlbl">STEEPER GROUND &rarr;</text>
        {laid.map((d, i) => {
          const on = hover === null || hover === i
          const isHome = HOME.has(d.region)
          return (
            <g key={d.region} opacity={on ? 1 : 0.45} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <path d={hill(d)} fill={terrainFill(steepNorm(d.steep))} stroke="var(--paper)" strokeWidth="0.75" />
              {isHome && <circle cx={d.xc} cy={d.peakY - 7} r="3" fill="var(--accent)" />}
              {named.has(d.region) && d.w > 22 && (
                <text x={d.xc} y={d.peakY - (isHome ? 13 : 8)} textAnchor="middle" className={`terr__peak${isHome ? ' terr__peak--home' : ''}`}>{short(d.region)}</text>
              )}
            </g>
          )
        })}
        <line x1={m.l} y1={baseY} x2={W - m.r} y2={baseY} stroke="var(--ink)" strokeWidth="1" />
        <text x={m.l} y={baseY + 16} className="terr__foot">Dodoma &middot; Dar: home, flat</text>
        <text x={W - m.r} y={baseY + 16} textAnchor="end" className="terr__foot">Kilimanjaro &middot; the Ulugurus: earned uphill</text>
      </svg>
      <div className="terr__legend chart-legend">
        <span>hill height = metres climbed per km</span>
        <span>hill width = how much training there</span>
        <span><i className="chart-swatch" style={{ background: 'rgb(216,201,163)' }} /> flat</span>
        <span><i className="chart-swatch" style={{ background: 'rgb(110,59,30)' }} /> steep</span>
      </div>
      {hover != null && laid[hover] && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(laid[hover].xc, 80), W - 90), top: 24 }}>
          <strong>{laid[hover].region}</strong>
          <br />
          {fmt(laid[hover].steep)} m climbed per km
          <br />
          {laid[hover].act} activities &middot; {Math.round(laid[hover].dist)} km &middot; {Math.round(laid[hover].elev).toLocaleString()} m up
        </div>
      )}
    </div>
  )
}
const fmt = (n) => (n >= 10 ? Math.round(n) : n.toFixed(1))

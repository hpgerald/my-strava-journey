import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks } from './primitives.js'

// The fleet as a terrain profile. Every pair stands on the pace line - quick on
// the left, a walker's amble on the right - and grows a stem up to how steeply it
// typically climbs, a metre of ascent for every kilometre. The road trainers sit
// low; the trail pairs spike up like mountains, the Juniper Trail towering over
// everything. Head size is total distance. points: [{ model, pace, steep, km, trail, trailPct }].
const short = (s) => s
  .replace(/\s*\(.*\)$/, '')
  .replace(/^(Air Zoom|Zoom|Nike|Under Armour|Saucony)\s+/, '')
  .replace(/\s+XT\s+\d+$/, '')
const paceLabel = (v) => `${Math.floor(v)}:${String(Math.round((v - Math.floor(v)) * 60)).padStart(2, '0')}`

export default function ShoePersonality({ points }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!points || !points.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 560
  const H = narrow ? 340 : 380
  const m = { t: 30, r: narrow ? 16 : 22, b: 46, l: narrow ? 34 : 40 }
  const iw = W - m.l - m.r
  const y0 = H - m.b // baseline

  // pace axis (x): quicker left. pad the domain a touch so heads never clip.
  const paces = points.map((p) => p.pace)
  const pMin = Math.floor(Math.min(...paces) * 2) / 2 - 0.3
  const pMax = Math.ceil(Math.max(...paces) * 2) / 2 + 0.3
  const sx = linScale([pMin, pMax], [m.l, m.l + iw])

  // climb axis (y): metres per km, drawn as stem height from the baseline up.
  const yN = niceTicks(Math.max(...points.map((p) => p.steep)), 4)
  const sy = linScale([0, yN.max], [y0, m.t])

  const kmMax = Math.max(...points.map((p) => p.km))
  const rOf = (km) => 4.5 + Math.sqrt(km / kmMax) * 12

  // label placement: name above each head. Edge-anchor near the margins so the
  // text never clips, then resolve horizontal clashes by lifting the later label
  // into a higher tier (with a leader line) using its true left/right span.
  const halfW = (n) => n.length * (narrow ? 3.1 : 3.5) + 5
  const lay = points
    .map((p, i) => {
      const x = sx(p.pace); const name = short(p.model); const hw = halfW(name)
      let anchor = 'middle'; let left = x - hw; let right = x + hw
      if (x - hw < m.l) { anchor = 'start'; left = x; right = x + 2 * hw }
      else if (x + hw > W - m.r) { anchor = 'end'; right = x; left = x - 2 * hw }
      return { i, x, yHead: sy(p.steep), name, trail: p.trail, anchor, left, right }
    })
    .sort((a, b) => a.left - b.left)
  const circles = points.map((p) => ({ cx: sx(p.pace), cy: sy(p.steep), cr: rOf(p.km) }))
  const placed = []
  for (const L of lay) {
    L.tier = 0
    let ly = L.yHead - rOf(points[L.i].km) - 9
    let bump = true
    let guard = 0
    while (bump && guard < 50) {
      bump = false
      guard += 1
      // clear other labels
      for (const q of placed) {
        if (L.left < q.right + 4 && q.left < L.right + 4 && Math.abs(q.ly - ly) < 15) {
          ly -= 15; L.tier += 1; bump = true; break
        }
      }
      if (bump) continue
      // clear any circle the text would sit on (its own included)
      for (const c of circles) {
        if (L.left < c.cx + c.cr + 3 && c.cx - c.cr - 3 < L.right && ly > c.cy - c.cr - 11 && ly < c.cy + c.cr) {
          ly = c.cy - c.cr - 11; L.tier += 1; bump = true; break
        }
      }
    }
    if (ly < m.t - 6) ly = m.t - 6
    L.ly = ly
    placed.push(L)
  }
  const labelByI = Object.fromEntries(placed.map((L) => [L.i, L]))

  return (
    <div ref={ref} className="shoep">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Each pair placed on the pace line, with a stem rising to how steeply it climbs; the trail pairs spike up like mountains."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* climb gridlines + left ticks */}
        {yN.ticks.map((v, i) => (
          <g key={'y' + i}>
            <line x1={m.l} y1={sy(v)} x2={m.l + iw} y2={sy(v)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" className="chart-tick">{v}</text>
          </g>
        ))}
        {/* baseline */}
        <line x1={m.l} y1={y0} x2={m.l + iw} y2={y0} stroke="var(--rule)" strokeWidth="1.5" />

        {/* pace ticks below baseline */}
        {(() => {
          const step = narrow ? 3 : 2
          const ticks = []
          for (let v = Math.ceil(pMin); v <= pMax; v += step) ticks.push(v)
          return ticks.map((v, i) => (
            <text key={'x' + i} x={sx(v)} y={y0 + 18} textAnchor="middle" className="chart-tick">{paceLabel(v)}</text>
          ))
        })()}
        <text x={m.l + iw / 2} y={H - 6} textAnchor="middle" className="shoep__axis">median pace (min/km) &middot; quicker left</text>
        <text transform={`translate(11 ${(m.t + y0) / 2}) rotate(-90)`} textAnchor="middle" className="shoep__axis">metres climbed per km</text>

        {/* stems + heads */}
        {points.map((p, i) => {
          const on = hover === null || hover === i
          const x = sx(p.pace)
          const yh = sy(p.steep)
          const r = rOf(p.km)
          const L = labelByI[i]
          const col = p.trail ? 'var(--accent)' : 'var(--ink)'
          return (
            <g key={i} opacity={on ? 1 : 0.35} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <line x1={x} y1={y0} x2={x} y2={yh + r - 1} stroke={col} strokeWidth={p.trail ? 2.4 : 1.8} strokeLinecap="round" opacity={p.trail ? 0.9 : 0.55} />
              <circle cx={x} cy={yh} r={r} fill={p.trail ? 'var(--accent)' : 'var(--paper)'} stroke={col} strokeWidth={p.trail ? 1.5 : 2} />
              {/* leader line when the label was lifted into a higher tier */}
              {L && L.tier > 0 && <line x1={x} y1={yh - r - 3} x2={x} y2={L.ly + 3} stroke="var(--rule-faint)" strokeWidth="1" />}
              {L && (
                <text x={x} y={L.ly} textAnchor={L.anchor} className={`shoep__lbl${p.trail ? ' shoep__lbl--trail' : ''}`}>{L.name}</text>
              )}
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(points[hover].pace), 80), W - 100), top: Math.max(4, sy(points[hover].steep) - 64) }}>
          <strong>{points[hover].model}</strong>
          <br />
          {paceLabel(points[hover].pace)}/km &middot; {Math.round(points[hover].steep)} m climbed/km
          <br />
          {Math.round(points[hover].km)} km &middot; {Math.round(points[hover].trailPct)}% trail
        </div>
      )}
    </div>
  )
}

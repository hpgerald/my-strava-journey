import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The baton relay: for five years there is almost always one primary pair
// carrying the load, and the next clocks in within a day of the last retiring.
// Primaries tile the timeline end to end, joined by baton dots; the occasional
// specialist pairs sit as a lower strip of cameos. props: primaries (in relay
// order, each with reignStart/reignEnd), cameos, start, end (ISO dates).
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const t = (d) => Date.parse(d + 'T00:00:00Z')

export default function ShoeRelay({ primaries, cameos, start, end }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)
  if (!primaries || !primaries.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 560
  // colour carries the job: trail/hill shoes in earth brown, road shoes in rubber
  // rubber tones alternate so adjacent reigns read apart; moss flags a trail pair
  const RUBBER = ['#3f3c38', '#6b5a48'], RUBBER_LT = '#9b938a'
  const TRAIL = '#5e6e3a', TRAIL_LT = '#97a06f'
  const isTrail = (s) => (s.trailPct || 0) >= 50
  const short = (s) => s.replace(/\s*\(.*\)$/, '').replace(/^(Air Zoom|Zoom|Nike)\s+/, '').replace(/\s+XT\s+\d+$/, '')
  const m = { r: 12, b: 30, l: 12 }
  const sx = linScale([t(start), t(end)], [m.l, W - m.r])
  const y0 = new Date(start).getUTCFullYear()
  const y1 = new Date(end).getUTCFullYear()
  const years = []
  for (let y = y0 + 1; y <= y1; y++) years.push(y)

  // primary name labels: shorten, then greedy row-pack (anchored at reign start)
  const primeLayout = primaries.map((p, i) => {
    const x = sx(t(p.reignStart)); const name = short(p.model)
    return { i, x, name, right: x + name.length * 5.4 + 6 }
  })
  const pRowR = []
  for (const L of primeLayout) { let r = 0; while (r < pRowR.length && pRowR[r] > L.x - 3) r += 1; L.row = r; pRowR[r] = L.right }
  const pRows = Math.max(1, pRowR.length)
  const primeByI = Object.fromEntries(primeLayout.map((L) => [L.i, L]))

  const topLabels = 16 + pRows * 13
  const laneY = topLabels + 8
  const laneH = 30
  const cameoY = laneY + laneH + 36
  const H = cameoY + 40

  // stagger cameo labels so overlapping windows (e.g. the 2026 trio) don't garble
  const camLayout = cameos.map((c, i) => {
    const x0 = sx(t(c.first)); const x1 = sx(t(c.last))
    const name = c.model.replace(/\s*\(.*\)$/, '')
    const hw = name.length * 3 + 4
    let cx = (x0 + x1) / 2; let anchor = 'middle'
    if (cx - hw < m.l) { cx = m.l; anchor = 'start' }
    else if (cx + hw > W - m.r) { cx = W - m.r; anchor = 'end' }
    const left = anchor === 'start' ? cx : anchor === 'end' ? cx - 2 * hw : cx - hw
    return { i, cx, anchor, name, left, right: left + 2 * hw }
  }).sort((a, b) => a.left - b.left)
  const rowR = []
  for (const L of camLayout) { let r = 0; while (r < rowR.length && rowR[r] > L.left - 4) r += 1; L.row = r; rowR[r] = L.right }
  const camByI = Object.fromEntries(camLayout.map((L) => [L.i, L]))

  return (
    <div ref={ref} className="relay">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="The primary pair of shoes over time, each handing off to the next as it retires."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* year gridlines */}
        {years.map((y) => (
          <g key={y}>
            <line x1={sx(t(`${y}-01-01`))} y1={laneY - 6} x2={sx(t(`${y}-01-01`))} y2={cameoY + 20} className="relay__grid" />
            <text x={sx(t(`${y}-01-01`))} y={cameoY + 34} textAnchor="middle" className="chart-tick">{y}</text>
          </g>
        ))}

        <text x={m.l} y={12} className="relay__lanelbl">THE PRIMARY PAIR, HANDED OFF</text>

        {/* primary reign segments, tiled end to end */}
        {primaries.map((p, i) => {
          const x0 = sx(t(p.reignStart))
          const x1 = sx(t(p.reignEnd))
          const w = Math.max(2, x1 - x0)
          const on = hover === null || hover === `p${i}`
          return (
            <g key={i} opacity={on ? 1 : 0.45} onMouseEnter={() => setHover(`p${i}`)} onMouseLeave={() => setHover(null)}>
              <rect x={x0 + 1} y={laneY} width={Math.max(1, w - 2)} height={laneH} rx="3" fill={isTrail(p) ? TRAIL : RUBBER[i % 2]} />
              {w > 34 && <text x={x0 + w / 2} y={laneY + laneH / 2 + 4} textAnchor="middle" className="relay__km">{Math.round(p.km)}</text>}
              {/* baton dot at the handoff (start of each reign after the first) */}
              {i > 0 && <circle cx={x0} cy={laneY + laneH / 2} r="5.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />}
              {/* model label, row-packed above so short reigns stay readable */}
              {primeByI[i] && <text x={x0 + 2} y={laneY - 8 - primeByI[i].row * 13} className="relay__name">{primeByI[i].name}</text>}
            </g>
          )
        })}

        {/* cameos: specialist pairs that overlapped a reign */}
        <text x={m.l} y={cameoY - 10} className="relay__lanelbl relay__lanelbl--sub">SPECIALIST CAMEOS</text>
        {cameos.map((c, i) => {
          const x0 = sx(t(c.first))
          const x1 = sx(t(c.last))
          const on = hover === null || hover === `c${i}`
          return (
            <g key={i} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(`c${i}`)} onMouseLeave={() => setHover(null)}>
              <rect x={x0} y={cameoY} width={Math.max(3, x1 - x0)} height={8} rx="2" fill={isTrail(c) ? TRAIL_LT : RUBBER_LT} />
              {camByI[i] && <text x={camByI[i].cx} y={cameoY - 5 - camByI[i].row * 12} textAnchor={camByI[i].anchor} className="relay__cameo">{camByI[i].name}</text>}
            </g>
          )
        })}
      </svg>
      <div className="relay__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: RUBBER[1] }} /> road pair</span>
        <span><i className="chart-swatch" style={{ background: TRAIL }} /> trail &amp; hill pair</span>
        <span><i className="chart-swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 2px var(--ink)', borderRadius: '50%' }} /> the baton: a handoff within days</span>
        <span className="relay__note">number = km logged in each pair</span>
      </div>
      {hover != null && (() => {
        const isP = hover[0] === 'p'
        const d = isP ? primaries[+hover.slice(1)] : cameos[+hover.slice(1)]
        if (!d) return null
        const cx = Math.min(Math.max(sx(t(isP ? d.reignStart : d.first)), 70), W - 90)
        return (
          <div className="chart-tip" style={{ left: cx, top: 2 }}>
            <strong>{d.model}</strong>
            <br />
            {Math.round(d.km)} km {isP ? `· ${Math.round(d.kmMo)} km/mo` : ''}
            <br />
            {MON[new Date(d.first).getUTCMonth()]} {new Date(d.first).getUTCFullYear()} to {MON[new Date(d.last).getUTCMonth()]} {new Date(d.last).getUTCFullYear()}
          </div>
        )
      })()}
    </div>
  )
}

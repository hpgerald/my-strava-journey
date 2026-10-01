import { useState, useRef } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, smoothAreaPath, smoothLinePath } from './primitives.js'

// The Switch, as the page's hero. Activities per month across the whole record,
// every gap filled with zero so the two quiet years read honestly, then the wall
// that starts in July 2021. Everything before the switch is grey, everything after
// is the accent. A playhead you can drag (slider, click, or arrow keys) moves a
// marker along the months and reads out the one under it, so the change can be felt
// before it is explained. rows: monthly_totals [{ month:'YYYY-MM', activities }].
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function SwitchReveal({ rows, switchMonth = '2021-07' }) {
  const [ref, width] = useWidth(900)
  const svgRef = useRef(null)

  const built = (() => {
    if (!rows || !rows.length) return null
    const byMonth = Object.fromEntries(rows.map((r) => [r.month, Number(r.activities) || 0]))
    const keys = rows.map((r) => r.month).sort()
    const [y0, m0] = keys[0].split('-').map(Number)
    const [y1, m1] = keys[keys.length - 1].split('-').map(Number)
    const months = []
    let y = y0, mo = m0
    while (y < y1 || (y === y1 && mo <= m1)) {
      const key = `${y}-${String(mo).padStart(2, '0')}`
      months.push({ key, y, mo, n: byMonth[key] || 0 })
      mo += 1; if (mo > 12) { mo = 1; y += 1 }
    }
    const switchIdx = Math.max(0, months.findIndex((d) => d.key === switchMonth))
    return { months, switchIdx, y0, m0, y1 }
  })()

  // sel stays null until the reader moves it, so the default tracks the switch
  // month even though the data arrives after the first render
  const [sel, setSel] = useState(null)
  if (!built) return <div ref={ref} />
  const { months, switchIdx, y0, m0, y1 } = built
  const N = months.length
  const selI = sel == null ? switchIdx : Math.max(0, Math.min(sel, N - 1))
  const cur = months[selI]

  const W = Math.max(360, width)
  const narrow = W < 560
  const H = narrow ? 200 : 260
  const m = { t: 18, r: 12, b: 26, l: 30 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const maxN = Math.max(...months.map((d) => d.n), 1)
  const xAt = (i) => m.l + (i / (N - 1)) * iw
  const sy = linScale([0, maxN], [m.t + ih, m.t])
  const baseY = m.t + ih
  const pts = months.map((d, i) => [xAt(i), sy(d.n)])
  const before = pts.slice(0, switchIdx + 1)
  const after = pts.slice(switchIdx)
  const switchX = xAt(switchIdx)
  const selX = xAt(selI)

  const yearTicks = []
  for (let yr = y0 + (m0 === 1 ? 0 : 1); yr <= y1; yr++) {
    const idx = months.findIndex((d) => d.y === yr && d.mo === 1)
    if (idx >= 0) yearTicks.push({ yr, x: xAt(idx) })
  }

  const era = selI < switchIdx ? 'before the switch' : selI === switchIdx ? 'the switch' : 'after the switch'
  const setFromClientX = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * W
    const i = Math.max(0, Math.min(N - 1, Math.round(((x - m.l) / iw) * (N - 1))))
    setSel(i)
  }

  return (
    <div ref={ref} className="switchr">
      <div className="switchr__readout" aria-hidden="true">
        <span className={`switchr__num mono${selI >= switchIdx ? ' switchr__num--on' : ''}`}>{cur.n}</span>
        <span className="switchr__cap">
          {cur.n === 1 ? 'activity' : 'activities'} in {MON[cur.mo - 1]} {cur.y}
          <span className="switchr__era"> · {era}</span>
        </span>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Activities per month across the whole record, flat for two years then surging from July 2021 and staying high."
        style={{ display: 'block', touchAction: 'none' }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setFromClientX(e.clientX) }}
        onPointerMove={(e) => { if (e.buttons) setFromClientX(e.clientX) }}
      >
        {yearTicks.map((t) => (
          <g key={t.yr}>
            <line x1={t.x} y1={m.t} x2={t.x} y2={baseY} className="ignition__grid" />
            <text x={t.x} y={H - 8} textAnchor="middle" className="chart-tick">{t.yr}</text>
          </g>
        ))}
        <path d={smoothAreaPath(before, baseY)} className="ignition__before" />
        <path d={smoothAreaPath(after, baseY)} className="ignition__after" />
        <path d={smoothLinePath(after)} className="ignition__line" />
        <line x1={switchX} y1={m.t - 4} x2={switchX} y2={baseY} className="ignition__switch" />
        {!narrow && <text x={switchX + 6} y={m.t + 6} className="ignition__switchlbl">July 2021 · the switch</text>}
        <line x1={m.l} y1={baseY} x2={m.l + iw} y2={baseY} stroke="var(--ink)" strokeWidth="1" />
        {/* playhead */}
        <line x1={selX} y1={m.t - 4} x2={selX} y2={baseY} className="switchr__head" />
        <circle cx={selX} cy={sy(cur.n)} r="5" fill="var(--ink)" stroke="var(--paper)" strokeWidth="2" />
      </svg>

      <input
        type="range" min={0} max={N - 1} value={selI}
        onChange={(e) => setSel(+e.target.value)}
        className="switchr__range"
        aria-label="Scrub through the months"
        aria-valuetext={`${MON[cur.mo - 1]} ${cur.y}, ${cur.n} ${cur.n === 1 ? 'activity' : 'activities'}, ${era}`}
      />
    </div>
  )
}

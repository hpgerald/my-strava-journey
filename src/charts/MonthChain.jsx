import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// Every month since the spark. One cell per calendar month across the whole
// record: filled and shaded by the ground covered on foot when the month was
// active, hollow when it was not. The early years flicker; from July 2021 the
// grid never breaks again. props: months [{ month:'YYYY-MM', distance_km, activities }].
const MN = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function MonthChain({ months }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!months || !months.length) return <div ref={ref} />

  const N = (x) => Number(x) || 0
  const km = {}
  const acts = {}
  for (const m of months) { km[m.month] = N(m.distance_km); acts[m.month] = N(m.activities) }
  const all = months.map((m) => m.month).sort()
  const y0 = +all[0].slice(0, 4), y1 = +all[all.length - 1].slice(0, 4)
  const years = []
  for (let y = y0; y <= y1; y++) years.push(y)
  const lastMonth = all[all.length - 1]

  // longest run of consecutive active months ending at the last
  const isActive = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}` in km
  let streak = 0
  { let y = y1, m = +lastMonth.slice(5, 7) - 1
    while (y >= y0 && isActive(y, m)) { streak += 1; m -= 1; if (m < 0) { m = 11; y -= 1 } } }
  // the spark = first month of that unbroken run
  const sparkIdx = (() => { let y = y1, m = +lastMonth.slice(5, 7) - 1, n = streak
    while (n > 1) { m -= 1; if (m < 0) { m = 11; y -= 1 }; n -= 1 } return { y, m } })()

  const W = Math.max(320, width)
  const narrow = W < 560
  const leftW = narrow ? 34 : 40
  const topH = 16
  const gap = 3
  const cell = Math.min(narrow ? 22 : 28, (W - leftW - 4 - 11 * gap) / 12)
  const gridW = 12 * cell + 11 * gap
  const H = topH + years.length * (cell + gap) + 6

  const kmMax = Math.max(...Object.values(km))
  const shade = linScale([0, kmMax], [0.16, 1])
  const cellFill = (v) => `color-mix(in srgb, var(--accent) ${Math.round(shade(v) * 100)}%, var(--paper))`

  return (
    <div ref={ref} className="mchain">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Every month of the record, shaded by distance on foot, unbroken since July 2021."
        style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {MN.map((mn, i) => (
          <text key={i} x={leftW + i * (cell + gap) + cell / 2} y={11} textAnchor="middle" className="mchain__mon">{mn}</text>
        ))}
        {years.map((y, yi) => (
          <text key={y} x={leftW - 8} y={topH + yi * (cell + gap) + cell / 2 + 4} textAnchor="end" className="mchain__yr">{y}</text>
        ))}
        {years.map((y, yi) => MN.map((_, mi) => {
          const key = `${y}-${String(mi + 1).padStart(2, '0')}`
          const active = key in km
          const x = leftW + mi * (cell + gap)
          const cy = topH + yi * (cell + gap)
          const spark = y === sparkIdx.y && mi === sparkIdx.m
          const on = hover === null || hover === key
          if (!active) {
            return <rect key={key} x={x} y={cy} width={cell} height={cell} rx="4" fill="none" stroke="var(--rule-faint)" strokeWidth="1" />
          }
          return (
            <g key={key} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={cy} width={cell} height={cell} rx="4" fill={cellFill(km[key])} stroke={spark ? 'var(--ink)' : 'none'} strokeWidth={spark ? 2 : 0} />
              {spark && <circle cx={x + cell - 4.5} cy={cy + 4.5} r="2.4" fill="var(--ink)" />}
            </g>
          )
        }))}
      </svg>
      <div className="mchain__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: 'var(--ink)', boxShadow: '0 0 0 2px var(--paper) inset' }} /> streak begins &middot; {MFULL[sparkIdx.m].slice(0, 3)} {sparkIdx.y}</span>
        <span><i className="chart-swatch" style={{ background: 'none', boxShadow: 'inset 0 0 0 1px var(--rule)' }} /> no activity</span>
        <span className="mchain__ramp-lbl">less</span>
        <span className="mchain__ramp" />
        <span className="mchain__ramp-lbl">more on foot</span>
      </div>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(leftW + (+hover.slice(5, 7) - 1) * (cell + gap) - 40, 8), W - 150), top: topH }}>
          <strong>{MFULL[+hover.slice(5, 7) - 1]} {hover.slice(0, 4)}</strong>
          <br />
          {Math.round(km[hover])} km on foot &middot; {acts[hover]} activities
        </div>
      )}
    </div>
  )
}

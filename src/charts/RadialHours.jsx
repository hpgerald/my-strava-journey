import { useState } from 'react'
import { useWidth } from './useWidth.js'

// A 24-hour radial "clock": one spoke per hour of the day, its length the number
// of activities that started then. Midnight at the top, going clockwise, so the
// morning and evening bulges read at a glance. Sequential orange (light -> dark)
// by magnitude. Hover a spoke to read its hour in the centre. Wrap in <Figure>
// for the text/table fallback.
// counts: number[24]
// Sequential ramp that STARTS AT WHITE, so an hour with no activity reads as
// blank rather than a pale orange, then climbs light -> deep orange.
const STOPS = [
  [255, 255, 255], // 0  -> white (none)
  [255, 214, 196], // low
  [252, 76, 2], //    accent
  [170, 48, 0], //    deep
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
const hourLabel = (i) => {
  const ap = i < 12 ? 'am' : 'pm'
  const h = i % 12 === 0 ? 12 : i % 12
  return `${h}${ap}`
}

export default function RadialHours({ counts, unit = 'activities' }) {
  const [ref, w] = useWidth(400)
  const [hi, setHi] = useState(null)
  const size = Math.max(300, Math.min(w, 468))
  const cx = size / 2
  const cy = size / 2
  const pad = 30
  const rOuter = size / 2 - pad
  const rInner = rOuter * 0.34
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)
  // thin spokes with a small gap so each hour reads on its own
  const bw = Math.max(5, ((2 * Math.PI * ((rInner + rOuter) / 2)) / 24) * 0.52)
  // the longest spoke's rounded cap must stay INSIDE the outer ring
  const rTipMax = rOuter - bw / 2 - 1

  // angle for hour i: midnight (0) at the top, advancing CLOCKWISE (15° per hour)
  const angleOf = (i) => ((-90 + i * 15) * Math.PI) / 180
  const spokes = counts.map((c, i) => {
    const t = angleOf(i)
    const len = (c / max) * (rTipMax - rInner)
    return {
      i, c,
      x1: cx + rInner * Math.cos(t), y1: cy + rInner * Math.sin(t),
      x2: cx + (rInner + len) * Math.cos(t), y2: cy + (rInner + len) * Math.sin(t),
      color: ramp(c / max),
    }
  })
  // a label every three hours so the clockwise order is unmistakable
  const ticks = [[0, '12a'], [3, '3a'], [6, '6a'], [9, '9a'], [12, '12p'], [15, '3p'], [18, '6p'], [21, '9p']]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Activities by hour of day" style={{ display: 'block', touchAction: 'none' }}>
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="var(--rule-faint)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="var(--rule-faint)" strokeWidth="1" />
        {spokes.map((s) =>
          s.c === 0 ? null : (
            <line
              key={s.i}
              x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke={hi == null || hi === s.i ? s.color : 'var(--grey-15)'}
              strokeWidth={bw} strokeLinecap="round"
              onMouseEnter={() => setHi(s.i)} onMouseLeave={() => setHi(null)}
            />
          )
        )}
        {ticks.map(([i, lab]) => {
          const t = angleOf(i)
          const rl = rOuter + 14
          const cos = Math.cos(t)
          const sin = Math.sin(t)
          return (
            <g key={i}>
              <line x1={cx + rOuter * cos} y1={cy + rOuter * sin} x2={cx + (rOuter + 5) * cos} y2={cy + (rOuter + 5) * sin} stroke="var(--grey-25)" strokeWidth="1" />
              <text x={cx + rl * cos} y={cy + rl * sin + 3.5} textAnchor="middle" className="chart-tick">
                {lab}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="radial__center">
        {hi == null ? (
          <>
            <span className="radial__big mono">{total.toLocaleString()}</span>
            <span className="radial__lbl">{unit} in all</span>
          </>
        ) : (
          <>
            <span className="radial__big mono">{counts[hi].toLocaleString()}</span>
            <span className="radial__lbl">start {hourLabel(hi)}–{hourLabel((hi + 1) % 24)}</span>
          </>
        )}
      </div>
    </div>
  )
}

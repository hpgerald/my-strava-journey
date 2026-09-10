import { useState } from 'react'
import { useWidth } from './useWidth.js'

// An alluvial flip: two stacked columns (distance on the left, climb on the
// right) with a ribbon per sport connecting its share on each side. It makes one
// point unmistakable: running owns the distance and almost none of the climb,
// while walking and the trails invert it. items: [{ key, label, dist, elev }].
const SHADE = { Run: 'var(--ink)', Walk: 'var(--grey-55)', TrailRun: 'var(--accent)', Hike: 'var(--grey-35)' }

export default function FootFlip({ items }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!items || !items.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 300
  const m = { t: 34, b: 22 }
  const ih = H - m.t - m.b
  const barW = 22
  const leftX = W * 0.28
  const rightX = W * 0.72
  const gap = 3

  const dTot = items.reduce((s, d) => s + d.dist, 0) || 1
  const eTot = items.reduce((s, d) => s + d.elev, 0) || 1

  const stack = (valOf, tot) => {
    let y = m.t
    return items.map((d) => {
      const h = (valOf(d) / tot) * (ih - gap * (items.length - 1))
      const seg = { ...d, y0: y, y1: y + h, pct: (valOf(d) / tot) * 100 }
      y += h + gap
      return seg
    })
  }
  const left = stack((d) => d.dist, dTot)
  const right = stack((d) => d.elev, eTot)

  const ribbon = (l, r) => {
    const x0 = leftX + barW
    const x1 = rightX
    const cx = (x0 + x1) / 2
    return `M ${x0} ${l.y0} C ${cx} ${l.y0} ${cx} ${r.y0} ${x1} ${r.y0}` +
      ` L ${x1} ${r.y1} C ${cx} ${r.y1} ${cx} ${l.y1} ${x0} ${l.y1} Z`
  }

  return (
    <div ref={ref} className="flip">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Each foot sport's share of total distance against its share of total climb."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        <text x={leftX + barW / 2} y={18} textAnchor="middle" className="flip__col">DISTANCE</text>
        <text x={rightX + barW / 2} y={18} textAnchor="middle" className="flip__col">CLIMB</text>
        {items.map((d, i) => {
          const l = left[i]
          const r = right[i]
          const on = hover === null || hover === d.key
          return (
            <path
              key={d.key}
              d={ribbon(l, r)}
              fill={SHADE[d.key] || 'var(--grey-45)'}
              opacity={on ? 0.24 : 0.06}
              onMouseEnter={() => setHover(d.key)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        {[['L', left, leftX, 'end', -8], ['R', right, rightX + barW, 'start', 8]].map(([side, segs, x, anchor, dx]) =>
          segs.map((s) => {
            const on = hover === null || hover === s.key
            return (
              <g key={side + s.key} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
                <rect x={side === 'L' ? leftX : rightX} y={s.y0} width={barW} height={Math.max(1, s.y1 - s.y0)} fill={SHADE[s.key] || 'var(--grey-45)'} rx="1.5" />
                {s.y1 - s.y0 > 13 && (
                  <text x={x + dx} y={(s.y0 + s.y1) / 2} dy="0.32em" textAnchor={anchor} className="flip__lbl">
                    {s.label} <tspan className="flip__pct">{Math.round(s.pct)}%</tspan>
                  </text>
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}

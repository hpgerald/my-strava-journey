import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Concentric progress rings, one per goal, in the spirit of an activity-ring
// glyph. Each ring fills to its share of target; a closed ring seals with a dot,
// and, for the year in progress, a notch marks where today's pace sits so the
// fill reads as ahead of or behind schedule. metrics: [{ key, label, value,
// target, color }]. pace: fraction of the year elapsed (null to hide).
export default function GoalRings({ metrics, size = 220, track = 12, gap = 7, pace = null, minStart = 0.62 }) {
  const [ref, width] = useWidth(size)
  const [hover, setHover] = useState(null)
  if (!metrics || !metrics.length) return <div ref={ref} />

  const S = Math.max(120, Math.min(size, width || size))
  const c = S / 2
  const outer = c - track / 2 - 2
  const rings = metrics.map((m, i) => {
    const r = outer - i * (track + gap)
    const C = 2 * Math.PI * r
    const frac = m.target > 0 ? m.value / m.target : 0
    return { ...m, r, C, frac, done: frac >= 1 }
  })

  const paceAngle = pace != null ? pace * 2 * Math.PI : null
  const tick = (r) => {
    const u = [Math.sin(paceAngle), -Math.cos(paceAngle)]
    const inA = [c + u[0] * (r - track / 2 - 2), c + u[1] * (r - track / 2 - 2)]
    const outA = [c + u[0] * (r + track / 2 + 2), c + u[1] * (r + track / 2 + 2)]
    return { inA, outA }
  }

  return (
    <div ref={ref} className="grings">
      <svg
        width={S}
        height={S}
        viewBox={`0 0 ${S} ${S}`}
        role="img"
        aria-label={metrics.map((m) => `${m.label} ${Math.round((m.value / m.target) * 100)} percent of target`).join(', ')}
        style={{ display: 'block', maxWidth: '100%' }}
        onMouseLeave={() => setHover(null)}
      >
        {rings.map((m, i) => {
          const on = hover === null || hover === i
          const dash = Math.min(m.frac, 1) * m.C
          return (
            <g key={m.key} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={c} cy={c} r={m.r} fill="none" stroke="var(--grey-10)" strokeWidth={track} />
              <circle
                cx={c}
                cy={c}
                r={m.r}
                fill="none"
                stroke={m.color}
                strokeWidth={track}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${m.C}`}
                transform={`rotate(-90 ${c} ${c})`}
              />
              {pace != null && (() => { const t = tick(m.r); return (
                <line x1={t.inA[0]} y1={t.inA[1]} x2={t.outA[0]} y2={t.outA[1]} stroke="var(--paper)" strokeWidth="2.5" />
              ) })()}
              {m.done && <circle cx={c} cy={c - m.r} r={track * 0.42} fill={m.color} stroke="var(--paper)" strokeWidth="1.5" />}
            </g>
          )
        })}
        {/* centre: rings closed out of total */}
        <text x={c} y={c - 2} textAnchor="middle" className="grings__cnum mono">{rings.filter((m) => m.done).length}/{rings.length}</text>
        <text x={c} y={c + 14} textAnchor="middle" className="grings__clbl">closed</text>
      </svg>
    </div>
  )
}

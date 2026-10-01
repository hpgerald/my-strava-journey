import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Goals as a small night sky. Each goal is a star, grouped into the four movements
// of the chapter below. The glyph says what kind it is: a filled star is a goal
// closed, a ringed star is one returned to on a cycle, a hollow star is still open.
// Size nods at how big the goal is. Faint lines link the stars of each movement into
// a loose constellation. It reads as a map of what follows.
// props: groups [{ key, label, stars: [{ name, value, status: 'closed'|'recurring'|'open', mag }] }]
// deterministic jitter so the sky is stable across renders
const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 11.7) * 43758.5; return x - Math.floor(x) }

export default function GoalsField({ groups }) {
  const [ref, width] = useWidth(900)
  const [hover, setHover] = useState(null)
  if (!groups || !groups.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 640
  const cols = narrow ? 2 : groups.length
  const rowsN = Math.ceil(groups.length / cols)
  const padX = 8
  const cellW = (W - padX * 2) / cols
  const cellH = narrow ? 150 : 172
  const H = rowsN * cellH + 8

  // place each group's stars in its cell as a small constellation
  const placed = groups.map((g, gi) => {
    const col = gi % cols, row = Math.floor(gi / cols)
    const bx = padX + col * cellW, by = 8 + row * cellH
    const innerT = 20, innerB = 44 // leave room for the group label at the foot
    const n = g.stars.length
    const stars = g.stars.map((s, i) => {
      const fx = 0.18 + 0.64 * ((i + 0.5) / n) + (rnd(gi * 10 + i) - 0.5) * 0.14
      const fy = 0.18 + 0.64 * rnd(gi * 7 + i * 3 + 1)
      return { ...s, x: bx + fx * cellW, y: by + innerT + fy * (cellH - innerT - innerB) }
    })
    return { ...g, bx, by, cx: bx + cellW / 2, labelY: by + cellH - 14, stars }
  })

  const magR = (m) => 4 + Math.sqrt(Math.max(0, Math.min(1, m))) * 7

  return (
    <div ref={ref} className="gfield">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="The chapter's goals as a constellation, grouped into four movements; filled stars are goals met, ringed stars recur, hollow stars are still open."
        style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {placed.map((g, gi) => (
          <g key={g.key}>
            {/* constellation links */}
            <polyline points={g.stars.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(' ')}
              fill="none" stroke="var(--rule)" strokeWidth="1" opacity="0.6" />
            {g.stars.map((s, i) => {
              const id = `${gi}-${i}`
              const on = hover === null || hover === id
              const r = magR(s.mag)
              const fill = s.status === 'closed' ? 'var(--accent)' : s.status === 'open' ? 'var(--paper)' : 'var(--paper)'
              const stroke = s.status === 'open' ? 'var(--grey-45)' : 'var(--accent)'
              return (
                <g key={id} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)}>
                  {s.status === 'recurring' && <circle cx={s.x} cy={s.y} r={r + 5} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.55" />}
                  <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth={s.status === 'closed' ? 0 : 2} />
                  {s.status === 'closed' && <circle cx={s.x} cy={s.y} r={r + 3} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.35" />}
                  <text x={s.x} y={s.y - r - 6} textAnchor="middle" className="gfield__star">{s.value}</text>
                </g>
              )
            })}
            {/* movement label */}
            <text x={g.cx} y={g.labelY} textAnchor="middle" className="gfield__grp"><tspan className="gfield__grpnum">{g.key}</tspan>  {g.label}</text>
          </g>
        ))}
      </svg>
      <div className="gfield__legend chart-legend">
        <span><i className="chart-swatch gfield__sw-closed" /> goal met</span>
        <span><i className="chart-swatch gfield__sw-rec" /> returns on a cycle</span>
        <span><i className="chart-swatch gfield__sw-open" /> still open</span>
      </div>
      {hover != null && (() => {
        const [gi, i] = hover.split('-').map(Number)
        const s = placed[gi]?.stars[i]; if (!s) return null
        return (
          <div className="chart-tip" style={{ left: Math.min(Math.max(s.x, 80), W - 90), top: Math.max(s.y - 52, 0) }}>
            <strong>{s.name}</strong>
            <br />
            {s.detail || s.value}
          </div>
        )
      })()}
    </div>
  )
}

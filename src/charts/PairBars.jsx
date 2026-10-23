import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// Two shares per row as a dumbbell: a grey dot for the first share, an orange dot
// for the second, joined by a bar. Rows are sorted by the gap between them, so
// the regions that climb far more than they are visited sit on top and the
// busy flat ones sit at the bottom. The gap itself is printed on the right.
// props: rows [{label, short?, a, b}] (shares 0-1), aLabel, bLabel, aShort?, bShort?, aria
const pc = (v) => `${Math.round(v * 100)}%`
const pts = (v) => { const n = Math.round(v * 100); return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0' }

export default function PairBars({ rows, aLabel, bLabel, aShort, bShort, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const sorted = [...rows].sort((p, q) => (q.b - q.a) - (p.b - p.a))
  const m = { t: 50, b: 14, l: narrow ? 110 : 140, r: narrow ? 42 : 56 }
  const room = narrow ? 34 : 40 // space for a value label past the last guide
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]))
  const top = Math.ceil(max * 10) / 10
  const x = linScale([0, top], [m.l, W - m.r - room])
  const band = (H - m.t - m.b) / sorted.length
  const grid = []
  for (let g = 0; g <= top + 1e-9; g += 0.1) grid.push(Math.round(g * 10) / 10)
  const r0 = narrow ? 6 : 7.5
  // a value sits beside its dot on the outer side; if that would run into the
  // zero line it moves above the dot instead
  const valPos = (cx, leftSide, gap, cy) => {
    if (leftSide && cx - gap - 30 < m.l + 2) return { x: cx, y: cy - gap - 4, textAnchor: 'middle' }
    return leftSide ? { x: cx - gap, y: cy + 4, textAnchor: 'end' } : { x: cx + gap, y: cy + 4, textAnchor: 'start' }
  }

  return (
    <div ref={ref} className="pbars">
      <div ref={root} className={`pbars__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {/* key */}
          <circle cx={m.l + 6} cy={10} r="5" fill="var(--paper)" stroke="var(--grey-55)" strokeWidth="2" />
          <text x={m.l + 16} y={14} className="pbars__key">{narrow && aShort ? aShort : aLabel}</text>
          <circle cx={m.l + (narrow ? 96 : 150)} cy={10} r="5" fill="var(--accent)" />
          <text x={m.l + (narrow ? 106 : 160)} y={14} className="pbars__key pbars__key--b">{narrow && bShort ? bShort : bLabel}</text>
          <text x={W - 2} y={14} textAnchor="end" className="pbars__key">gap</text>

          {/* guides */}
          {grid.map((g) => (
            <g key={g}>
              <line x1={x(g)} y1={m.t - 12} x2={x(g)} y2={H - m.b} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={x(g)} y={m.t - 18} textAnchor="middle" className="pbars__gl">{pc(g)}</text>
            </g>
          ))}

          {sorted.map((r, i) => {
            const cy = m.t + band * i + band / 2
            const up = r.b > r.a
            const xa = x(r.a), xb = x(r.b)
            const lo = Math.min(xa, xb), hi = Math.max(xa, xb)
            return (
              <g key={r.label} className={`pbars__row${up ? ' is-up' : ''}`} style={{ '--d': `${i * 110}ms` }}>
                {i > 0 && <line x1={0} y1={cy - band / 2} x2={W} y2={cy - band / 2} stroke="var(--rule-faint)" strokeWidth="1" />}
                <text x={m.l - 12} y={cy + 4} textAnchor="end" className={`pbars__lbl${narrow ? ' pbars__lbl--sm' : ''}`}>{narrow && r.short ? r.short : r.label}</text>
                <g className="pbars__bar" style={{ transformOrigin: `${xa}px ${cy}px` }}>
                  <rect x={lo} y={cy - (narrow ? 3 : 4)} width={Math.max(1, hi - lo)} height={narrow ? 6 : 8} rx={narrow ? 3 : 4}
                    fill={up ? 'color-mix(in srgb, var(--accent) 45%, var(--paper))' : 'var(--grey-15)'} />
                </g>
                <circle className="pbars__dot" cx={xa} cy={cy} r={r0} fill="var(--paper)" stroke="var(--grey-55)" strokeWidth="2.25" />
                <circle className="pbars__dot pbars__dot--b" cx={xb} cy={cy} r={r0 + 0.5} fill="var(--accent)" />
                {/* values sit outside the pair, never between the two dots */}
                <text {...valPos(xa, xa < xb, r0 + 6, cy)} className="pbars__val">{pc(r.a)}</text>
                <text {...valPos(xb, xb < xa, r0 + 7, cy)} className="pbars__val pbars__val--b">{pc(r.b)}</text>
                <text x={W - 2} y={cy + 5} textAnchor="end" className={`pbars__gap${up ? ' pbars__gap--up' : ''}`}>{pts(r.b - r.a)}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

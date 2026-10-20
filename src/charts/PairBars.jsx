import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// Two measures per row, drawn as a pair of thin bars so the gap between them is
// the story: a grey bar for one share, an accent bar for the other. Values sit at
// the end of each bar; a key above names the two.
// props: rows [{label, short?, a, b}] (shares 0-1), aLabel, bLabel, aShort?, bShort?, aria
const pc = (v) => `${Math.round(v * 100)}%`

export default function PairBars({ rows, aLabel, bLabel, aShort, bShort, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const labW = W < 400 ? 96 : 120
  const m = { t: 34, r: 44, b: 10, l: labW }
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]))
  const top = Math.min(1, Math.ceil(max * 10) / 10)
  const x = linScale([0, top], [m.l, W - m.r])
  const band = (H - m.t - m.b) / rows.length
  const bh = Math.min(13, band * 0.26)

  return (
    <div ref={ref} className="pbars">
      <div ref={root} className={`pbars__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          <g className="pbars__key">
            <rect x={m.l} y={6} width="14" height="8" rx="1.5" fill="var(--grey-45)" />
            <text x={m.l + 20} y={14} className="pbars__keylbl">{narrow && aShort ? aShort : aLabel}</text>
            <rect x={m.l + (narrow ? 96 : 150)} y={6} width="14" height="8" rx="1.5" fill="var(--accent)" />
            <text x={m.l + (narrow ? 116 : 170)} y={14} className="pbars__keylbl">{narrow && bShort ? bShort : bLabel}</text>
          </g>
          <line x1={m.l} y1={m.t - 6} x2={m.l} y2={H - m.b} stroke="var(--ink)" strokeWidth="1" />
          {rows.map((r, i) => {
            const cy = m.t + band * i + band / 2
            return (
              <g key={r.label} className="pbars__row" style={{ '--d': `${i * 90}ms` }}>
                <text x={m.l - 10} y={cy + 4} textAnchor="end" className="pbars__lbl">{narrow && r.short ? r.short : r.label}</text>
                <g className="pbars__bars" style={{ transformOrigin: `${m.l}px ${cy}px` }}>
                  <rect x={m.l} y={cy - bh - 1.5} width={Math.max(1, x(r.a) - m.l)} height={bh} rx="1.5" fill="var(--grey-45)" />
                  <rect x={m.l} y={cy + 1.5} width={Math.max(1, x(r.b) - m.l)} height={bh} rx="1.5" fill="var(--accent)" />
                </g>
                <text x={x(r.a) + 6} y={cy - 3} textAnchor="start" className="pbars__val">{pc(r.a)}</text>
                <text x={x(r.b) + 6} y={cy + bh + 1} textAnchor="start" className="pbars__val pbars__val--b">{pc(r.b)}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

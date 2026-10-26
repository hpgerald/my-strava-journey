import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// Plain vertical bars on the site grid, for the companion figures of the home
// sections. Each bar carries its own value on top; tone colours it like the
// rest of the section ('quiet' grey, 'mid' ink, 'big' accent). An optional
// dashed reference line (an average, an even split) is drawn over the bars and
// keyed at the top right, where it cannot touch them.
// props: items [{label, short?, value, display, tone}], max?, ticks [values],
//   tickFmt (v => string), ref {value, label, short?}, xCap, yCap, aria, H?, Hn?
export default function ColBars({ items, max, ticks = [], tickFmt = (v) => v, refLine, xCap, yCap, aria, H: Hd = 360, Hn = 300 }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!items || !items.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? Hn : Hd
  const m = { t: 30, r: 14, b: xCap ? 44 : 26, l: 46 }
  const top = max || Math.max(...items.map((d) => d.value)) * 1.08
  const y = linScale([0, top], [H - m.b, m.t])
  const n = items.length
  const slot = (W - m.l - m.r) / n
  const bw = slot * (n > 9 ? (narrow ? 0.7 : 0.62) : narrow ? 0.62 : 0.5)
  const bx = (i) => m.l + slot * i + (slot - bw) / 2
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {ticks.filter((g) => g <= top).map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{tickFmt(g)}</text>
            </g>
          ))}
          {!ticks.includes(0) && <line x1={m.l} y1={y(0)} x2={W - m.r} y2={y(0)} stroke="var(--ink)" strokeWidth="1" />}

          {items.map((d, i) => (
            <g key={`${d.label}-${i}`} className={`cb__bar cb__bar--${d.tone || 'quiet'}`} style={{ '--d': `${i * 60}ms` }}>
              <rect x={bx(i)} y={y(d.value)} width={bw} height={Math.max(0, y(0) - y(d.value))} rx="2"
                style={{ transformOrigin: `0 ${y(0)}px` }} />
              <text x={bx(i) + bw / 2} y={y(d.value) - 7} textAnchor="middle" className="cb__val">{d.display}</text>
              <text x={bx(i) + bw / 2} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{narrow && d.short ? d.short : d.label}</text>
            </g>
          ))}

          {refLine && (
            <g className="cb__ref">
              <line x1={m.l} y1={y(refLine.value)} x2={W - m.r} y2={y(refLine.value)} stroke="var(--ink)" strokeWidth="1.25" strokeDasharray="4 3" opacity="0.6" />
              {/* keyed at the top right, clear of every bar and value */}
              <line x1={W - m.r - 22} y1={m.t - 22} x2={W - m.r} y2={m.t - 22} stroke="var(--ink)" strokeWidth="1.25" strokeDasharray="4 3" opacity="0.6" />
              <text className="cb__reflbl" x={W - m.r - 28} y={m.t - 18} textAnchor="end">
                {narrow && refLine.short ? refLine.short : refLine.label}
              </text>
            </g>
          )}

          {xCap && <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">{xCap}</text>}
          {yCap && <text x={m.l - 8} y={m.t - 18} textAnchor="start" className="cb__axis">{yCap}</text>}
        </svg>
      </div>
    </div>
  )
}

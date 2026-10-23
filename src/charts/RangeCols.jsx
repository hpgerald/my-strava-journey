import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// One column per year showing a spread: a band from the 25th to the 75th
// percentile with the median as a bold tick and its value printed beside it.
// For pace the axis runs upside down (`invert`), so quicker years stand taller.
// The column holding the best median is drawn in accent.
// props: items [{ label, p25, med, p75 }], domain [lo, hi], ticks, tickFmt,
//   valFmt, invert, yCap, aria
export default function RangeCols({ items, domain, ticks = [], tickFmt = (v) => v, valFmt = (v) => v, invert = false, yCap, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!items || !items.length) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: 10, b: 26, l: 44 }
  const y = invert ? linScale(domain, [m.t, H - m.b]) : linScale(domain, [H - m.b, m.t])
  const slot = (W - m.l - m.r) / items.length
  const bw = Math.min(46, slot * (narrow ? 0.5 : 0.42))
  const best = items.reduce((b, d, i) => ((invert ? d.med < items[b].med : d.med > items[b].med) ? i : b), 0)
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot rcol${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {ticks.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke="var(--rule-faint)" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{tickFmt(g)}</text>
            </g>
          ))}
          {items.map((d, i) => {
            const cx = m.l + slot * i + slot / 2
            const a = y(d.p25), b = y(d.p75)
            const top = Math.min(a, b)
            return (
              <g key={d.label} className={`rcol__c${i === best ? ' is-best' : ''}`} style={{ '--d': `${i * 80}ms` }}>
                <rect x={cx - bw / 2} y={top} width={bw} height={Math.abs(b - a)} rx="2" className="rcol__band" />
                <line x1={cx - bw / 2 - 3} x2={cx + bw / 2 + 3} y1={y(d.med)} y2={y(d.med)} className="rcol__med" />
                <text x={cx} y={top - 7} textAnchor="middle" className="rcol__val">{valFmt(d.med)}</text>
                <text x={cx} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{narrow ? `'${String(d.label).slice(2)}` : d.label}</text>
              </g>
            )
          })}
          {yCap && <text x={m.l - 8} y={m.t - 16} className="cb__axis">{yCap}</text>}
        </svg>
      </div>
    </div>
  )
}

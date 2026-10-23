import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// Stacked columns, one per year: each column is cut into parts coloured by key,
// with the column's total printed on top. Columns grow from the floor one after
// another. A column marked `partial` (the year still running) is drawn hatched
// at its top edge and labelled so.
// props: items [{ label, short?, parts: [{ key, value }], display, partial? }],
//   keys [{ key, label }], ticks, tickFmt, yCap, aria, H?, Hn?
export default function StackCols({ items, keys, ticks = [], tickFmt = (v) => v, yCap, aria, H: Hd = 360, Hn = 300 }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!items || !items.length) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? Hn : Hd
  const m = { t: 30, r: 8, b: 26, l: 44 }
  const tot = (d) => d.parts.reduce((s, p) => s + p.value, 0)
  const top = Math.max(...items.map(tot), ...(ticks.length ? [ticks[ticks.length - 1]] : [])) * 1.08
  const y = linScale([0, top], [H - m.b, m.t])
  const slot = (W - m.l - m.r) / items.length
  const bw = slot * (narrow ? 0.66 : 0.56)
  const bx = (i) => m.l + slot * i + (slot - bw) / 2
  return (
    <div ref={ref} className="scol">
      <ul className="srow__key scol__key" aria-hidden="true">
        {keys.map((k) => <li key={k.key}><i className={`msw msw--${k.key}`} />{k.label}</li>)}
      </ul>
      <div ref={root} className={`scol__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {ticks.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{tickFmt(g)}</text>
            </g>
          ))}
          {items.map((d, i) => {
            let acc = 0
            return (
              <g key={d.label} className="scol__col" style={{ '--d': `${i * 70}ms`, transformOrigin: `0 ${y(0)}px` }}>
                {d.parts.map((p) => {
                  const y0 = y(acc), y1 = y(acc + p.value)
                  acc += p.value
                  return p.value > 0 ? <rect key={p.key} x={bx(i)} y={y1} width={bw} height={Math.max(0, y0 - y1)} className={`mfill--${p.key}`} /> : null
                })}
                <text x={bx(i) + bw / 2} y={y(tot(d)) - 7} textAnchor="middle" className="scol__val">{d.display}</text>
                <text x={bx(i) + bw / 2} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{narrow && d.short ? d.short : d.label}{d.partial ? '*' : ''}</text>
              </g>
            )
          })}
          {yCap && <text x={m.l - 8} y={m.t - 16} className="cb__axis">{yCap}</text>}
        </svg>
      </div>
    </div>
  )
}

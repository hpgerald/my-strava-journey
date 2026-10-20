import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// The same days as the Lorenz curve, cut into ten equal groups from shortest
// to longest. Each bar is that tenth's share of all the distance. If every day
// were equal, every bar would stop at the dashed 10% line.
// props: shares [10 numbers, 0-1, shortest tenth first].
const pc = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`

export default function DecileBars({ shares }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!shares || shares.length !== 10) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: 14, b: 44, l: 40 }
  const top = Math.max(0.25, Math.ceil(Math.max(...shares) * 20) / 20)
  const y = linScale([0, top], [H - m.b, m.t])
  const slot = (W - m.l - m.r) / 10
  const bw = slot * (narrow ? 0.72 : 0.64)
  const bx = (i) => m.l + slot * i + (slot - bw) / 2
  const ticks = [0, 0.05, 0.1, 0.15, 0.2, 0.25].filter((t) => t <= top + 1e-9)
  const tone = (i) => (i < 5 ? 'quiet' : i < 8 ? 'mid' : 'big')

  return (
    <div ref={ref} className="dec">
      <div ref={root} className={`dec__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Active days cut into ten equal groups, shortest to longest. ${shares.map((s, i) => `Tenth ${i + 1}: ${pc(s)}`).join('. ')}. An even record would put 10% in each.`}
          style={{ display: 'block' }}>
          {ticks.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="dec__gl">{Math.round(g * 100)}%</text>
            </g>
          ))}

          {shares.map((s, i) => (
            <g key={i} className={`dec__bar dec__bar--${tone(i)}`} style={{ '--d': `${i * 70}ms` }}>
              <rect x={bx(i)} y={y(s)} width={bw} height={y(0) - y(s)} rx="2"
                style={{ transformOrigin: `0 ${y(0)}px` }} />
              <text x={bx(i) + bw / 2} y={y(s) - 7} textAnchor="middle" className="dec__val">
                {narrow ? (s * 100).toFixed(s < 0.1 ? 1 : 0) : pc(s)}
              </text>
              <text x={bx(i) + bw / 2} y={H - m.b + 16} textAnchor="middle" className="dec__gl">{i + 1}</text>
            </g>
          ))}

          {/* the even line drawn over the bars so it reads against every one */}
          <line className="dec__even" x1={m.l} y1={y(0.1)} x2={W - m.r} y2={y(0.1)} stroke="var(--ink)" strokeWidth="1.25" strokeDasharray="4 3" opacity="0.6" />
          <text className="dec__evenlbl dec__halo" x={m.l + 6} y={y(0.1) - 8} textAnchor="start">{narrow ? 'every day equal · 10%' : 'if every day were equal · 10%'}</text>

          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="dec__axis">each tenth of days, shortest to longest &rarr;</text>
          <text x={m.l - 8} y={m.t - 14} textAnchor="start" className="dec__axis">share of distance &uarr;</text>
        </svg>
      </div>
    </div>
  )
}

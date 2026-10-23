import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// A histogram with one thin bar per unit, where a few chosen bars (the spikes)
// are drawn in accent and labelled with their count. Built for the treadmill's
// stopping points: whole fives stand out of a low grey field.
// props: bins [{ x, count }], spikes [x], xCap, yCap, aria
export default function SpikeHist({ bins, spikes = [], xCap, yCap, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!bins || !bins.length) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 280 : 340
  const m = { t: 30, r: 10, b: 44, l: 40 }
  const max = Math.max(...bins.map((b) => b.count)) * 1.12
  const y = linScale([0, max], [H - m.b, m.t])
  const slot = (W - m.l - m.r) / bins.length
  const bw = Math.max(2, slot * 0.72)
  const spike = new Set(spikes)
  const step = Math.max(...bins.map((b) => b.x)) > 30 ? 5 : 2
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          <line x1={m.l} y1={y(0)} x2={W - m.r} y2={y(0)} stroke="var(--ink)" />
          {bins.map((b, i) => {
            const x = m.l + slot * i + (slot - bw) / 2
            const hi = spike.has(b.x)
            return (
              <g key={b.x} className={`cb__bar cb__bar--${hi ? 'big' : 'quiet'}`} style={{ '--d': `${i * 18}ms` }}>
                {b.count > 0 && <rect x={x} y={y(b.count)} width={bw} height={y(0) - y(b.count)} rx="1" style={{ transformOrigin: `0 ${y(0)}px` }} />}
                {hi && <text x={x + bw / 2} y={y(b.count) - 7} textAnchor="middle" className="cb__val">{b.count}</text>}
                {(b.x % step === 0 || b.x === 1) && <text x={x + bw / 2} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{b.x}</text>}
              </g>
            )
          })}
          {xCap && <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">{xCap}</text>}
          {yCap && <text x={m.l - 8} y={m.t - 16} className="cb__axis">{yCap}</text>}
        </svg>
      </div>
    </div>
  )
}

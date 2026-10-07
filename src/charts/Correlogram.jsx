import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// Autocorrelation of the daily active/rest series: does training today predict
// training some days later? Each bar is the correlation at a lag, from one day
// out to a full year. A tall bar near lag 1 that decays slowly is a habit with
// long memory; a bar at 365 near zero means no real annual cycle. The faint band
// is the 95% noise threshold (±2/√n): anything above it is a real signal.
// props: bars [{lag, acf}], conf (threshold), marks [{lag, label}], note hooks.
const COL = (lag) => (lag === 365 ? 'var(--grey-45)' : 'var(--accent)')

export default function Correlogram({ bars, conf = 0.04, marks = [] }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!bars || !bars.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const H = 300
  const m = { t: 18, r: 16, b: 46, l: 40 }
  const maxLag = Math.max(...bars.map((b) => b.lag))
  const maxAcf = Math.max(0.1, ...bars.map((b) => b.acf))
  const x = linScale([0, maxLag + 1], [m.l, W - m.r])
  const y = linScale([0, Math.ceil(maxAcf * 10) / 10], [H - m.b, m.t])
  const bw = Math.max(1.5, Math.min(7, ((W - m.l - m.r) / bars.length) * 0.55))

  const yTicks = []
  for (let t = 0; t <= maxAcf + 1e-9; t += 0.1) yTicks.push(Math.round(t * 10) / 10)

  return (
    <div ref={ref} className="corr">
      <div ref={root} className={`corr__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Autocorrelation of daily activity by lag. It starts near ${bars[0].acf.toFixed(2)} at one day, decays slowly across the first month, and falls near zero by a year.`}
          style={{ display: 'block' }}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.l} y1={y(t)} x2={W - m.r} y2={y(t)} stroke="var(--rule-faint)" strokeWidth="1" opacity="0.6" />
              <text x={m.l - 6} y={y(t) + 3} textAnchor="end" className="corr__gl">{t.toFixed(1)}</text>
            </g>
          ))}

          {/* 95% noise band: correlations below this are indistinguishable from chance */}
          <rect x={m.l} y={y(conf)} width={W - m.l - m.r} height={Math.max(0, (H - m.b) - y(conf))}
            fill="var(--ink)" opacity="0.05" />
          <line x1={m.l} y1={y(conf)} x2={W - m.r} y2={y(conf)} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <text x={W - m.r} y={y(conf) - 5} textAnchor="end" className="corr__band">95% noise floor</text>

          {/* zero axis */}
          <line x1={m.l} y1={y(0)} x2={W - m.r} y2={y(0)} stroke="var(--ink)" strokeWidth="1.25" />

          {bars.map((b, i) => {
            const h = Math.max(0, y(0) - y(b.acf))
            return (
              <rect key={b.lag} className="corr__bar" x={x(b.lag) - bw / 2} y={y(b.acf)} width={bw} height={h}
                rx={bw > 3 ? 1.5 : 0.8} fill={COL(b.lag)} style={{ transitionDelay: `${Math.min(i * 10, 500)}ms`, transformOrigin: `center ${y(0)}px` }} />
            )
          })}

          {marks.map((mk) => {
            const px = x(mk.lag)
            const nearRight = px > W - m.r - 46
            return (
              <g key={mk.lag} className="corr__mark">
                <line x1={px} y1={m.t + 2} x2={px} y2={H - m.b} stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                <text x={nearRight ? px - 5 : px + 5} y={m.t - 4} textAnchor={nearRight ? 'end' : 'start'} className="corr__mkl">{mk.label}</text>
              </g>
            )
          })}

          <text x={(m.l + W - m.r) / 2} y={H - 10} textAnchor="middle" className="corr__axis">days between &rarr;</text>
        </svg>
      </div>
    </div>
  )
}

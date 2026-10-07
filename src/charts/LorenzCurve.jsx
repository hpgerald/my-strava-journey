import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, linePath } from './primitives.js'

// A Lorenz curve: how evenly the kilometres are shared across the days that
// carry them. The straight diagonal is a perfectly even record, every day the
// same. The real curve bows below it; the gap between the two, scaled, is the
// Gini coefficient. The further the bow, the more a few big days do the work.
// props: points [{p,l}] (share of days, share of distance), gini, markP (a day
// share to call out), markLabel.
const pc = (v) => `${Math.round(v * 100)}%`

export default function LorenzCurve({ points, gini, markP = 0.9, unitLabel = 'distance' }) {
  const [ref, width] = useWidth(520)
  const [root, inView] = useInView()
  if (!points || points.length < 2) return <div ref={ref} />

  const W = Math.max(280, width)
  const S = Math.min(W, 380)
  const m = { t: 20, r: 18, b: 40, l: 44 }
  const x = linScale([0, 1], [m.l, S - m.r])
  const y = linScale([0, 1], [S - m.b, m.t])
  const pts = points.map((d) => [x(d.p), y(d.l)])

  // the top (1 - markP) share: find l at markP
  let lAt = 0
  for (const d of points) { if (d.p <= markP + 1e-9) lAt = d.l }
  const topShare = 1 - lAt
  const topFrac = 1 - markP

  return (
    <div ref={ref} className="lorenz">
      <div ref={root} className={`lorenz__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={S} viewBox={`0 0 ${S} ${S}`} role="img"
          aria-label={`Lorenz curve of distance by day. Gini ${gini.toFixed(2)}. The busiest ${pc(topFrac)} of days hold ${pc(topShare)} of all the ground.`}
          style={{ display: 'block', margin: '0 auto', maxWidth: `${S}px` }}>
          {[0.25, 0.5, 0.75].map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={S - m.r} y2={y(g)} stroke="var(--rule-faint)" strokeWidth="1" opacity="0.5" />
              <text x={m.l - 6} y={y(g) + 3} textAnchor="end" className="lorenz__gl">{pc(g)}</text>
            </g>
          ))}
          {/* equality diagonal */}
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--ink)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
          <text x={x(0.52)} y={y(0.52) - 6} className="lorenz__eq" transform={`rotate(-38 ${x(0.52)} ${y(0.52)})`}>a perfectly even record</text>
          {/* the gap (Gini area) */}
          <path className="lorenz__area" d={`${linePath(pts)} L${x(1)} ${y(1)} Z`} fill="color-mix(in srgb, var(--accent) 13%, var(--paper))" stroke="none" />
          {/* the Lorenz curve */}
          <path className="lorenz__line" d={linePath(pts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          {/* top-decile marker */}
          <line x1={x(markP)} y1={y(lAt)} x2={x(markP)} y2={S - m.b} stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
          <circle cx={x(markP)} cy={y(lAt)} r="3.5" fill="var(--accent-ink)" />
          <text x={m.l + 6} y={m.t + 12} className="lorenz__gini">Gini {gini.toFixed(2)}</text>
          <text x={x(1)} y={S - 24} textAnchor="end" className="lorenz__axis">share of active days &rarr;</text>
          <text x={m.l + 2} y={m.t - 6} className="lorenz__axis">&uarr; share of {unitLabel}</text>
        </svg>
      </div>
    </div>
  )
}

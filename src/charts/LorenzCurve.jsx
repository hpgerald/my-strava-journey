import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, linePath } from './primitives.js'

// A Lorenz curve: how evenly the kilometres are shared across the days that
// carry them. The straight diagonal is the even-split line, every day the
// same. The real curve bows below it; the gap between the two, scaled, is the
// Gini coefficient. The further the bow, the more a few big days do the work.
// props: points [{p,l}] (share of days, share of distance), gini, markP (a day
// share to call out), unitLabel.
const pc = (v) => `${Math.round(v * 100)}%`

export default function LorenzCurve({ points, gini, markP = 0.9, unitLabel = 'distance' }) {
  const [ref, width] = useWidth(520)
  const [root, inView] = useInView()
  if (!points || points.length < 2) return <div ref={ref} />

  const W = Math.max(280, width)
  const S = Math.min(W, 360)
  const m = { t: 22, r: 20, b: 46, l: 50 }
  const x = linScale([0, 1], [m.l, S - m.r])
  const y = linScale([0, 1], [S - m.b, m.t])
  const pts = points.map((d) => [x(d.p), y(d.l)])

  // the top (1 - markP) share: find l at markP
  let lAt = 0
  for (const d of points) { if (d.p <= markP + 1e-9) lAt = d.l }
  const topShare = 1 - lAt
  const topFrac = 1 - markP

  // Gini label parked inside the widest part of the gap, clear of both lines
  const gx = 0.62
  const gy = (gx + lAt) / 2 // roughly midway between diagonal (y=gx) and curve

  return (
    <div ref={ref} className="lorenz">
      <div ref={root} className={`lorenz__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={S} viewBox={`0 0 ${S} ${S}`} role="img"
          aria-label={`Lorenz curve of ${unitLabel} by day. Gini coefficient ${gini.toFixed(2)}. The busiest ${pc(topFrac)} of active days carry ${pc(topShare)} of all the ground covered.`}
          style={{ display: 'block', margin: '0 auto', maxWidth: `${S}px` }}>
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={S - m.r} y2={y(g)} stroke="var(--rule-faint)" strokeWidth="1" opacity="0.5" />
              <text x={m.l - 7} y={y(g) + 3} textAnchor="end" className="lorenz__gl">{pc(g)}</text>
            </g>
          ))}
          {/* equality diagonal: the even-split line */}
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--ink)" strokeWidth="1.25" strokeDasharray="4 3" opacity="0.55" />
          {/* the gap (Gini area) */}
          <path className="lorenz__area" d={`${linePath(pts)} L${x(1)} ${y(1)} Z`} fill="color-mix(in srgb, var(--accent) 14%, var(--paper))" stroke="none" />
          {/* the Lorenz curve */}
          <path className="lorenz__line" d={linePath(pts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.75" strokeLinecap="round" />
          {/* Gini value, parked inside the gap */}
          <text x={x(gx)} y={y(gy)} textAnchor="middle" className="lorenz__gini">Gini {gini.toFixed(2)}</text>
          {/* busiest-decile marker */}
          <line x1={x(markP)} y1={y(lAt)} x2={x(markP)} y2={S - m.b} stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
          <circle cx={x(markP)} cy={y(lAt)} r="4" fill="var(--accent-ink)" />
          {/* axis captions */}
          <text x={m.l - 7} y={m.t - 8} textAnchor="start" className="lorenz__axis">share of {unitLabel}</text>
          <text x={S - m.r} y={S - 14} textAnchor="end" className="lorenz__axis">share of active days</text>
        </svg>
      </div>
      <dl className="lorenz__key">
        <div className="lorenz__keyitem">
          <span className="lorenz__swatch lorenz__swatch--eq" aria-hidden="true" />
          <dt>Even-split line</dt>
          <dd>every day covers the same distance</dd>
        </div>
        <div className="lorenz__keyitem">
          <span className="lorenz__swatch lorenz__swatch--curve" aria-hidden="true" />
          <dt>The real record</dt>
          <dd>how the distance actually stacks up, day by day</dd>
        </div>
        <div className="lorenz__keyitem">
          <span className="lorenz__swatch lorenz__swatch--gap" aria-hidden="true" />
          <dt>The gap</dt>
          <dd>how far the record leans on its big days, scaled to the Gini coefficient</dd>
        </div>
        <div className="lorenz__keyitem">
          <span className="lorenz__swatch lorenz__swatch--mark" aria-hidden="true" />
          <dt>Busiest {pc(topFrac)} of days</dt>
          <dd>carry {pc(topShare)} of all the ground covered</dd>
        </div>
      </dl>
    </div>
  )
}

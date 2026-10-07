import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// Where a record sits in the distribution it came from. The histogram is every
// ordinary effort; the orange marker is the record, pushed far out into the
// empty tail. The grey band is one standard deviation either side of the mean,
// so the distance to the record reads as a count of sigmas. The point: the
// record is not a little better than usual, it is many deviations beyond it.
// props: values [], mark, mean, sd, z, pct, unit, markLabel.
export default function TailOutlier({ values, mark, mean, sd, z, pct, unit = 'km', markLabel = 'the record' }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!values || !values.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 288
  const m = { t: 36, r: 18, b: 46, l: 16 }

  const hi = Math.max(mark, ...values) * 1.04
  const binW = hi <= 50 ? 1 : 2
  const nbins = Math.ceil(hi / binW)
  const counts = new Array(nbins).fill(0)
  for (const v of values) { const b = Math.min(nbins - 1, Math.floor(v / binW)); counts[b] += 1 }
  const maxCount = Math.max(...counts)

  const x = linScale([0, hi], [m.l, W - m.r])
  const y = linScale([0, maxCount], [H - m.b, m.t])
  const bw = (x(binW) - x(0)) * 0.9

  const xTicks = []
  const step = hi <= 50 ? 10 : 20
  for (let t = 0; t <= hi; t += step) xTicks.push(t)

  return (
    <div ref={ref} className="tail">
      <div ref={root} className={`tail__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Distribution of efforts with the record marked. The average is ${mean.toFixed(1)} ${unit}; the record of ${mark.toFixed(1)} ${unit} sits ${z.toFixed(1)} standard deviations out, past the ${pct} percentile.`}
          style={{ display: 'block' }}>
          {/* one-sigma band */}
          <rect x={x(Math.max(0, mean - sd))} y={m.t} width={x(mean + sd) - x(Math.max(0, mean - sd))} height={H - m.b - m.t}
            fill="var(--ink)" opacity="0.05" />
          <line x1={x(mean)} y1={m.t} x2={x(mean)} y2={H - m.b} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <text x={x(mean)} y={16} textAnchor="middle" className="tail__meanlbl">average {mean.toFixed(1)} {unit}</text>
          <text x={x(mean)} y={28} textAnchor="middle" className="tail__meanlbl tail__meanlbl--dim">shaded band = &plusmn;1 sd</text>

          {/* baseline */}
          <line x1={m.l} y1={y(0)} x2={W - m.r} y2={y(0)} stroke="var(--ink)" strokeWidth="1.25" />

          {/* histogram */}
          {counts.map((c, i) => c > 0 ? (
            <rect key={i} className="tail__bar" x={x(i * binW) + (x(binW) - x(0)) * 0.05} y={y(c)} width={bw}
              height={Math.max(0, y(0) - y(c))} rx="1" fill="var(--grey-45)"
              style={{ transitionDelay: `${Math.min(i * 12, 420)}ms`, transformOrigin: `center ${y(0)}px` }} />
          ) : null)}

          {/* the record, far out in the tail */}
          <g className="tail__mark">
            <line x1={x(mark)} y1={y(0)} x2={x(mark)} y2={m.t + 40} stroke="var(--accent)" strokeWidth="2" />
            <circle cx={x(mark)} cy={m.t + 40} r="4.5" fill="var(--accent)" />
            <text x={x(mark)} y={m.t + 30} textAnchor="middle" className="tail__markv">{mark.toFixed(1)} {unit}</text>
          </g>

          {/* the gap arrow from the bulk to the record */}
          <g className="tail__gap">
            <line x1={x(mean + sd) + 4} y1={H - m.b - 14} x2={x(mark) - 6} y2={H - m.b - 14}
              stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" markerEnd="" />
            <text x={(x(mean + sd) + x(mark)) / 2} y={H - m.b - 20} textAnchor="middle" className="tail__gaplbl">
              {z.toFixed(1)} standard deviations out · {pct}
            </text>
          </g>

          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - 22} textAnchor="middle" className="tail__gl">{t}</text>
          ))}
          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="tail__axis">distance per outing, {unit} &rarr;</text>
        </svg>
      </div>
    </div>
  )
}

import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, linePath } from './primitives.js'
import { linreg } from '../lib/stats.js'

// A rank-size plot on log-log axes. Rank each place by how often it appears, then
// plot rank against count with both axes logarithmic. If the places follow a
// power law (Zipf), the dots fall along a straight line; the slope is how fast
// the world narrows as you go down the list, and R2 says how clean the law is.
// props: items [{label, value}] already sorted largest first, unit.
const log10 = (v) => Math.log(v) / Math.LN10

export default function RankSize({ items, unit = 'activities' }) {
  const [ref, width] = useWidth(560)
  const [root, inView] = useInView()
  if (!items || items.length < 3) return <div ref={ref} />

  const ranked = items.filter((d) => d.value > 0)
  const n = ranked.length
  const lx = ranked.map((_, i) => log10(i + 1))
  const ly = ranked.map((d) => log10(d.value))
  const fit = linreg(lx, ly)
  const slope = fit ? fit.m : 0
  const r2 = fit ? fit.r2 : 0

  const W = Math.max(300, width)
  const H = Math.min(W * 0.72, 380)
  const m = { t: 20, r: 20, b: 48, l: 46 }
  const xmax = log10(n)
  const ymax = Math.ceil(ly[0] * 2) / 2
  const x = linScale([0, xmax], [m.l, W - m.r])
  const y = linScale([0, ymax], [H - m.b, m.t])

  // decade gridlines (1, 10, 100, 1000)
  const xDecades = []
  for (let d = 0; Math.pow(10, d) <= n; d++) xDecades.push(d)
  const yDecades = []
  for (let d = 0; d <= ymax + 1e-9; d++) yDecades.push(d)

  const fitLine = [
    [x(0), y(fit.predict(0))],
    [x(xmax), y(fit.predict(xmax))],
  ]

  // Label the top place and the last always; add ranks 2 and 3 only when the plot
  // is wide enough that their names will not collide (they sit close together).
  const labelIdx = new Set([0, n - 1])
  if (W >= 620) { labelIdx.add(1); labelIdx.add(2) }

  return (
    <div ref={ref} className="ranksize">
      <div ref={root} className={`ranksize__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Rank-size plot of places on log-log axes. The points fall close to a straight line with R-squared ${r2.toFixed(2)}, a near power-law distribution.`}
          style={{ display: 'block' }}>
          {yDecades.map((d) => (
            <g key={`y${d}`}>
              <line x1={m.l} y1={y(d)} x2={W - m.r} y2={y(d)} stroke="var(--rule-faint)" strokeWidth="1" opacity="0.6" />
              <text x={m.l - 6} y={y(d) + 3} textAnchor="end" className="ranksize__gl">{Math.pow(10, d).toLocaleString('en-US')}</text>
            </g>
          ))}
          {xDecades.map((d) => (
            <text key={`x${d}`} x={x(d)} y={H - m.b + 16} textAnchor="middle" className="ranksize__gl">
              {d === 0 ? '1st' : `${Math.pow(10, d)}th`}
            </text>
          ))}

          {/* fitted power law */}
          <path className="ranksize__fit" d={linePath(fitLine)} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.55" />

          {/* points */}
          {ranked.map((d, i) => (
            <circle key={i} className="ranksize__dot" cx={x(log10(i + 1))} cy={y(log10(d.value))} r={i === 0 ? 5 : 4}
              fill={i === 0 ? 'var(--accent)' : 'var(--accent-ink)'} style={{ transitionDelay: `${Math.min(i * 28, 600)}ms` }} />
          ))}

          {/* a few labels */}
          {ranked.map((d, i) => labelIdx.has(i) ? (
            <text key={`l${i}`} className="ranksize__lbl" x={x(log10(i + 1)) + (i === n - 1 ? -8 : 8)} y={y(log10(d.value)) - 7}
              textAnchor={i === n - 1 ? 'end' : 'start'}>{d.label}</text>
          ) : null)}

          <text x={W - m.r} y={m.t + 6} textAnchor="end" className="ranksize__fitlbl">
            power-law fit · R&sup2; {r2.toFixed(2)}
          </text>
          <text x={(m.l + W - m.r) / 2} y={H - 8} textAnchor="middle" className="ranksize__axis">rank of place (log) &rarr;</text>
        </svg>
      </div>
    </div>
  )
}

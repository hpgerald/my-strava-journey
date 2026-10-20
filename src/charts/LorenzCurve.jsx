import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, linePath } from './primitives.js'

// Every active day lined up from shortest to longest, with the distance added
// up as you go. The dashed diagonal is what an even record would look like;
// the real record bows below it, and the shaded gap is the Gini coefficient.
// Labels sit on the chart itself (no legend to cross-reference).
// props: points [{p,l}] (share of days, share of distance), gini, markP (a day
// share to call out, e.g. 0.9 = where the busiest tenth begins).
const pc = (v) => `${Math.round(v * 100)}%`

export default function LorenzCurve({ points, gini, markP = 0.9 }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!points || points.length < 2) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: 14, b: 44, l: 40 }
  const x = linScale([0, 1], [m.l, W - m.r])
  const y = linScale([0, 1], [H - m.b, m.t])
  const pts = points.map((d) => [x(d.p), y(d.l)])
  const lAt = (p) => { let v = 0; for (const d of points) { if (d.p <= p + 1e-9) v = d.l; else break } return v }

  const markL = lAt(markP)
  const topShare = 1 - markL
  const gp = 0.56 // where the Gini label sits, inside the widest part of the gap
  const cp = narrow ? 0.5 : 0.74 // where "the real record" label sits, just under the curve
  const ep = narrow ? 0.45 : 0.3 // where "if every day were equal" sits, just above the diagonal
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div ref={ref} className="lorenz">
      <div ref={root} className={`lorenz__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Days lined up from shortest to longest, with distance added up as you go. An even record would follow the diagonal. The real record bows below it: the busiest ${pc(1 - markP)} of days carry ${pc(topShare)} of all the distance. Gini coefficient ${gini.toFixed(2)}.`}
          style={{ display: 'block' }}>
          {ticks.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="lorenz__gl">{pc(g)}</text>
              <text x={x(g)} y={H - m.b + 16} textAnchor={g === 0 ? 'start' : g === 1 ? 'end' : 'middle'} className="lorenz__gl">{pc(g)}</text>
            </g>
          ))}

          {/* even split, the gap, and the real record */}
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--ink)" strokeWidth="1.25" strokeDasharray="4 3" opacity="0.55" />
          <path className="lorenz__area" d={`${linePath(pts)} L${x(1)} ${y(1)} Z`} fill="color-mix(in srgb, var(--accent) 14%, var(--paper))" stroke="none" />
          <path className="lorenz__line" d={linePath(pts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.75" strokeLinecap="round" />

          {/* where the busiest tenth begins */}
          <line className="lorenz__lbl" x1={x(markP)} y1={y(markL)} x2={x(markP)} y2={H - m.b} stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2 2" />
          <circle className="lorenz__lbl" cx={x(markP)} cy={y(markL)} r="4.5" fill="var(--accent-ink)" stroke="var(--paper)" strokeWidth="1.5" />

          {/* direct labels */}
          <text className="lorenz__lbl lorenz__eq lorenz__halo" x={x(ep) - 6} y={y(ep) - 12} textAnchor="end">if every day were equal</text>
          <text className="lorenz__lbl lorenz__gini lorenz__halo" x={x(gp)} y={y((gp + lAt(gp)) / 2) + 6} textAnchor="middle">Gini {gini.toFixed(2)}</text>
          <text className="lorenz__lbl lorenz__rec lorenz__halo" x={x(cp) + 8} y={y(lAt(cp)) + (narrow ? 24 : 20)} textAnchor="start">the real record</text>
          <text className="lorenz__lbl lorenz__mk lorenz__halo" x={x(markP) - 10} y={y(markL) - 2} textAnchor="end">busiest tenth</text>
          <text className="lorenz__lbl lorenz__mk lorenz__halo" x={x(markP) - 10} y={y(markL) + 14} textAnchor="end">{pc(topShare)} of the distance</text>

          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="lorenz__axis">share of active days, shortest to longest &rarr;</text>
          <text x={m.l - 8} y={m.t - 14} textAnchor="start" className="lorenz__axis">share of distance &uarr;</text>
        </svg>
      </div>
    </div>
  )
}

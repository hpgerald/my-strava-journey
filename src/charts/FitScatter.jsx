import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// A scatter of one measure against another with its least-squares line drawn
// through it and the correlation printed on the line. Dots wash in first, the
// line draws after. `invertY` puts smaller values at the top (quicker paces).
// props: points [{ x, y }], fit { slope, intercept, r }, xDomain, yDomain,
//   xTicks, yTicks, xFmt, yFmt, xCap, yCap, tone (mode key), invertY, fitLabel, aria
export default function FitScatter({ points, fit, xDomain, yDomain, xTicks = [], yTicks = [], xFmt = (v) => v, yFmt = (v) => v, xCap, yCap, tone = 'tread', invertY = false, fitLabel, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: 12, b: 44, l: 44 }
  const x = linScale(xDomain, [m.l, W - m.r])
  const y = invertY ? linScale(yDomain, [m.t, H - m.b]) : linScale(yDomain, [H - m.b, m.t])
  const clampX = (v) => Math.max(xDomain[0], Math.min(xDomain[1], v))
  const clampY = (v) => Math.max(Math.min(...yDomain), Math.min(Math.max(...yDomain), v))
  const fx0 = xDomain[0], fx1 = xDomain[1]
  const ly = (v) => clampY(fit.intercept + fit.slope * v)
  const lx1 = x(fx0), ly1 = y(ly(fx0)), lx2 = x(fx1), ly2 = y(ly(fx1))
  const len = Math.hypot(lx2 - lx1, ly2 - ly1)
  // the r label rides the line near its right end, nudged off it
  const tx = lx1 + (lx2 - lx1) * 0.72, ty = ly1 + (ly2 - ly1) * 0.72
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot fsc${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {yTicks.map((g) => (
            <g key={`y${g}`}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke="var(--rule-faint)" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{yFmt(g)}</text>
            </g>
          ))}
          {xTicks.map((g) => <text key={`x${g}`} x={x(g)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{xFmt(g)}</text>)}
          <line x1={m.l} y1={H - m.b} x2={W - m.r} y2={H - m.b} stroke="var(--ink)" />
          <g className="fsc__dots">
            {points.map((p, i) => (
              <circle key={i} cx={x(clampX(p.x))} cy={y(clampY(p.y))} r={narrow ? 2.2 : 2.8} className={`fsc__dot mfill--${tone}`} style={{ '--d': `${Math.round((i / points.length) * 900)}ms` }} />
            ))}
          </g>
          <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} className="fsc__fit" strokeDasharray={len} style={{ '--len': len }} />
          <text x={tx} y={ty - 12} textAnchor="middle" className="fsc__r cb__halo">{fitLabel || `r = ${fit.r.toFixed(2)}`}</text>
          {xCap && <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">{xCap}</text>}
          {yCap && <text x={m.l - 8} y={m.t - 16} className="cb__axis">{yCap}</text>}
        </svg>
      </div>
    </div>
  )
}

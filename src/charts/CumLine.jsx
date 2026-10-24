import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// A running total against time, filled underneath, with each milestone marked
// where the line crossed it: a dot, a dashed drop to the time axis and the
// mark's value. The line draws itself in; the marks follow.
// props: series [{ t, v }] (in order), marks [{ t, v, label }], yTicks, yFmt,
//   yCap, aria
export default function CumLine({ series, marks = [], yTicks = [], yFmt = (v) => v, yCap, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!series || series.length < 2) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: 14, b: 26, l: 52 }
  const ta = series[0].t, tb = series[series.length - 1].t
  const t0 = Date.UTC(new Date(ta).getUTCFullYear(), 0, 1)
  const x = linScale([t0, tb], [m.l, W - m.r])
  const top = Math.max(series[series.length - 1].v, ...yTicks)
  const y = linScale([0, top * 1.04], [H - m.b, m.t])
  // thin the series to one point per pixel column
  const pts = []
  let lastX = -1
  for (const p of series) { const px = Math.round(x(p.t)); if (px !== lastX) { pts.push([x(p.t), y(p.v)]); lastX = px } }
  pts.push([x(tb), y(series[series.length - 1].v)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${x(tb).toFixed(1)} ${y(0)} L${x(ta).toFixed(1)} ${y(0)} Z`
  const len = W * 2.5
  const years = []
  for (let yy = new Date(t0).getUTCFullYear(); Date.UTC(yy, 0, 1) <= tb; yy++) years.push(yy)
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot cuml${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {yTicks.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{yFmt(g)}</text>
            </g>
          ))}
          {years.map((yy) => <text key={yy} x={x(Math.min(tb, Date.UTC(yy, 6, 1)))} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{narrow ? `'${String(yy).slice(2)}` : yy}</text>)}
          <path d={area} className="cuml__area" />
          <path d={line} className="cuml__line" fill="none" strokeDasharray={len} style={{ '--len': len }} />
          {marks.map((k, i) => (
            <g key={k.label} className="cuml__mark" style={{ '--d': `${0.9 + i * 0.12}s` }}>
              <line x1={x(k.t)} x2={x(k.t)} y1={y(k.v)} y2={y(0)} stroke="var(--ink)" strokeDasharray="2 3" opacity="0.5" />
              <circle cx={x(k.t)} cy={y(k.v)} r="4.5" className="cuml__dot" />
              <text x={x(k.t) - 7} y={y(k.v) - 2} textAnchor="end" className="cuml__lbl cb__halo">{k.label}</text>
            </g>
          ))}
          {yCap && <text x={m.l - 8} y={m.t - 16} className="cb__axis">{yCap}</text>}
        </svg>
      </div>
    </div>
  )
}

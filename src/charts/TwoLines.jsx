import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, linePath } from './primitives.js'

// Two counts across the years, each labelled at its own end, with the year the
// second line takes the lead marked. Used for walks against runs.
// props: years [n], a {label, values}, b {label, values} (b is the accent line),
//   cross (index of the first year b leads, or -1), aria
export default function TwoLines({ years, a, b, cross = -1, crossLabel, aria, yCap = 'outings a year' }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!years || years.length < 2) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: narrow ? 52 : 64, b: 44, l: 40 }
  const max = Math.max(...a.values, ...b.values)
  const step = max > 1000 ? 500 : max > 200 ? 100 : 50
  const top = Math.ceil(max / step) * step
  const x = linScale([0, years.length - 1], [m.l + 6, W - m.r])
  const y = linScale([0, top], [H - m.b, m.t])
  const ticks = []
  for (let t = 0; t <= top; t += step) ticks.push(t)
  const pa = a.values.map((v, i) => [x(i), y(v)])
  const pb = b.values.map((v, i) => [x(i), y(v)])
  const li = years.length - 1
  // keep the two end labels apart
  let ya = y(a.values[li]) + 4, yb = y(b.values[li]) + 4
  if (Math.abs(ya - yb) < 16) { if (yb <= ya) { yb = ya - 16 } else { ya = yb - 16 } }

  return (
    <div ref={ref} className="tl">
      <div ref={root} className={`tl__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} y1={y(t)} x2={W - m.r} y2={y(t)} stroke={t === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="tl__gl">{t.toLocaleString('en-US')}</text>
            </g>
          ))}
          {years.map((yr, i) => (
            <text key={yr} x={x(i)} y={H - m.b + 16} textAnchor="middle" className="tl__gl">{narrow ? `'${String(yr).slice(2)}` : yr}</text>
          ))}
          {cross >= 0 && (
            <g className="tl__cross">
              <line x1={x(cross)} y1={m.t} x2={x(cross)} y2={H - m.b} stroke="var(--accent-ink)" strokeWidth="1" strokeDasharray="2 2" />
              {crossLabel && <text x={x(cross) > W * 0.7 ? x(cross) - 6 : x(cross) + 6} y={m.t + 10} textAnchor={x(cross) > W * 0.7 ? 'end' : 'start'} className="tl__crosslbl tl__halo">{crossLabel}</text>}
            </g>
          )}
          <path className="tl__line" d={linePath(pa)} pathLength="1" fill="none" stroke="var(--grey-55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path className="tl__line" d={linePath(pb)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
          {pa.map(([cx, cy], i) => <circle key={'a' + i} className="tl__dot" cx={cx} cy={cy} r="3" fill="var(--grey-55)" />)}
          {pb.map(([cx, cy], i) => <circle key={'b' + i} className="tl__dot" cx={cx} cy={cy} r="3.5" fill="var(--accent)" />)}
          <text x={x(li) + 8} y={ya} className="tl__end tl__end--a">{a.label}</text>
          <text x={x(li) + 8} y={yb} className="tl__end tl__end--b">{b.label}</text>
          <text x={m.l - 8} y={m.t - 14} textAnchor="start" className="tl__axis">{yCap} &uarr;</text>
          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="tl__axis">year &rarr;</text>
        </svg>
      </div>
    </div>
  )
}

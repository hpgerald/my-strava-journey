import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// Every month of the record as one cell, years down, months across. The shade is
// the share of that month's days with an activity: pale is a thin month, deep
// orange a month with something nearly every day. Months outside the record are
// left empty. Marked columns (e.g. the dip months) carry a bracket on top.
// props: years [number], cells {[year]: [12 x (share 0-1 | null)]}, mark [month index]
const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const STOPS = [[246, 241, 238], [255, 205, 181], [252, 76, 2], [168, 46, 0]]
function ramp(t) {
  const v = Math.max(0, Math.min(1, t))
  const seg = 1 / (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(v / seg))
  const u = (v - i * seg) / seg
  const a = STOPS[i], b = STOPS[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`
}

export default function MonthGrid({ years, cells, mark = [], markLabel }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!years || !years.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 34, r: 14, b: 44, l: narrow ? 34 : 44 }
  const cw = (W - m.l - m.r) / 12
  const ch = (H - m.t - m.b) / years.length
  const gap = narrow ? 2 : 3
  const lg = { w: Math.min(160, W * 0.36), h: 8 }

  return (
    <div ref={ref} className="mgrid">
      <div ref={root} className={`mgrid__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Share of days active in each month, ${years[0]} to ${years[years.length - 1]}. ${years.map((y) => `${y}: ${cells[y].map((v, i) => (v == null ? '' : `${MON[i]} ${Math.round(v * 100)}%`)).filter(Boolean).join(', ')}`).join('. ')}.`}
          style={{ display: 'block' }}>
          {mark.length > 0 && (() => {
            const x0 = m.l + cw * Math.min(...mark) + gap / 2
            const x1 = m.l + cw * (Math.max(...mark) + 1) - gap / 2
            return (
              <g className="mgrid__mark">
                <path d={`M${x0} ${m.t - 6} V${m.t - 12} H${x1} V${m.t - 6}`} fill="none" stroke="var(--accent-ink)" strokeWidth="1.25" />
                {markLabel && <text x={(x0 + x1) / 2} y={m.t - 17} textAnchor="middle" className="mgrid__marklbl">{markLabel}</text>}
              </g>
            )
          })()}
          {years.map((y, r) => (
            <g key={y}>
              <text x={m.l - 8} y={m.t + ch * r + ch / 2 + 4} textAnchor="end" className="mgrid__yr">{narrow ? `'${String(y).slice(2)}` : y}</text>
              {cells[y].map((v, c) => (
                <rect key={c} className="mgrid__cell" style={{ '--d': `${(r * 12 + c) * 6}ms` }}
                  x={m.l + cw * c + gap / 2} y={m.t + ch * r + gap / 2} width={cw - gap} height={ch - gap} rx="2"
                  fill={v == null ? 'none' : ramp(v)} stroke={v == null ? 'var(--rule-faint)' : 'none'} strokeDasharray={v == null ? '2 2' : undefined}>
                  <title>{`${y} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][c]}: ${v == null ? 'outside the record' : `${Math.round(v * 100)}% of days active`}`}</title>
                </rect>
              ))}
            </g>
          ))}
          {MON.map((l, c) => (
            <text key={c} x={m.l + cw * c + cw / 2} y={H - m.b + 16} textAnchor="middle" className={`mgrid__gl${mark.includes(c) ? ' mgrid__gl--mark' : ''}`}>{l}</text>
          ))}
          <defs>
            <linearGradient id="mgrid-ramp" x1="0" x2="1" y1="0" y2="0">
              {STOPS.map((s, i) => <stop key={i} offset={i / (STOPS.length - 1)} stopColor={`rgb(${s.join(',')})`} />)}
            </linearGradient>
          </defs>
          <text x={m.l} y={H - 6} textAnchor="start" className="mgrid__axis">0%</text>
          <rect x={m.l + 22} y={H - 13} width={lg.w} height={lg.h} rx="2" fill="url(#mgrid-ramp)" />
          <text x={m.l + 28 + lg.w} y={H - 6} textAnchor="start" className="mgrid__axis">100% of days active</text>
        </svg>
      </div>
    </div>
  )
}

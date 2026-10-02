import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The ordinary day, set against all the records above. One clock, dawn to midnight,
// with the usual outing dropped where it usually falls: a short session in the early
// evening. The far edges are rare by definition; almost all of the total came from
// days that looked like this one. props: medKm, medMin, hour (0-23), doublesPct.
const hourLabel = (h) => { const am = h < 12; const hr = h % 12 || 12; return `${hr}${am ? 'am' : 'pm'}` }

export default function OrdinaryDay({ medKm = 0, medMin = 0, hour = 18, doublesPct = 0 }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(300, width)
  const H = 86
  const m = { t: 30, r: 12, b: 24, l: 12 }
  const iw = W - m.l - m.r
  const x = linScale([0, 24], [m.l, W - m.r])
  const trackY = m.t + 10
  const trackH = 16
  const bx0 = x(hour)
  const bx1 = x(Math.min(24, hour + medMin / 60))
  const ticks = [0, 6, 12, 18, 24]

  return (
    <div ref={ref} className="ord">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`A usual day: a single outing of about ${medKm.toFixed(1)} km lasting around ${Math.round(medMin)} minutes, starting near ${hourLabel(hour)}.`}
        style={{ display: 'block' }}>
        <rect x={m.l} y={trackY} width={iw} height={trackH} rx="8" fill="var(--grey-06)" />
        <rect x={bx0} y={trackY} width={Math.max(6, bx1 - bx0)} height={trackH} rx="8" fill="var(--accent)" />
        <text x={(bx0 + bx1) / 2} y={trackY - 7} textAnchor="middle" className="ord__blk">the usual outing</text>
        {ticks.map((h) => (
          <g key={h}>
            <line x1={x(h)} y1={trackY - 3} x2={x(h)} y2={trackY + trackH + 3} stroke="var(--rule)" strokeWidth="1" />
            <text x={x(h)} y={H - 8} textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'} className="chart-tick">{h === 0 ? 'midnight' : h === 24 ? 'midnight' : hourLabel(h)}</text>
          </g>
        ))}
      </svg>
      <ul className="ord__stats">
        <li><span className="ord__v">{medKm.toFixed(1)}<span className="ord__u"> km</span></span><span className="ord__l">the median outing</span></li>
        <li><span className="ord__v">{Math.round(medMin)}<span className="ord__u"> min</span></span><span className="ord__l">how long it lasts</span></li>
        <li><span className="ord__v">{hourLabel(hour)}</span><span className="ord__l">when it usually starts</span></li>
        <li><span className="ord__v">{doublesPct}<span className="ord__u">%</span></span><span className="ord__l">of active days hold two</span></li>
      </ul>
    </div>
  )
}

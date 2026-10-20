import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

// A typical active day, one row per year. The bar is the minutes moving on a day
// with an activity, cut into the outings that made it: each block is the average
// outing, so a row of short blocks is a day of doubles and one long block is a
// single long outing. Grey before the habit, ink for the habit years, accent for
// the year in progress.
// props: rows [{year, perDay, outings, avgMin}], quietUntil (last grey year)
export default function DaySplit({ rows, quietUntil }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!rows || !rows.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: narrow ? 70 : 92, b: 44, l: narrow ? 34 : 44 }
  const maxMin = Math.max(120, Math.ceil(Math.max(...rows.map((r) => r.perDay)) / 30) * 30)
  const x = linScale([0, maxMin], [m.l, W - m.r])
  const band = (H - m.t - m.b) / rows.length
  const bh = Math.min(22, band * 0.62)
  const last = rows[rows.length - 1].year
  const tone = (yr) => (yr <= quietUntil ? 'quiet' : yr === last ? 'now' : 'mid')
  const ticks = []
  for (let t = 0; t <= maxMin; t += 30) ticks.push(t)

  return (
    <div ref={ref} className="dsplit">
      <div ref={root} className={`dsplit__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Minutes moving on an active day, by year, cut into outings. ${rows.map((r) => `${r.year}: ${Math.round(r.perDay)} minutes, ${r.outings.toFixed(1)} outings of ${Math.round(r.avgMin)} minutes`).join('. ')}.`}
          style={{ display: 'block' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} y1={m.t - 6} x2={x(t)} y2={H - m.b} stroke={t === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={x(t)} y={H - m.b + 16} textAnchor="middle" className="dsplit__gl">{t}</text>
            </g>
          ))}

          {rows.map((r, i) => {
            const cy = m.t + band * i + band / 2
            const full = Math.floor(r.outings + 1e-9)
            const part = r.outings - full
            const segs = []
            let x0 = 0
            for (let k = 0; k < full; k++) { segs.push([x0, r.avgMin]); x0 += r.avgMin }
            if (part > 0.02) segs.push([x0, r.avgMin * part])
            return (
              <g key={r.year} className={`dsplit__row dsplit__row--${tone(r.year)}`} style={{ '--d': `${i * 80}ms` }}>
                <text x={m.l - 8} y={cy + 4} textAnchor="end" className="dsplit__yr">{narrow ? `'${String(r.year).slice(2)}` : r.year}</text>
                <g className="dsplit__bars" style={{ transformOrigin: `${m.l}px ${cy}px` }}>
                  {segs.map(([a, w], k) => (
                    <rect key={k} x={x(a) + (k ? 1.5 : 0)} y={cy - bh / 2} width={Math.max(1, x(a + w) - x(a) - (k ? 1.5 : 0))} height={bh} rx="2"
                      className={k === segs.length - 1 && part > 0.02 ? 'dsplit__seg dsplit__seg--part' : 'dsplit__seg'} />
                  ))}
                </g>
                <text x={x(r.perDay) + 8} y={cy + 4} textAnchor="start" className="dsplit__val">
                  {narrow ? `${Math.round(r.perDay)} min` : `${r.outings.toFixed(1)} × ${Math.round(r.avgMin)} min`}
                </text>
              </g>
            )
          })}

          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="dsplit__axis">minutes moving on an active day &rarr;</text>
          <text x={m.l - 8} y={m.t - 14} textAnchor="start" className="dsplit__axis">each block is one average outing</text>
        </svg>
      </div>
    </div>
  )
}

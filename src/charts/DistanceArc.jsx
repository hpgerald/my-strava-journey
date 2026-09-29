import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The seven-year arc. Distance covered on foot in each year, from two near-dormant
// opening years to the surge of 2021 and 2022, a dip, and the climb back. The dashed
// line is the 2,400 km you set yourself chasing in 2021, and cleared. props: years
// [{ year, distance_km }], target, inProgressYear.
export default function DistanceArc({ years, target = 2400, inProgressYear }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!years || !years.length) return <div ref={ref} />

  const N = (x) => Number(x) || 0
  const data = [...years].sort((a, b) => a.year.localeCompare(b.year)).map((r) => ({ year: r.year, km: N(r.distance_km) }))
  const W = Math.max(320, width)
  const narrow = W < 560
  const H = narrow ? 280 : 320
  const m = { t: 24, r: 16, b: 34, l: narrow ? 34 : 44 }
  const maxKm = Math.max(target * 1.06, ...data.map((d) => d.km))
  const sx = linScale([0, data.length - 1], [m.l + 6, W - m.r - 6])
  const sy = linScale([0, maxKm], [H - m.b, m.t])
  const peak = data.reduce((b, d) => (d.km > b.km ? d : b), data[0])

  const pts = data.map((d, i) => [sx(i), sy(d.km)])
  const areaPath = `M${sx(0)},${H - m.b} L` + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ` L${sx(data.length - 1)},${H - m.b} Z`
  const linePath = 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')
  const kmTicks = [0, 1000, 2000, 3000].filter((k) => k <= maxKm)

  return (
    <div ref={ref} className="darc">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Distance on foot by year, rising to a peak in 2022 and climbing back, against the 2,400 km target." style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        {kmTicks.map((k) => (
          <g key={k}>
            <line x1={m.l} y1={sy(k)} x2={W - m.r} y2={sy(k)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(k) + 3} textAnchor="end" className="chart-tick">{k >= 1000 ? (k / 1000) + 'k' : k}</text>
          </g>
        ))}
        {/* the target you set and cleared */}
        <line x1={m.l} y1={sy(target)} x2={W - m.r} y2={sy(target)} stroke="var(--ink)" strokeWidth="1.2" strokeDasharray="5 3" />
        <text x={W - m.r} y={sy(target) - 6} textAnchor="end" className="darc__target">the 2,400 you chased &middot; cleared in 2021</text>

        <path d={areaPath} fill="var(--accent-soft)" opacity="0.55" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

        {data.map((d, i) => {
          const on = hover === null || hover === i
          const isPk = d.year === peak.year
          const prog = d.year === inProgressYear
          return (
            <g key={d.year} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={sx(i)} cy={sy(d.km)} r={isPk ? 5.5 : 4} fill={isPk ? 'var(--accent)' : 'var(--paper)'} stroke="var(--accent)" strokeWidth="2" />
              {isPk && <text x={sx(i)} y={sy(d.km) - 10} textAnchor="middle" className="darc__peak">{Math.round(d.km).toLocaleString('en-US')} km &middot; the peak</text>}
              <text x={sx(i)} y={H - 20} textAnchor="middle" className={`darc__yr${prog ? ' darc__yr--prog' : ''}`}>{d.year.slice(2)}</text>
              {prog && <text x={sx(i)} y={H - 8} textAnchor="middle" className="darc__prog">so far</text>}
            </g>
          )
        })}
        <text x={sx(0.5)} y={sy(120) } textAnchor="middle" className="darc__note">the quiet years</text>
      </svg>
      {hover != null && data[hover] && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(hover) - 55, 8), W - 130), top: Math.max(2, sy(data[hover].km) - 60) }}>
          <strong>{data[hover].year}</strong>{data[hover].year === inProgressYear ? ' · so far' : ''}
          <br />
          {Math.round(data[hover].km).toLocaleString('en-US')} km on foot
        </div>
      )}
    </div>
  )
}

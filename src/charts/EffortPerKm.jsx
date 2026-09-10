import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks, smoothLinePath } from './primitives.js'

// The price of a kilometre, year by year: relative effort spent per km on foot,
// falling as fitness rises. A descending curve is the clearest fitness-gain shape
// in the data. data: [{ year, value, thin }] (thin marks small-sample years).
export default function EffortPerKm({ data }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 300
  const m = { t: 28, r: 20, b: 38, l: 40 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const n = data.length
  const yN = niceTicks(Math.max(...data.map((d) => d.value)), 4)
  const sx = linScale([0, n - 1], [m.l, m.l + iw])
  const sy = linScale([0, yN.max], [m.t + ih, m.t])
  const pts = data.map((d, i) => [sx(i), sy(d.value)])
  const lowI = data.reduce((bi, d, i) => (d.value < data[bi].value ? i : bi), 0)

  return (
    <div ref={ref} className="epk">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Relative effort spent per kilometre on foot, by year, falling over time."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {yN.ticks.map((t, i) => (
          <g key={'y' + i}>
            <line x1={m.l} y1={sy(t)} x2={m.l + iw} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" className="chart-tick">{t}</text>
          </g>
        ))}
        <text transform={`translate(11 ${m.t + ih / 2}) rotate(-90)`} textAnchor="middle" className="epk__axis">effort per km</text>

        <path d={smoothLinePath(pts)} className="epk__line" />

        {data.map((d, i) => {
          const on = hover === null || hover === i
          const isLow = i === lowI
          return (
            <g key={i} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={sx(i)} cy={sy(d.value)} r={isLow || hover === i ? 6 : 4}
                fill={isLow ? 'var(--accent)' : 'var(--paper)'} stroke="var(--accent)" strokeWidth="2" opacity={d.thin ? 0.5 : 1} />
              {(i === 0 || isLow) && (
                <text x={sx(i)} y={sy(d.value) - 14} textAnchor={i === 0 ? 'start' : 'middle'} className="epk__val">{d.value.toFixed(1)}</text>
              )}
              <text x={sx(i)} y={H - 12} textAnchor="middle" className="chart-tick" opacity={d.thin ? 0.55 : 1}>{String(d.year).slice(-2)}</text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(hover), 50), W - 60), top: sy(data[hover].value) - 46 }}>
          <strong>{data[hover].year}</strong>
          <br />
          {data[hover].value.toFixed(1)} effort / km{data[hover].thin ? ' (small sample)' : ''}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks } from './primitives.js'

// Personal records do not fade with age here, they pulse. Each year is a stem
// topped with a dot sized by how many PRs it held, the height its PR rate per
// outing. The tallest, freshest stem is the story. data: [{ year, rate, total }].
export default function PRPulse({ data }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const H = 300
  const m = { t: 30, r: 16, b: 38, l: 40 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const n = data.length
  const yN = niceTicks(Math.max(...data.map((d) => d.rate)), 4)
  const sx = linScale([0, n - 1], [m.l + 12, m.l + iw - 12])
  const sy = linScale([0, yN.max], [m.t + ih, m.t])
  const nMax = Math.max(...data.map((d) => d.total)) || 1
  const rOf = (t) => 4 + Math.sqrt(t / nMax) * 12
  const topI = data.reduce((bi, d, i) => (d.rate > data[bi].rate ? i : bi), 0)

  return (
    <div ref={ref} className="prp">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Personal-record rate per outing by year, dot sized by total PRs."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {yN.ticks.map((t, i) => (
          <g key={'y' + i}>
            <line x1={m.l} y1={sy(t)} x2={m.l + iw} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" className="chart-tick">{t.toFixed(1)}</text>
          </g>
        ))}
        <text transform={`translate(11 ${m.t + ih / 2}) rotate(-90)`} textAnchor="middle" className="prp__axis">PRs per outing</text>

        {data.map((d, i) => {
          const on = hover === null || hover === i
          const hot = i === topI
          const y = sy(d.rate)
          return (
            <g key={i} opacity={on ? 1 : 0.4} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <line x1={sx(i)} y1={sy(0)} x2={sx(i)} y2={y} stroke={hot ? 'var(--accent)' : 'var(--grey-45)'} strokeWidth="2" />
              <circle cx={sx(i)} cy={y} r={rOf(d.total)} fill={hot ? 'var(--accent)' : 'var(--paper)'} stroke={hot ? 'var(--accent)' : 'var(--grey-55)'} strokeWidth="2" />
              {hot && <text x={sx(i)} y={y - rOf(d.total) - 8} textAnchor="middle" className="prp__val">{d.rate.toFixed(2)}</text>}
              <text x={sx(i)} y={H - 12} textAnchor="middle" className="chart-tick">{String(d.year).slice(-2)}</text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(hover), 54), W - 66), top: sy(data[hover].rate) - 52 }}>
          <strong>{data[hover].year}</strong>
          <br />
          {data[hover].rate.toFixed(2)} PRs/outing &middot; {data[hover].total} total
        </div>
      )}
    </div>
  )
}

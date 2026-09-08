import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks, smoothAreaPath, smoothLinePath } from './primitives.js'

// The distribution drawn as a shape: a frequency polygon over the distance bands,
// filled, so the two humps (short outings around 5 km, longer ones around 11 km)
// and the long thin tail read as a silhouette. The median is marked; the tail is
// annotated. data: [{ label, value }] in band order.
export default function DistCurve({ data, medianLabel = '', medianAt = 0, tailNote = '' }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const height = 300
  const m = { t: 24, r: 14, b: 40, l: 40 }
  const iw = Math.max(10, width - m.l - m.r)
  const ih = height - m.t - m.b
  const n = data.length
  const bandW = iw / n
  const xAt = (i) => m.l + (i + 0.5) * bandW

  const yMaxRaw = Math.max(...data.map((d) => d.value))
  const { max: yMax, ticks } = niceTicks(yMaxRaw, 3)
  const sy = linScale([0, yMax], [m.t + ih, m.t])
  const pts = data.map((d, i) => [xAt(i), sy(d.value)])
  const baseY = m.t + ih
  const medX = m.l + medianAt * bandW

  return (
    <div ref={ref} className="distcurve">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Distribution of activities by distance, drawn as a shape"
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" className="chart-tick">{t}</text>
          </g>
        ))}
        <path d={smoothAreaPath(pts, baseY)} className="distcurve__fill" />
        <path d={smoothLinePath(pts)} className="distcurve__line" />
        {/* median marker */}
        {medianAt > 0 && (
          <g>
            <line x1={medX} x2={medX} y1={m.t - 2} y2={baseY} className="distcurve__median" />
            <text x={medX + 5} y={m.t + 8} className="distcurve__medlbl">{medianLabel}</text>
          </g>
        )}
        {/* dots + hit areas per band */}
        {data.map((d, i) => {
          const on = hover === i
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <circle cx={xAt(i)} cy={sy(d.value)} r={on ? 5 : 3} fill="var(--accent-strong)" />
              <rect x={m.l + i * bandW} y={m.t} width={bandW} height={ih} fill="transparent" />
              {(i === 0 || i === n - 1 || i % 2 === 0) && (
                <text x={xAt(i)} y={height - 22} textAnchor="middle" className="chart-tick">{d.label}</text>
              )}
            </g>
          )
        })}
        <text x={m.l + iw / 2} y={height - 6} textAnchor="middle" className="distcurve__axislbl">distance of the outing (km)</text>
        <line x1={m.l} x2={m.l + iw} y1={baseY} y2={baseY} stroke="var(--ink)" strokeWidth="1" />
        {tailNote && (
          <text x={m.l + iw} y={sy(0) - 8} textAnchor="end" className="distcurve__tail">{tailNote}</text>
        )}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(xAt(hover), 60), width - 60), top: 4 }}>
          <strong>{data[hover].label} km</strong>
          <br />
          {data[hover].value} activities
        </div>
      )}
    </div>
  )
}

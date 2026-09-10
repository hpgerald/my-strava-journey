import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, niceTicks } from './primitives.js'

// A start-line metaphor: every discipline leaves the same line on the left and
// runs its own lane to the right, the marker dropped at the furthest single
// outing it ever recorded. One real distance axis, so the lanes are directly
// comparable. data: [{ label, value(km), display, sub }], longest first.
export default function DistanceStartLine({ data }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!data || !data.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const laneH = 46
  const m = { t: 24, b: 34, l: 118, r: 56 }
  const H = m.t + data.length * laneH + m.b
  const x0 = m.l
  const xN = niceTicks(Math.max(...data.map((d) => d.value)), 5)
  const sx = linScale([0, xN.max], [x0, W - m.r])
  const laneY = (i) => m.t + i * laneH + laneH / 2

  return (
    <div ref={ref} className="startline">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Each discipline's furthest single outing, drawn as a lane leaving a common start line."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* distance grid */}
        {xN.ticks.map((t, i) => (
          <g key={'g' + i}>
            <line x1={sx(t)} y1={m.t - 6} x2={sx(t)} y2={H - m.b + 4} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={sx(t)} y={H - m.b + 20} textAnchor="middle" className="chart-tick">{t}</text>
          </g>
        ))}
        <text x={(x0 + W - m.r) / 2} y={H - 6} textAnchor="middle" className="startline__axis">kilometres in one outing</text>

        {/* the start line */}
        <line x1={x0} y1={m.t - 6} x2={x0} y2={H - m.b + 4} className="startline__start" />
        <text x={x0} y={m.t - 12} textAnchor="middle" className="startline__startlbl">START</text>

        {data.map((d, i) => {
          const y = laneY(i)
          const on = hover === null || hover === i
          const xEnd = sx(d.value)
          return (
            <g key={i} opacity={on ? 1 : 0.35} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* lane */}
              <line x1={x0} y1={y} x2={W - m.r} y2={y} className="startline__lane" />
              {/* the run to the marker */}
              <line x1={x0} y1={y} x2={xEnd} y2={y} className="startline__run" strokeWidth={hover === i ? 4 : 3} />
              {/* finish marker */}
              <line x1={xEnd} y1={y - 11} x2={xEnd} y2={y + 11} className="startline__finish" />
              <circle cx={xEnd} cy={y} r={hover === i ? 6 : 5} fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.5" />
              {/* lane number + discipline at the start */}
              <text x={x0 - 12} y={y} dy="0.32em" textAnchor="end" className="startline__name">
                <tspan className="startline__rank">{i + 1}</tspan>  {d.label}
              </text>
              {/* value past the marker */}
              <text x={xEnd + 12} y={y} dy="0.32em" className="startline__val">{d.display}</text>
            </g>
          )
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(sx(data[hover].value), 80), W - 90), top: laneY(hover) - 46 }}>
          <strong>{data[hover].label}</strong>
          <br />
          {data[hover].display} km {data[hover].sub || ''}
        </div>
      )}
    </div>
  )
}

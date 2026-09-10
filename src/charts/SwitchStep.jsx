import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The switch as a single step up: a low platform at the old monthly rate, a high
// platform at the new one, and the multiplier written on the riser between them.
// props: { before, after } activities per month.
export default function SwitchStep({ before, after }) {
  const [ref, width] = useWidth(560)
  if (!before || !after) return <div ref={ref} />
  const mult = after / before

  const W = Math.max(320, width)
  const H = 260
  const m = { t: 30, b: 40, l: 16, r: 16 }
  const ih = H - m.t - m.b
  const sy = linScale([0, after * 1.15], [H - m.b, m.t])
  const xMid = W * 0.5
  const lx0 = m.l + 8
  const lx1 = xMid - 10
  const rx0 = xMid + 10
  const rx1 = W - m.r - 8
  const yBefore = sy(before)
  const yAfter = sy(after)
  const base = H - m.b

  return (
    <div ref={ref} className="switchstep">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Monthly activity rate stepped up from ${before.toFixed(1)} to ${after.toFixed(1)} per month, about ${mult.toFixed(0)} times.`}
        style={{ display: 'block' }}
      >
        {/* low platform (before) */}
        <path d={`M${lx0} ${base} L${lx0} ${yBefore} L${lx1} ${yBefore} L${lx1} ${base} Z`} className="switchstep__before" />
        <line x1={lx0} y1={yBefore} x2={lx1} y2={yBefore} className="switchstep__cap switchstep__cap--before" />
        <text x={(lx0 + lx1) / 2} y={yBefore - 10} textAnchor="middle" className="switchstep__num switchstep__num--before">{before.toFixed(1)}</text>
        <text x={(lx0 + lx1) / 2} y={base + 18} textAnchor="middle" className="switchstep__lbl">before Jul 2021</text>
        <text x={(lx0 + lx1) / 2} y={base + 32} textAnchor="middle" className="switchstep__sub">activities / month</text>

        {/* high platform (after) */}
        <path d={`M${rx0} ${base} L${rx0} ${yAfter} L${rx1} ${yAfter} L${rx1} ${base} Z`} className="switchstep__after" />
        <line x1={rx0} y1={yAfter} x2={rx1} y2={yAfter} className="switchstep__cap switchstep__cap--after" />
        <text x={(rx0 + rx1) / 2} y={yAfter - 10} textAnchor="middle" className="switchstep__num switchstep__num--after">{after.toFixed(1)}</text>
        <text x={(rx0 + rx1) / 2} y={base + 18} textAnchor="middle" className="switchstep__lbl">since</text>
        <text x={(rx0 + rx1) / 2} y={base + 32} textAnchor="middle" className="switchstep__sub">activities / month</text>

        {/* the riser + multiplier */}
        <line x1={xMid} y1={yBefore} x2={xMid} y2={yAfter} className="switchstep__riser" />
        <line x1={lx1} y1={yBefore} x2={xMid} y2={yBefore} className="switchstep__riser" />
        <line x1={xMid} y1={yAfter} x2={rx0} y2={yAfter} className="switchstep__riser" />
        <text x={xMid + 8} y={(yBefore + yAfter) / 2} dy="0.32em" className="switchstep__mult">&times;{mult.toFixed(0)}</text>
      </svg>
    </div>
  )
}

import { useWidth } from './useWidth.js'

// Total time on the clock, split into moving and paused. The headline is the
// moving total read as continuous days; the sliver of paused "dead time" rides
// alongside. props: { movingHours, elapsedHours }.
export default function MotionClock({ movingHours, elapsedHours }) {
  const [ref] = useWidth(560)
  if (!movingHours || !elapsedHours) return <div ref={ref} />
  const pausedHours = Math.max(0, elapsedHours - movingHours)
  const movePct = (movingHours / elapsedHours) * 100
  const pausePct = 100 - movePct
  const days = movingHours / 24

  return (
    <div ref={ref} className="mclock">
      <div className="mclock__hero">
        <span className="mclock__big mono">{days.toFixed(0)}</span>
        <span className="mclock__unit">days in motion</span>
      </div>
      <p className="mclock__sub">{Math.round(movingHours).toLocaleString('en-US')} hours moving, nearly {(days / 7).toFixed(0)} weeks without stopping.</p>
      <div className="mclock__bar" role="img" aria-label={`${Math.round(movingHours)} hours moving, ${Math.round(pausedHours)} hours paused.`}>
        <div className="mclock__move" style={{ width: `${movePct}%` }} />
        <div className="mclock__pause" style={{ width: `${pausePct}%` }} />
      </div>
      <div className="mclock__key">
        <span><i className="mclock__sw mclock__sw--move" /> moving {movePct.toFixed(0)}%</span>
        <span><i className="mclock__sw mclock__sw--pause" /> paused {pausePct.toFixed(0)}%</span>
      </div>
      <p className="mclock__foot">That paused {pausePct.toFixed(1)}% ({Math.round(pausedHours)} h) is dead time: stopped at lights, catching breath, standing still.</p>
    </div>
  )
}

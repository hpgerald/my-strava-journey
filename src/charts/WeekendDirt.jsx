import { useWidth } from './useWidth.js'

// Weekends go off-road. Trail runs and hikes as a share of activity on weekdays
// versus weekends, side by side, with the multiple called out. props:
// { weekday, weekend } as percentages.
export default function WeekendDirt({ weekday, weekend }) {
  const [ref] = useWidth(400)
  if (weekday == null || weekend == null) return <div ref={ref} />
  const mult = weekend / (weekday || 1)
  const max = Math.max(weekday, weekend, 1)
  const bar = (pct) => `${(pct / max) * 100}%`

  return (
    <div ref={ref} className="wknd">
      <div className="wknd__row">
        <span className="wknd__lbl">Weekday</span>
        <div className="wknd__track"><div className="wknd__fill wknd__fill--wd" style={{ width: bar(weekday) }} /></div>
        <span className="wknd__pct mono">{weekday.toFixed(1)}%</span>
      </div>
      <div className="wknd__row">
        <span className="wknd__lbl">Weekend</span>
        <div className="wknd__track"><div className="wknd__fill wknd__fill--we" style={{ width: bar(weekend) }} /></div>
        <span className="wknd__pct mono">{weekend.toFixed(1)}%</span>
      </div>
      <p className="wknd__note"><strong>&times;{mult.toFixed(1)}</strong> more likely to hit the trails once Saturday comes.</p>
    </div>
  )
}

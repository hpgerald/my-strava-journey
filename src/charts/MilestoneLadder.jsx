// The distance milestones as a time ladder. Each rung is the day a cumulative
// threshold was crossed, drawn along a shared span from first activity to last;
// the spacing between rungs is the story (a slow first thousand, then a rush).
// data: [{ km, date, tFrac }]   tFrac = position along the whole span, 0..1
export default function MilestoneLadder({ data, axisNote }) {
  return (
    <ul className="ladder">
      {data.map((d, i) => (
        <li key={i} className="ladder__row">
          <span className="ladder__km mono">{d.km}</span>
          <div className="ladder__track" aria-hidden="true">
            <span className="ladder__fill" style={{ width: `${d.tFrac * 100}%` }} />
            <span className="ladder__dot" style={{ left: `${d.tFrac * 100}%` }} />
          </div>
          <span className="ladder__date mono">{d.date}</span>
        </li>
      ))}
      {axisNote ? <li className="ladder__axis mono">{axisNote}</li> : null}
    </ul>
  )
}

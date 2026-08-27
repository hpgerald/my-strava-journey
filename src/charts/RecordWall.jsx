// A wall of all-time bests. Each cell leads with the record value, then names
// what it is and the single activity that set it. Editorial, not a chart, but it
// is the headline of the page.
// records: [{ value, unit, title, detail, date }]
export default function RecordWall({ records }) {
  return (
    <ul className="recwall">
      {records.map((r, i) => (
        <li key={i} className="recwall__cell">
          <div className="recwall__val mono">
            {r.value}
            {r.unit ? <span className="recwall__unit"> {r.unit}</span> : null}
          </div>
          <div className="recwall__title">{r.title}</div>
          <div className="recwall__detail">{r.detail}</div>
          {r.date ? <div className="recwall__date mono">{r.date}</div> : null}
        </li>
      ))}
    </ul>
  )
}

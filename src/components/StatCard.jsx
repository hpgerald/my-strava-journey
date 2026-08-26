import { Link } from 'react-router-dom'

// A single headline figure. Value is real text; unit and label are secondary.
// Pass `to` to make the whole card a hover-inverting link.
export default function StatCard({ value, unit, label, note, source, to }) {
  const inner = (
    <>
      <div className="stat__value mono">
        {value}
        {unit ? <span className="stat__unit">{unit}</span> : null}
      </div>
      <div className="stat__label">{label}</div>
      {note ? <p className="stat__note">{note}</p> : null}
      {source ? <div className="source">Source: {source}</div> : null}
    </>
  )
  if (to) {
    return (
      <Link className="stat" to={to}>
        {inner}
      </Link>
    )
  }
  return <div className="stat">{inner}</div>
}

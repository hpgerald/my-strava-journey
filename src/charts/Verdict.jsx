// A bold typographic verdict: the one figure a section turns on, either as a
// single hero number or a "from -> to" leap. Meant to replace a throwaway
// sparkline with the number that actually carries the point.
// props: { value, unit, from, to, mult, sub }.
export default function Verdict({ value, unit, from, to, mult, sub }) {
  const isLeap = from != null && to != null
  return (
    <div className="verdict">
      {isLeap ? (
        <div className="verdict__leap">
          <span className="verdict__from mono">{from}</span>
          <span className="verdict__arrow" aria-hidden="true">&#8594;</span>
          <span className="verdict__to mono">{to}</span>
          {unit ? <span className="verdict__unit">{unit}</span> : null}
        </div>
      ) : (
        <div className="verdict__single">
          <span className="verdict__big mono">{value}</span>
          {unit ? <span className="verdict__unit">{unit}</span> : null}
        </div>
      )}
      {mult ? <div className="verdict__mult">{mult}</div> : null}
      {sub ? <p className="verdict__sub">{sub}</p> : null}
    </div>
  )
}

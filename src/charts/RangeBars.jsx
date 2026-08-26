import { useState } from 'react'

// Horizontal range bars: one row per category, a light band from the 25th to the
// 75th percentile and a solid tick at the median. A compact "box plot" for
// showing the spread of a value (pace, distance) across a few groups.
// data: [{ label, p25, med, p75, display, sub }]
export default function RangeBars({ data, axisMax, unit = '', axisNote }) {
  const [hi, setHi] = useState(null)
  const max = axisMax ?? Math.max(1, ...data.map((d) => d.p75))
  const L = (v) => Math.max(0, Math.min(100, (v / max) * 100))

  return (
    <ul className="rangebars">
      {data.map((d, i) => (
        <li
          key={i}
          className={`rangebars__row${hi === i ? ' is-hi' : ''}`}
          onMouseEnter={() => setHi(i)}
          onMouseLeave={() => setHi(null)}
        >
          <div className="rangebars__head">
            <span className="rangebars__label">{d.label}</span>
            <span className="rangebars__val mono">
              {d.display}
              {unit ? <span className="text-muted"> {unit}</span> : null}
              {d.sub ? <span className="text-muted"> {d.sub}</span> : null}
            </span>
          </div>
          <div className="rangebars__track" aria-hidden="true" title={`${d.label}: ${d.display}${unit ? ' ' + unit : ''}`}>
            <span className="rangebars__band" style={{ left: `${L(d.p25)}%`, width: `${Math.max(1, L(d.p75) - L(d.p25))}%` }} />
            <span className="rangebars__med" style={{ left: `${L(d.med)}%` }} />
          </div>
        </li>
      ))}
      {axisNote ? <li className="rangebars__axis mono">{axisNote}</li> : null}
    </ul>
  )
}

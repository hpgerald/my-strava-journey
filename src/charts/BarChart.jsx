import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toNum } from '../lib/format.js'

// A refined ranked-bar list: thin rounded track, accent fill, the value read
// right at the bar. Built to sit inside a dashboard grid cell. Decorative bars
// are aria-hidden; wrap in <Figure> for the text/table fallback.
// data: [{ label, sub, value:number, display:string, unit, to }]
export default function BarChart({ data, max, accent = true, showRank = false }) {
  const peak = max ?? Math.max(1, ...data.map((d) => toNum(d.value) || 0))
  const fill = accent ? 'var(--accent)' : 'var(--ink)'
  const [hi, setHi] = useState(null)

  return (
    <ul className="barchart">
      {data.map((d, i) => {
        const w = Math.max(1.5, ((toNum(d.value) || 0) / peak) * 100)
        const inner = (
          <div
            className={`barchart__row${hi === i ? ' is-hi' : ''}`}
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
          >
            <div className="barchart__head">
              {showRank ? <span className="barchart__rank mono">{i + 1}</span> : null}
              <span className="barchart__label">
                {d.label}
                {d.sub ? <span className="barchart__sub"> {d.sub}</span> : null}
              </span>
              <span className="barchart__val mono">
                {d.display}
                {d.unit ? <span className="text-muted"> {d.unit}</span> : null}
              </span>
            </div>
            <div className="barchart__track" aria-hidden="true">
              <div className="barchart__fill" style={{ width: `${w}%`, background: fill }} />
            </div>
          </div>
        )
        return (
          <li key={i}>
            {d.to ? (
              <Link className="barchart__link" to={d.to}>
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ul>
  )
}

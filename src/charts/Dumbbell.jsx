import { useState } from 'react'
import { toNum } from '../lib/format.js'

// A dumbbell (connected-dot) chart for comparing two values per row on one shared
// scale: here, the item's Strava lifetime odometer vs the distance logged inside
// this history. The gap between the dots is the point. Decorative; wrap in
// <Figure> for the table fallback.
// data: [{ label, a:number, b:number, aDisplay, bDisplay }]  a = logged, b = lifetime
// aLabel / bLabel name the two ends for the legend.
export default function Dumbbell({ data, max, unit = '', aLabel = 'Logged here', bLabel = 'Strava lifetime' }) {
  const peak = max ?? Math.max(1, ...data.map((d) => Math.max(toNum(d.a) || 0, toNum(d.b) || 0)))
  const [hi, setHi] = useState(null)
  const pos = (v) => `${Math.max(0, Math.min(100, ((toNum(v) || 0) / peak) * 100))}%`

  return (
    <div className="dumb">
      <ul className="dumb__legend">
        <li>
          <span className="dumb__key dumb__key--a" /> {aLabel}
        </li>
        <li>
          <span className="dumb__key dumb__key--b" /> {bLabel}
        </li>
      </ul>
      <ul className="dumb__list">
        {data.map((d, i) => {
          const a = pos(d.a)
          const b = pos(d.b)
          const lo = Math.min(parseFloat(a), parseFloat(b))
          const hiP = Math.max(parseFloat(a), parseFloat(b))
          return (
            <li
              key={i}
              className={`dumb__row${hi === i ? ' is-hi' : ''}`}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
            >
              <div className="dumb__label">
                {d.label}
                <span className="dumb__nums mono">
                  {d.aDisplay} / {d.bDisplay}
                  {unit ? <span className="text-muted"> {unit}</span> : null}
                </span>
              </div>
              <div className="dumb__track" aria-hidden="true">
                <span className="dumb__conn" style={{ left: `${lo}%`, width: `${hiP - lo}%` }} />
                <span className="dumb__dot dumb__dot--b" style={{ left: b }} />
                <span className="dumb__dot dumb__dot--a" style={{ left: a }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

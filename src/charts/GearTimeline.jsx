import { useState } from 'react'

// A rotation timeline: one row per pair of shoes, a bar spanning the first to the
// last day it appears in the log, laid along a shared year axis. Read top to
// bottom it is a relay: one workhorse hands off to the next, with a road pair and
// a trail pair often on the go at once.
// rows: [{ label, sub, startFrac, endFrac, current, trail }]
// yearTicks: [{ label, frac }]
export default function GearTimeline({ rows, yearTicks = [] }) {
  const [hi, setHi] = useState(null)
  return (
    <div className="gtl">
      <div className="gtl__head">
        <span className="gtl__headlabel" />
        <div className="gtl__scale">
          {yearTicks.map((t, i) => (
            <span key={i} className="gtl__yr mono" style={{ left: `${t.frac * 100}%` }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <ul className="gtl__rows">
        {rows.map((r, i) => (
          <li
            key={i}
            className={`gtl__row${hi === i ? ' is-hi' : ''}`}
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
          >
            <span className="gtl__name">
              {r.label}
              {r.sub ? <span className="gtl__sub"> {r.sub}</span> : null}
            </span>
            <div className="gtl__track">
              {yearTicks.map((t, j) => (
                <span key={j} className="gtl__tick" style={{ left: `${t.frac * 100}%` }} aria-hidden="true" />
              ))}
              <span
                className={`gtl__bar${r.trail ? ' gtl__bar--trail' : ''}${r.current ? ' gtl__bar--live' : ''}`}
                style={{ left: `${r.startFrac * 100}%`, width: `${Math.max(1.4, (r.endFrac - r.startFrac) * 100)}%` }}
                title={`${r.label}: ${r.sub || ''}`}
              />
              {r.current ? <span className="gtl__now" style={{ left: `${r.endFrac * 100}%` }} aria-hidden="true" /> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { useState } from 'react'

// One 100%-wide bar per pair of shoes, split into road (grey) and trail (accent).
// The eye runs down the accent edge: mostly grey rows are road trainers, the two
// nearly all-accent rows are the dedicated trail shoes.
// rows: [{ label, roadPct, trailPct }]
export default function TerrainMix({ rows }) {
  const [hi, setHi] = useState(null)
  return (
    <ul className="terrain">
      {rows.map((r, i) => (
        <li
          key={i}
          className={`terrain__row${hi === i ? ' is-hi' : ''}`}
          onMouseEnter={() => setHi(i)}
          onMouseLeave={() => setHi(null)}
        >
          <div className="terrain__head">
            <span className="terrain__label">{r.label}</span>
            <span className="terrain__val mono">
              {r.trailPct >= 50 ? `${Math.round(r.trailPct)}% trail` : `${Math.round(r.roadPct)}% road`}
            </span>
          </div>
          <div className="terrain__bar" aria-hidden="true">
            <span className="terrain__seg terrain__seg--road" style={{ width: `${r.roadPct}%` }} />
            <span className="terrain__seg terrain__seg--trail" style={{ width: `${r.trailPct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

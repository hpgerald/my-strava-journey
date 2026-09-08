import { useState } from 'react'
import { useWidth } from './useWidth.js'

// The gear metaphor for Gear: every pair of shoes as a strip of outsole tread,
// its length the distance logged in it. The workhorse reads as a long, worn
// sole; a light pair as a short one. Trail shoes carry the accent; the lugs
// nearest the heel fade on the most-worn pairs, as real tread wears smooth.
// Decorative; the Figure/table carries the readable numbers.
export default function TreadWear({ rows }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)
  const W = Math.max(280, width)
  const rowH = 30
  const maxKm = Math.max(1, ...rows.map((r) => r.km))
  const lugStep = 8
  const lugSkew = 5

  return (
    <div ref={ref} className="tread">
      <ul className="tread__list">
        {rows.map((r, ri) => {
          const frac = Math.max(0.02, r.km / maxKm)
          const fillW = Math.max(lugStep * 2, W * frac)
          const lugColor = r.trail ? 'var(--accent)' : 'var(--grey-70)'
          const nLugs = Math.floor((fillW - lugSkew) / lugStep)
          const lugs = []
          for (let i = 0; i < nLugs; i++) {
            const x = 1 + i * lugStep
            // the earliest lugs (heel) wear smooth on the highest-mileage pairs
            const wear = frac > 0.5 ? Math.min(1, (i / nLugs) * 1.6 + 0.28) : 1
            lugs.push(
              <polygon
                key={i}
                points={`${x + lugSkew},6 ${x + lugStep},6 ${x + lugStep - lugSkew},${rowH - 8} ${x},${rowH - 8}`}
                fill={lugColor}
                opacity={wear.toFixed(2)}
              />
            )
          }
          const active = hover === ri
          return (
            <li
              key={ri}
              className={`tread__row${active ? ' is-hi' : ''}`}
              onMouseEnter={() => setHover(ri)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="tread__head">
                <span className="tread__name">
                  {r.label}
                  {r.trail ? <i className="tread__badge">trail</i> : null}
                </span>
                <span className="tread__val mono">
                  {r.display} km{r.current ? <i className="tread__now" title="still in rotation" /> : null}
                </span>
              </div>
              <svg
                width="100%"
                height={rowH}
                viewBox={`0 0 ${W} ${rowH}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`${r.label}: ${r.display} km logged${r.current ? ', still in rotation' : ''}.`}
                style={{ display: 'block' }}
              >
                <line x1="0" y1={rowH - 8.5} x2={W} y2={rowH - 8.5} className="tread__base" />
                <line x1="0" y1="6.5" x2={W} y2="6.5" className="tread__base" />
                {lugs}
                <line x1={fillW} y1="3" x2={fillW} y2={rowH - 4} className="tread__edge" />
              </svg>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

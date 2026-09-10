import { useState } from 'react'

// A mirrored split (population-pyramid style): each sport's share of total
// distance on the left, its share of total activities on the right, off a shared
// centre. It makes the inversion obvious: running is a long left bar and a short
// right one; walking is the reverse. items: [{ label, dist, acts }].
export default function SportSplit({ items }) {
  const [hover, setHover] = useState(null)
  if (!items || !items.length) return null
  const dTot = items.reduce((s, d) => s + d.dist, 0) || 1
  const aTot = items.reduce((s, d) => s + d.acts, 0) || 1
  const maxPct = Math.max(...items.flatMap((d) => [d.dist / dTot, d.acts / aTot])) * 100

  return (
    <div className="ssplit">
      <div className="ssplit__head">
        <span>Distance</span>
        <span>Activities</span>
      </div>
      <ul className="ssplit__rows">
        {items.map((d, i) => {
          const dp = (d.dist / dTot) * 100
          const ap = (d.acts / aTot) * 100
          const on = hover === null || hover === i
          return (
            <li key={i} className="ssplit__row" style={{ opacity: on ? 1 : 0.45 }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="ssplit__side ssplit__side--l">
                <span className="ssplit__pct mono">{Math.round(dp)}%</span>
                <span className="ssplit__bar ssplit__bar--l" style={{ width: `${(dp / maxPct) * 100}%` }} />
              </div>
              <span className="ssplit__name">{d.label}</span>
              <div className="ssplit__side ssplit__side--r">
                <span className="ssplit__bar ssplit__bar--r" style={{ width: `${(ap / maxPct) * 100}%` }} />
                <span className="ssplit__pct mono">{Math.round(ap)}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

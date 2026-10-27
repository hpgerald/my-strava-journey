import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { NAMED_COUNTRIES, OTHER_LABEL } from '../lib/geo.js'

// Home against away. Of every outing a GPS start could place, Tanzania is the
// disc; the other African countries are listed with the year each was first
// reached, and anything outside Africa sits in one row marked Others.
// props: rows (the countries table: { country, activities, first_activity_date })
const HOME = 'Tanzania'
const INDOOR = 'Indoor / no GPS'

export default function GeoBubbles({ rows }) {
  const [ref, width] = useWidth(560)
  const [hover, setHover] = useState(null)
  const N = (x) => Number(x) || 0
  if (!rows || !rows.length) return <div ref={ref} />

  const located = rows.filter((r) => r.country && r.country !== INDOOR)
  const home = located.find((r) => r.country === HOME)
  const awayRaw = located
    .filter((r) => r.country !== HOME)
    .map((r) => ({ country: r.country, n: N(r.activities), year: (r.first_activity_date || '').slice(0, 4) }))
    .sort((a, b) => b.n - a.n)
  // name the African countries; everything else is one "Others" row
  const namedAway = awayRaw.filter((a) => NAMED_COUNTRIES.has(a.country))
  const restAway = awayRaw.filter((a) => !NAMED_COUNTRIES.has(a.country))
  const away = [...namedAway]
  if (restAway.length) away.push({ country: OTHER_LABEL, n: restAway.reduce((s, a) => s + a.n, 0), year: '' })
  const total = located.reduce((a, r) => a + N(r.activities), 0)
  const homeN = home ? N(home.activities) : 0
  const homePct = total ? Math.round((homeN / total) * 100) : 0
  const awayN = total - homeN
  const maxAway = Math.max(1, ...away.map((a) => a.n))

  const W = Math.max(300, width)
  const narrow = W < 460
  // home disc radius sized to fill its panel
  const discPanel = narrow ? W - 8 : Math.round(W * 0.40)
  const R = Math.min(narrow ? 78 : 104, discPanel / 2 - 6)

  return (
    <div ref={ref} className="geo">
      <div className={`geo__grid${narrow ? ' is-narrow' : ''}`}>
        <div className="geo__home">
          <svg width={R * 2 + 8} height={R * 2 + 8} viewBox={`0 0 ${R * 2 + 8} ${R * 2 + 8}`}
            role="img" aria-label={`Tanzania holds ${homeN.toLocaleString()} of ${total.toLocaleString()} located activities, ${homePct} percent.`}
            style={{ display: 'block', margin: '0 auto' }}>
            <circle cx={R + 4} cy={R + 4} r={R} fill="var(--accent)" />
            <text x={R + 4} y={R + 4 - 10} textAnchor="middle" className="geo__disc-pct">{homePct}%</text>
            <text x={R + 4} y={R + 4 + 22} textAnchor="middle" className="geo__disc-lbl">at home</text>
          </svg>
          <p className="geo__home-cap">
            <strong>{HOME}</strong> · {homeN.toLocaleString()} outings
          </p>
        </div>

        <div className="geo__away">
          <p className="geo__away-hd">
            Outside Tanzania · {awayN.toLocaleString()} outings
          </p>
          <ul className="geo__list">
            {away.map((a, i) => (
              <li key={a.country}
                className={`geo__row${hover === i ? ' is-hi' : ''}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}>
                <span className="geo__cty">{a.country}</span>
                <span className="geo__bar-wrap" aria-hidden="true">
                  <span className="geo__bar" style={{ width: `${Math.max(6, (a.n / maxAway) * 100)}%` }} />
                </span>
                <span className="geo__n mono">{a.n}</span>
                <span className="geo__yr mono">{a.year}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

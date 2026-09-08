import { useState } from 'react'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// accent ramp: the whole run glows, deeper where the week was busier
const RAMP = ['#ffe0d1', '#ffb38f', '#ff8a54', '#fc4c02', '#bf3a02']
const fmtWk = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return `week of ${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// The weekly-streak feature for Rhythm: the current run of consecutive weeks
// with at least one activity, drawn as a grid of 52-week years. Every cell is
// present, so three unbroken years read at a glance; the shade tracks how busy
// that week was, and the last cell (this week) is ringed. Decorative; the
// Figure carries the readable data.
export default function WeekStreakGrid({ weeks, perRow = 52 }) {
  const [hover, setHover] = useState(null)
  const n = weeks.length
  const years = (n / 52)
  const maxN = Math.max(2, ...weeks.map((w) => w.n))
  const shade = (v) => RAMP[Math.min(RAMP.length - 1, Math.round((Math.min(1, v / maxN)) * (RAMP.length - 1)))]

  // chunk newest-last into rows of `perRow`
  const rows = []
  for (let i = 0; i < n; i += perRow) rows.push(weeks.slice(i, i + perRow))

  return (
    <div className="wstreak">
      <div className="wstreak__head">
        <span className="wstreak__big mono">{n}</span>
        <div className="wstreak__headtext">
          <span className="wstreak__unit">weeks</span>
          <span className="wstreak__sub">
            {years >= 3 ? `${years.toFixed(0)} years` : `${years.toFixed(1)} years`}, without missing a single one, and still going
          </span>
        </div>
      </div>
      <div className="wstreak__grid" role="presentation">
        {rows.map((row, ri) => (
          <div className="wstreak__rowline" key={ri}>
            <span className="wstreak__rowlbl mono" aria-hidden="true">{fmtWk(row[0].key).replace('week of ', '').replace(/^\d+ /, '')}</span>
            <div className="wstreak__row" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
              {row.map((w) => {
                const last = w.key === weeks[n - 1].key
                return (
                  <span
                    key={w.key}
                    className={`wstreak__cell${last ? ' is-now' : ''}`}
                    style={{ background: shade(w.n) }}
                    onMouseEnter={() => setHover(w)}
                    onMouseLeave={() => setHover(null)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="wstreak__foot" aria-hidden="true">
        <span>{fmtWk(weeks[0].key).replace('week of ', '')}</span>
        <span className="wstreak__now">this week &rarr;</span>
      </div>
      {hover && (
        <p className="wstreak__readout" aria-hidden="true">
          {fmtWk(hover.key)}: <strong>{hover.n}</strong> {hover.n === 1 ? 'activity' : 'activities'}
        </p>
      )}
    </div>
  )
}

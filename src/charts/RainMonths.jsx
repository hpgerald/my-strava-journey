import { useInView } from '../components/Reveal.jsx'

// The rains of a few places, month by month: one row per place, one cell per
// month, the darker the cell the more rain falls in that month on average. The
// orange dot in each cell is the share of my days there that month with an
// outing, so a full dot in a dark cell is a wet month I kept going out in.
// rows: [{ place, months: [{ m, mm, wet, out, days }] }]
const MON1 = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MIN_DAYS = 10

export default function RainMonths({ rows, aria }) {
  const [ref, inView] = useInView()
  const top = Math.max(1, ...rows.flatMap((r) => r.months.map((x) => x.mm)))
  return (
    <div ref={ref} className={`rmo${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      <div className="rmo__grid" aria-hidden="true">
        <span />
        {MON1.map((m, i) => <span key={i} className="rmo__m">{m}</span>)}
        {rows.map((r, ri) => (
          <div key={r.place} className="rmo__row" style={{ '--d': `${ri * 120}ms` }}>
            <span className="rmo__p">{r.place.replace('Dar es Salaam', 'Dar')}</span>
            {r.months.map((x) => {
              const share = x.days >= MIN_DAYS ? x.out / x.days : null
              return (
                <span key={x.m} className="rmo__c" style={{ '--r': Math.sqrt(x.mm / top) }} title={`${r.place}, ${MONTH[x.m - 1]}: about ${Math.round(x.mm)} mm of rain${share != null ? `, out on ${Math.round(share * 100)}% of my days there` : ''}`}>
                  {share != null ? <i className="rmo__dot" style={{ '--s': share }} /> : null}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <ul className="rmo__key" aria-hidden="true">
        <li><i className="rmo__sw rmo__sw--wet" />more rain</li>
        <li><i className="rmo__sw rmo__sw--dry" />little or none</li>
        <li><i className="rmo__sw rmo__sw--dot" />share of my days there out</li>
      </ul>
    </div>
  )
}

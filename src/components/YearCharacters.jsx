import { Link } from 'react-router-dom'
import { useInView } from './Reveal.jsx'

// One card per year on the shared four-column grid: the year, its character and
// the one line on how that year was made. Every card opens the year's report.
// Cards arrive in a stagger as the row scrolls in.
// summaries: [{ year, label, line }], quietUntil (years up to here read grey),
//   current (the year in progress, accent), title (the line over the row)
// facts (optional): { 'YYYY': { n, km, days: Set of 'YYYY-MM-DD' } } adds three
//   numbers and a strip of the year's days to each card, a day out as a mark,
//   the days of the streak in orange (streakFrom: its first day)
const fmtN = (v) => Math.round(v || 0).toLocaleString('en-US')
function DayStrip({ year, days, streakFrom }) {
  const start = Date.UTC(year, 0, 1)
  const n = (Date.UTC(year + 1, 0, 1) - start) / 864e5
  const cells = []
  for (let i = 0; i < n; i++) {
    const d = new Date(start + i * 864e5).toISOString().slice(0, 10)
    cells.push(<i key={i} className={days.has(d) ? (streakFrom && d >= streakFrom ? 'is-s' : 'is-on') : ''} />)
  }
  return <span className="ycard__strip" aria-hidden="true">{cells}</span>
}

export default function YearCharacters({ summaries, quietUntil, current, title = 'Open a year', facts, streakFrom }) {
  const [ref, inView] = useInView({ threshold: 0.15, rootMargin: '0px' })
  return (
    <div ref={ref} className={`ycards${inView ? ' is-in' : ''}`}>
      <p className="odds__title">{title}</p>
      <ol className="ycards__row">
        {summaries.map((y, i) => (
          <li key={y.year} className="ycards__cell" style={{ transitionDelay: `${i * 70}ms` }}>
            <Link to={`/numbers/${y.year}`} data-cursor="Read" className={`ycard${y.year <= quietUntil ? ' ycard--quiet' : y.year === current ? ' ycard--now' : ''}`}
              aria-label={`${y.year}, ${y.label}: ${y.line} Open the ${y.year} report.`}>
              <span className="ycard__top">
                <span className="ycard__year">{y.year}</span>
                <span className="ycard__arrow" aria-hidden="true">&rarr;</span>
              </span>
              <span className="ycard__label">{y.label}</span>
              <span className="ycard__line">{y.line}</span>
              {facts && facts[String(y.year)] ? (
                <>
                  <span className="ycard__nums">
                    <span><b>{fmtN(facts[String(y.year)].n)}</b> outings</span>
                    <span><b>{fmtN(facts[String(y.year)].km)}</b> km on foot</span>
                    <span><b>{fmtN(facts[String(y.year)].days.size)}</b> days out</span>
                  </span>
                  <DayStrip year={y.year} days={facts[String(y.year)].days} streakFrom={streakFrom} />
                </>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

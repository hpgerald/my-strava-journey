import { Link } from 'react-router-dom'
import { useInView } from './Reveal.jsx'

// One card per year on the shared four-column grid: the year, its character and
// the one line on how that year was made. Every card opens the year's report.
// Cards arrive in a stagger as the row scrolls in.
// summaries: [{ year, label, line }], quietUntil (years up to here read grey),
//   current (the year in progress, accent)
export default function YearCharacters({ summaries, quietUntil, current }) {
  const [ref, inView] = useInView({ threshold: 0.15, rootMargin: '0px' })
  return (
    <div ref={ref} className={`ycards${inView ? ' is-in' : ''}`}>
      <p className="odds__title">Open a year</p>
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
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

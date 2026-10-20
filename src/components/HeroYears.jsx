import { Link } from 'react-router-dom'
import { useInView } from './Reveal.jsx'
import { fmtInt } from '../lib/format.js'

// The years as one aligned row of equal cells, four to a line on the hero grid.
// Each cell: the year, how many activities it held, a bar sized to that volume
// (coloured like the heartbeat band: grey before the silence, ink for the habit,
// accent for the year still running), and its one line. Each opens its report.
export default function HeroYears({ years, quietUntil }) {
  const [ref, inView] = useInView({ threshold: 0.15, rootMargin: '0px' })
  const max = Math.max(1, ...years.map((y) => y.n))
  const latest = years.length ? years[years.length - 1].y : null
  const zone = (y) => (y.y === latest ? ' hero__yrfill--now' : y.y <= quietUntil ? ' hero__yrfill--quiet' : '')
  return (
    <ol ref={ref} className={`hero__years${inView ? ' is-in' : ''}`} aria-label="Each year in one line">
      {years.map((y, i) => (
        <li key={y.y} className="hero__yr" style={{ transitionDelay: `${i * 90}ms` }}>
          <Link to={`/numbers/${y.y}`} className="hero__yrlink">
            <span className="hero__yrhead">
              <span className="hero__yrnum">{y.y}</span>
              <span className="hero__yrcount">{fmtInt(y.n)} activities</span>
            </span>
            <span className="hero__yrbar" aria-hidden="true">
              <span className={`hero__yrfill${zone(y)}`} style={{ '--w': y.n / max, transitionDelay: `${250 + i * 90}ms` }} />
            </span>
            <span className="hero__yrfact">{y.fact}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

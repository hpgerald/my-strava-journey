import { Link } from 'react-router-dom'
import { Reveal } from './Reveal.jsx'

// The seven years as a narrative index: each year its character and the one fact
// that defines it, computed from the data upstream. Every row links into that
// year's full report. Rows reveal in a stagger as they scroll in.
// summaries: [{ year, label, line }]
export default function YearCharacters({ summaries }) {
  return (
    <ol className="years">
      {summaries.map((y, i) => (
        <li key={y.year}>
          <Reveal as={Link} to={`/numbers/${y.year}`} className="yearrow" delay={i * 45} aria-label={`${y.year}, ${y.label}: ${y.line}`}>
            <span className="yearrow__year">{y.year}</span>
            <span className="yearrow__label">{y.label}</span>
            <span className="yearrow__line">{y.line}</span>
            <span className="yearrow__arrow mono" aria-hidden="true">→</span>
          </Reveal>
        </li>
      ))}
    </ol>
  )
}

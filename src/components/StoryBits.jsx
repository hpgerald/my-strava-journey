import { Link } from 'react-router-dom'
import Container from './Container.jsx'
import { useBook } from './BookContext.js'
import { useTable } from '../context/DataContext.jsx'
import RasKilomoni from '../charts/RasKilomoni.jsx'
import Eyebrow from './Eyebrow.jsx'

// Small pieces of the story told in parts.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`

// the moments of the timeline that fall inside a part, in the order they came
export function Moments({ events, from, to }) {
  const list = (events || []).filter((e) => e.date.slice(0, 7) >= from && e.date.slice(0, 7) <= to).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (!list.length) return null
  return (
    <Container>
      <div className="smom">
        <p className="smom__k">Moments in this part</p>
        <ol className="smom__list">
          {list.map((e, i) => (
            <li key={`${e.date}${i}`} className={e.now ? 'is-now' : ''}>
              <time dateTime={e.date}>{day(e.date)}</time>
              <b>{e.title}</b>
              {e.sub ? <span>{e.sub}</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </Container>
  )
}

// a lesson from What It Means, set once at the point in the story where it was learned
export function Lesson({ to, title }) {
  const book = useBook()
  return (
    <Container>
      <p className="slesson">
        <span className="slesson__k">What it taught me</span>
        {book ? <b className="slesson__t">{title}</b> : <Link className="slesson__t" to={`/what-it-means?s=${to}`}>{title} <span aria-hidden="true">→</span></Link>}
      </p>
    </Container>
  )
}

// the hand-off at the end of a part: the next part, its years and its first line
export function HandOff({ n, name, years }) {
  const book = useBook()
  if (book) return null
  const go = (e) => {
    const el = document.getElementById(`part-${n}`)
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  }
  return (
    <Container>
      <a className="shand" href={`#/?part=${n}`} onClick={go}>
        <span className="shand__k">Next · Part {n} · {years}</span>
        <span className="shand__t">{name}</span>
        <span className="shand__a" aria-hidden="true">↓</span>
      </a>
    </Container>
  )
}

// the fifty trips to Ras Kilomoni, told where 2026 is told
export function RasPart() {
  const raw = useTable('ras_kilomoni')
  const rows = raw.map((r) => ({ n: Number(r.day), roman: r.roman, date: r.date, sport: r.sport, km: Number(r.distance_km) || 0 })).sort((a, b) => a.n - b.n)
  if (!rows.length) return null
  const first = rows[0], last = rows[rows.length - 1]
  const runs = rows.filter((r) => r.sport === 'Run' || r.sport === 'TrailRun').length
  const days = Math.round((Date.parse(last.date) - Date.parse(first.date)) / 864e5) + 1
  const word = rows.length === 50 ? 'Fifty' : String(rows.length)
  return (
    <Container>
      <section className="sgrid" aria-labelledby="part-ras">
        <div className="sgrid__head">
          <Eyebrow>One place, again and again</Eyebrow>
          <h2 id="part-ras" className="section-head__title">{word} trips to Ras&nbsp;Kilomoni.</h2>
        </div>
        <p className="sgrid__statement">
          <span lang="sw">Bandu bandu humaliza gogo</span>, chip by chip finishes the log. I counted the trips to the headland in Roman
          numerals, {first.roman} to {last.roman}, {rows.length - runs} walks and {runs} runs, over {days} days.
        </p>
        <figure className="sgrid__fig">
          <figcaption className="sgrid__figtitle">Every trip, in the numbers I counted them</figcaption>
          <div className="sgrid__chart"><RasKilomoni rows={rows} aria={`${word} tiles numbered ${first.roman} to ${last.roman}, one for each trip to Ras Kilomoni: ${rows.length - runs} walks and ${runs} runs.`} /></div>
        </figure>
        <p className="mtn-link"><Link to="/goals?s=ras-kilomoni">The trips month by month →</Link></p>
      </section>
    </Container>
  )
}

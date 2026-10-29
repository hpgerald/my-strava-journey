import { Link } from 'react-router-dom'
import { useKeyed, useTable } from '../context/DataContext.jsx'
import { lenisRef } from '../motion/env.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')

// The footer: a quiet ink sign-off with the Swahili goodbye, the chapters,
// a way to say hi and the coverage dates.
export default function Footer() {
  const meta = useKeyed('meta', 'key', 'value')
  const rows = useTable('nav_index')
  const top = () => (lenisRef.current ? lenisRef.current.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }))
  return (
    <footer className="sfoot">
      <div className="sfoot__in">
        <div className="sfoot__top">
          <p className="sfoot__big" lang="sw">
            Kesho tena<b>.</b>
            <span className="sfoot__mean" lang="en">Tomorrow again.</span>
          </p>
          <button type="button" className="sfoot__up" onClick={top} data-magnetic data-cursor="Up">
            <span aria-hidden="true">↑</span><span className="visually-hidden">Back to top</span>
          </button>
        </div>
        <div className="sfoot__grid">
          <div className="sfoot__col sfoot__col--say">
            <p className="sfoot__k">Say hi</p>
            <a className="sfoot__mail" href="mailto:hpgerald@gmail.com" data-cursor="Write">hpgerald@gmail.com</a>
            <p className="sfoot__note">Source: my Strava activity log. Maps from Natural Earth.</p>
          </div>
          <nav className="sfoot__col" aria-label="Chapters">
            <p className="sfoot__k">Chapters</p>
            <ol className="sfoot__list">
              {rows.map((r) => (
                <li key={r.number}><Link to={r.route}><span>{r.number}</span>{r.title}</Link></li>
              ))}
            </ol>
          </nav>
          <div className="sfoot__col">
            <p className="sfoot__k">More</p>
            <ul className="sfoot__list">
              <li><Link to="/about">About</Link></li>
              <li><Link to="/data">The data</Link></li>
              <li><a href="https://www.strava.com/athletes/gtesha" target="_blank" rel="noopener noreferrer">Strava ↗</a></li>
            </ul>
          </div>
          <div className="sfoot__col">
            <p className="sfoot__k">Coverage</p>
            <p className="sfoot__note">
              {day(meta.coverage_start)} to {day(meta.coverage_end)}<br />
              Refreshed {day(meta.last_refreshed)}
            </p>
          </div>
        </div>
        <div className="sfoot__base">
          <span>Showing up<b>.</b> Gerald Tesha</span>
          <span>Made in Tanzania from my Strava log</span>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'
import { useKeyed } from '../context/DataContext.jsx'
import Container from './Container.jsx'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')

export default function Footer() {
  const meta = useKeyed('meta', 'key', 'value')
  return (
    <footer className="footer">
      <Container>
        <div className="footer__grid">
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
              My Strava Journey
            </p>
            <p className="measure text-muted" style={{ margin: 0 }}>
              Source: my Strava activity log. Maps from Natural Earth.
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
              More
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="mono">
              <li>
                <Link to="/data">The data</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
              Coverage
            </p>
            <p className="mono text-muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
              {day(meta.coverage_start)} to {day(meta.coverage_end)}
              <br />
              {meta.total_activities ? Number(meta.total_activities).toLocaleString('en-US') : ''} activities
              <br />
              Refreshed {day(meta.last_refreshed)}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}

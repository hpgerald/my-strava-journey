import { Link } from 'react-router-dom'
import { useKeyed } from '../context/DataContext.jsx'
import Container from './Container.jsx'

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
              Seven years of my Strava activity, laid out so anyone can read it. A record of
              showing up, week after week.
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
              The data
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="mono">
              <li>
                <Link to="/data">The data</Link>
              </li>
              <li>
                <Link to="/about">About &amp; method</Link>
              </li>
              <li>
                <Link to="/debug">Data debug</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
              Coverage
            </p>
            <p className="mono text-muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
              {meta.coverage_start || '2019'} &ndash; {meta.coverage_end || 'now'}
              <br />
              {meta.total_activities || '2,000'} activities
              <br />
              Refreshed {meta.last_refreshed || 'recently'}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}

import { NavLink, Link } from 'react-router-dom'
import { useTable } from '../context/DataContext.jsx'
import Container from './Container.jsx'

export default function Nav() {
  const rows = useTable('nav_index')

  return (
    <header className="nav">
      <Container className="nav__inner">
        <Link className="nav__brand" to="/">
          My Strava Journey
        </Link>
        <nav aria-label="Primary">
          <ul className="nav__links">
            {rows.map((r) => (
              <li key={r.number}>
                <NavLink
                  to={r.route}
                  className="nav__link"
                  end={r.route === '/'}
                >
                  {r.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  )
}

import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useTable } from '../context/DataContext.jsx'
import Container from './Container.jsx'

export default function Nav() {
  const rows = useTable('nav_index')
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  // close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false)
  }, [loc.pathname])

  // close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="nav">
      <Container className="nav__inner">
        <Link className="nav__brand" to="/" onClick={() => setOpen(false)}>
          My Strava Journey
        </Link>

        <button
          type="button"
          className="nav__toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav__toggle-text">{open ? 'Close' : 'Menu'}</span>
          <span className={`nav__burger${open ? ' is-open' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <nav id="primary-nav" aria-label="Primary" className={`nav__nav${open ? ' is-open' : ''}`}>
          <ul className="nav__links">
            {rows.map((r) => (
              <li key={r.number}>
                <NavLink to={r.route} className="nav__link" end={r.route === '/'} onClick={() => setOpen(false)}>
                  <span className="nav__link-num mono" aria-hidden="true">{r.number}</span>
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

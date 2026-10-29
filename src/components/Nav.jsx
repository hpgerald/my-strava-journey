import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { lenisRef } from '../motion/env.js'

// The studio nav: a slim bar with the mark, the chapter you are in and a Menu
// button. The menu opens a full-screen ink index of every chapter, rising in
// line by line.
export default function Nav() {
  const rows = useTable('nav_index')
  const meta = useKeyed('meta', 'key', 'value')
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const btn = useRef(null)
  const panel = useRef(null)
  const base = '/' + (loc.pathname.split('/')[1] || '')
  const here = rows.find((r) => r.route === base)

  useEffect(() => { setOpen(false) }, [loc.pathname])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('menu-open', open)
    if (lenisRef.current) open ? lenisRef.current.stop() : lenisRef.current.start()
    if (!open) return undefined
    const first = panel.current && panel.current.querySelector('a')
    if (first) setTimeout(() => first.focus(), 60)
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); btn.current && btn.current.focus() }
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll('a, button')]
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); root.classList.remove('menu-open') }
  }, [open])

  const total = Number(meta.total_activities) || 0

  return (
    <header className={`snav${open ? ' is-open' : ''}`}>
      <div className="snav__bar">
        <Link className="snav__mark" to="/" aria-label="My Strava Journey, home" data-magnetic>
          Showing up<b>.</b>
        </Link>
        <p className="snav__here" aria-hidden={!here}>
          {here ? <><span className="snav__here-n">{here.number}</span>{here.title}</> : null}
        </p>
        <button
          ref={btn}
          type="button"
          className="snav__btn"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
          data-magnetic
        >
          <span className="snav__btn-t">{open ? 'Close' : 'Menu'}</span>
          <span className="snav__btn-i" aria-hidden="true"><i /><i /></span>
        </button>
      </div>

      <div id="site-menu" ref={panel} className="smenu" role="dialog" aria-modal="true" aria-label="Chapters" hidden={!open} data-lenis-prevent>
        <nav aria-label="Primary" className="smenu__nav">
          <ol className="smenu__list">
            {rows.map((r, i) => (
              <li key={r.number} className="smenu__item" style={{ '--i': i }}>
                <Link to={r.route} className={`smenu__link${r.route === base ? ' is-here' : ''}`} aria-current={r.route === base ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <span className="smenu__num">{r.number}</span>
                  <span className="smenu__t">{r.title}</span>
                  <span className="smenu__s">{r.subtitle}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <aside className="smenu__side">
          <p className="smenu__k">The log</p>
          <p className="smenu__big">{total.toLocaleString('en-US')}<span>outings so far</span></p>
          <p className="smenu__k">More</p>
          <ul className="smenu__more">
            <li><Link to="/about" onClick={() => setOpen(false)}>About ↗</Link></li>
            <li><Link to="/data" onClick={() => setOpen(false)}>The data ↗</Link></li>
            <li><a href="https://www.strava.com/athletes/gtesha" target="_blank" rel="noopener noreferrer">Strava ↗</a></li>
          </ul>
          <p className="smenu__k">Say hi</p>
          <a className="smenu__mail" href="mailto:hpgerald@gmail.com">hpgerald@gmail.com</a>
        </aside>
      </div>
    </header>
  )
}

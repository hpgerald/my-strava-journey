import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motionOK } from './env.js'
import { useTable } from '../context/DataContext.jsx'

// Between chapters an ink panel covers the page and lifts away, carrying the
// number and name of the chapter being opened.
export default function PageTransition() {
  const { pathname } = useLocation()
  const rows = useTable('nav_index')
  const first = useRef(true)
  const [run, setRun] = useState(null)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!motionOK()) return
    const base = '/' + (pathname.split('/')[1] || '')
    const row = rows.find((r) => r.route === base)
    const key = Date.now()
    setRun({ key, num: row ? row.number : '', title: row ? row.title : base === '/about' ? 'About' : base === '/data' ? 'The data' : '' })
    const t = setTimeout(() => setRun((r) => (r && r.key === key ? null : r)), 1300)
    return () => clearTimeout(t)
  }, [pathname])

  if (!run) return null
  return (
    <div key={run.key} className="ptr" aria-hidden="true">
      <div className="ptr__panel">
        <span className="ptr__num">{run.num}</span>
        <span className="ptr__title">{run.title}</span>
      </div>
    </div>
  )
}

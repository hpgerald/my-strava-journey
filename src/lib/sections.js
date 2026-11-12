import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTable } from '../context/DataContext.jsx'

// a link such as /what-it-means?s=wm-days lands on that section once it is drawn
export function useSectionJump() {
  const { search } = useLocation()
  useEffect(() => {
    const id = new URLSearchParams(search).get('s')
    if (!id) return undefined
    let tries = 0
    const t = setInterval(() => {
      const el = document.getElementById(id)
      const sec = el && (el.closest('section') || el)
      if (sec || ++tries > 40) { clearInterval(t); if (sec) sec.scrollIntoView({ block: 'start' }) }
    }, 150)
    return () => clearInterval(t)
  }, [search])
}

// Prev/next paging between top-level sections, in nav_index order.
export function useSectionPaging(route) {
  const nav = useTable('nav_index')
  const idx = nav.findIndex((n) => n.route === route)
  const cur = idx >= 0 ? nav[idx] : null
  const item = (n) => (n ? { to: n.route, label: n.title, subtitle: n.subtitle, number: n.number } : null)
  const prev = idx > 0 ? item(nav[idx - 1]) : null
  const next = idx >= 0 && idx < nav.length - 1 ? item(nav[idx + 1]) : null
  return { cur, prev, next, ready: nav.length > 0 }
}

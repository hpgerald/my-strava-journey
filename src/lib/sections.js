import { useTable } from '../context/DataContext.jsx'

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

import { useTable } from '../context/DataContext.jsx'

// Prev/next paging between top-level sections, in nav_index order.
export function useSectionPaging(route) {
  const nav = useTable('nav_index')
  const idx = nav.findIndex((n) => n.route === route)
  const cur = idx >= 0 ? nav[idx] : null
  const prev = idx > 0 ? { to: nav[idx - 1].route, label: nav[idx - 1].title } : null
  const next = idx >= 0 && idx < nav.length - 1 ? { to: nav[idx + 1].route, label: nav[idx + 1].title } : null
  return { cur, prev, next, ready: nav.length > 0 }
}

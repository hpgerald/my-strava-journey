import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BASE = 'My Strava Journey'
const STATIC = {
  '/': BASE,
  '/numbers': 'By the Numbers',
  '/sports': 'Sports',
  '/records': 'Records',
  '/where': 'Where',
  '/rhythm': 'Rhythm',
  '/gear': 'Gear',
  '/timeline': 'Timeline',
  '/what-it-means': 'What It Means',
  '/data': 'The Data',
  '/about': 'About',
  '/design': 'Design System',
  '/debug': 'Data Debug',
}

function pretty(seg) {
  return seg
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Sets a per-route <title>. Central so pages don't each manage it.
export default function TitleManager() {
  const { pathname } = useLocation()
  useEffect(() => {
    let title = STATIC[pathname]
    if (!title) {
      const seg = pathname.split('/').filter(Boolean)
      title = seg.length ? pretty(seg[seg.length - 1]) : BASE
    }
    document.title = title === BASE ? BASE : `${title} · ${BASE}`
  }, [pathname])
  return null
}

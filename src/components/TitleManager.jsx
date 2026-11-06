import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_TITLE } from '../lib/siteTitle.js'

const BASE = 'My Strava Journey'
const STATIC = {
  '/': SITE_TITLE,
  '/numbers': 'Year in Sport',
  '/sports': 'Sports',
  '/records': 'Records',
  '/where': 'Where',
  '/timeline': 'Timeline',
  '/what-it-means': 'What It Means',
  '/on-trial': 'The Habit on Trial',
  '/book': 'My Book',
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

// the description each chapter gives search engines, from data/seo.json
// (written with the numbers of the latest refresh by scripts/build_seo.mjs)
let seoJob = null
const loadSeo = () => (seoJob ||= fetch(`${import.meta.env.BASE_URL}data/seo.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null))

// Sets a per-route <title> and meta description. Central so pages don't each manage it.
export default function TitleManager() {
  const { pathname } = useLocation()
  const [seo, setSeo] = useState(null)
  useEffect(() => { let live = true; loadSeo().then((j) => { if (live) setSeo(j) }); return () => { live = false } }, [])
  useEffect(() => {
    const base = '/' + (pathname.split('/')[1] || '')
    const r = seo && seo.routes && (seo.routes[base] || seo.routes['/'])
    if (!r) return
    const set = (sel, v) => { const m = document.querySelector(sel); if (m) m.setAttribute('content', v) }
    set('meta[name="description"]', r.description)
    set('meta[property="og:description"]', r.description)
    set('meta[name="twitter:description"]', r.description)
  }, [pathname, seo])
  useEffect(() => {
    let title = STATIC[pathname]
    if (!title) {
      const seg = pathname.split('/').filter(Boolean)
      title = seg.length ? pretty(seg[seg.length - 1]) : BASE
    }
    document.title = title === SITE_TITLE || title === BASE ? title : `${title} · ${BASE}`
  }, [pathname])
  return null
}

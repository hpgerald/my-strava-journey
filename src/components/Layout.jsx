import { useEffect, useRef } from 'react'
import Nav from './Nav.jsx'
import Footer from './Footer.jsx'
import { useBook } from './BookContext.js'
import SectionMap from './SectionMap.jsx'
import { watchPairs } from '../lib/alignPairs.js'

// Shared page frame: skip link, sticky nav, main landmark, footer.
// It also drives the site-wide scroll-reveal: every chart figure, section header
// and headline-figure block fades/rises into view as it is scrolled to. The
// Year in Sport report runs its own choreography, so anything inside it is left
// alone. Honours prefers-reduced-motion (nothing is hidden at all in that case).
export default function Layout({ children }) {
  const book = useBook()
  const mainRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined' || book) return
    const reduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || navigator.webdriver
    const root = mainRef.current
    if (reduce || !root || typeof IntersectionObserver === 'undefined') return

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // thin things (a rule) count as in view as soon as they touch the screen
        if (e.isIntersecting && (e.intersectionRatio >= 0.1 || e.boundingClientRect.height < 4)) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }
    }, { threshold: [0, 0.1], rootMargin: '0px 0px -6% 0px' })

    // floating dot clouds only move while they are on screen
    const live = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('is-live', e.isIntersecting)
    }, { rootMargin: '10% 0px' })
    const scanFloat = () => root.querySelectorAll('[data-float]').forEach((el) => { if (!el.dataset.floatOn) { el.dataset.floatOn = '1'; live.observe(el) } })

    const scan = () => {
      scanFloat()
      // titles, index figures and quotes read their own scroll progress (scrollFx)
      root.querySelectorAll('.sgrid > .sgrid__head > .section-head__title, .sgrid > .sgrid__head > .eyebrow--n, .fieldnote__quote').forEach((el) => { if (!el.dataset.fx && !el.closest('.book')) el.dataset.fx = '' })
      const nodes = root.querySelectorAll('figure.fig, .section-head:not(.detail-head), .edges, .sgrid__head > *, hr.rule, .sgrid__fig, .flip, .tm, .geo, .grings, .fieldnote__quote, .sgrid__statement, .odds, .ycards, .sgrid__note, .ev-file, .ev-read, .ev-how > div, .ev-gloss > div, .ev-tbl')
      nodes.forEach((el) => {
        if (el.dataset.areveal || el.closest('.book')) return
        if (el.closest('.yis-report') && (el.matches('figure.fig, .section-head, .edges'))) return
        el.dataset.areveal = '1'
        el.classList.add('areveal')
        io.observe(el)
      })
    }
    scan()
    // content loads from CSVs after mount, so catch figures added later too
    const mo = new MutationObserver(scan)
    mo.observe(root, { childList: true, subtree: true })
    return () => { io.disconnect(); live.disconnect(); mo.disconnect() }
  }, [])

  // charts set side by side start on the same line (the book included)
  useEffect(() => (book ? undefined : watchPairs(mainRef.current)), [book])

  // inside My Book a page is typeset as a chapter, so it brings no site chrome
  if (book) return <>{children}</>

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <SectionMap />
      <main id="main" tabIndex={-1} ref={mainRef}>
        {children}
      </main>
      <Footer />
    </>
  )
}

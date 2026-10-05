import { useEffect, useRef } from 'react'
import Nav from './Nav.jsx'
import Footer from './Footer.jsx'

// Shared page frame: skip link, sticky nav, main landmark, footer.
// It also drives the site-wide scroll-reveal: every chart figure, section header
// and headline-figure block fades/rises into view as it is scrolled to. The
// Year in Sport report runs its own choreography, so anything inside it is left
// alone. Honours prefers-reduced-motion (nothing is hidden at all in that case).
export default function Layout({ children }) {
  const mainRef = useRef(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = mainRef.current
    if (reduce || !root || typeof IntersectionObserver === 'undefined') return

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' })

    const scan = () => {
      const nodes = root.querySelectorAll('figure.fig, .section-head:not(.detail-head), .edges')
      nodes.forEach((el) => {
        if (el.dataset.areveal || el.closest('.yis-report')) return
        el.dataset.areveal = '1'
        el.classList.add('areveal')
        io.observe(el)
      })
    }
    scan()
    // content loads from CSVs after mount, so catch figures added later too
    const mo = new MutationObserver(scan)
    mo.observe(root, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1} ref={mainRef}>
        {children}
      </main>
      <Footer />
    </>
  )
}

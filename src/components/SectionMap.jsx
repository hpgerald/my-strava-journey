import { useEffect, useRef, useState } from 'react'
import { lenisRef } from '../motion/env.js'

// The page map on wide screens: a thin rail at the right edge with one tick
// for each section of the chapter. The tick of the section on screen grows
// and turns orange, and the section's title slides out beside it on hover.
// A click scrolls to that section. It also draws the reading line along the
// top of the page. Built from the sections on the page, so every chapter gets
// it without any set-up. On the story page the ticks are the years of its
// parts, so the rail reads as a spine of years.
export default function SectionMap() {
  const [items, setItems] = useState([])
  const [on, setOn] = useState(-1)
  const bar = useRef(null)

  useEffect(() => {
    const main = document.getElementById('main')
    if (!main) return undefined
    let raf = 0
    const read = () => {
      // a page told in parts (the story) is mapped by its parts, each with its
      // year: the map becomes a spine of years
      const parts = [...main.querySelectorAll('section.spart[data-spine][aria-labelledby]')].filter((s) => !s.closest('.book'))
      const secs = parts.length >= 3 ? [] : [...main.querySelectorAll('section.sgrid[aria-labelledby]')].filter((s) => !s.closest('.book'))
      const next = secs.map((s) => {
        const h = document.getElementById(s.getAttribute('aria-labelledby'))
        return { id: s.getAttribute('aria-labelledby'), label: h ? h.textContent.replace(/\s+/g, ' ').trim() : '', spine: s.getAttribute('data-spine') || '' }
      }).filter((x) => x.label)
      setItems((cur) => (cur.length === next.length && cur.every((c, i) => c.id === next[i].id && c.label === next[i].label && c.spine === next[i].spine) ? cur : next))
    }
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(read) })
    mo.observe(main, { childList: true, subtree: true })
    read()
    return () => { mo.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    if (!items.length) return undefined
    let raf = 0
    const tick = () => {
      raf = 0
      const mid = window.innerHeight * 0.45
      let cur = -1
      items.forEach((it, i) => {
        const h = document.getElementById(it.id)
        const s = h && h.closest('section')
        if (s && s.getBoundingClientRect().top <= mid) cur = i
      })
      setOn(cur)
      const doc = document.documentElement
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, doc.scrollHeight - window.innerHeight)))
      if (bar.current) bar.current.style.setProperty('--read', p.toFixed(4))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    tick()
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [items])

  const go = (id) => {
    const h = document.getElementById(id)
    const s = h && h.closest('section')
    if (!s) return
    if (lenisRef.current) lenisRef.current.scrollTo(s, { offset: -24 })
    else s.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <div className="sread" aria-hidden="true" ref={bar}><span /></div>
      {items.length >= 3 ? (
        <nav className={`smap${items[0].spine ? ' smap--spine' : ''}`} aria-label={items[0].spine ? 'The story, year by year' : 'Sections of this page'}>
          <ol>
            {items.map((it, i) => (
              <li key={it.id} className={i === on ? 'is-on' : i < on ? 'is-past' : ''}>
                <button type="button" onClick={() => go(it.id)} aria-current={i === on ? 'true' : undefined}>
                  <span className="smap__n">{it.spine || String(i + 1).padStart(2, '0')}</span>
                  <span className="smap__t">{it.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </>
  )
}

import { useEffect } from 'react'
import Lenis from 'lenis'
import { motionOK, lenisRef } from './env.js'

// Smooth, weighted scrolling for the whole site (Lenis), plus the small
// scroll-linked layer the studio design leans on:
//  - --vel on <html>: the scroll velocity, which skews the marquees
//  - [data-speed]: elements drift against the scroll for depth
//  - html.is-scrolled / html.is-scrolling-down: the nav hides on the way down
// Nothing runs under reduced motion or for automated browsers.
export default function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement
    const setDir = (y, last) => {
      root.classList.toggle('is-scrolled', y > 40)
      if (Math.abs(y - last) > 4) root.classList.toggle('is-scrolling-down', y > last && y > 160)
    }
    if (!motionOK()) {
      let last = window.scrollY
      const onScroll = () => { const y = window.scrollY; setDir(y, last); last = y }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }
    root.classList.add('motion')
    if ((() => { try { return !sessionStorage.getItem('su-pre') } catch { return false } })()) {
      root.classList.add('pre-on')
      setTimeout(() => root.classList.remove('pre-on'), 4000)
    }
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true })
    lenisRef.current = lenis
    let last = 0
    let raf = 0
    const vh = () => window.innerHeight
    lenis.on('scroll', ({ scroll, velocity }) => {
      setDir(scroll, last); last = scroll
      root.style.setProperty('--vel', Math.max(-1, Math.min(1, velocity / 40)).toFixed(3))
      const h = vh()
      const max = Math.max(1, document.documentElement.scrollHeight - h)
      root.style.setProperty('--progress', (scroll / max).toFixed(4))
      document.querySelectorAll('.sgrid__statement, .hero__statement').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top > h) { el.style.setProperty('--fill', '0'); return }
        if (r.bottom < 0) return
        const p = Math.max(0, Math.min(1, (h * 0.92 - r.top) / (h * 0.45)))
        el.style.setProperty('--fill', p.toFixed(3))
      })
      document.querySelectorAll('[data-speed]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.bottom < -h || r.top > h * 2) return
        const mid = r.top + r.height / 2 - h / 2
        el.style.transform = `translate3d(0, ${(-mid * Number(el.dataset.speed)).toFixed(1)}px, 0)`
      })
    })
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenisRef.current = null; root.style.removeProperty('--vel'); root.classList.remove('motion') }
  }, [])
  return null
}

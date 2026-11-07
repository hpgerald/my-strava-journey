import { useEffect } from 'react'
import Lenis from 'lenis'
import { motionOK, lenisRef, scrollState } from './env.js'
import { createScrollFx } from './scrollFx.js'

// The scroll layer. Scrolling itself is the browser's own, for touchpads,
// mouse wheels and touch screens alike: a touchpad already glides, and
// smoothing it a second time made the page feel heavy. Lenis is kept only to
// glide to a place when the site asks (the page map, back to top).
// On top of the native scroll, once per frame and only while it moves:
//  - the scroll-linked scenes (scrollFx)
//  - [data-speed]: elements drift against the scroll for depth
//  - the marquees lean with the speed of the scroll (--vel, on the marquees only)
//  - html.is-scrolled / html.is-scrolling-down: the nav hides on the way down
//  - html.is-scrolling: ambient motion (floating dots, breathing type) holds
//    still while the page moves, and picks up again when it stops
// Every value is written on the few elements that use it, never on <html>,
// so a scroll frame never restyles the whole page.
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
    const lenis = new Lenis({ smoothWheel: false, syncTouch: false, lerp: 0.12 })
    lenisRef.current = lenis
    let lraf = 0
    const lloop = (t) => { lenis.raf(t); lraf = requestAnimationFrame(lloop) }
    lraf = requestAnimationFrame(lloop)

    const fx = createScrollFx()
    let last = window.scrollY, lastT = performance.now(), vel = 0, raf = 0, idle = 0
    const marquees = () => document.querySelectorAll('.mq__run')
    const frame = () => {
      raf = 0
      const y = window.scrollY, t = performance.now()
      const v = (y - last) / Math.max(1, t - lastT) * 16
      vel += (Math.max(-1, Math.min(1, v / 40)) - vel) * 0.35
      setDir(y, last); last = y; lastT = t
      fx.update()
      const h = window.innerHeight
      document.querySelectorAll('[data-speed]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.bottom < -h || r.top > h * 2) return
        const mid = r.top + r.height / 2 - h / 2
        el.style.transform = `translate3d(0, ${(-mid * Number(el.dataset.speed)).toFixed(1)}px, 0)`
      })
      marquees().forEach((m) => m.style.setProperty('--vel', vel.toFixed(3)))
    }
    const settle = () => {
      scrollState.active = false
      root.classList.remove('is-scrolling')
      vel = 0
      marquees().forEach((m) => m.style.setProperty('--vel', '0'))
    }
    const onScroll = () => {
      if (!scrollState.active) { scrollState.active = true; root.classList.add('is-scrolling') }
      clearTimeout(idle); idle = setTimeout(settle, 160)
      if (!raf) raf = requestAnimationFrame(frame)
    }
    const onResize = () => { fx.refresh(); fx.update() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    // a first pass, so the scenes start in place before anyone scrolls
    requestAnimationFrame(() => fx.update())
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(lraf); clearTimeout(idle)
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize)
      fx.destroy(); lenis.destroy(); lenisRef.current = null
      root.classList.remove('motion', 'is-scrolling'); scrollState.active = false
    }
  }, [])
  return null
}

import { useEffect, useRef } from 'react'
import { motionOK, finePointer } from './env.js'

// Keeps the home hero alive after its entrance. With a mouse, the two lines of
// "Showing up." lean a little toward the pointer, each its own way; on a touch
// screen they sway on their own, slowly. Writes --hx and --hy (-1..1, eased) on
// the hero, and stops whenever the hero is off screen.
export function useHeroLive() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !motionOK()) return undefined
    const mouse = finePointer()
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = true
    const t0 = performance.now()
    const move = (e) => {
      const r = el.getBoundingClientRect()
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
    }
    const leave = () => { tx = 0; ty = 0 }
    const tick = (now) => {
      if (!mouse) {
        const s = (now - t0) / 1000
        tx = Math.sin(s * 0.42) * 0.45
        ty = Math.cos(s * 0.31) * 0.35
      }
      x += (tx - x) * 0.06
      y += (ty - y) * 0.06
      el.style.setProperty('--hx', x.toFixed(4))
      el.style.setProperty('--hy', y.toFixed(4))
      if (on) raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      const vis = e.isIntersecting
      if (vis && !on) { on = true; raf = requestAnimationFrame(tick) }
      if (!vis) { on = false; cancelAnimationFrame(raf) }
    })
    io.observe(el)
    if (mouse) { window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave) }
    raf = requestAnimationFrame(tick)
    return () => {
      on = false; cancelAnimationFrame(raf); io.disconnect()
      window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave)
      el.style.removeProperty('--hx'); el.style.removeProperty('--hy')
    }
  }, [])
  return ref
}

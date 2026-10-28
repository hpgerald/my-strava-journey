import { useEffect, useRef, useState } from 'react'
import { motionOK, finePointer } from './env.js'

// The studio cursor: a small dot that follows exactly and a ring that trails it.
// Over a link or button the ring grows; over anything with data-cursor it
// shows that word ("Read", "Open", "Menu"). Elements marked data-magnetic lean
// toward the pointer. Only for a real mouse, and never under reduced motion.
export default function Cursor() {
  const dot = useRef(null)
  const ring = useRef(null)
  const [on, setOn] = useState(false)
  const [label, setLabel] = useState('')
  const [mode, setMode] = useState('')

  useEffect(() => {
    if (!motionOK() || !finePointer()) return
    setOn(true)
    document.documentElement.classList.add('has-cursor')
    let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y, raf = 0
    let mag = null
    const move = (e) => {
      x = e.clientX; y = e.clientY
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      const t = e.target instanceof Element ? e.target : null
      const m = t && t.closest('[data-magnetic]')
      if (mag && mag !== m) { mag.style.transform = ''; mag = null }
      if (m) {
        const r = m.getBoundingClientRect()
        const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2)
        m.style.transform = `translate3d(${dx * 0.28}px, ${dy * 0.36}px, 0)`
        mag = m
      }
      const c = t && t.closest('[data-cursor]')
      const link = t && t.closest('a, button, [role="button"], summary, label')
      setLabel(c ? c.getAttribute('data-cursor') : '')
      setMode(c ? 'label' : link ? 'link' : '')
    }
    const leave = () => setMode('hide')
    const down = () => ring.current && ring.current.classList.add('is-down')
    const up = () => ring.current && ring.current.classList.remove('is-down')
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('mousemove', move, { passive: true })
    document.addEventListener('mouseleave', leave)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', move)
      document.removeEventListener('mouseleave', leave)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  if (!on) return null
  return (
    <div className={`cur cur--${mode || 'base'}`} aria-hidden="true">
      <div ref={ring} className="cur__ring"><span className="cur__label">{label}</span></div>
      <div ref={dot} className="cur__dot" />
    </div>
  )
}

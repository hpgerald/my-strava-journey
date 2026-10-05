import { useState, useEffect, useRef } from 'react'

// Shared scroll-reveal + count-up helpers for the animated report pages.
// All of them degrade to the final (visible, full-value) state under
// prefers-reduced-motion or when IntersectionObserver is unavailable, so nothing
// is ever stranded invisible.

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
    const on = () => setReduce(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduce
}

// Observe an element; returns [ref, inView]. Once true it stays true.
export function useInView({ threshold = 0.2, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  const reduce = usePrefersReducedMotion()
  useEffect(() => {
    if (reduce) { setInView(true); return }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setInView(true); io.disconnect() } },
      { threshold, rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce, threshold, rootMargin])
  return [ref, inView]
}

// Count up to `target` over `dur` ms once `run` is true (cubic ease-out).
// decimals keeps a fixed precision for fractional figures.
export function useCountUp(target, run, { dur = 900, decimals = 0 } = {}) {
  const reduce = usePrefersReducedMotion()
  const [val, setVal] = useState(reduce || !run ? target : 0)
  const raf = useRef(0)
  useEffect(() => {
    if (reduce || !run) { setVal(target); return }
    let start = 0
    const f = Math.pow(10, decimals)
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased * f) / f)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, run, reduce, dur, decimals])
  return val
}

// Wrapper that fades/slides its children in when scrolled into view. Children
// always render (so content and a11y text are present); only the visual entrance
// is gated. `delay` staggers siblings.
export function Reveal({ as: Tag = 'div', className = '', style, delay = 0, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' is-in' : ''}${className ? ' ' + className : ''}`}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

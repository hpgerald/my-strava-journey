import { useState, useEffect, useRef } from 'react'

// The animated middle line of the hero: it cycles through the headline numbers
// (activities, km, vertical, streak, ...), each rolling up from zero as it
// arrives. Motion is disabled for prefers-reduced-motion, where it simply shows
// the first metric. metrics: [{ value:number, word:string }].
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
    const on = () => setReduce(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduce
}

// Count up to `target` over `dur` ms when `run` is true (cubic ease-out).
function useCountUp(target, run, dur = 650) {
  const [val, setVal] = useState(run ? 0 : target)
  const raf = useRef(0)
  useEffect(() => {
    if (!run) { setVal(target); return }
    let start = 0
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, run, dur])
  return val
}

export default function HeroRotator({ metrics, interval = 2800, className }) {
  const reduce = usePrefersReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce || metrics.length < 2) return
    const id = setInterval(() => setI((x) => (x + 1) % metrics.length), interval)
    return () => clearInterval(id)
  }, [reduce, metrics.length, interval])

  const m = metrics[Math.min(i, metrics.length - 1)] || { value: 0, word: '' }
  const num = useCountUp(m.value, !reduce, 650)

  return (
    <span className={className} aria-hidden="true">
      <span className="hero__rot" key={i}>
        <span className="hero__rotnum">{num.toLocaleString()}</span> <span className="hero__rotword">{m.word}</span>
      </span>
    </span>
  )
}

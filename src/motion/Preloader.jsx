import { useEffect, useState } from 'react'
import { motionOK } from './env.js'
import { useKeyed } from '../context/DataContext.jsx'

// The first thing a visitor sees, once per visit: an ink screen counting up to
// the number of outings in the log, then lifting away like a curtain.
export default function Preloader() {
  const meta = useKeyed('meta', 'key', 'value')
  const total = Number(meta.total_activities) || 0
  const [show, setShow] = useState(() => {
    if (!motionOK()) return false
    try { return !sessionStorage.getItem('su-pre') } catch { return true }
  })
  const [n, setN] = useState(0)
  const [phase, setPhase] = useState('count')

  useEffect(() => {
    if (!show || !total) return
    try { sessionStorage.setItem('su-pre', '1') } catch { /* private mode */ }
    let raf = 0, start = 0
    const dur = 1500
    const step = (t) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      setN(Math.round(total * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
      else { setPhase('lift'); setTimeout(() => setShow(false), 1100) }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [show, total])

  if (!show) return null
  return (
    <div className={`pre pre--${phase}`} aria-hidden="true">
      <div className="pre__top"><span>Showing Up<b>.</b></span><span>Gerald Tesha</span></div>
      <div className="pre__mid">
        <span className="pre__n">{n.toLocaleString('en-US')}</span>
        <span className="pre__l">outings, and counting</span>
      </div>
      <div className="pre__bar"><span style={{ transform: `scaleX(${total ? n / total : 0})` }} /></div>
    </div>
  )
}

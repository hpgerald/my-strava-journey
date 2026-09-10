import { useState } from 'react'
import { useWidth } from './useWidth.js'

// Active days split by how many activities they held: one, two, or three-plus.
// Makes the doubling habit visible as a single stacked ribbon. segs come in as
// [{ label, days }], smallest count-per-day first.
const SHADE = ['var(--grey-25)', 'var(--accent)', 'var(--accent-ink)']

export default function DoublesBar({ segs }) {
  const [ref] = useWidth(560)
  const [hover, setHover] = useState(null)
  if (!segs || !segs.length) return <div ref={ref} />
  const total = segs.reduce((s, d) => s + d.days, 0) || 1

  let acc = 0
  const parts = segs.map((d, i) => {
    const x0 = (acc / total) * 100
    acc += d.days
    return { ...d, x0, w: (d.days / total) * 100, i, pct: Math.round((d.days / total) * 100) }
  })

  return (
    <div ref={ref} className="dbl">
      <div className="dbl__bar" role="img" aria-label="Active days by activities per day: one, two, or three or more.">
        {parts.map((p) => (
          <div
            key={p.i}
            className="dbl__seg"
            style={{ left: `${p.x0}%`, width: `${p.w}%`, background: SHADE[p.i] || 'var(--grey-45)', opacity: hover === null || hover === p.i ? 1 : 0.4 }}
            onMouseEnter={() => setHover(p.i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </div>
      <ul className="dbl__key">
        {parts.map((p) => (
          <li key={p.i} onMouseEnter={() => setHover(p.i)} onMouseLeave={() => setHover(null)} style={{ opacity: hover === null || hover === p.i ? 1 : 0.5 }}>
            <i className="dbl__sw" style={{ background: SHADE[p.i] || 'var(--grey-45)' }} />
            <span className="dbl__klbl">{p.label}</span>
            <span className="dbl__kval mono">{p.days.toLocaleString('en-US')} days &middot; {p.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

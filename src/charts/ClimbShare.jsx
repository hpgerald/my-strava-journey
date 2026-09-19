import { useState } from 'react'

// Where the vertical comes from: each foot sport's share of total climb as one
// stacked bar, so the point lands at a glance - running does the least climbing
// of all, despite being the biggest share of distance. items: [{ key, label,
// value, color, highlight }], largest first.
export default function ClimbShare({ items }) {
  const [hover, setHover] = useState(null)
  if (!items || !items.length) return null
  const total = items.reduce((s, d) => s + d.value, 0) || 1

  return (
    <div className="cshare">
      <div className="cshare__bar" role="img" aria-label="Share of total foot climb by sport.">
        {items.map((d, i) => {
          const pct = (d.value / total) * 100
          return (
            <div
              key={d.key}
              className={`cshare__seg${d.highlight ? ' cshare__seg--hi' : ''}`}
              style={{ width: `${pct}%`, background: d.color, opacity: hover === null || hover === i ? 1 : 0.4 }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              title={`${d.label} ${Math.round(pct)}%`}
            />
          )
        })}
      </div>
      <ul className="cshare__key">
        {items.map((d, i) => (
          <li key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}>
            <i className="cshare__sw" style={{ background: d.color }} />
            <span className="cshare__lbl">{d.label}</span>
            <span className="cshare__pct mono">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

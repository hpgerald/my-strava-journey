import { useState } from 'react'

// A back-to-back "tornado" chart. Each row is a time-of-day band; the left wing
// grows for one sport, the right wing for another, both measured as a share of
// that sport's own sessions so the two are directly comparable.
// rows: [{ label, left, right }]  (left/right are percentages 0-100)
// keys: { left, right }
export default function Diverging({ rows, keys = { left: 'Run', right: 'Walk' }, max }) {
  const [hi, setHi] = useState(null)
  const peak = max ?? Math.max(1, ...rows.flatMap((r) => [r.left, r.right]))
  const W = (v) => (v / peak) * 100

  return (
    <div className="diverge">
      <div className="diverge__legend mono">
        <span className="diverge__key"><i className="diverge__sw diverge__sw--l" />{keys.left}</span>
        <span className="diverge__key"><i className="diverge__sw diverge__sw--r" />{keys.right}</span>
      </div>
      <ul className="diverge__rows">
        {rows.map((r, i) => {
          const on = hi === i
          return (
            <li
              key={i}
              className={`diverge__row${on ? ' is-hi' : ''}`}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
            >
              <div className="diverge__side diverge__side--l">
                <span className="diverge__num mono">{Math.round(r.left)}%</span>
                <span className="diverge__bar diverge__bar--l" style={{ width: `${W(r.left)}%` }} aria-hidden="true" />
              </div>
              <span className="diverge__label">{r.label}</span>
              <div className="diverge__side diverge__side--r">
                <span className="diverge__bar diverge__bar--r" style={{ width: `${W(r.right)}%` }} aria-hidden="true" />
                <span className="diverge__num mono">{Math.round(r.right)}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

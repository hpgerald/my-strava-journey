import { Link } from 'react-router-dom'
import { toNum } from '../lib/format.js'

// Shared "figure list": a ranked set of rows, each with a label, a proportional
// bar (decorative, aria-hidden) and the value as text. Reused across sections.
// items: [{ label, value:number, display:string, unit, sub, to }]
export default function RankList({ items, max, caption, accent = false }) {
  const peak = max ?? Math.max(1, ...items.map((d) => toNum(d.value) || 0))
  const fill = accent ? 'var(--accent)' : 'var(--ink)'
  return (
    <div className="ranklist">
      {caption ? (
        <p className="source" style={{ marginBottom: 'var(--sp-3)' }}>
          {caption}
        </p>
      ) : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((d, i) => {
          const w = ((toNum(d.value) || 0) / peak) * 100
          const Row = (
            <>
              <div className="bar__row">
                <span
                  className="display"
                  style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}
                >
                  {d.label}
                  {d.sub ? (
                    <span className="text-muted" style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-sm)', fontWeight: 400 }}>
                      {' '}
                      {d.sub}
                    </span>
                  ) : null}
                </span>
                <span className="mono" style={{ fontSize: 'var(--fs-sm)', whiteSpace: 'nowrap' }}>
                  {d.display}
                  {d.unit ? <span className="text-muted"> {d.unit}</span> : null}
                </span>
              </div>
              <div className="bar__track" aria-hidden="true" style={{ marginTop: 8 }}>
                <div className="bar__fill" style={{ width: `${w}%`, background: fill }} />
              </div>
            </>
          )
          return (
            <li
              key={i}
              style={{ padding: 'var(--sp-4) 0', borderTop: i ? '1px solid var(--rule-faint)' : 'none' }}
            >
              {d.to ? (
                <Link to={d.to} className="ranklist__link" style={{ display: 'block' }}>
                  {Row}
                </Link>
              ) : (
                Row
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

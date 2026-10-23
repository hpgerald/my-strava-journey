import { useInView } from '../components/Reveal.jsx'

// One measure per row, each row a full bar cut into the sports' shares of it, so
// the eye can run down a column and see one sport's share change from measure to
// measure. Shares print inside their segment when it is wide enough; the row's
// total sits on the right.
// props: rows [{ label, total, parts: [{ key, value }] }], keys [{ key, label }]
const pc = (v) => `${Math.round(v * 100)}%`

export default function ShareRows({ rows, keys }) {
  const [root, inView] = useInView()
  return (
    <div ref={root} className={`srow${inView ? ' is-in' : ''}`}>
      <ul className="srow__key" aria-hidden="true">
        {keys.map((k) => <li key={k.key}><i className={`msw msw--${k.key}`} />{k.label}</li>)}
      </ul>
      <ul className="srow__list">
        {rows.map((r, i) => {
          const sum = r.parts.reduce((s, p) => s + p.value, 0) || 1
          return (
            <li key={r.label} className="srow__row" style={{ '--d': `${i * 90}ms` }}>
              <span className="srow__lbl">{r.label}</span>
              <span className="srow__tot mono">{r.total}</span>
              <span className="srow__bar" role="img" aria-label={`${r.label}: ${r.parts.map((p) => `${keys.find((k) => k.key === p.key).label} ${pc(p.value / sum)}`).join(', ')}`}>
                {r.parts.map((p) => {
                  const s = p.value / sum
                  return (
                    <span key={p.key} className={`srow__seg mfill--${p.key}`} style={{ width: `${s * 100}%` }}>
                      {s >= 0.09 && <b className="srow__pc">{pc(s)}</b>}
                    </span>
                  )
                })}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

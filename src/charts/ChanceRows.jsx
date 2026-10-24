import { useInView } from '../components/Reveal.jsx'

// Records against chance: one row per list, the bar is how many times its record
// actually broke and the ring is how many times it would break, on average, if
// the same outings had come in a random order. A bar past its ring broke more
// often than chance.
// props: rows [{ key, label, sub, actual, expected }], aria
export default function ChanceRows({ rows, aria }) {
  const [root, inView] = useInView()
  const top = Math.max(...rows.map((r) => Math.max(r.actual, r.expected))) * 1.0
  return (
    <div ref={root} className={`hb chr${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      <p className="chr__key" aria-hidden="true"><i className="chr__barsw" />times broken <i className="chr__ring" />by chance</p>
      <ul className="hb__list" aria-hidden="true">
        {rows.map((r, i) => (
          <li key={r.label} className="hb__row" style={{ '--d': `${i * 80}ms` }}>
            <span className="hb__lbl">{r.label}{r.sub && <small className="hb__sub">{r.sub}</small>}</span>
            <span className="hb__track">
              <span className={`hb__bar mfill--${r.key}`} style={{ '--v': r.actual / top }} />
              <i className="chr__mark" style={{ '--v': r.expected / top }} />
              <b className="hb__val mono" style={{ '--v': Math.max(r.actual, r.expected) / top }}>{r.actual} <span className="chr__exp">/ {r.expected.toFixed(1)}</span></b>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

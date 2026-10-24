import { useInView } from '../components/Reveal.jsx'

// Plain horizontal bars, one per row, coloured by the row's key and growing from
// the left in turn. The longest stops short of the edge so its value fits. The
// value sits at the bar's end and an optional second line under the label adds
// context. An optional dashed reference (an even share, an average) runs down
// the whole list and is keyed above it.
// props: rows [{ key, label, value, display, sub? }], max?, refLine { value, label }, aria
export default function HBars({ rows, max, refLine, aria }) {
  const [root, inView] = useInView()
  const top = max || Math.max(...rows.map((r) => r.value), refLine ? refLine.value : 0) * 1.0
  return (
    <div ref={root} className={`hb${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      {refLine && <p className="hb__refk" aria-hidden="true"><i className="hb__refsw" />{refLine.label}</p>}
      <div className="hb__wrap">
      {refLine && <span className="hb__ref" aria-hidden="true" style={{ '--v': refLine.value / top }} />}
      <ul className="hb__list" aria-hidden="true">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="hb__row" style={{ '--d': `${i * 70}ms` }}>
            <span className="hb__lbl">{r.label}{r.sub && <small className="hb__sub">{r.sub}</small>}</span>
            <span className="hb__track">
              <span className={`hb__bar mfill--${r.key}`} style={{ '--v': r.value / top }} />
              <b className="hb__val mono" style={{ '--v': r.value / top }}>{r.display}</b>
            </span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  )
}

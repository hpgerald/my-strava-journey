import { useInView } from '../components/Reveal.jsx'

// This year against the one before it. For each measure, two bars on a shared
// scale (this year in accent, last year in grey) and the change as a percentage.
// A partial current year is compared to a full prior year, so the note upstream
// says so. rows: [{ label, cur, prev, unit, decimals }]; prevYear: number.
function fmt(v, decimals = 0) {
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function YearVsPrev({ rows, prevYear }) {
  const [root, inView] = useInView()
  if (!rows || !rows.length) return null

  return (
    <div ref={root} className={`yvp${inView ? ' is-in' : ''}`}>
      <ul className="yvp__list">
        {rows.map((r, i) => {
          const max = Math.max(1, r.cur, r.prev)
          const delta = r.prev > 0 ? (r.cur - r.prev) / r.prev : null
          const up = delta != null && delta >= 0
          const pct = delta == null ? null : `${up ? '+' : '−'}${Math.round(Math.abs(delta) * 100)}%`
          return (
            <li key={r.label} className="yvp__row">
              <span className="yvp__lbl">{r.label}</span>
              <span className="yvp__bars">
                <span className="yvp__barwrap">
                  <span className="yvp__bar yvp__bar--cur" style={{ width: `${(r.cur / max) * 100}%`, transitionDelay: `${i * 70}ms` }} />
                  <b className="yvp__num mono">{fmt(r.cur, r.decimals)}{r.unit ? <span className="yvp__u"> {r.unit}</span> : null}</b>
                </span>
                <span className="yvp__barwrap yvp__barwrap--prev">
                  <span className="yvp__bar yvp__bar--prev" style={{ width: `${(r.prev / max) * 100}%`, transitionDelay: `${i * 70 + 40}ms` }} />
                  <b className="yvp__num yvp__num--prev mono">{fmt(r.prev, r.decimals)}</b>
                </span>
              </span>
              {pct != null && (
                <span className={`yvp__delta${up ? ' is-up' : ' is-down'}`}>
                  <span aria-hidden="true">{up ? '▲' : '▼'}</span> {pct}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="yvp__leg">
        <span className="yvp__swatch yvp__swatch--cur" aria-hidden="true" /> this year
        <span className="yvp__swatch yvp__swatch--prev" aria-hidden="true" /> {prevYear}
      </p>
    </div>
  )
}

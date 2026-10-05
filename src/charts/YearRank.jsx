import { useInView } from '../components/Reveal.jsx'

// Where the selected year sits against every other year on one measure. The
// chosen year's bar is accent and bold; the rest are grey. Bars sweep out on
// reveal. One axis, one hue by selection (identity via the year labels).
// series: [{ year, value }]; selected: number; fmt: (v)=>string.
export default function YearRank({ series, selected, fmt = (v) => String(Math.round(v)), caption }) {
  const [root, inView] = useInView()
  const max = Math.max(1, ...series.map((d) => d.value))
  return (
    <div ref={root} className={`yrank${inView ? ' is-in' : ''}`}>
      {caption ? <p className="yrank__cap">{caption}</p> : null}
      <ul className="yrank__list">
        {series.map((d, i) => {
          const on = d.year === selected
          return (
            <li key={d.year} className={`yrank__row${on ? ' is-sel' : ''}`}>
              <span className="yrank__yr mono">{d.year}</span>
              <span className="yrank__track" aria-hidden="true">
                <span className="yrank__fill" style={{
                  width: `${(d.value / max) * 100}%`,
                  background: on ? 'var(--accent)' : 'var(--grey-15)',
                  transitionDelay: `${i * 55}ms`,
                }} />
              </span>
              <span className={`yrank__val mono${on ? ' is-sel' : ''}`}>{fmt(d.value)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

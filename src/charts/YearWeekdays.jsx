import { useInView } from '../components/Reveal.jsx'

// The shape of the week: seven columns, Monday to Sunday, each as tall as the
// activities that landed on it. Reveals which days carried the year. The tallest
// day is picked out in accent; a near-flat row of seven means the habit ran every
// day alike. counts: [Mon..Sun] activity counts.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function YearWeekdays({ counts }) {
  const [root, inView] = useInView()
  const safe = (counts && counts.length === 7) ? counts : Array(7).fill(0)
  const max = Math.max(1, ...safe)
  const peak = safe.indexOf(max)
  const total = safe.reduce((a, b) => a + b, 0) || 1

  return (
    <div ref={root} className={`yweek${inView ? ' is-in' : ''}`}>
      {safe.map((v, i) => (
        <div key={i} className="yweek__col" title={`${DAYS[i]}: ${v} activities`}>
          <span className="yweek__val mono">{v}</span>
          <span className="yweek__track">
            <span className={`yweek__bar${i === peak ? ' is-peak' : ''}`}
              style={{ height: `${(v / max) * 100}%`, transitionDelay: `${i * 90}ms` }} />
          </span>
          <span className="yweek__day chart-tick">{DAYS[i].slice(0, 1)}</span>
          <span className="yweek__pct mono">{Math.round((v / total) * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

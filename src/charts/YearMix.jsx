import { useInView } from '../components/Reveal.jsx'

// The year's movement mix: one row per activity type, bars sweeping out from the
// left in a stagger. Names are shown directly, so colour is a secondary cue
// (warm by rank for the foot sports, grey for everything else). Cycling folds
// into "Other activity" upstream, so it is counted but never named.
// mix: [{ label, n, foot }] sorted desc by n.
const WARM = ['var(--accent)', '#d1430a', '#b23400', '#e06a2a', '#f08a4a']

export default function YearMix({ mix }) {
  const [root, inView] = useInView()
  const max = Math.max(1, ...mix.map((d) => d.n))
  const total = mix.reduce((s, d) => s + d.n, 0) || 1
  let footRank = -1
  return (
    <div ref={root} className={`ymix${inView ? ' is-in' : ''}`}>
      <ul className="ymix__list">
        {mix.map((d, i) => {
          if (d.foot) footRank += 1
          const color = d.foot ? WARM[Math.min(footRank, WARM.length - 1)] : 'var(--grey-30, #bdbdbd)'
          return (
            <li key={d.label} className="ymix__row">
              <span className="ymix__lbl">{d.label}</span>
              <span className="ymix__track" aria-hidden="true">
                <span className="ymix__fill" style={{ width: `${(d.n / max) * 100}%`, background: color, transitionDelay: `${i * 70}ms` }} />
              </span>
              <span className="ymix__n mono">{d.n}</span>
              <span className="ymix__pct mono">{Math.round((d.n / total) * 100)}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

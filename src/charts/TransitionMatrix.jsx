import { useInView } from '../components/Reveal.jsx'

// The two-state Markov chain behind the streak, drawn as its transition matrix:
// given today, the chance of each tomorrow. The "move again" cell is the engine.
// Run the matrix forward and it settles at a stationary active rate, which the
// record matches almost exactly. props: p11 (move|moved), p01 (move|rested),
// beforeP11 (pre-switch), activeFrac (observed active share).
const pct = (v) => `${Math.round(v * 100)}%`

function cellStyle(p, active, delay) {
  const bg = active
    ? `color-mix(in srgb, var(--accent) ${Math.round(12 + p * 80)}%, var(--paper))`
    : `color-mix(in srgb, var(--grey-55) ${Math.round(10 + p * 55)}%, var(--paper))`
  const color = active && p > 0.55 ? 'var(--paper)' : 'var(--ink)'
  return { background: bg, color, transitionDelay: `${delay}ms` }
}

export default function TransitionMatrix({ p11, p01, beforeP11, activeFrac }) {
  const [ref, inView] = useInView()
  const p10 = 1 - p11
  const p00 = 1 - p01
  const stationary = (1 - p11 + p01) !== 0 ? p01 / (1 - p11 + p01) : 0

  return (
    <div ref={ref} className={`tmx${inView ? ' is-in' : ''}`}>
      <div className="tmx__grid" role="img"
        aria-label={`Transition matrix. After moving, ${pct(p11)} chance of moving again. After resting, ${pct(p01)} chance of moving. It settles at ${pct(stationary)} of days active.`}>
        <span className="tmx__corner" aria-hidden="true">today \ tomorrow</span>
        <span className="tmx__colhd">moves</span>
        <span className="tmx__colhd">rests</span>

        <span className="tmx__rowhd">You moved today</span>
        <span className="tmx__cell" style={cellStyle(p11, true, 0)}><b>{pct(p11)}</b></span>
        <span className="tmx__cell" style={cellStyle(p10, false, 80)}><b>{pct(p10)}</b></span>

        <span className="tmx__rowhd">You rested today</span>
        <span className="tmx__cell" style={cellStyle(p01, true, 160)}><b>{pct(p01)}</b></span>
        <span className="tmx__cell" style={cellStyle(p00, false, 240)}><b>{pct(p00)}</b></span>
      </div>
      <p className="tmx__note">
        Run that matrix forward and it settles at <strong>{pct(stationary)}</strong> of days active, almost exactly the {pct(activeFrac)} that have carried an activity since the switch. Before July 2021 the top-left cell was only <strong>{pct(beforeP11)}</strong>, so moving one day hardly moved the next.
      </p>
    </div>
  )
}

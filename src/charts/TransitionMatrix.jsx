import { useInView } from '../components/Reveal.jsx'

// Given today, the chance of each tomorrow. Two rows, each adding to 100%.
// The top-left cell is the engine: how often a day out leads to another.
// props: p11 (moves | moved today), p01 (moves | rested today).
const pct = (v) => `${Math.round(v * 100)}%`

function cellStyle(p, active, delay) {
  const bg = active
    ? `color-mix(in srgb, var(--accent) ${Math.round(12 + p * 80)}%, var(--paper))`
    : `color-mix(in srgb, var(--grey-55) ${Math.round(10 + p * 55)}%, var(--paper))`
  const color = active && p > 0.55 ? 'var(--paper)' : 'var(--ink)'
  return { background: bg, color, transitionDelay: `${delay}ms` }
}

export default function TransitionMatrix({ p11, p01 }) {
  const [ref, inView] = useInView()
  const p10 = 1 - p11
  const p00 = 1 - p01
  return (
    <div ref={ref} className={`tmx${inView ? ' is-in' : ''}`}>
      <div className="tmx__grid" role="img"
        aria-label={`If you moved today: ${pct(p11)} chance you move tomorrow, ${pct(p10)} you rest. If you rested today: ${pct(p01)} chance you move tomorrow, ${pct(p00)} you rest.`}>
        <span className="tmx__corner" aria-hidden="true" />
        <span className="tmx__colhd" aria-hidden="true">Tomorrow you move</span>
        <span className="tmx__colhd" aria-hidden="true">Tomorrow you rest</span>

        <span className="tmx__rowhd" aria-hidden="true">If you moved today</span>
        <span className="tmx__cell" style={cellStyle(p11, true, 0)} aria-hidden="true"><b>{pct(p11)}</b></span>
        <span className="tmx__cell" style={cellStyle(p10, false, 80)} aria-hidden="true"><b>{pct(p10)}</b></span>

        <span className="tmx__rowhd" aria-hidden="true">If you rested today</span>
        <span className="tmx__cell" style={cellStyle(p01, true, 160)} aria-hidden="true"><b>{pct(p01)}</b></span>
        <span className="tmx__cell" style={cellStyle(p00, false, 240)} aria-hidden="true"><b>{pct(p00)}</b></span>
      </div>
    </div>
  )
}

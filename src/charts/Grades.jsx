import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// If every way of moving were a road: each line starts at the same point and
// climbs across one kilometre at that sport's real average gradient (all the
// metres climbed divided by all the kilometres covered). The rise is drawn ten
// times taller than true so the gentle ones can still be told apart, and the
// value at the end of each line is the true one. Lines draw themselves in.
// props: rows [{ key, label, mPerKm }], exaggerate (default 10), aria
export default function Grades({ rows, exaggerate = 10, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 24, r: narrow ? 104 : 150, b: 40, l: 14 }
  const run = W - m.l - m.r
  const maxRise = Math.max(...rows.map((r) => r.mPerKm))
  // the run is 1,000 m wide; scale the rise so the steepest fits the height
  const k = Math.min((H - m.t - m.b) / (maxRise * exaggerate), run / 1000)
  const sx = run / 1000
  const ex = (k * exaggerate) / sx // the exaggeration actually drawn
  const y0 = H - m.b
  // labels stack upward from the flattest so close gradients never collide
  const ends = rows.map((r) => ({ ...r, ey: y0 - r.mPerKm * exaggerate * k })).sort((a, b) => b.ey - a.ey)
  ends.forEach((e, i) => { e.ly = i ? Math.min(e.ey, ends[i - 1].ly - 32) : e.ey })
  return (
    <div ref={ref} className="grades">
      <div ref={root} className={`grades__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          <line x1={m.l} x2={m.l + run} y1={y0} y2={y0} stroke="var(--ink)" />
          <text x={m.l} y={y0 + 18} className="cb__gl">start</text>
          <text x={m.l + run} y={y0 + 18} textAnchor="end" className="cb__gl">1 km on</text>
          {ends.map((r, i) => {
            const len = Math.hypot(run, y0 - r.ey)
            return (
              <g key={r.key} className="grades__g" style={{ '--d': `${i * 150}ms`, '--len': len }}>
                <line x1={m.l} y1={y0} x2={m.l + run} y2={r.ey} className={`grades__l mstroke--${r.key}`} strokeDasharray={len} />
                <circle cx={m.l + run} cy={r.ey} r="4" className={`mfill--${r.key} grades__dot`} />
                <line x1={m.l + run + 6} x2={m.l + run + 12} y1={r.ey} y2={r.ly} stroke="var(--rule)" className="grades__lead" />
                <text x={m.l + run + 16} y={r.ly - 2} className="grades__lt">{r.label}</text>
                <text x={m.l + run + 16} y={r.ly + 13} className="grades__ls">{r.mPerKm < 0.5 ? 'flat' : `${Math.round(r.mPerKm)} m up · ${(r.mPerKm / 10).toFixed(1)}%`}</text>
              </g>
            )
          })}
          <text x={m.l} y={H - 4} className="cb__axis">{`height drawn ${Math.round(ex)}× true`}</text>
        </svg>
      </div>
    </div>
  )
}

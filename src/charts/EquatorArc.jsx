import { useWidth } from './useWidth.js'

// Distance covered on foot, laid against the length of the equator. A single arc
// of the planet's circumference with the covered fraction swept in accent, so
// "a third of the way around the Earth" is something you can see.
// props: { km, equatorKm, borderKm }.
export default function EquatorArc({ km, equatorKm = 40075, borderKm = 3861 }) {
  const [ref, width] = useWidth(560)
  if (!km) return <div ref={ref} />
  const frac = Math.min(km / equatorKm, 1)

  const W = Math.max(320, width)
  const H = 320
  const cx = W / 2
  const cy = H * 0.62
  const R = Math.min(W * 0.34, cy - 40)
  // start at top, sweep clockwise by frac of full circle
  const a0 = -Math.PI / 2
  const a1 = a0 + frac * Math.PI * 2
  const pt = (a, r = R) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  const large = frac > 0.5 ? 1 : 0
  const [sx, sy] = pt(a0)
  const [ex, ey] = pt(a1)
  const arc = `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`

  return (
    <div ref={ref} className="eqarc">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${Math.round(km).toLocaleString('en-US')} km on foot is ${(frac * 100).toFixed(0)} percent of the equator.`}
        style={{ display: 'block' }}
      >
        {/* the globe outline (full equator) */}
        <circle cx={cx} cy={cy} r={R} className="eqarc__globe" />
        {/* faint meridians for a planet feel */}
        <ellipse cx={cx} cy={cy} rx={R * 0.42} ry={R} className="eqarc__meridian" />
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} className="eqarc__meridian" />
        {/* covered sweep */}
        <path d={arc} className="eqarc__sweep" fill="none" />
        <circle cx={sx} cy={sy} r="4" fill="var(--ink)" />
        <circle cx={ex} cy={ey} r="5" fill="var(--accent)" />
        {/* center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="eqarc__pct mono">{(frac * 100).toFixed(0)}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="eqarc__of">of the equator</text>
      </svg>
      <p className="eqarc__cap">
        <span className="mono eqarc__big">{Math.round(km).toLocaleString('en-US')} km</span> on foot &middot; {(km / borderKm).toFixed(1)}&times; the length of Tanzania&rsquo;s border
      </p>
    </div>
  )
}

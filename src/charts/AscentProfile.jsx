import { useWidth } from './useWidth.js'

// The signature elevation metaphor for Records: total foot-climb drawn as a
// mountain range you would have to climb, one Everest-height summit per Everest
// gained. Reference lines mark Everest and Kilimanjaro so the scale reads at a
// glance. Snowcaps are the single accent touch. Purely decorative: the Figure
// wrapper carries the readable data table.
export default function AscentProfile({ meters, everest = 8849, kili = 5895 }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(320, width)
  const H = Math.round(Math.min(320, Math.max(240, W * 0.34)))

  const times = meters / everest
  const full = Math.floor(times)
  const frac = times - full
  const n = Math.max(1, Math.ceil(times))

  const padTop = 30
  const gY = H - 30 // ground / sea level
  const summitY = padTop
  const peakH = gY - summitY
  const seg = W / n
  const valleyY = gY - peakH * 0.08 // ridge floor between peaks, so the range connects
  const kiliY = gY - peakH * (kili / everest)

  // front ridgeline path (filled), one summit per Everest, last one partial
  const heightOf = (i) => (i < full ? 1 : frac)
  let d = `M 0 ${gY.toFixed(1)}`
  d += ` L 0 ${valleyY.toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const x0 = i * seg
    const cx = x0 + seg / 2
    const topY = gY - peakH * heightOf(i)
    // a slight shoulder on the way up gives the summit a less rigid, more alpine line
    d += ` L ${(x0 + seg * 0.16).toFixed(1)} ${(valleyY - (valleyY - topY) * 0.34).toFixed(1)}`
    d += ` L ${cx.toFixed(1)} ${topY.toFixed(1)}`
    d += ` L ${(x0 + seg * 0.7).toFixed(1)} ${(valleyY - (valleyY - topY) * 0.5).toFixed(1)}`
    d += ` L ${(x0 + seg).toFixed(1)} ${valleyY.toFixed(1)}`
  }
  d += ` L ${W} ${gY.toFixed(1)} Z`

  // a paler range set behind, offset, for atmospheric depth
  const backSeg = W / (n + 0.5)
  let db = `M 0 ${gY.toFixed(1)} L 0 ${(valleyY + peakH * 0.06).toFixed(1)}`
  for (let i = 0; i < n + 1; i++) {
    const x0 = i * backSeg - backSeg * 0.35
    const cx = x0 + backSeg / 2
    const topY = gY - peakH * 0.72 * (0.82 + 0.18 * ((i % 3) / 2))
    db += ` L ${cx.toFixed(1)} ${topY.toFixed(1)} L ${(x0 + backSeg).toFixed(1)} ${(valleyY + peakH * 0.06).toFixed(1)}`
  }
  db += ` L ${W} ${gY.toFixed(1)} Z`

  // snowcaps: the top wedge of each full summit, in the accent
  const caps = []
  for (let i = 0; i < n; i++) {
    const h = heightOf(i)
    if (h < 0.55) continue
    const cx = i * seg + seg / 2
    const topY = gY - peakH * h
    const capH = peakH * 0.13
    const capW = seg * 0.11 * (h)
    caps.push(
      <polygon
        key={i}
        points={`${cx},${topY} ${cx + capW},${topY + capH} ${cx - capW},${topY + capH}`}
        fill="var(--accent)"
      />
    )
  }

  return (
    <div ref={ref} className="ascent">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Total foot climbing drawn as ${times.toFixed(1)} Everest-height summits, against reference lines for Everest and Kilimanjaro.`}
        style={{ display: 'block' }}
      >
        {/* reference altitude lines */}
        <line x1="0" y1={kiliY} x2={W} y2={kiliY} className="ascent__ref" />
        <line x1="0" y1={summitY} x2={W} y2={summitY} className="ascent__ref" />
        {/* ranges, back to front */}
        <path d={db} className="ascent__back" />
        <path className="ascent__range" d={d} />
        {caps}
        {/* ground line */}
        <line x1="0" y1={gY} x2={W} y2={gY} className="ascent__ground" />
      </svg>
      <div className="ascent__labels" aria-hidden="true">
        <span className="ascent__ref-lbl ascent__ref-lbl--summit">Everest · 8,849 m</span>
        <span
          className="ascent__ref-lbl ascent__ref-lbl--kili"
          style={{ top: `calc(${(kiliY / H) * 100}% - 0.1rem)` }}
        >
          Kilimanjaro · 5,895 m
        </span>
        <span className="ascent__ref-lbl ascent__ref-lbl--sea">sea level</span>
      </div>
    </div>
  )
}

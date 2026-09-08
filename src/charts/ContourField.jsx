import { useMemo } from 'react'

// The atlas motif for the opening: a field of topographic contour lines, as if
// the home page were a plate torn from a map. Deterministic terrain (layered
// sine harmonics) so it renders identically every load; faint ink strokes with
// a single accent survey mark at the summit. Purely decorative.
export default function ContourField({ loops = 10, focal = [0.66, 0.52] }) {
  const VW = 1000
  const VH = 620
  const cx = VW * focal[0]
  const cy = VH * focal[1]

  const paths = useMemo(() => {
    const K = 132
    const out = []
    for (let l = 0; l < loops; l++) {
      const base = 34 + l * 41
      const ph = l * 0.7
      let d = ''
      for (let i = 0; i <= K; i++) {
        const th = (i / K) * Math.PI * 2
        // radial terrain: a few harmonics, warped a little per ring so the
        // contours read as a real slope rather than tidy circles
        const r =
          base *
          (1 +
            0.07 * Math.sin(3 * th + ph) +
            0.045 * Math.sin(5 * th + ph * 1.7) +
            0.03 * Math.sin(2 * th - ph) +
            0.02 * Math.sin(7 * th + l))
        const x = cx + r * Math.cos(th) * 1.28 // widen horizontally to fill the plate
        const y = cy + r * Math.sin(th)
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
      }
      out.push({ d: d + 'Z', inner: l < 3, len: Math.round(2 * Math.PI * base * 1.14) })
    }
    return out
  }, [loops, cx, cy])

  return (
    <svg
      className="contour"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g className="contour__lines">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            className={`contour__line${p.inner ? ' contour__line--in' : ''}`}
            style={{ '--len': p.len, '--i': i }}
          />
        ))}
      </g>
      {/* survey mark at the summit: home ground */}
      <g className="contour__mark" transform={`translate(${cx} ${cy})`}>
        <line x1="-11" y1="0" x2="11" y2="0" />
        <line x1="0" y1="-11" x2="0" y2="11" />
        <circle cx="0" cy="0" r="4.2" />
      </g>
    </svg>
  )
}

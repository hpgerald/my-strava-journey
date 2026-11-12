// The drawn relief of a mountain, from its GPS profile: the line my watch
// recorded, filled to the ground, with fainter echoes of it behind like ridges
// in the mist. It is set behind the title of a mountain chapter, in the
// chapter's own colour, so the opening page shows the shape of the day before
// a single word. Decoration: the same profiles are charted, with values, below.
// props: lines [[{ x: 0..1, alt }]], one or more profiles; echo: draw echoes of
//   a single profile (true by default when there is only one line)
export default function Relief({ lines, echo }) {
  const ls = (lines || []).filter((l) => l && l.length > 2)
  if (!ls.length) return null
  const all = ls.flat()
  const lo = Math.min(...all.map((p) => p.alt)), hi = Math.max(...all.map((p) => p.alt))
  const W = 1000, H = 320
  const y = (a) => H - 12 - ((a - lo) / Math.max(1, hi - lo)) * (H - 40)
  const path = (l, dx = 0, dy = 0, sx = 1) => l.map((p, i) => `${i ? 'L' : 'M'}${(dx + p.x * W * sx).toFixed(1)} ${(y(p.alt) + dy).toFixed(1)}`).join('')
  const area = (l, dx, dy, sx) => `${path(l, dx, dy, sx)}L${(dx + l[l.length - 1].x * W * sx).toFixed(1)} ${H}L${(dx + l[0].x * W * sx).toFixed(1)} ${H}Z`
  // a single profile gets two echoes behind it, wider and lower; several are layered as they are
  const layers = ls.length > 1 || echo === false
    ? ls.map((l, i) => ({ l, dx: 0, dy: 0, sx: 1, o: 0.06 + (0.1 * (i + 1)) / ls.length, key: i }))
    : [{ l: ls[0], dx: -60, dy: 46, sx: 1.12, o: 0.05, key: 'b' }, { l: ls[0], dx: -24, dy: 22, sx: 1.05, o: 0.09, key: 'm' }, { l: ls[0], dx: 0, dy: 0, sx: 1, o: 0.15, key: 'f' }]
  return (
    <svg className="relief" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {layers.map((L) => <path key={`a${L.key}`} d={area(L.l, L.dx, L.dy, L.sx)} className="relief__area" style={{ fillOpacity: L.o }} />)}
      {layers.slice(-1).map((L) => <path key={`l${L.key}`} d={path(L.l, L.dx, L.dy, L.sx)} className="relief__line" pathLength="1" />)}
    </svg>
  )
}

// Small chart math helpers. No dependencies.

export function linScale([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1
  const fn = (v) => r0 + ((v - d0) / span) * (r1 - r0)
  fn.invert = (p) => d0 + ((p - r0) / (r1 - r0)) * span
  return fn
}

export function extent(arr, accessor = (d) => d) {
  let min = Infinity
  let max = -Infinity
  for (const d of arr) {
    const v = accessor(d)
    if (v == null || Number.isNaN(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === Infinity) return [0, 1]
  return [min, max]
}

// "nice" upper bound and a few round ticks for an axis 0..max
export function niceTicks(max, count = 4) {
  if (max <= 0) return { max: 1, ticks: [0, 1] }
  const raw = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag
  const niceMax = Math.ceil(max / step) * step
  const ticks = []
  for (let t = 0; t <= niceMax + 1e-9; t += step) ticks.push(t)
  return { max: niceMax, ticks }
}

// straight-segment line path
export function linePath(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')
}

// area path closed to a baseline y
export function areaPath(points, baselineY) {
  if (!points.length) return ''
  const top = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')
  const first = points[0][0].toFixed(2)
  const last = points[points.length - 1][0].toFixed(2)
  return `${top} L${last} ${baselineY.toFixed(2)} L${first} ${baselineY.toFixed(2)} Z`
}

// Smooth (Catmull-Rom -> cubic Bezier) line through the points. Gives the soft
// curve preferred for area/line charts. Falls back to a straight segment for 2
// points. y is clamped to the data's own min/max so the curve never overshoots
// past the extremes (keeps an area fill from dipping below its baseline).
export function smoothLinePath(points) {
  if (!points || points.length < 2) return ''
  if (points.length === 2) {
    return `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)} L${points[1][0].toFixed(2)} ${points[1][1].toFixed(2)}`
  }
  let yMin = Infinity
  let yMax = -Infinity
  for (const p of points) { if (p[1] < yMin) yMin = p[1]; if (p[1] > yMax) yMax = p[1] }
  const clampY = (y) => Math.max(yMin, Math.min(yMax, y))
  const p = points
  let d = `M${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] || p[i + 1]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6)
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6)
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d
}

// Smooth area closed to a baseline y.
export function smoothAreaPath(points, baselineY) {
  if (!points || !points.length) return ''
  const top = smoothLinePath(points)
  const first = points[0][0].toFixed(2)
  const last = points[points.length - 1][0].toFixed(2)
  return `${top} L${last} ${baselineY.toFixed(2)} L${first} ${baselineY.toFixed(2)} Z`
}

export function bisectNearest(xs, target) {
  let lo = 0
  let hi = xs.length - 1
  if (hi < 0) return -1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid] < target) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && Math.abs(xs[lo - 1] - target) <= Math.abs(xs[lo] - target)) return lo - 1
  return lo
}

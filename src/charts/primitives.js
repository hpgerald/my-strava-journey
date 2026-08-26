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

// Small statistics helpers, no dependencies. Everything the site's math stories
// need: ordinary least squares, a Lorenz curve with its Gini, a Gaussian pdf,
// and a two-state Markov summary.

// Ordinary least-squares fit y = m x + b, with R^2.
export function linreg(xs, ys) {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i] }
  const d = n * sxx - sx * sx || 1
  const m = (n * sxy - sx * sy) / d
  const b = (sy - m * sx) / n
  const my = sy / n
  let ssTot = 0, ssRes = 0
  for (let i = 0; i < n; i++) { const p = m * xs[i] + b; ssRes += (ys[i] - p) ** 2; ssTot += (ys[i] - my) ** 2 }
  const r2 = ssTot ? 1 - ssRes / ssTot : 0
  return { m, b, r2, predict: (x) => m * x + b }
}

// Pearson correlation.
export function pearson(xs, ys) {
  const r = linreg(xs, ys)
  if (!r) return 0
  // sign of slope times sqrt(r2)
  return Math.sign(r.m) * Math.sqrt(Math.max(0, r.r2))
}

// Lorenz curve points [{p, l}] (share of population, share of total) plus Gini.
// Input: an array of non-negative values.
export function lorenz(values) {
  const v = values.filter((x) => x > 0).slice().sort((a, b) => a - b)
  const n = v.length
  if (!n) return { points: [{ p: 0, l: 0 }, { p: 1, l: 1 }], gini: 0 }
  const total = v.reduce((a, b) => a + b, 0) || 1
  const points = [{ p: 0, l: 0 }]
  let cum = 0
  for (let i = 0; i < n; i++) { cum += v[i]; points.push({ p: (i + 1) / n, l: cum / total }) }
  // Gini via the trapezoidal area under the Lorenz curve
  let area = 0
  for (let i = 1; i < points.length; i++) {
    area += (points[i].p - points[i - 1].p) * (points[i].l + points[i - 1].l) / 2
  }
  return { points, gini: 1 - 2 * area }
}

// Share of the total held by the top `frac` of items (largest first).
export function topShare(values, frac) {
  const v = values.filter((x) => x > 0).slice().sort((a, b) => b - a)
  const total = v.reduce((a, b) => a + b, 0) || 1
  const k = Math.max(1, Math.round(v.length * frac))
  let cum = 0
  for (let i = 0; i < k; i++) cum += v[i]
  return cum / total
}

export function mean(v) { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0 }
export function sd(v) { const m = mean(v); return v.length ? Math.sqrt(mean(v.map((x) => (x - m) ** 2))) : 0 }

// Gaussian pdf (for overlaying a normal/log-normal curve).
export function normalPdf(x, mu, sigma) {
  if (sigma <= 0) return 0
  return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI))
}

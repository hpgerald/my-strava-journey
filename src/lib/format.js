// Number + text formatting helpers. Numbers are always rendered as real text
// (never only inside a chart), for accessibility.

export function toNum(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// 1996 -> "1,996"
export function fmtInt(v) {
  const n = toNum(v)
  if (n === null) return '—'
  return Math.round(n).toLocaleString('en-US')
}

// 2046.7 -> "2,046.7" (keep up to `dp` decimals, trimming trailing zeros)
export function fmtNum(v, dp = 1) {
  const n = toNum(v)
  if (n === null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: dp })
}

// Big numbers to a compact editorial form: 1639179 -> "1.64M"
export function fmtCompact(v, dp = 1) {
  const n = toNum(v)
  if (n === null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e6) return trim(n / 1e6, dp) + 'M'
  if (abs >= 1e3) return trim(n / 1e3, dp) + 'k'
  return String(Math.round(n))
}

function trim(n, dp) {
  return Number(n.toFixed(dp)).toString()
}

// A ratio like 6.7 -> "6.7x"
export function fmtFactor(a, b) {
  const na = toNum(a)
  const nb = toNum(b)
  if (!na || !nb) return '—'
  return `${trim(nb / na, 1)}x`
}

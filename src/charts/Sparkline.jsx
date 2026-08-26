import { linScale, extent, linePath, areaPath } from './primitives.js'

// A tiny inline line chart (no axes), for use beside text. `values` is a plain
// number array; `labels` optionally names each point for the aria-label.
export default function Sparkline({ values, width = 132, height = 40, accent = true, area = true, label }) {
  if (!values || values.length < 2) return null
  const m = 3
  const [lo, hi] = extent(values, (v) => v)
  const sx = linScale([0, values.length - 1], [m, width - m])
  const sy = linScale([Math.min(0, lo), hi || 1], [height - m, m])
  const pts = values.map((v, i) => [sx(i), sy(v)])
  const stroke = accent ? 'var(--accent)' : 'var(--ink)'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label || 'trend'} style={{ display: 'block' }}>
      {area && <path d={areaPath(pts, sy(Math.min(0, lo)))} fill="var(--accent-mute)" />}
      <path d={linePath(pts)} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={stroke} />
    </svg>
  )
}

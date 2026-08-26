import { useWidth } from './useWidth.js'
import { linScale, extent, linePath, areaPath } from './primitives.js'

// A small framed trend, larger and more legible than a sparkline, for pairing
// beside body text. Shows the shape of a yearly series with its first and last
// values called out. values: number[]; startLabel/endLabel are the axis ends.
export default function MiniTrend({ values, startLabel, endLabel, caption, unit = '', fmt = (v) => Math.round(v).toLocaleString() }) {
  const [ref, w] = useWidth(320)
  const height = 132
  if (!values || values.length < 2) return <div ref={ref} />

  const m = { t: 22, r: 12, b: 22, l: 12 }
  const iw = Math.max(10, w - m.l - m.r)
  const ih = height - m.t - m.b
  const [lo, hi] = extent(values, (v) => v)
  const sx = linScale([0, values.length - 1], [m.l, m.l + iw])
  const sy = linScale([Math.min(0, lo), hi || 1], [m.t + ih, m.t])
  const pts = values.map((v, i) => [sx(i), sy(v)])
  const first = pts[0]
  const last = pts[pts.length - 1]

  return (
    <figure className="minitrend" style={{ margin: 0 }} ref={ref}>
      {caption ? <figcaption className="minitrend__cap eyebrow">{caption}</figcaption> : null}
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={caption || 'trend'} style={{ display: 'block' }}>
        <line x1={m.l} x2={m.l + iw} y1={sy(Math.min(0, lo))} y2={sy(Math.min(0, lo))} stroke="var(--rule-faint)" strokeWidth="1" />
        <path d={areaPath(pts, sy(Math.min(0, lo)))} fill="var(--accent-mute)" />
        <path d={linePath(pts)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={first[0]} cy={first[1]} r="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
        <circle cx={last[0]} cy={last[1]} r="3.6" fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.5" />
        <text x={first[0]} y={first[1] - 8} textAnchor="start" className="chart-tick">{fmt(values[0])}</text>
        <text x={last[0]} y={last[1] - 9} textAnchor="end" className="minitrend__end">{fmt(values[values.length - 1])}{unit ? ' ' + unit : ''}</text>
      </svg>
      <div className="minitrend__axis">
        <span className="mono">{startLabel}</span>
        <span className="mono">{endLabel}</span>
      </div>
    </figure>
  )
}

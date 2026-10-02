import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale, smoothAreaPath, smoothLinePath } from './primitives.js'

// Activity against the seasons. Every calendar month's activities summed across the
// seven years, drawn as one curve, with Tanzania's rough wet and dry spells shaded
// behind it. The busy months gather in the cool, dry middle of the year, June to
// October; the thinner months line up with the rains. It is a pattern in the record,
// not a claim that the weather caused anything. rows: monthly_totals [{ month, activities }].
const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// rough seasons for central/coastal Tanzania; wet shaded cool, dry left clear
const SEASONS = [
  { lo: 0, hi: 2, label: 'hot, dry', wet: false },
  { lo: 2, hi: 5, label: 'long rains', wet: true },
  { lo: 5, hi: 10, label: 'cool, dry season', wet: false, peak: true },
  { lo: 10, hi: 12, label: 'short rains', wet: true },
]

export default function ActivityWeather({ rows }) {
  const [ref, width] = useWidth(760)
  const [hover, setHover] = useState(null)
  const N = (x) => Number(x) || 0
  if (!rows || !rows.length) return <div ref={ref} />

  const tot = Array(12).fill(0)
  for (const r of rows) { const m = +r.month.slice(5, 7) - 1; if (m >= 0 && m < 12) tot[m] += N(r.activities) }
  const maxN = Math.max(...tot, 1)

  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 30, r: 12, b: 42, l: 12 }
  const H = narrow ? 230 : 270
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const baseY = m.t + ih
  const xAt = (i) => m.l + (i / 11) * iw
  const colW = iw / 11
  const sy = linScale([0, maxN], [baseY, m.t])
  const pts = tot.map((v, i) => [xAt(i), sy(v)])

  const bandX = (lo) => m.l + (lo / 12) * iw
  const bandW = (lo, hi) => ((hi - lo) / 12) * iw

  return (
    <div ref={ref} className="wx">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Activities by calendar month summed over seven years, peaking in the cool dry season from June to October, with the wetter months thinner."
        style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
        {/* season bands */}
        {SEASONS.map((s, i) => (
          <g key={i}>
            <rect x={bandX(s.lo)} y={m.t - 8} width={bandW(s.lo, s.hi)} height={ih + 8} fill={s.wet ? 'color-mix(in srgb, #4b4b86 12%, var(--paper))' : 'transparent'} />
            <text x={bandX(s.lo) + bandW(s.lo, s.hi) / 2} y={m.t - 14} textAnchor="middle" className={`wx__season${s.peak ? ' wx__season--peak' : ''}`}>{s.label}</text>
          </g>
        ))}
        {/* activity curve */}
        <path d={smoothAreaPath(pts, baseY)} fill="color-mix(in srgb, var(--accent) 14%, var(--paper))" />
        <path d={smoothLinePath(pts)} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <line x1={m.l} y1={baseY} x2={m.l + iw} y2={baseY} stroke="var(--ink)" strokeWidth="1" />
        {tot.map((v, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={xAt(i) - colW / 2} y={m.t} width={colW} height={ih} fill="transparent" />
            <circle cx={xAt(i)} cy={sy(v)} r={hover === i ? 5 : 3} fill={hover === i ? 'var(--accent)' : 'var(--paper)'} stroke="var(--accent)" strokeWidth="2" />
            <text x={xAt(i)} y={H - 10} textAnchor="middle" className="chart-tick">{MON[i]}</text>
          </g>
        ))}
      </svg>
      <div className="wx__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: 'color-mix(in srgb, #4b4b86 22%, var(--paper))' }} /> wetter months</span>
        <span><i className="chart-swatch" style={{ background: 'var(--paper)', boxShadow: 'inset 0 0 0 1px var(--rule)' }} /> drier months</span>
        <span className="wx__note">an observed pattern, not a cause</span>
      </div>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(xAt(hover), 70), W - 80), top: 2 }}>
          <strong>{MFULL[hover]}</strong><br />
          {tot[hover]} activities, all years
        </div>
      )}
    </div>
  )
}

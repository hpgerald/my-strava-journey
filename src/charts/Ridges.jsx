import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { smoothAreaPath, smoothLinePath } from './primitives.js'

// A ridgeline: one smoothed distribution per row, each scaled to its own peak so
// the shapes can be compared however many outings sit behind them. A tick marks
// each row's median and the median is read out on the right. Rows wash in from
// the top one after another.
// props: rows [{ key, label, values [numbers], note? }], domain [lo, hi], step
//   (bin width), ticks [values], tickFmt, medFmt, medHead, xCap, aria, smooth
//   (bins each side to average over, default 1), circular. A row may carry
//   `mark` (where its tick goes) and `right` (the text on the right) to show a
//   peak instead of the median.
const median = (v) => { const s = v.slice().sort((a, b) => a - b); const i = (s.length - 1) / 2; return s.length ? (s[Math.floor(i)] + s[Math.ceil(i)]) / 2 : 0 }

export default function Ridges({ rows, domain, step, ticks = [], tickFmt = (v) => v, medFmt = (v) => v, medHead = 'median', xCap, aria, smooth = 1, circular = false }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const m = { t: 8, r: narrow ? 54 : 64, b: xCap ? 44 : 26, l: narrow ? 74 : 104 }
  const rowH = narrow ? 44 : 52
  const lift = rowH * 1.35
  const H = m.t + lift + rowH * (rows.length - 1) + 18 + m.b
  const [lo, hi] = domain
  const nb = Math.round((hi - lo) / step)
  const X = (v) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r)

  const shapes = rows.map((r) => {
    const c = new Array(nb).fill(0)
    for (const v of r.values) { if (v < lo || v >= hi) continue; c[Math.floor((v - lo) / step)]++ }
    const s = c.map((_, i) => {
      let t = 0, w = 0
      for (let j = -smooth; j <= smooth; j++) {
        let k = i + j
        if (circular) k = (k + nb) % nb
        if (k < 0 || k >= nb) continue
        const wt = smooth + 1 - Math.abs(j); t += c[k] * wt; w += wt
      }
      return w ? t / w : 0
    })
    const peak = Math.max(1e-9, ...s)
    return { ...r, dens: s.map((v) => v / peak), med: median(r.values) }
  })

  return (
    <div ref={ref} className="ridge">
      <div ref={root} className={`ridge__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={X(t)} x2={X(t)} y1={m.t} y2={H - m.b} stroke="var(--rule-faint)" />
              <text x={X(t)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{tickFmt(t)}</text>
            </g>
          ))}
          {shapes.map((r, i) => {
            const base = m.t + lift + rowH * i
            const pts = [[X(lo), base], ...r.dens.map((d, j) => [X(lo + (j + 0.5) * step), base - d * lift]), [X(hi), base]]
            return (
              <g key={r.label} className="ridge__row" style={{ '--d': `${i * 120}ms` }}>
                <path d={smoothAreaPath(pts, base)} className={`ridge__a mfill--${r.key}`} />
                <path d={smoothLinePath(pts)} className="ridge__l" fill="none" />
                <line x1={m.l} x2={W - m.r} y1={base} y2={base} stroke="var(--ink)" strokeWidth="0.75" />
                <line x1={X(r.mark ?? r.med)} x2={X(r.mark ?? r.med)} y1={base} y2={base + 6} stroke="var(--ink)" strokeWidth="2" />
                <text x={m.l - 10} y={base - 4} textAnchor="end" className="ridge__lbl">{r.label}</text>
                {r.note && <text x={m.l - 10} y={base + 10} textAnchor="end" className="ridge__note">{r.note}</text>}
                <text x={W - m.r + 8} y={base - 4} className="ridge__med">{r.right ?? medFmt(r.med)}</text>
              </g>
            )
          })}
          <text x={W - m.r + 8} y={m.t + 10} className="cb__axis">{narrow && medHead === 'median' ? 'mid' : medHead}</text>
          {xCap && <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">{xCap}</text>}
        </svg>
      </div>
    </div>
  )
}

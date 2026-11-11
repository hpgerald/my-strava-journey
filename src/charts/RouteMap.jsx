import { useWidth } from './useWidth.js'
import { useSceneH, fitH } from '../components/SceneContext.js'

// The GPS line of a route, drawn to scale with north up. No map tiles: the
// line itself is the picture, with its named points, a scale bar and a north
// mark. Several lines can share one map (the days I went back to a mountain).
// props: lines [{ key, pts [[lat, lng]], tone 'main' | 'back' | 'faint', dashed? }],
//   marks [{ at [lat, lng], label, sub?, kind 'start' | 'top' | 'hut' | 'open', side? 'l' | 'r', dy?,
//     quiet? (on a narrow map the mark stays and its words step out) }],
//   aria, ratio (height / width, default 0.72)
const R = 6371

export default function RouteMap({ lines = [], marks = [], aria, ratio = 0.72 }) {
  const [ref, width] = useWidth(640)
  const want = useSceneH()
  const all = [...lines.flatMap((l) => l.pts), ...marks.map((m) => m.at)]
  if (!all.length) return <div ref={ref} />
  const W = Math.max(280, width)
  const narrow = W < 520
  const H = fitH(Math.round(W * (narrow ? Math.max(ratio, 0.9) : ratio)), want)
  const leftLabel = marks.some((m) => m.side === 'l')
  const pad = { t: narrow ? 30 : 50, r: narrow ? 104 : 124, b: 44, l: leftLabel ? (narrow ? 92 : 104) : narrow ? 20 : 34 }

  // a flat projection is fine at this size: kilometres east and north of the middle
  const lat0 = (Math.min(...all.map((p) => p[0])) + Math.max(...all.map((p) => p[0]))) / 2
  const lng0 = (Math.min(...all.map((p) => p[1])) + Math.max(...all.map((p) => p[1]))) / 2
  const k = Math.cos((lat0 * Math.PI) / 180)
  const toKm = (p) => [((p[1] - lng0) * Math.PI / 180) * R * k, ((p[0] - lat0) * Math.PI / 180) * R]
  const kms = all.map(toKm)
  const xs = kms.map((p) => p[0]), ys = kms.map((p) => p[1])
  const spanX = Math.max(0.5, Math.max(...xs) - Math.min(...xs)), spanY = Math.max(0.5, Math.max(...ys) - Math.min(...ys))
  const s = Math.min((W - pad.l - pad.r) / spanX, (H - pad.t - pad.b) / spanY)
  const cx = pad.l + (W - pad.l - pad.r) / 2, cy = pad.t + (H - pad.t - pad.b) / 2
  const midX = (Math.max(...xs) + Math.min(...xs)) / 2, midY = (Math.max(...ys) + Math.min(...ys)) / 2
  const xy = (p) => { const q = toKm(p); return [cx + (q[0] - midX) * s, cy - (q[1] - midY) * s] }
  const d = (pts) => pts.map((p, i) => { const [x, y] = xy(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join('')

  // a round scale bar: 1, 2 or 5 km, about a fifth of the width
  const barKm = (W * 0.2) / s
  const bar = [0.5, 1, 2, 5, 10].reduce((b, v) => (Math.abs(v - barKm) < Math.abs(b - barKm) ? v : b), 1)
  const order = { faint: 0, back: 1, main: 2 }
  const sorted = [...lines].sort((a, b) => (order[a.tone] || 0) - (order[b.tone] || 0))

  return (
    <div ref={ref} className="rmap">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
        {sorted.map((l) => (
          <path key={l.key} d={d(l.pts)} className={`rmap__line rmap__line--${l.tone || 'main'}${l.dashed ? ' is-dashed' : ''}`} fill="none" />
        ))}
        {marks.map((m, i) => {
          const [x, y] = xy(m.at)
          const left = m.side ? m.side === 'l' : x > W - pad.r + 8
          const tx = left ? x - 11 : x + 11
          const dy = narrow ? 0 : m.dy || 0 // on a narrow map the labels keep to their mark's own line
          return (
            <g key={i} className={`rmap__mark rmap__mark--${m.kind || 'hut'}`}>
              {m.kind === 'top' ? <path d={`M${x} ${y - 8}L${x + 7} ${y + 5}H${x - 7}Z`} className="rmap__tri" />
                : <circle cx={x} cy={y} r={m.kind === 'start' ? 5 : 4.5} className="rmap__dot" />}
              {narrow && m.quiet ? null : <text x={tx} y={y + dy + (m.sub ? -1 : 4)} textAnchor={left ? 'end' : 'start'} className="rmap__lbl">{m.label}</text>}
              {m.sub && !(narrow && m.quiet) ? <text x={tx} y={y + dy + 13} textAnchor={left ? 'end' : 'start'} className="rmap__sub">{m.sub}</text> : null}
            </g>
          )
        })}
        <g className="rmap__scale" aria-hidden="true">
          <line x1={pad.l} x2={pad.l + bar * s} y1={H - 16} y2={H - 16} />
          <line x1={pad.l} x2={pad.l} y1={H - 20} y2={H - 12} />
          <line x1={pad.l + bar * s} x2={pad.l + bar * s} y1={H - 20} y2={H - 12} />
          <text x={pad.l + bar * s + 8} y={H - 12}>{bar} km</text>
        </g>
        <g className="rmap__north" aria-hidden="true" transform={`translate(${W - 18} ${H - 30})`}>
          <path d="M0 -12L5 4L0 1L-5 4Z" />
          <text x="0" y="18" textAnchor="middle">N</text>
        </g>
      </svg>
    </div>
  )
}

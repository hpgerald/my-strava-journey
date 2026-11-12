import { useWidth } from './useWidth.js'
import { useSceneH, fitH } from '../components/SceneContext.js'

// The GPS line of a route, drawn to scale with north up. No map tiles: the
// line itself is the picture, with its named points, a scale bar and a north
// mark. Several lines can share one map (the days I went back to a mountain).
// props: lines [{ key, pts [[lat, lng]], tone 'main' | 'back' | 'faint', dashed? }],
//   marks [{ at [lat, lng], label, sub?, kind 'start' | 'top' | 'hut' | 'open', side? 'l' | 'r', dy?,
//     quiet? (on a narrow map the mark stays and its words step out) }],
//   aria, ratio (height / width, default 0.72)
// A line may carry `alt`, a function from the share of the way done (0 to 1) to
// the altitude my watch recorded there, and `by` 'dist' (default) or 'index' for
// how that share is counted. Those lines get a band of ground under them, shaded
// from low to high by the altitude, so the climb shows on the map itself.
const R = 6371

export default function RouteMap({ lines = [], marks = [], aria, ratio = 0.72 }) {
  const [ref, width] = useWidth(640)
  const want = useSceneH()
  const all = [...lines.flatMap((l) => l.pts), ...marks.map((m) => m.at)]
  if (!all.length) return <div ref={ref} />
  const W = Math.max(280, width)
  const narrow = W < 520
  // a modest map: never taller than 440 px on a wide screen, 360 on a narrow one
  const H = fitH(Math.min(narrow ? 360 : 440, Math.round(W * (narrow ? Math.max(ratio, 0.9) : ratio))), want)
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
  // the ground under the lines that carry an altitude
  const shaded = lines.filter((l) => typeof l.alt === 'function' && l.pts.length > 1)
  const ground = shaded.map((l) => {
    const km = [0]
    for (let i = 1; i < l.pts.length; i++) { const a = toKm(l.pts[i - 1]), b = toKm(l.pts[i]); km.push(km[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])) }
    const tot = km[km.length - 1] || 1
    return l.pts.map((p, i) => ({ p, m: l.alt(l.by === 'index' ? i / (l.pts.length - 1) : km[i] / tot) }))
  })
  const alts = ground.flat().map((g) => g.m).filter((v) => Number.isFinite(v))
  const aLo = alts.length ? Math.min(...alts) : 0, aHi = alts.length ? Math.max(...alts) : 1
  // low ground is pale sand, high ground a deep earth brown
  const tint = (m) => { const t = Math.max(0, Math.min(1, (m - aLo) / Math.max(1, aHi - aLo))); const mix = (a, b) => Math.round(a + (b - a) * t); return `rgb(${mix(236, 150)}, ${mix(228, 118)}, ${mix(210, 84)})` }
  const bandW = narrow ? 14 : 20
  const order = { faint: 0, back: 1, main: 2 }
  const sorted = [...lines].sort((a, b) => (order[a.tone] || 0) - (order[b.tone] || 0))

  return (
    <div ref={ref} className="rmap">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
        {ground.length ? (
          <g className="rmap__ground" aria-hidden="true">
            {ground.map((g, gi) => g.slice(1).map((q, i) => {
              const [x1, y1] = xy(g[i].p), [x2, y2] = xy(q.p)
              return <line key={`${gi}-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tint((g[i].m + q.m) / 2)} strokeWidth={bandW} strokeLinecap="round" />
            }))}
          </g>
        ) : null}
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
      {ground.length ? (
        <p className="rmap__key" aria-hidden="true">
          <span>{(Math.round(aLo / 10) * 10).toLocaleString('en-US')} m</span>
          <i style={{ background: `linear-gradient(90deg, ${tint(aLo)}, ${tint(aHi)})` }} />
          <span>{(Math.round(aHi / 10) * 10).toLocaleString('en-US')} m</span>
          <em>ground height on my watch</em>
        </p>
      ) : null}
    </div>
  )
}

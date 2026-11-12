import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'
import { useSceneH, fitH } from '../components/SceneContext.js'

// A ridge walked out and back: altitude against the distance covered. The way
// out is orange and the way back is black, so the same tops show twice, once
// from each side. A dotted line holds the height of the start, which shows at
// once where the day ended below it.
// props: pts [{ d, alt }], turnI (index of the far end), level ({ d, alt } back
//   level with the start, optional), aria
export default function RidgeProfile({ pts, turnI, level, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const want = useSceneH()
  if (!pts || pts.length < 3) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 560
  const H = fitH(narrow ? 300 : 380, want)
  const m = { t: 34, r: narrow ? 16 : 26, b: 40, l: narrow ? 50 : 58 }
  const maxD = pts[pts.length - 1].d
  const lo = Math.floor((Math.min(...pts.map((p) => p.alt)) - 20) / 100) * 100
  const hi = Math.ceil((Math.max(...pts.map((p) => p.alt)) + 10) / 100) * 100
  const x = linScale([0, maxD], [m.l, W - m.r])
  const y = linScale([lo, hi], [H - m.b, m.t])
  const yt = []
  for (let v = lo; v <= hi; v += 100) yt.push(v)
  const xt = []
  for (let v = 0; v <= maxD; v += narrow ? 5 : 2.5) xt.push(v)
  const seg = (a, b) => pts.slice(a, b + 1).map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)} ${y(p.alt).toFixed(1)}`).join('')
  const area = `${seg(0, pts.length - 1)}L${x(maxD).toFixed(1)} ${y(lo)}L${x(0).toFixed(1)} ${y(lo)}Z`
  const start = pts[0], turn = pts[turnI], end = pts[pts.length - 1]
  const n = (v) => Math.round(v).toLocaleString('en-US')
  return (
    <div ref={(el) => { ref.current = el; root.current = el }} className={`rdg${inView ? ' is-in' : ''}`}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--rule-faint)" />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">{v.toLocaleString('en-US')}{v === yt[yt.length - 1] ? ' m' : ''}</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(lo)} y2={y(lo)} stroke="var(--ink)" />
        {xt.map((v) => <text key={v} x={x(v)} y={H - m.b + 18} textAnchor="middle" className="chart-tick">{v}{v === xt[xt.length - 1] ? ' km' : ''}</text>)}
        <path d={area} className="rdg__area" />
        <line x1={m.l} x2={W - m.r} y1={y(start.alt)} y2={y(start.alt)} className="rdg__level" />
        <path d={seg(turnI, pts.length - 1)} fill="none" className="rdg__line rdg__line--back" />
        <path d={seg(0, turnI)} fill="none" className="rdg__line rdg__line--out" />
        <circle cx={x(start.d)} cy={y(start.alt)} r="4" className="rdg__dot rdg__dot--start" />
        <text x={x(start.d) + 8} y={y(start.alt) + 17} textAnchor="start" className="rdg__lbl">{narrow ? 'Start' : `The start · ${n(start.alt)} m`}</text>
        <path d={`M${x(turn.d) - 6} ${y(turn.alt) - 5}L${x(turn.d)} ${y(turn.alt) - 16}L${x(turn.d) + 6} ${y(turn.alt) - 5}Z`} className="rdg__tri" />
        <text x={x(turn.d)} y={y(turn.alt) - 22} textAnchor="middle" className="rdg__lbl rdg__lbl--b">{narrow ? `${n(turn.alt)} m` : `The far end · ${n(turn.alt)} m`}</text>
        {level && !narrow ? <text x={x(level.d) + 8} y={y(start.alt) - 8} textAnchor="start" className="rdg__lbl rdg__lbl--q">level with the start</text> : null}
        <circle cx={x(end.d)} cy={y(end.alt)} r="4" className="rdg__dot" />
        <text x={x(end.d) - 12} y={y(end.alt) + 5} textAnchor="end" className="rdg__lbl">{narrow ? `${n(end.alt)} m` : `The finish · ${n(end.alt)} m`}</text>
      </svg>
    </div>
  )
}

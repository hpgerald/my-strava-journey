import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'
import { useSceneH, fitH } from '../components/SceneContext.js'

// Every trip to Bondwa Peak on one pair of axes: altitude against the distance
// walked. Each trip is a line, the featured one in orange, the others in grey
// with their year at the end of the line. The first trip started down in the
// town, so its line begins far below the rest.
// props: trips [{ trip, date, profile [{ d, alt }], climb }], feature (trip id), aria
export default function BondwaClimbs({ trips, feature, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const want = useSceneH()
  if (!trips || !trips.length) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 560
  const H = fitH(narrow ? 300 : 340, want)
  const m = { t: 20, r: narrow ? 14 : 22, b: 40, l: narrow ? 52 : 58 }
  const maxD = Math.max(...trips.flatMap((t) => t.profile.map((p) => p.d)))
  const lo = Math.floor(Math.min(...trips.flatMap((t) => t.profile.map((p) => p.alt))) / 500) * 500
  const hi = Math.ceil(Math.max(...trips.flatMap((t) => t.profile.map((p) => p.alt))) / 250) * 250
  const x = linScale([0, maxD], [m.l, W - m.r])
  const y = linScale([lo, hi], [H - m.b, m.t])
  const yt = []
  for (let v = lo; v <= hi; v += 500) yt.push(v)
  const xt = []
  for (let v = 0; v <= maxD; v += narrow ? 4 : 2) xt.push(v)
  const path = (t) => t.profile.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)} ${y(p.alt).toFixed(1)}`).join('')
  const sorted = [...trips].sort((a, b) => (a.trip === feature ? 1 : 0) - (b.trip === feature ? 1 : 0))
  // the year sits at the end of its line: above a high end, below a low one;
  // two low ends close together take turns, one below and one above
  const side = {}
  let lastX = -99, lastUp = true
  ;[...trips].sort((a, b) => a.profile[a.profile.length - 1].d - b.profile[b.profile.length - 1].d).forEach((t) => {
    const end = t.profile[t.profile.length - 1]
    let up = end.alt > (lo + hi) / 2
    if (!up && x(end.d) - lastX < 44 && !lastUp) up = true
    if (!up || up !== (end.alt > (lo + hi) / 2)) { lastX = x(end.d); lastUp = up }
    side[t.trip] = up
  })
  // a trip that started far below the others carries its year at its start, where the plot is empty
  const starts = trips.map((t) => t.profile[0].alt).sort((a, b) => a - b)
  const lowStart = (t) => trips.length > 1 && t.profile[0].alt === starts[0] && starts[1] - starts[0] > 300
  return (
    <div ref={(el) => { ref.current = el; root.current = el }} className={`bwc${inView ? ' is-in' : ''}`}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--rule-faint)" />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">{v.toLocaleString('en-US')}{v === yt[yt.length - 1] ? ' m' : ''}</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(lo)} y2={y(lo)} stroke="var(--ink)" />
        {xt.map((v) => <text key={v} x={x(v)} y={H - m.b + 18} textAnchor="middle" className="chart-tick">{v}{v === xt[xt.length - 1] ? ' km' : ''}</text>)}
        {sorted.map((t) => {
          const on = t.trip === feature
          const end = t.profile[t.profile.length - 1]
          const up = side[t.trip]
          return (
            <g key={t.trip}>
              <path d={path(t)} fill="none" className={`bwc__line${on ? ' is-on' : ''}`} />
              <circle cx={x(end.d)} cy={y(end.alt)} r={on ? 4 : 3} className={`bwc__end${on ? ' is-on' : ''}`} />
              {lowStart(t)
                ? <text x={x(t.profile[0].d) + 10} y={y(t.profile[0].alt) - 12} textAnchor="start" className={`bwc__yr${on ? ' is-on' : ''}`}>{t.date.slice(0, 4)}</text>
                : <text x={x(end.d)} y={y(end.alt) + (up ? -10 : 18)} textAnchor={x(end.d) > W - m.r - 24 ? 'end' : 'middle'} className={`bwc__yr${on ? ' is-on' : ''}`}>{t.date.slice(0, 4)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

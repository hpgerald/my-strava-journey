import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'
import { useSceneH, fitH } from '../components/SceneContext.js'

// The Kilimanjaro expedition as one climb: the altitude of every stage on foot,
// side by side, from the gate to the huts and up the summit night, then back
// down to Horombo. Each stage is as wide as the ground it covered. On the summit
// night the watch stopped near the crater rim, so the recorded line ends there;
// the rest of the night (the rim, Uhuru Peak and the way back to Kibo Hut) is a
// dashed line in its own band, marked as not recorded and given no distance.
// props: stages [{ stage, from, to, km, start, end, high }] (recorded km),
//   profile { [stage]: [{ f, alt }] }, peaks { rim, top } (altitudes), aria
const GAP_KM = 9 // the width given to the part of the summit night not recorded

export default function KiliClimb({ stages, profile, peaks, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const want = useSceneH()
  if (!stages || stages.length < 5) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 560
  const H = fitH(narrow ? 340 : 340, want)
  const m = { t: 34, r: narrow ? 10 : 16, b: 40, l: narrow ? 40 : 52 }

  // stage spans along x: recorded kilometres, plus the unrecorded band after stage 4
  const spans = []
  let at = 0
  stages.forEach((s) => {
    spans.push({ ...s, x0: at, x1: at + s.km })
    at += s.km
    if (s.stage === 4) { spans.push({ gap: true, x0: at, x1: at + GAP_KM }); at += GAP_KM }
  })
  const x = linScale([0, at], [m.l, W - m.r])
  const y = linScale([1500, 6100], [H - m.b, m.t])
  const ticks = [2000, 3000, 4000, 5000, 6000]
  const fmt = (v) => `${Math.round(v).toLocaleString('en-US')} m`

  const pathOf = (s) => (profile[s.stage] || []).map((p, i) => `${i ? 'L' : 'M'}${x(s.x0 + p.f * s.km).toFixed(1)} ${y(p.alt).toFixed(1)}`).join(' ')
  const up = spans.filter((s) => !s.gap && s.stage <= 4)
  const down = spans.find((s) => s.stage === 5)
  const gap = spans.find((s) => s.gap)
  const s4 = spans.find((s) => s.stage === 4)
  // the night after the watch stopped: on to the crater rim, the summit, and back to Kibo Hut
  const gx = (f) => x(gap.x0 + f * (gap.x1 - gap.x0))
  const dash = `M${x(s4.x1).toFixed(1)} ${y(s4.high).toFixed(1)} L${gx(0.2).toFixed(1)} ${y(peaks.rim).toFixed(1)} L${gx(0.42).toFixed(1)} ${y(peaks.top).toFixed(1)} L${gx(0.6).toFixed(1)} ${y(peaks.rim).toFixed(1)} L${gx(1).toFixed(1)} ${y(down.start).toFixed(1)}`
  const upLine = up.map(pathOf).join(' ')
  const area = up.map((s) => `${pathOf(s)} L${x(s.x1).toFixed(1)} ${y(1500)} L${x(s.x0).toFixed(1)} ${y(1500)} Z`).join(' ')
  const len = W * 3

  const huts = [
    { x: x(0), alt: stages[0].start, name: 'Marangu Gate', anchor: 'start', dy: 18 },
    { x: x(spans[0].x1), alt: stages[0].end, name: 'Mandara Hut' },
    { x: x(spans[1].x1), alt: stages[1].end, name: 'Horombo Hut' },
    { x: x(spans[2].x1), alt: stages[2].end, name: 'Kibo Hut', anchor: 'end', dx: -8 },
  ]
  const labels = [
    { x: x(s4.x1), y: y(s4.high), t: narrow ? 'Watch stopped' : 'The watch stopped', v: s4.high, anchor: 'end', dx: -8, dy: 20 },
    { x: gx(0.2), y: y(peaks.rim), t: "Gilman's Point", v: peaks.rim, anchor: 'end', dx: -8, dy: -8 },
    { x: gx(0.42), y: y(peaks.top), t: 'Uhuru Peak', v: peaks.top, anchor: 'middle', dx: 0, dy: -12, top: true },
  ]
  const days = [
    { a: spans[0], t: 'Day 1' }, { a: spans[1], t: 'Day 2' }, { a: spans[2], t: 'Day 3' },
    { a: s4, b: gap, t: narrow ? 'Summit' : 'Summit night' }, { a: down, t: narrow ? 'Down' : 'Back down' },
  ]

  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot kcl${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
          {ticks.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke="var(--rule-faint)" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{narrow ? `${g / 1000}k` : g.toLocaleString('en-US')}</text>
            </g>
          ))}
          <line x1={m.l} y1={y(1500)} x2={W - m.r} y2={y(1500)} stroke="var(--ink)" />
          <rect x={gx(0)} y={m.t - 6} width={gx(1) - gx(0)} height={y(1500) - m.t + 6} className="kcl__gap" />
          <text x={(gx(0) + gx(1)) / 2} y={y(1500) - 10} textAnchor="middle" className="cb__axis">{narrow ? 'no record' : 'not recorded'}</text>
          {days.map((d, i) => {
            const x0 = x(d.a.x0), x1 = x((d.b || d.a).x1)
            return (
              <g key={d.t}>
                {i ? <line x1={x0} x2={x0} y1={y(1500)} y2={y(1500) + 6} stroke="var(--ink)" /> : null}
                <text x={(x0 + x1) / 2} y={H - m.b + 18} textAnchor="middle" className="cb__gl">{d.t}</text>
              </g>
            )
          })}
          <path d={area} className="kcl__area" />
          <path d={pathOf(down)} className="kcl__down" fill="none" />
          <path d={dash} className="kcl__dash" fill="none" />
          <path d={upLine} className="kcl__line" fill="none" strokeDasharray={len} style={{ '--len': len }} />
          {huts.map((h) => (
            <g key={h.name} className="kcl__mark">
              <circle cx={h.x} cy={y(h.alt)} r="4" className="kcl__hut" />
              {!narrow || h.anchor ? (
                <text x={h.x + (h.dx || 0)} y={y(h.alt) + (h.dy || -12)} textAnchor={h.anchor || 'middle'} className="kcl__lbl cb__halo">
                  {h.name} <tspan className="kcl__alt">{fmt(h.alt)}</tspan>
                </text>
              ) : null}
            </g>
          ))}
          <circle cx={x(down.x1)} cy={y(down.end)} r="4" className="kcl__hut" />
          {labels.map((l) => (
            <g key={l.t} className="kcl__mark kcl__mark--late">
              <circle cx={l.x} cy={l.y} r={l.top ? 6 : 4} className={l.top ? 'kcl__top' : 'kcl__hut'} />
              <text x={l.x + l.dx} y={l.y + l.dy} textAnchor={l.anchor} className={`kcl__lbl cb__halo${l.top ? ' kcl__lbl--top' : ''}`}>
                {l.t} <tspan className="kcl__alt">{fmt(l.v)}</tspan>
              </text>
            </g>
          ))}
          <text x={m.l - 8} y={m.t - 18} className="cb__axis">metres above sea level</text>
        </svg>
      </div>
    </div>
  )
}

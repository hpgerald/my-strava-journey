import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'
import { useSceneH, fitH } from '../components/SceneContext.js'

// One long day on Mount Hanang against the clock: the altitude of the hike from
// the early-morning start to the top, then down through the night, back after
// two in the morning. Across is the time of day, so the length of the day is
// the story; the way up is orange, the way down is ink. Brackets above the line
// give the hours up and the hours down.
// props: points [{ t (minutes after the start), alt }], start ('YYYY-MM-DD HH:MM'), aria
const hhmm = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = m % 60
  return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}
const dur = (min) => `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`
const TICKS = [[360, '6 am'], [540, '9 am'], [720, 'noon'], [900, '3 pm'], [1080, '6 pm'], [1260, '9 pm'], [1440, 'midnight'], [1620, '3 am']]

export default function HanangDay({ points, start, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const want = useSceneH()
  if (!points || points.length < 3) return <div ref={ref} />
  const W = Math.max(300, width)
  const narrow = W < 560
  const H = fitH(narrow ? 320 : 380, want)
  const m = { t: 58, r: narrow ? 12 : 18, b: 30, l: narrow ? 40 : 64 }
  const s0 = parseInt(start.slice(11, 13), 10) * 60 + parseInt(start.slice(14, 16), 10)
  const pts = points.map((p) => ({ c: s0 + p.t, alt: p.alt }))
  const end = pts[pts.length - 1].c
  const x = linScale([Math.floor(s0 / 60) * 60 - 20, Math.max(end + 30, 1620)], [m.l, W - m.r])
  const y = linScale([1800, 3600], [H - m.b, m.t])
  const top = pts.reduce((b, p) => (p.alt > b.alt ? p : b), pts[0])
  const iTop = pts.indexOf(top)
  const path = (arr) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(p.c).toFixed(1)} ${y(p.alt).toFixed(1)}`).join(' ')
  const up = pts.slice(0, iTop + 1), down = pts.slice(iTop)
  const area = `${path(pts)} L${x(end).toFixed(1)} ${y(1800)} L${x(pts[0].c).toFixed(1)} ${y(1800)} Z`
  const len = W * 2.5
  const bY = m.t - 30
  // whole minutes, so the hours up and the hours down add up to the whole day
  const upMin = Math.round(top.c - pts[0].c), allMin = Math.round(end - pts[0].c)
  const spans = [
    { a: pts[0].c, b: top.c, t: `${dur(upMin)} up` },
    { a: top.c, b: end, t: `${dur(allMin - upMin)} down` },
  ]
  const marks = [
    { p: pts[0], t: 'Start', anchor: 'start', dx: 8, dy: 4 },
    { p: top, t: 'The top', anchor: 'middle', dx: 0, dy: -12, hot: true },
    { p: pts[pts.length - 1], t: 'Back', anchor: 'end', dx: -10, dy: 17 },
  ]
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot hng${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
          {[2000, 2500, 3000, 3500].map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke="var(--rule-faint)" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="cb__gl">{narrow ? `${(g / 1000).toFixed(1)}k` : `${g.toLocaleString('en-US')} m`}</text>
            </g>
          ))}
          <line x1={m.l} y1={y(1800)} x2={W - m.r} y2={y(1800)} stroke="var(--ink)" />
          {TICKS.filter(([c], i) => !narrow || i % 2 === 0 || c === 1440).map(([c, t]) => (
            <g key={c}>
              <line x1={x(c)} x2={x(c)} y1={y(1800)} y2={y(1800) + 5} stroke="var(--ink)" />
              <text x={x(c)} y={H - m.b + 18} textAnchor="middle" className="cb__gl">{t}</text>
            </g>
          ))}
          <line x1={x(1440)} x2={x(1440)} y1={m.t - 6} y2={y(1800)} className="hng__mid" />
          <path d={area} className="hng__area" />
          <path d={path(down)} className="hng__down" fill="none" />
          <path d={path(up)} className="hng__up" fill="none" strokeDasharray={len} style={{ '--len': len }} />
          {spans.map((s, i) => (
            <g key={s.t} className="hng__span" style={{ '--d': `${1.4 + i * 0.3}s` }}>
              <path d={`M${x(s.a) + 1} ${bY + 6} V${bY} H${x(s.b) - 1} V${bY + 6}`} fill="none" className={i ? 'hng__br' : 'hng__br hng__br--up'} />
              <text x={(x(s.a) + x(s.b)) / 2} y={bY - 7} textAnchor="middle" className="hng__lbl cb__halo">{s.t}</text>
            </g>
          ))}
          {marks.map((k) => (
            <g key={k.t} className="hng__mark">
              <circle cx={x(k.p.c)} cy={y(k.p.alt)} r={k.hot ? 6 : 4} className={k.hot ? 'hng__top' : 'hng__dot'} />
              <text x={x(k.p.c) + k.dx} y={y(k.p.alt) + k.dy} textAnchor={k.anchor} className="hng__lbl cb__halo">
                {k.t} <tspan className="hng__alt">{hhmm(k.p.c)}</tspan>
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

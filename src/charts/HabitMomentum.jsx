import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, smoothLinePath, smoothAreaPath } from './primitives.js'

// The chance the next day is active, read from where you stand today. The
// middle line is a day you moved. Right: each step is one more day on a roll
// (orange, climbing toward certainty). Left: each step is one more day since
// you last moved (grey, falling fast). The imbalance is the point: a streak is
// far easier to keep than to restart.
// props: stick [{L,p}] (run length), rebound [{g,p}] (days off), origin (p after moving).
const pct = (v) => `${Math.round(v * 100)}%`

export default function HabitMomentum({ stick, rebound, origin }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  if (!stick || !stick.length || !rebound || !rebound.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { t: 30, r: 14, b: 44, l: 40 }
  const maxL = stick[stick.length - 1].L
  const maxG = rebound[rebound.length - 1].g
  const cx = m.l + (W - m.l - m.r) * 0.4
  const y = linScale([0, 1], [H - m.b, m.t])
  const xRight = (L) => cx + ((L - 1) / Math.max(1, maxL - 1)) * (W - m.r - cx)
  const xLeft = (g) => cx - (g / Math.max(1, maxG)) * (cx - m.l)

  const rightPts = stick.map((s) => [xRight(s.L), y(s.p)])
  const leftPts = rebound.map((g) => [xLeft(g.g), y(g.p)])
  const y0 = H - m.b
  const endRight = stick[stick.length - 1]
  const endLeft = rebound[rebound.length - 1]
  const week = stick.find((s) => s.L === 7)
  const oneOff = rebound.find((g) => g.g === 1)

  const grid = [0, 0.25, 0.5, 0.75, 1]
  const rTicks = [1, 7, 14, 21, maxL].filter((v, i, a) => v <= maxL && a.indexOf(v) === i)
  const lTicks = Array.from({ length: maxG }, (_, i) => i + 1)

  return (
    <div ref={ref} className="hmom">
      <div ref={root} className={`hmom__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Chance the next day is active. If you moved today it is ${pct(origin)}. It climbs to ${week ? pct(week.p) : ''} after a week on a roll and ${pct(endRight.p)} by ${endRight.L} days. After one day off it is ${oneOff ? pct(oneOff.p) : ''}, and after ${endLeft.g} days off it falls to ${pct(endLeft.p)}.`}
          style={{ display: 'block' }}>
          {/* y gridlines with their percentages */}
          {grid.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke={g === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeWidth="1" />
              <text x={m.l - 8} y={y(g) + 4} textAnchor="end" className="hmom__gl">{pct(g)}</text>
            </g>
          ))}

          {/* the two arms */}
          <path className="hmom__area hmom__area--up" d={smoothAreaPath(rightPts, y0)} fill="color-mix(in srgb, var(--accent) 11%, var(--paper))" stroke="none" />
          <path className="hmom__area hmom__area--down" d={smoothAreaPath(leftPts, y0)} fill="color-mix(in srgb, var(--grey-45) 16%, var(--paper))" stroke="none" />
          <path className="hmom__line hmom__line--up" d={smoothLinePath(rightPts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.75" strokeLinecap="round" />
          <path className="hmom__line hmom__line--down" d={smoothLinePath(leftPts)} pathLength="1" fill="none" stroke="var(--grey-55)" strokeWidth="2.5" strokeLinecap="round" />

          {/* the shared middle: a day you moved */}
          <line className="hmom__today" x1={cx} y1={m.t - 6} x2={cx} y2={H - m.b} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <text x={cx} y={m.t - 12} textAnchor="middle" className="hmom__todaylbl">MOVED TODAY</text>
          <circle className="hmom__dot" cx={cx} cy={y(origin)} r="5.5" fill="var(--ink)" stroke="var(--paper)" strokeWidth="2" />
          <text x={cx - 10} y={y(origin) - 10} textAnchor="end" className="hmom__onum hmom__halo">{pct(origin)}</text>

          {/* waypoints: a week on a roll, one day off */}
          {week && (
            <g className="hmom__mark">
              <circle cx={xRight(7)} cy={y(week.p)} r="3.5" fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.5" />
              <text x={xRight(7) + 6} y={y(week.p) + 26} textAnchor="start" className="hmom__end hmom__end--up hmom__halo">1 week · {pct(week.p)}</text>
            </g>
          )}
          {oneOff && (
            <g className="hmom__mark">
              <circle cx={xLeft(1)} cy={y(oneOff.p)} r="3.5" fill="var(--grey-55)" stroke="var(--paper)" strokeWidth="1.5" />
              <text x={xLeft(1) - 8} y={y(oneOff.p) - 12} textAnchor="end" className="hmom__end hmom__end--down hmom__halo">1 day off · {pct(oneOff.p)}</text>
            </g>
          )}

          {/* the two ends */}
          <circle className="hmom__dot" cx={xRight(endRight.L)} cy={y(endRight.p)} r="4" fill="var(--accent)" />
          <text x={xRight(endRight.L)} y={y(endRight.p) + 20} textAnchor="end" className="hmom__end hmom__end--up hmom__halo">{endRight.L} days · {pct(endRight.p)}</text>
          <circle className="hmom__dot" cx={xLeft(endLeft.g)} cy={y(endLeft.p)} r="4" fill="var(--grey-55)" />
          <text x={xLeft(endLeft.g) + 4} y={y(endLeft.p) + 22} textAnchor="start" className="hmom__end hmom__end--down hmom__halo">{endLeft.g} days off · {pct(endLeft.p)}</text>

          {/* x ticks: days off to the left, days on a roll to the right */}
          {lTicks.map((g) => (
            <text key={'l' + g} x={xLeft(g)} y={H - m.b + 16} textAnchor="middle" className="hmom__tick">{g}</text>
          ))}
          {rTicks.filter((L) => L > 1).map((L) => (
            <text key={'r' + L} x={xRight(L)} y={H - m.b + 16} textAnchor={L === maxL ? 'end' : 'middle'} className="hmom__tick">{L}</text>
          ))}
          <text x={(m.l + cx) / 2} y={H - 6} textAnchor="middle" className="hmom__axis">&larr; days off</text>
          <text x={(cx + W - m.r) / 2} y={H - 6} textAnchor="middle" className="hmom__axis">days on a roll &rarr;</text>
        </svg>
      </div>
    </div>
  )
}

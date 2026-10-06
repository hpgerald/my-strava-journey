import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, smoothLinePath, smoothAreaPath } from './primitives.js'

// The physics of the streak, read as conditional probability. One point in the
// middle is "the day after you move": 82% you move again. From there the record
// splits in two. Keep going and each day makes the next more certain, a long
// gentle climb to the right that all but reaches 1. Stop, and the chance of
// coming back falls away, a short steep drop to the left. The asymmetry is the
// whole point: a streak is far easier to keep than to restart.
// props: stick [{L,p}] (momentum), rebound [{g,p}] (rust), origin (p the day after).
const pct = (v) => `${Math.round(v * 100)}%`

export default function HabitMomentum({ stick, rebound, origin }) {
  const [ref, width] = useWidth(840)
  const [root, inView] = useInView()
  if (!stick || !stick.length || !rebound || !rebound.length) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 600
  const H = narrow ? 320 : 380
  const m = { t: 52, r: 18, b: 48, l: 18 }
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

  const grid = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div ref={ref} className="hmom">
      <div ref={root} className={`hmom__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Chance the next day is active. The day after moving it is ${pct(origin)}; it climbs toward ${pct(endRight.p)} the longer the streak runs, and falls to ${pct(endLeft.p)} after ${endLeft.g} days off.`}
          style={{ display: 'block' }}>
          {grid.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke="var(--rule-faint)" strokeWidth="1" opacity={g === 0 ? 1 : 0.6} />
              {(g === 0.5 || g === 0.75) && <text x={W - m.r} y={y(g) - 4} textAnchor="end" className="hmom__gl">{pct(g)}</text>}
            </g>
          ))}
          <text x={m.l} y={m.t - 30} textAnchor="start" className="hmom__ycap">chance the next day is active &darr;</text>

          {/* the two arms */}
          <path className="hmom__area hmom__area--up" d={smoothAreaPath(rightPts, y0)} fill="color-mix(in srgb, var(--accent) 11%, var(--paper))" stroke="none" />
          <path className="hmom__area hmom__area--down" d={smoothAreaPath(leftPts, y0)} fill="color-mix(in srgb, var(--grey-45) 16%, var(--paper))" stroke="none" />
          <path className="hmom__line hmom__line--up" d={smoothLinePath(rightPts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.75" strokeLinecap="round" />
          <path className="hmom__line hmom__line--down" d={smoothLinePath(leftPts)} pathLength="1" fill="none" stroke="var(--grey-55)" strokeWidth="2.5" strokeLinecap="round" />

          {/* the shared origin: the day after you move */}
          <line className="hmom__today" x1={cx} y1={m.t - 8} x2={cx} y2={H - m.b} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <text x={cx} y={m.t - 14} textAnchor="middle" className="hmom__todaylbl">THE DAY AFTER YOU MOVE</text>
          <circle className="hmom__dot" cx={cx} cy={y(origin)} r="5" fill="var(--ink)" stroke="var(--paper)" strokeWidth="2" />
          <text x={cx + 8} y={y(origin) - 8} className="hmom__onum">{pct(origin)}</text>

          {/* end markers */}
          <circle className="hmom__dot" cx={xRight(endRight.L)} cy={y(endRight.p)} r="4" fill="var(--accent)" />
          <text x={xRight(endRight.L)} y={y(endRight.p) - 10} textAnchor="end" className="hmom__end hmom__end--up">{endRight.L} days in · {pct(endRight.p)}</text>
          <circle className="hmom__dot" cx={xLeft(endLeft.g)} cy={y(endLeft.p)} r="4" fill="var(--grey-55)" />
          <text x={xLeft(endLeft.g)} y={y(endLeft.p) + 16} textAnchor="start" className="hmom__end hmom__end--down">{endLeft.g} days off · {pct(endLeft.p)}</text>

          {/* axis captions */}
          <text x={(cx + W - m.r) / 2} y={H - 10} textAnchor="middle" className="hmom__axis">days on a roll &rarr;</text>
          <text x={(m.l + cx) / 2} y={H - 10} textAnchor="middle" className="hmom__axis">&larr; days since you stopped</text>
        </svg>
      </div>
    </div>
  )
}

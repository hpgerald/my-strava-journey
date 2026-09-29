import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The lone marathon. Exactly one full 42 km has ever been run in a single day, and
// it was run hard: 42.75 km in 2 hours 56, a shade over four minutes a kilometre,
// on a flat May morning in 2022. Set against a normal long day, it is twice the
// distance at better than half the usual pace. Fixed facts of one effort.
const EVERYDAY = 21.1
const MARATHON = { km: 42.75, time: '2:56:44', pace: '4:08', when: 'one May morning, 2022' }
const OFFICIAL = 42.195

export default function DistanceExtremes() {
  const [ref, width] = useWidth(700)
  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 14, r: 16, b: 28, l: 14 }
  const maxKm = 44.5
  const sx = linScale([0, maxKm], [m.l, W - m.r])
  const rowH = narrow ? 60 : 64
  const barH = narrow ? 16 : 20
  const y0 = m.t + 26
  const y1 = y0 + rowH
  const H = y1 + barH + 40
  const kmTicks = [0, 10, 20, 30, 40]

  return (
    <div ref={ref} className="dext">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="The one marathon, 42.75 km in 2 hours 56, against a normal long day." style={{ display: 'block' }}>
        {kmTicks.map((k) => (
          <g key={k}>
            <line x1={sx(k)} y1={m.t} x2={sx(k)} y2={H - m.b + 2} stroke="var(--rule-faint)" strokeWidth="1" />
            <text x={sx(k)} y={H - 9} textAnchor={k === 0 ? 'start' : 'middle'} className="dext__tick">{k} km</text>
          </g>
        ))}

        {/* a normal long day */}
        <text x={m.l} y={y0 - 9} className="dext__lbl">A NORMAL LONG DAY</text>
        <text x={W - m.r} y={y0 - 9} textAnchor="end" className="dext__val">{EVERYDAY} km</text>
        <rect x={m.l} y={y0} width={sx(EVERYDAY) - m.l} height={barH} rx="3" fill="var(--grey-25)" />

        {/* the marathon */}
        <text x={m.l} y={y1 - 9} className="dext__lbl">THE ONE FULL MARATHON</text>
        <text x={W - m.r} y={y1 - 9} textAnchor="end" className="dext__val dext__val--hot">{MARATHON.km} km</text>
        <rect x={m.l} y={y1} width={sx(MARATHON.km) - m.l} height={barH} rx="3" fill="var(--accent)" />
        {/* time inside the bar */}
        <text x={sx(MARATHON.km) - 8} y={y1 + barH / 2 + 4} textAnchor="end" className="dext__intime">{MARATHON.time}</text>
        {/* official 42.195 mark */}
        <line x1={sx(OFFICIAL)} y1={y1 - 3} x2={sx(OFFICIAL)} y2={y1 + barH + 3} stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 2" />
        <text x={sx(OFFICIAL)} y={y1 + barH + 14} textAnchor="middle" className="dext__mark">42.2 km official</text>
        <text x={m.l} y={y1 + barH + 14} className="dext__mark">{MARATHON.when} &middot; {MARATHON.pace}/km &middot; flat &middot; sub-three-hours</text>
      </svg>
    </div>
  )
}

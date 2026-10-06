import { useInView, useCountUp } from '../components/Reveal.jsx'

// What seven years come to, read as things you can picture: the distance as a
// slice of the way round the planet, the climb as a stack of Everests, the time
// as whole days spent moving. Numbers count up when the block scrolls in.
const EQUATOR = 40075 // km
const EVEREST = 8849 // m

function Stat({ value, decimals = 0, unit, label, equiv }) {
  const [ref, inView] = useInView()
  const safe = Number.isFinite(value) ? value : 0
  const v = useCountUp(safe, inView, { decimals, dur: 1300 })
  return (
    <div ref={ref} className="adds__stat">
      <p className="adds__num">
        {v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="adds__unit">{unit}</span> : null}
      </p>
      <p className="adds__lbl">{label}</p>
      <p className="adds__equiv">{equiv}</p>
    </div>
  )
}

function EquatorArc({ km }) {
  const [ref, inView] = useInView()
  const frac = Math.min(1, (Number(km) || 0) / EQUATOR)
  const R = 72
  const C = 2 * Math.PI * R
  return (
    <div ref={ref} className={`adds__globe${inView ? ' is-in' : ''}`}>
      <svg width="180" height="180" viewBox="0 0 180 180" role="img"
        aria-label={`On foot, ${Math.round(frac * 100)} percent of the way around the equator.`}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--rule-faint)" strokeWidth="10" />
        <circle className="adds__ring" cx="90" cy="90" r={R} fill="none" stroke="var(--accent)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={inView ? C * (1 - frac) : C}
          transform="rotate(-90 90 90)" />
        <text x="90" y="84" textAnchor="middle" className="adds__globepct">{Math.round(frac * 100)}%</text>
        <text x="90" y="104" textAnchor="middle" className="adds__globecap">of the equator</text>
      </svg>
    </div>
  )
}

export default function AddsUpTo({ km, elev, activities, hours }) {
  const everests = (Number(elev) || 0) / EVEREST
  const days = Math.round((Number(hours) || 0) / 24)
  return (
    <div className="adds">
      <div className="adds__stats">
        <Stat value={km} unit="km" label="on foot" equiv="run, walked and hiked" />
        <Stat value={elev} unit="m" label="climbed" equiv={`${everests.toFixed(1)} times the height of Everest`} />
        <Stat value={activities} label="activities" equiv="roughly six every week, for seven years" />
        <Stat value={hours} unit="h" label="moving" equiv={`${days} whole days of nonstop motion`} />
      </div>
      <EquatorArc km={km} />
    </div>
  )
}

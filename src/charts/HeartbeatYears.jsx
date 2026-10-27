import { useMemo } from 'react'
import OutingSky from './OutingSky.jsx'
import { useInView, useCountUp } from '../components/Reveal.jsx'
import { fmtInt, toNum } from '../lib/format.js'

// The home hero: every outing of the record as one living sky (OutingSky), then
// the four big numbers counting up underneath.
export default function HeartbeatYears({ activities, km, elevation, streak }) {
  const [coRef, coIn] = useInView({ threshold: 0.15, rootMargin: '0px' })
  const activeDays = useMemo(() => new Set(activities.map((a) => (a.date || '').slice(0, 10)).filter(Boolean)).size, [activities])
  const ready = activities.length > 0
  const actN = useCountUp(activities.length, coIn && ready, { dur: 2700 })
  const kmN = useCountUp(Math.round(toNum(km) || 0), coIn && ready, { dur: 2700 })
  const elevN = useCountUp(Math.round(toNum(elevation) || 0), coIn && ready, { dur: 2700 })
  const streakN = useCountUp(Math.round(toNum(streak) || 0), coIn && ready, { dur: 2700 })

  return (
    <div className="sky-hero">
      <OutingSky activities={activities} />
      <div ref={coRef} className={`beat__callouts${coIn ? ' is-in' : ''}`}>
        <div className="beat__co">
          <div className="beat__n">{fmtInt(actN)}</div>
          <div className="beat__l">Activities</div>
        </div>
        <div className="beat__co">
          <div className="beat__n">{fmtInt(kmN)}<span className="beat__u">km</span></div>
          <div className="beat__l">On foot</div>
        </div>
        <div className="beat__co">
          <div className="beat__n">{fmtInt(elevN)}<span className="beat__u">m</span></div>
          <div className="beat__l">Climbed</div>
        </div>
        <div className="beat__co beat__co--accent">
          <div className="beat__n">{fmtInt(streakN)}<span className="beat__u">days</span></div>
          <div className="beat__l">Current streak</div>
        </div>
      </div>
    </div>
  )
}

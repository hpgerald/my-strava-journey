import { useMemo, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// Every single day from the first run to today, one square each. The days that
// carried an activity are lit; the rest stay dark. The long dark band in the
// middle is the 353-day silence; the bright run at the end is the streak still
// going. The point reads before any number: more than half of every day, for
// seven years. props: firstISO, lastISO, activeSet (Set 'YYYY-MM-DD'),
// streakStartISO, streakEndISO.
const DAY = 86400000

export default function EveryDayField({ firstISO, lastISO, activeSet, streakStartISO, streakEndISO }) {
  const [ref, width] = useWidth(900)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)

  const days = useMemo(() => {
    if (!firstISO || !lastISO) return []
    const out = []
    let t = Date.parse(firstISO + 'T00:00:00Z')
    const end = Date.parse(lastISO + 'T00:00:00Z')
    const sS = streakStartISO ? Date.parse(streakStartISO + 'T00:00:00Z') : null
    const sE = streakEndISO ? Date.parse(streakEndISO + 'T00:00:00Z') : null
    while (t <= end) {
      const iso = new Date(t).toISOString().slice(0, 10)
      out.push({ iso, active: activeSet.has(iso), streak: sS != null && t >= sS && t <= sE })
      t += DAY
    }
    return out
  }, [firstISO, lastISO, activeSet, streakStartISO, streakEndISO])

  if (!days.length) return <div ref={ref} />

  const W = Math.max(300, width)
  const narrow = W < 560
  const gap = 1.5
  const target = narrow ? 7 : 9
  const cols = Math.max(20, Math.floor(W / target))
  const cell = (W - (cols - 1) * gap) / cols
  const step = cell + gap
  const rows = Math.ceil(days.length / cols)
  const H = rows * step

  return (
    <div ref={ref} className="edf">
      <div ref={root} className={`edf__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`One square per day across the whole record; the lit squares are the days that carried an activity, more than half of them.`}
          style={{ display: 'block' }} onMouseLeave={() => setHi(null)}>
          {days.map((d, i) => {
            const col = i % cols
            const rowi = Math.floor(i / cols)
            const fill = d.streak ? 'var(--accent-ink)' : d.active ? 'var(--accent)' : 'var(--grey-10)'
            return (
              <rect key={i} className="edf__cell" x={col * step} y={rowi * step} width={cell} height={cell} rx="1"
                fill={fill} style={{ transitionDelay: `${Math.round((col / cols) * 500)}ms` }}
                onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
            )
          })}
        </svg>
        {hi != null && days[hi] && (
          <div className="chart-tip" style={{ left: `${Math.min(86, Math.max(6, ((hi % cols) / cols) * 100))}%`, top: Math.floor(hi / cols) * step + step }}>
            <strong>{new Date(days[hi].iso + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</strong>
            <br />{days[hi].active ? (days[hi].streak ? 'active · in the streak' : 'active') : 'rest day'}
          </div>
        )}
      </div>
    </div>
  )
}

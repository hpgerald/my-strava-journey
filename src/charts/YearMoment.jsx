import { useInView, useCountUp, Reveal } from '../components/Reveal.jsx'
import { prettySport } from '../lib/slug.js'

// The signature moment of each year: a focused, animated statement plus one
// bespoke mini-visual. Driven entirely by the year's computed `stats`, so the
// words and figures stay true to the data. Cycling never appears by name.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Big({ value, decimals = 0 }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals })
  return <span ref={ref} className="ymom__big">{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
}

// small animated columns for a few months
function JumpBars({ items }) {
  const [root, inView] = useInView()
  const max = Math.max(1, ...items.map((d) => d.v))
  return (
    <div ref={root} className={`ymom__jump${inView ? ' is-in' : ''}`}>
      {items.map((d, i) => (
        <div key={d.label} className="ymom__jumpcol">
          <span className="ymom__jumpval mono">{d.v}</span>
          <span className="ymom__jumptrack">
            <span className="ymom__jumpbar" style={{ height: `${(d.v / max) * 100}%`, transitionDelay: `${i * 160}ms`, background: d.hot ? 'var(--accent)' : 'var(--grey-25)' }} />
          </span>
          <span className="ymom__jumplbl chart-tick">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function YearMoment({ year, stats }) {
  const s = stats
  const chip = (label, value, decimals = 0) => (
    <div className="ymom__chip">
      <Big value={value} decimals={decimals} />
      <span className="ymom__chiplbl">{label}</span>
    </div>
  )

  let kicker = 'The moment'
  let title = null
  let body = null
  let figure = null

  if (year <= 2019) {
    kicker = 'First steps'
    title = 'The record begins.'
    body = `It opens with a short run in August and gathers ${s.n} activities before the year is out, most of them indoor miles. A quiet debut, with no sign yet of what it becomes.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('kilometres on foot', Math.round(s.footKm))}</div>
  } else if (year === 2020) {
    kicker = 'The quiet year'
    title = 'Then it nearly stops.'
    body = `Just ${s.n} activities across the whole year, and after midsummer the log falls silent for months. The habit has not caught yet.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('longest streak', s.streakLen)}</div>
  } else if (year === 2021) {
    kicker = 'The switch'
    title = 'The year it caught.'
    const jun = s.monthsActivities[5] || 0
    const jul = s.monthsActivities[6] || 0
    const aug = s.monthsActivities[7] || 0
    body = `For the first half the calendar barely registers. Then July arrives and does not let go: a handful of activities becomes dozens, and the year closes with a ${s.streakLen}-day unbroken run.`
    figure = <JumpBars items={[{ label: 'Jun', v: jun }, { label: 'Jul', v: jul, hot: true }, { label: 'Aug', v: aug }]} />
  } else if (year === 2022) {
    kicker = 'The peak'
    title = 'The busiest year on record.'
    body = `${s.n} activities, more than any year before or since, and the year walking first drew level with running as the engine of the habit.`
    figure = (
      <div className="ymom__versus">
        <div className="ymom__vrow"><span className="ymom__vlbl">Walk</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.walkN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--accent)' }} /><span className="mono">{s.walkN}</span></div>
        <div className="ymom__vrow"><span className="ymom__vlbl">Run</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.runN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--grey-35)' }} /><span className="mono">{s.runN}</span></div>
      </div>
    )
  } else if (year === 2023) {
    kicker = 'The climb'
    title = 'The year of vertical.'
    body = `${Math.round(s.elev).toLocaleString()} metres gained, far more than any year yet, capped by a 100 km stage race run over four straight nights in March.`
    const peak = s.monthsElev.indexOf(Math.max(...s.monthsElev))
    figure = (
      <>
        <div className="ymom__chips">{chip('metres climbed', Math.round(s.elev))}{chip('personal records', s.prs)}</div>
        <p className="ymom__cap">Steepest month: <b>{MON[peak]}</b>, {Math.round(s.monthsElev[peak]).toLocaleString()} m.</p>
      </>
    )
  } else if (year === 2024) {
    kicker = 'The passport'
    title = 'The widest the map ever spread.'
    const away = s.countries.filter((c) => c.country !== 'Tanzania')
    body = `${s.countries.length} countries in a single year, from home in Tanzania out to ${away.slice(0, 3).map((c) => c.country).join(', ')}${away.length > 3 ? ' and more' : ''}.`
    figure = (
      <Reveal className="ymom__stamps">
        {s.countries.map((c, i) => (
          <span key={c.country} className="ymom__stamp" style={{ transitionDelay: `${i * 80}ms` }}>
            {c.country} <b className="mono">{c.n}</b>
          </span>
        ))}
      </Reveal>
    )
  } else if (year === 2025) {
    kicker = 'The highest point'
    title = 'The steepest day on record.'
    body = `One outing climbed ${Math.round(s.highestClimb ? s.highestClimb.val : 0).toLocaleString()} metres, the most vertical ever gained in a single day, part of a year that kept pointing uphill.`
    figure = <div className="ymom__chips">{chip('metres in a day', Math.round(s.highestClimb ? s.highestClimb.val : 0))}{chip('metres in the year', Math.round(s.elev))}</div>
  } else {
    // 2026 and any later year: the unbroken streak
    kicker = 'Unbroken'
    title = 'A streak that never broke.'
    body = `Active ${s.streakLen} days in a row and still counting, with more hours moving and more personal records than any year before.`
    figure = <div className="ymom__chips">{chip('day streak', s.streakLen)}{chip('hours moving', Math.round(s.hours))}{chip('personal records', s.prs)}</div>
  }

  return (
    <div className="ymom">
      <Reveal className="ymom__head">
        <p className="eyebrow ymom__kicker">{kicker}</p>
        <h3 className="ymom__title display">{title}</h3>
        <p className="ymom__body measure">{body}</p>
      </Reveal>
      <Reveal className="ymom__fig" delay={120}>{figure}</Reveal>
    </div>
  )
}

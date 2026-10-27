import { useInView, useCountUp, Reveal } from '../components/Reveal.jsx'
import { isNamedCountry } from '../lib/geo.js'

// The signature moment of each year: a focused, animated statement plus one
// bespoke mini-visual. Driven entirely by the year's computed `stats`, so the
// words and figures stay true to the data. Only sports on foot and African
// countries are ever named.
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
    body = `My first upload was in August, and by the end of the year I had ${s.n} activities, most of them runs on a treadmill. Nothing about it looked like the start of a habit.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('kilometres on foot', Math.round(s.footKm))}</div>
  } else if (year === 2020) {
    kicker = 'The quiet year'
    title = 'Then it nearly stopped.'
    body = `Only ${s.n} activities all year. After the middle of the year I stopped logging for months. The habit hadn’t taken hold yet.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('longest streak', s.streakLen)}</div>
  } else if (year === 2021) {
    kicker = 'The switch'
    title = 'The year it caught.'
    const jun = s.monthsActivities[5] || 0
    const jul = s.monthsActivities[6] || 0
    const aug = s.monthsActivities[7] || 0
    body = `For the first half of the year there’s hardly anything. Then, in the middle of the year, a handful of outings a month turned into dozens, and by the end I’d strung together ${s.streakLen} days in a row.`
    figure = <JumpBars items={[{ label: 'Jun', v: jun }, { label: 'Jul', v: jul, hot: true }, { label: 'Aug', v: aug }]} />
  } else if (year === 2022) {
    kicker = 'The peak'
    title = 'The busiest year on record.'
    body = `${s.n} activities, more than in any other year, and the first year I walked more often than I ran.`
    figure = (
      <div className="ymom__versus">
        <div className="ymom__vrow"><span className="ymom__vlbl">Walk</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.walkN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--accent)' }} /><span className="mono">{s.walkN}</span></div>
        <div className="ymom__vrow"><span className="ymom__vlbl">Run</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.runN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--grey-35)' }} /><span className="mono">{s.runN}</span></div>
      </div>
    )
  } else if (year === 2023) {
    kicker = 'The climb'
    title = 'My year of climbing.'
    body = `I climbed ${Math.round(s.elev).toLocaleString()} metres, far more than in any year before, and in March I ran a 100 km stage race over four evenings in a row.`
    const peak = s.monthsElev.indexOf(Math.max(...s.monthsElev))
    figure = (
      <>
        <div className="ymom__chips">{chip('metres climbed', Math.round(s.elev))}{chip('personal records', s.prs)}</div>
        <p className="ymom__cap">My biggest month for climbing was <b>{MON[peak]}</b>, with {Math.round(s.monthsElev[peak]).toLocaleString()} m.</p>
      </>
    )
  } else if (year === 2024) {
    kicker = 'The travel year'
    title = 'The map at its widest.'
    const away = s.countries.filter((c) => c.country !== 'Tanzania' && isNamedCountry(c.country)).map((c) => c.country)
    const list = away.length > 1 ? `${away.slice(0, -1).join(', ')} and ${away[away.length - 1]}` : away.join('')
    body = `I went out in ${s.countriesNamed} countries that year. Most outings were at home in Tanzania, and the rest were in ${list}.`
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
    title = 'My biggest climb.'
    body = `One outing that year climbed ${Math.round(s.highestClimb ? s.highestClimb.val : 0).toLocaleString()} metres, more than any other single outing I’ve done.`
    figure = <div className="ymom__chips">{chip('metres in a day', Math.round(s.highestClimb ? s.highestClimb.val : 0))}{chip('metres in the year', Math.round(s.elev))}</div>
  } else {
    // 2026 and any later year: the unbroken streak
    kicker = 'Unbroken'
    title = 'A streak that never broke.'
    body = `I’ve been out ${s.streakLen} days in a row and I’m still going. I’ve also moved for more hours and set more personal records than in any year before.`
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

import { useInView, useCountUp, Reveal } from '../components/Reveal.jsx'

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
    title = 'Where it began.'
    body = `Looking at it now, nothing there looked like the start of a habit.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('kilometres on foot', Math.round(s.footKm))}</div>
  } else if (year === 2020) {
    kicker = 'The quiet year'
    title = 'Then I stopped.'
    body = `After the middle of the year I stopped logging, and it stayed like that for months.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('longest streak', s.streakLen)}</div>
  } else if (year === 2021) {
    kicker = 'Coming back'
    title = 'The year it caught.'
    const jun = s.monthsActivities[5] || 0
    const jul = s.monthsActivities[6] || 0
    const aug = s.monthsActivities[7] || 0
    body = `For the first half of the year there is almost nothing. Then, in the middle of the year, a few outings a month became dozens, and before the year ended I had gone out ${s.streakLen} days in a row.`
    figure = <JumpBars items={[{ label: 'Jun', v: jun }, { label: 'Jul', v: jul, hot: true }, { label: 'Aug', v: aug }]} />
  } else if (year === 2022) {
    kicker = 'The busiest'
    title = 'My busiest year.'
    body = `More activities than any other year. It was also the first year I walked more often than I ran.`
    figure = (
      <div className="ymom__versus">
        <div className="ymom__vrow"><span className="ymom__vlbl">Walk</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.walkN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--accent)' }} /><span className="mono">{s.walkN}</span></div>
        <div className="ymom__vrow"><span className="ymom__vlbl">Run</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.runN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--grey-35)' }} /><span className="mono">{s.runN}</span></div>
      </div>
    )
  } else if (year === 2023) {
    kicker = 'The hills'
    title = 'A year in the hills.'
    body = `I went to the hills more than ever. In March I also ran a 100 km stage race, over four evenings in a row.`
    const peak = s.monthsElev.indexOf(Math.max(...s.monthsElev))
    figure = (
      <>
        <div className="ymom__chips">{chip('metres climbed', Math.round(s.elev))}{chip('km on trails', Math.round(s.trailKm))}</div>
        <p className="ymom__cap">My biggest month for climbing was <b>{MON[peak]}</b>, with {Math.round(s.monthsElev[peak]).toLocaleString()} m.</p>
      </>
    )
  } else if (year === 2024) {
    kicker = 'Travelling'
    title = 'The map at its widest.'
    body = `Most outings were at home in Tanzania. The rest were across the border.`
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
    body = `One ${s.highestClimb ? s.highestClimb.sport.toLowerCase() : 'outing'} that year climbed more than any other single outing I have done.`
    figure = <div className="ymom__chips">{chip('metres in a day', Math.round(s.highestClimb ? s.highestClimb.val : 0))}{chip('metres in the year', Math.round(s.elev))}</div>
  } else {
    // 2026 and any later year: the unbroken streak
    kicker = 'Every day'
    title = 'One day at a time.'
    body = `Every day of the year so far, at home and away.`
    figure = <div className="ymom__chips">{chip('days in a row', s.streakLen)}{chip('hours moving', Math.round(s.hours))}</div>
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

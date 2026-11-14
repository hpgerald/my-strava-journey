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

// the human opening of a year, without its picture, for the top of the page
export function momentText(year, stats) {
  return momentParts(year, stats).body
}

export default function YearMoment({ year, stats }) {
  const { kicker, title, body, figure } = momentParts(year, stats)
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

function momentParts(year, stats) {
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
    body = `I heard about Strava and decided to give it a try. Most of that first year was runs on the treadmill, and nothing yet looked like the start of a habit.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('kilometres on foot', Math.round(s.footKm))}</div>
  } else if (year === 2020) {
    kicker = 'The quiet year'
    title = 'Then I stopped.'
    body = `I changed jobs and moved from Arusha to Kilimanjaro, in the time of COVID-19. After the middle of the year the log went quiet, and it stayed quiet for almost a year.`
    figure = <div className="ymom__chips">{chip('activities', s.n)}{chip('active days', s.activeDays)}{chip('longest streak', s.streakLen)}</div>
  } else if (year === 2021) {
    kicker = 'Coming back'
    title = 'The year it caught.'
    const jun = s.monthsActivities[5] || 0
    const jul = s.monthsActivities[6] || 0
    const aug = s.monthsActivities[7] || 0
    body = `After the check-up I came back in June with a 10 km run, and this time I stayed. Before the year ended I was on a ${s.streakLen}-day streak.`
    figure = <JumpBars items={[{ label: 'Jun', v: jun }, { label: 'Jul', v: jul, hot: true }, { label: 'Aug', v: aug }]} />
  } else if (year === 2022) {
    kicker = 'The busiest'
    title = 'My busiest year.'
    body = `The habit was strong enough now for a big day, and in May came my first marathon. It was also the first year I walked more often than I ran.`
    figure = (
      <div className="ymom__versus">
        <div className="ymom__vrow"><span className="ymom__vlbl">Walk</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.walkN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--accent)' }} /><span className="mono">{s.walkN}</span></div>
        <div className="ymom__vrow"><span className="ymom__vlbl">Run</span><span className="ymom__vbar" style={{ width: `${Math.min(100, (s.runN / Math.max(s.walkN, s.runN)) * 100)}%`, background: 'var(--grey-35)' }} /><span className="mono">{s.runN}</span></div>
      </div>
    )
  } else if (year === 2023) {
    kicker = 'The summit'
    title = 'To the top of Kilimanjaro.'
    body = `In March I went up Kilimanjaro with four friends and reached Uhuru Peak. Later that month I took a challenge from the Activate Uganda team, 25 km a day on the treadmill, four evenings in a row. In April came the longest day in my log, on Hanang.`
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
    body = `A remote job and a few consultancies took me across borders, and the shoes always came along. Wherever the work was, I found time to go out.`
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
    body = `On Bondwa Peak, in rain so heavy that everything was slippery, I climbed more than on any other outing I have done. Then, in the last days of the year, I decided to stop missing days.`
    figure = <div className="ymom__chips">{chip('metres in a day', Math.round(s.highestClimb ? s.highestClimb.val : 0))}{chip('metres in the year', Math.round(s.elev))}</div>
  } else {
    // 2026 and any later year: the unbroken streak
    kicker = 'Every day'
    title = 'One day at a time.'
    body = year === 2026 ? `I started this streak on purpose, and my first target is to reach 31 December without a zero day. So far every day of the year has an outing, in Tanzania and away.` : `Every day of the year so far, in Tanzania and away.`
    figure = <div className="ymom__chips">{chip('day streak', s.streakLen)}{chip('hours moving', Math.round(s.hours))}</div>
  }

  return { kicker, title, body, figure }
}

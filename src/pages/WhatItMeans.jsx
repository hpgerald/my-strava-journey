import DetailFrame from '../components/DetailFrame.jsx'
import Term from '../components/Term.jsx'
import Verdict from '../charts/Verdict.jsx'
import ClimbShare from '../charts/ClimbShare.jsx'
import EffortPerKm from '../charts/EffortPerKm.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const RUN_SET = new Set(['Run', 'TrailRun'])
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const median = (arr) => {
  const s = arr.filter((v) => v > 0).sort((a, b) => a - b)
  if (!s.length) return 0
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export default function WhatItMeans() {
  const activities = useTable('activities')
  const lifetime = useTable('lifetime_totals')
  const fun = useTable('fun_journey')
  const countries = useTable('countries')
  const regions = useTable('tanzania_regions')
  const glossary = useTable('glossary')
  const { prev, next } = useSectionPaging('/what-it-means')

  const life = (n) => (lifetime.find((r) => (r.metric || '').toLowerCase().includes(n)) || {}).value
  const funv = (n) => (fun.find((f) => (f.comparison || '').includes(n)) || {}).value

  const totalActs = activities.length || toNum(life('activities')) || 0
  const acts2019 = activities.filter((a) => a.year === '2019').length
  const everests = funv('Everest')
  const elevation = toNum(life('elevation'))
  const realCountries = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS').length
  const regionCount = regions.filter((r) => r.region).length

  // effort spent per km on foot, by year (the honest fitness signal)
  const epkAgg = {}
  for (const a of activities) {
    if (!FOOT.has(a.sport_type)) continue
    const re = toNum(a.relative_effort)
    const km = toNum(a.distance_km)
    if (re > 0 && km > 0.3 && a.year) {
      const e = (epkAgg[a.year] = epkAgg[a.year] || { e: 0, k: 0 })
      e.e += re
      e.k += km
    }
  }
  const effortPerKm = Object.keys(epkAgg).sort().map((y) => ({ year: y, value: epkAgg[y].e / epkAgg[y].k, thin: epkAgg[y].k < 400 }))
  const epkFirst = effortPerKm[0]
  const epkLow = effortPerKm.reduce((lo, d) => (d.value < lo.value ? d : lo), effortPerKm[0] || { value: 0 })

  // where the vertical comes from, by sport
  const elevBy = {}
  const distBy = {}
  for (const a of activities) {
    if (!FOOT.has(a.sport_type)) continue
    elevBy[a.sport_type] = (elevBy[a.sport_type] || 0) + (toNum(a.elevation_gain_m) || 0)
    distBy[a.sport_type] = (distBy[a.sport_type] || 0) + (toNum(a.distance_km) || 0)
  }
  const totalFootElev = Object.values(elevBy).reduce((s, v) => s + v, 0) || 1
  const totalFootDist = Object.values(distBy).reduce((s, v) => s + v, 0) || 1
  const climbShareData = [
    { key: 'Walk', label: 'Walking', value: elevBy.Walk || 0, color: 'var(--grey-55)' },
    { key: 'TrailRun', label: 'Trail running', value: elevBy.TrailRun || 0, color: 'var(--ink)' },
    { key: 'Run', label: 'Running (road + treadmill)', value: elevBy.Run || 0, color: 'var(--accent)', highlight: true },
    { key: 'Hike', label: 'Hiking', value: elevBy.Hike || 0, color: 'var(--grey-35)' },
  ].sort((a, b) => b.value - a.value)
  const runDistPct = Math.round((100 * (distBy.Run || 0)) / totalFootDist)
  const runClimbPct = Math.round((100 * (elevBy.Run || 0)) / totalFootElev)

  // typical outing + the doubling habit
  const footKm = activities.filter((a) => FOOT.has(a.sport_type)).map((a) => toNum(a.distance_km) || 0)
  const medKm = median(footKm)
  const perDay = {}
  for (const a of activities) { const d = (a.date || '').slice(0, 10); if (d) perDay[d] = (perDay[d] || 0) + 1 }
  const dayVals = Object.values(perDay)
  const doublePct = dayVals.length ? Math.round((100 * dayVals.filter((v) => v >= 2).length) / dayVals.length) : 0

  // consistency
  const activeDays = Object.keys(perDay).length
  const dates = Object.keys(perDay).sort()
  const spanDays = dates.length ? Math.round((Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000) + 1 : 1
  const activePct = Math.round((100 * activeDays) / spanDays)
  const streak = toNum(life('longest streak'))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'What It Means' }]}
      number="10"
      title="What It Means"
      subtitle="What the numbers say to you."
      lede="A record is only worth keeping if it tells you something. Everything on this site converges on a handful of lessons, and which one matters depends on where you are in your own training. Here is what seven years of showing up has to say. Dotted words carry plain definitions; hover, tap or tab."
      prev={prev}
      next={next}
    >
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you are just starting out</h2>
            <p className="measure">
              Start small and stay in the game. This began in 2019 as {acts2019} activities and no
              real intent, and it did not reach {fmtInt(totalActs)} through talent or heroics. It got
              there because in July 2021 a hobby quietly became the default, and the default was never
              switched off. That is the single loudest lesson in the data: almost nothing here came
              from the first two years, and almost everything came from refusing to stop after them.
              A modest habit, compounded over years, dwarfs any burst of motivation.
            </p>
          </div>
          <Verdict from={acts2019} to={fmtInt(totalActs)} mult={`about ${Math.round(totalActs / (acts2019 || 1))}x more activities`} sub="27 activities in 2019, and the totals looked after themselves once the habit held." />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you are chasing consistency</h2>
            <p className="measure">
              Consistency is not built from big days; it is built from small ones you refuse to skip.
              The longest unbroken run here is {fmtInt(streak)} days, sitting inside a 157-week streak
              that reaches back three full years, and {activePct}% of every calendar day across seven
              years carries an activity. None of that was earned on the epic outings. It was earned on
              the short evening walk logged only to keep the chain alive. That is why{' '}
              <Term name="Moving time">moving time</Term> and turning up will always beat a single
              personal best.
            </p>
          </div>
          <Verdict value={fmtInt(streak)} unit="days" sub={`unbroken, inside a 157-week streak, with ${activePct}% of all days active.`} />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you are coming back from a break</h2>
            <p className="measure">
              A gap is not the end of the story. The biggest silence in this whole record is 353 days,
              nearly a full year, from July 2020 to June 2021, with nothing logged at all. What came
              next was not a slow, guilty return but the most productive stretch of the entire seven
              years. The lesson is not that rest is failure; it is that a long layoff and a lasting
              comeback can sit right next to each other. The clock does not have to reset your ambition,
              only your pace back in.
            </p>
          </div>
          <Verdict value="353" unit="days away" sub="the longest gap on record, immediately before the most consistent stretch of all." />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you are a runner working on pace</h2>
            <p className="measure">
              Fitness is easiest to see not in speed, which the treadmill distorts, but in cost. Divide
              how hard a session felt by how far it went and you get the price of a kilometre in{' '}
              <Term name="Relative Effort">relative effort</Term>. In 2019 a kilometre on foot cost about{' '}
              {fmtNum(epkFirst?.value, 1)} points; by {epkLow?.year} it cost {fmtNum(epkLow?.value, 1)}.
              The same ground, for a fraction of the toll. That downward curve, not any one fast run, is
              what getting fitter actually looks like. Chase it in the <Term name="Pace zones">pace zones</Term>.
            </p>
          </div>
          <EffortPerKm data={effortPerKm} />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you are short on time</h2>
            <p className="measure">
              You do not need long days. The typical foot outing here is just {fmtNum(medKm, 1)} km, and
              on {doublePct}% of active days there were two or more sessions rather than one long one.
              The volume that stacked up to a third of the way around the Earth was assembled almost
              entirely out of short, ordinary efforts squeezed into ordinary days. A brisk half hour,
              repeated, is the engine. The long session is the exception, not the requirement.
            </p>
          </div>
          <Verdict value={fmtNum(medKm, 1)} unit="km" sub={`the median outing, and ${doublePct}% of active days held more than one.`} />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you live for vertical</h2>
            <p className="measure">
              Elevation does not come from where you would guess. Running is {runDistPct}% of the
              distance on foot but only {runClimbPct}% of the climb, because it stays flat and mostly on
              a treadmill. The vertical, all {fmtInt(elevation)} metres of it, {fmtNum(everests)} Everests,
              is carried by walking uphill and by the trails, where a single trail run averages around
              350 metres of gain and a hike climbs over 700. If you want <Term name="Elevation gain">elevation</Term>, the answer
              is not to run harder. It is to walk uphill, and to get on the trails often.
            </p>
          </div>
          <ClimbShare items={climbShareData} />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you train through travel</h2>
            <p className="measure">
              The routine does not have to stay home. These activities begin in {realCountries} countries
              and {regionCount} regions of Tanzania, and travel never broke the streak, it fed it. Some
              of the standout days, a gravel ride across a border, a dawn walk in an unfamiliar city,
              happened precisely because the habit packed its shoes and came along for the trip. A new
              place is not an excuse to stop; it is a fresh route to log.
            </p>
          </div>
          <div className="reach">
            <div className="reach__row">
              <span className="reach__num">{realCountries}</span>
              <span className="reach__lbl">countries reached</span>
            </div>
            <div className="reach__row">
              <span className="reach__num">{regionCount}</span>
              <span className="reach__lbl">Tanzania regions</span>
            </div>
            <p className="source" style={{ marginTop: 'var(--sp-2)' }}>Source: Activity Log &middot; GPS</p>
          </div>
        </article>
      </section>

      {/* Full glossary for completeness */}
      <section style={{ paddingTop: 'var(--sp-8)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
          Glossary
        </p>
        <dl style={{ margin: 0 }}>
          {glossary.map((g, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(8rem, 12rem) 1fr',
                gap: 'var(--sp-4)',
                padding: 'var(--sp-3) 0',
                borderTop: '1px solid var(--rule-faint)',
              }}
            >
              <dt className="mono" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                {g.term}
              </dt>
              <dd className="text-muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                {g.definition}
              </dd>
            </div>
          ))}
        </dl>
        <p className="source" style={{ marginTop: 'var(--sp-4)' }}>
          Definitions are standard Strava terminology, written for this site.
        </p>
      </section>
    </DetailFrame>
  )
}

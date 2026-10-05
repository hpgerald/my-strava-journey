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
  // current week streak: consecutive ISO weeks with at least one activity, ending now
  const weekStreak = (() => {
    const wk = new Set()
    for (const d of dates) { const dt = new Date(`${d}T00:00:00Z`); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); wk.add(dt.toISOString().slice(0, 10)) }
    if (!wk.size) return 158
    let cur = [...wk].sort().pop(); let n = 0
    while (wk.has(cur)) { n += 1; const p = new Date(`${cur}T00:00:00Z`); p.setUTCDate(p.getUTCDate() - 7); cur = p.toISOString().slice(0, 10) }
    return n
  })()

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'What It Means' }]}
      number="10"
      title="What It Means"
      subtitle="What the numbers say to you."
      lede="Seven years of a record, read back. Four things it shows plainly, and a last one it only hints at. Dotted words carry plain definitions; hover, tap or tab."
      prev={prev}
      next={next}
    >
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">Almost all of it came after 2021</h2>
            <p className="measure">
              In 2019 the log held {acts2019} activities and no particular plan. The count reached
              {' '}{fmtInt(totalActs)} slowly: from July 2021 the habit stopped being optional, and the
              total looked after itself. The longest unbroken run is {fmtInt(streak)} days, inside a
              {' '}{weekStreak}-week streak, and {activePct}% of every calendar day carries something, most of them
              short evening walks logged just to keep the chain going.
            </p>
          </div>
          <Verdict from={acts2019} to={fmtInt(totalActs)} mult={`about ${Math.round(totalActs / (acts2019 || 1))}x more activities`} sub="27 activities in 2019, and the totals looked after themselves once the habit held." />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">A year of silence, then the busiest stretch</h2>
            <p className="measure">
              The biggest gap in the record is 353 days, nearly a full year, from July 2020 to June
              2021, with nothing logged at all. The stretch that followed became the most active of the
              whole seven years. Here, at least, a long layoff and a lasting comeback sat right next to
              each other.
            </p>
          </div>
          <Verdict value="353" unit="days away" sub="the longest gap on record, immediately before the most consistent stretch of all." />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">The climb was walked, not run</h2>
            <p className="measure">
              Running is {runDistPct}% of the distance on foot but only {runClimbPct}% of the climb; it
              stays flat and mostly on a treadmill. The {fmtInt(elevation)} metres of{' '}
              <Term name="Elevation gain">vertical</Term>, {fmtNum(everests)} Everests, came from walking
              uphill and from the trails, where a single trail run averages around 350 metres of gain and
              a hike over 700. The metres were earned slowly, on foot.
            </p>
          </div>
          <ClimbShare items={climbShareData} />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">The total was ordinary days</h2>
            <p className="measure">
              The typical foot outing is just {fmtNum(medKm, 1)} km, and on {doublePct}% of active days
              there were two or more short ones rather than one long. Speed is hard to read on a
              treadmill; {' '}<Term name="Relative Effort">cost</Term> is steadier. A kilometre on foot
              cost about {fmtNum(epkFirst?.value, 1)} points in 2019 and {fmtNum(epkLow?.value, 1)} by
              {' '}{epkLow?.year}, the same ground for a smaller toll. That slow decline, more than any
              fast run, is what getting fitter looked like.
            </p>
          </div>
          <EffortPerKm data={effortPerKm} />
        </article>

        <div className="means-close">
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>In the end</p>
          <p className="measure" style={{ fontSize: 'var(--fs-md)', margin: 0 }}>
            Seven years in, the part I notice most is the smallest one. On an ordinary flat morning in
            Dodoma, with nothing to train for, the walk still happens. The record only keeps count of it.
          </p>
        </div>
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

import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import StatCard from '../components/StatCard.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Figure from '../charts/Figure.jsx'
import AreaLine from '../charts/AreaLine.jsx'
import Columns from '../charts/Columns.jsx'
import ProportionBar from '../charts/ProportionBar.jsx'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

function yearsBetween(a, b) {
  if (!a || !b) return null
  const start = new Date(a)
  const end = new Date(b)
  if (isNaN(start) || isNaN(end)) return null
  return Math.round((end - start) / (365.25 * 24 * 3600 * 1000))
}

export default function Home() {
  const lifetime = useTable('lifetime_totals')
  const meta = useKeyed('meta', 'key', 'value')
  const countries = useTable('countries')
  const fun = useTable('fun_journey')
  const activityLog = useTable('activities')
  const yearly = useTable('yearly_totals')
  const sports = useTable('sport_breakdown')

  const life = (needle) =>
    lifetime.find((r) => (r.metric || '').toLowerCase().includes(needle)) || {}

  const activities = life('activities').value
  const km = life('total km').value
  const elevation = life('elevation').value
  const streak = life('longest streak').value

  const years = yearsBetween(meta.coverage_start, meta.coverage_end)
  const countryCount = countries.filter(
    (c) => c.country && c.country !== 'Indoor / no GPS'
  ).length
  const everests =
    (fun.find((f) => (f.comparison || '').includes('Everest')) || {}).value

  // Cumulative activities over time (the journey building up).
  const cumulative = (() => {
    const dated = activityLog
      .map((a) => ({ t: Date.parse((a.date || '').replace(' ', 'T')) }))
      .filter((d) => Number.isFinite(d.t))
      .sort((a, b) => a.t - b.t)
    return dated.map((d, i) => ({ x: d.t, y: i + 1, label: new Date(d.t).toISOString().slice(0, 10) }))
  })()

  // activities per year, for the at-a-glance columns
  const yearActs = [...yearly]
    .sort((a, b) => Number(a.year) - Number(b.year))
    .map((r) => ({ label: r.year, value: toNum(r.activities) || 0 }))

  // sport mix by distance: top 5 + Other
  const sportSorted = [...sports]
    .filter((s) => toNum(s.distance_km) > 0)
    .sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km))
  const sportMix = sportSorted.slice(0, 5).map((s) => ({
    label: prettySport(s.sport),
    value: toNum(s.distance_km),
    display: fmtNum(s.distance_km, 0),
  }))
  const sportRest = sportSorted.slice(5)
  if (sportRest.length) {
    sportMix.push({
      label: `Other (${sportRest.length})`,
      value: sportRest.reduce((a, s) => a + toNum(s.distance_km), 0),
      display: fmtNum(sportRest.reduce((a, s) => a + toNum(s.distance_km), 0), 0),
    })
  }

  return (
    <Layout>
      <Container>
        {/* ---- Type-led hero -------------------------------------------- */}
        <section style={{ paddingBlock: 'clamp(2.5rem, 8vw, 6rem) var(--sp-6)' }}>
          <p className="eyebrow">
            {years ? `${years} years` : 'Seven years'} · {meta.coverage_start?.slice(0, 4) || '2019'}
            &ndash;{meta.coverage_end?.slice(0, 4) || '2026'} · Strava
          </p>
          <h1
            className="display"
            style={{ fontSize: 'var(--fs-4xl)', margin: 'var(--sp-4) 0 var(--sp-5)', maxWidth: '18ch' }}
          >
            {years || 7} years. {fmtInt(activities)} activities. One habit.
          </h1>
          <p className="measure" style={{ fontSize: 'var(--fs-md)' }}>
            Seven years of my Strava history, in one place. It began with a single lunch ride in
            2019 and turned into a near-daily habit: running, walking, hiking and riding, mostly
            around Tanzania and, over time, in {countryCount || 'seven'} countries. Every number
            comes straight from the data, and each one traces back to where it came from.
          </p>
        </section>

        {/* ---- Headline figures ----------------------------------------- */}
        <section aria-label="Headline figures" style={{ paddingBottom: 'var(--sp-7)' }}>
          <div className="grid grid--3">
            <StatCard
              value={fmtInt(km)}
              unit="km"
              label="Distance moved"
              note="Roughly a third of the way around the planet."
              source="Overview"
            />
            <StatCard
              value={fmtInt(elevation)}
              unit="m"
              label="Vertical climbed"
              note={everests ? `About ${fmtNum(everests)} times the height of Everest.` : undefined}
              source="Overview"
            />
            <StatCard
              value={fmtInt(streak)}
              unit="days"
              label="Longest active streak"
              note="Consecutive active days, and still counting."
              source="Fun Stats"
            />
          </div>
        </section>
      </Container>

      {/* ---- At a glance: two quick reads ------------------------------- */}
      <Container>
        <hr className="rule" />
        <div className="section-head">
          <p className="eyebrow">At a glance</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-xl)' }}>
            The shape of it.
          </h2>
        </div>
        <div className="grid grid--2" style={{ paddingBottom: 'var(--sp-6)' }}>
          <Figure
            title="Activities per year"
            note="From a 27-activity debut half-year in 2019 to a full, steady rhythm."
            source="Yearly Trends"
            columns={['Year', 'Activities']}
            rows={yearActs.map((y) => [y.label, fmtInt(y.value)])}
          >
            <Columns data={yearActs} unit="activities" formatY={(v) => fmtInt(v)} />
          </Figure>
          <Figure
            title="What the training is made of"
            note="Share of all distance by sport. Walking and running carry most of it."
            source="Overview"
            columns={['Sport', 'km']}
            rows={sportMix.map((s) => [s.label, s.display])}
          >
            <ProportionBar segments={sportMix} unit="km" />
          </Figure>
        </div>
      </Container>

      {/* ---- Signature chart: the habit, accumulating ------------------- */}
      <Container>
        <hr className="rule" />
        <div style={{ paddingBlock: 'var(--sp-6)' }}>
          <Figure
            title="Every activity, 2019 to now"
            note="Every activity I've logged, adding up over time. The steeper the line, the busier I was."
            source="Activity Log"
            tableCaption="Cumulative activities by year-end"
            columns={['Year', 'Total activities']}
            rows={Object.entries(
              cumulative.reduce((acc, p) => {
                acc[p.label.slice(0, 4)] = p.y
                return acc
              }, {})
            ).map(([y, v]) => [y, fmtInt(v)])}
          >
            <AreaLine
              points={cumulative}
              height={300}
              yUnit="activities"
              formatX={(p) => p.label}
              formatY={(v) => fmtInt(v)}
            />
          </Figure>
        </div>
      </Container>

      {/* ---- Primary navigation: numbered index ------------------------- */}
      <Container>
        <div className="section-head">
          <p className="eyebrow">Explore</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
            Nine ways in.
          </h2>
        </div>
        <IndexHub />
      </Container>
    </Layout>
  )
}

import DetailFrame from '../components/DetailFrame.jsx'
import Term from '../components/Term.jsx'
import MiniTrend from '../charts/MiniTrend.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

export default function WhatItMeans() {
  const lifetime = useTable('lifetime_totals')
  const fun = useTable('fun_journey')
  const reYear = useTable('relative_effort_by_year')
  const yearly = useTable('yearly_totals')
  const countries = useTable('countries')
  const regions = useTable('tanzania_regions')
  const glossary = useTable('glossary')
  const { prev, next } = useSectionPaging('/what-it-means')

  const yrs = [...yearly].sort((a, b) => Number(a.year) - Number(b.year))
  const years = yrs.map((r) => r.year)
  const startY = years[0]
  const endY = years[years.length - 1]

  const actsByYear = yrs.map((r) => toNum(r.activities) || 0)
  const elevByYear = yrs.map((r) => toNum(r.elevation_m) || 0)
  // cadence: skip years with no cadence data (stored as 0) so the line doesn't dip to the floor
  const cadByYear = [...reYear]
    .sort((a, b) => Number(a.year) - Number(b.year))
    .map((r) => toNum(r.avg_cadence) || 0)
    .filter((v) => v > 0)
  const cumActs = actsByYear.reduce((acc, v) => { acc.push((acc[acc.length - 1] || 0) + v); return acc }, [])

  const life = (n) => (lifetime.find((r) => (r.metric || '').toLowerCase().includes(n)) || {}).value
  const funv = (n) => (fun.find((f) => (f.comparison || '').includes(n)) || {}).value
  const re = (y) => reYear.find((r) => r.year === y) || {}

  const activities = life('activities')
  const streak = life('longest streak')
  const elevation = life('elevation')
  const everests = funv('Everest')
  const kilis = funv('Kilimanjaro')
  const realCountries = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS').length
  const regionCount = regions.filter((r) => r.region).length

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'What It Means' }]}
      number="09"
      title="What It Means"
      subtitle="Reading these numbers as an athlete"
      lede="Numbers only matter if they mean something to you. So here is what this record might say, depending on where you are in your own training. The dotted words have plain definitions: hover, tap or tab to see them."
      prev={prev}
      next={next}
    >
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you're just starting out</h2>
            <p className="measure">
              The first five months of this history, back in 2019, held just 27 activities. Seven
              years on it is {fmtInt(activities)}. Nothing here happened in a single heroic block;
              it accumulated. The pattern the data keeps repeating is that consistency matters more
              than intensity, and a modest start still adds up to a lot.
            </p>
          </div>
          <MiniTrend values={cumActs} startLabel={startY} endLabel={endY} caption="Activities, running total" />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you're chasing consistency</h2>
            <p className="measure">
              The longest unbroken run of active days here is {fmtInt(streak)} days, and it is still
              going. A streak like that is built on the ordinary days, the ones it would be easy to
              skip. Even a short walk keeps the chain alive, which is exactly why{' '}
              <Term name="Moving time">moving time</Term> and activity counts matter more than any
              single personal best.
            </p>
          </div>
          <MiniTrend values={actsByYear} startLabel={startY} endLabel={endY} caption="Activities per year" />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you're a runner working on pace</h2>
            <p className="measure">
              Two numbers capture the change in fitness. Average{' '}
              <Term name="Cadence">cadence</Term> rose from {fmtNum(re('2019').avg_cadence)} to{' '}
              {fmtNum(re('2026').avg_cadence)} steps per minute, a more efficient turnover. Meanwhile
              average <Term name="Relative Effort">relative effort</Term> per session fell from{' '}
              {fmtInt(re('2019').avg_relative_effort)} to {fmtInt(re('2026').avg_relative_effort)}:
              the same work simply costs the body less now. If you are targeting speed, your{' '}
              <Term name="Pace zones">pace zones</Term> are where to spend attention.
            </p>
          </div>
          <MiniTrend values={cadByYear} startLabel={startY} endLabel={endY} caption="Average cadence (spm)" fmt={(v) => v.toFixed(0)} />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you live for vertical</h2>
            <p className="measure">
              Total <Term name="Elevation gain">elevation gain</Term> across the history is{' '}
              {fmtInt(elevation)} metres, roughly {fmtNum(everests)} times the height of Everest or{' '}
              {fmtNum(kilis)} times Kilimanjaro. Trail running was absent in 2019 and is now a
              regular part of the mix. If climbing is your thing, the pattern here is clear: the
              vertical adds up as the miles do.
            </p>
          </div>
          <MiniTrend values={elevByYear} startLabel={startY} endLabel={endY} caption="Elevation per year (m)" />
        </article>

        <article className="persona persona--split">
          <div>
            <h2 className="persona__who">If you train through travel</h2>
            <p className="measure">
              Activities in this record start in {realCountries} different countries, placed by each
              one's GPS point. A trip does not have to mean a training gap. The data suggests the
              opposite: some of the standout days, from gravel rides abroad to morning walks in a new
              city, happened precisely because the habit travelled too.
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
            <p className="source" style={{ marginTop: 'var(--sp-2)' }}>Source: Activity Log · GPS</p>
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

import { useParams } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import DataTable from '../components/DataTable.jsx'
import Figure from '../charts/Figure.jsx'
import Columns from '../charts/Columns.jsx'
import NotFound from './NotFound.jsx'
import { useTable } from '../context/DataContext.jsx'
import { slugify, prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

export default function PlaceDetail() {
  const { placeId } = useParams()
  const countries = useTable('countries')
  const regions = useTable('tanzania_regions')
  const geo = useTable('activity_geo')
  const activities = useTable('activities')

  if (!countries.length && !regions.length) {
    return <DetailFrame title="Loading…" crumbs={[{ label: 'Home', to: '/' }]} />
  }

  const realCountries = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS')
  const cIdx = realCountries.findIndex((c) => slugify(c.country) === placeId)
  const rIdx = regions.findIndex((r) => slugify(r.region) === placeId)

  if (cIdx === -1 && rIdx === -1) {
    return <NotFound message={`No place called "${placeId}" appears in this history.`} />
  }

  const isCountry = cIdx !== -1
  const row = isCountry ? realCountries[cIdx] : regions[rIdx]
  const name = isCountry ? row.country : row.region
  const siblings = isCountry ? realCountries : regions
  const idx = isCountry ? cIdx : rIdx
  const keyName = isCountry ? 'country' : 'region'

  const prev =
    idx > 0
      ? { to: `/where/${slugify(siblings[idx - 1][keyName])}`, label: siblings[idx - 1][keyName] }
      : { to: '/where', label: 'All places' }
  const next =
    idx < siblings.length - 1
      ? { to: `/where/${slugify(siblings[idx + 1][keyName])}`, label: siblings[idx + 1][keyName] }
      : null

  // notable activities in this place, from the geo join
  const actById = new Map(activities.map((a) => [a.activity_key, a]))
  const here = geo
    .filter((g) => g.has_gps === '1' && (isCountry ? g.country === name : g.region === name && g.country === 'Tanzania'))
    .map((g) => ({ ...g, act: actById.get(g.activity_key) || {} }))
  const notable = [...here].sort((a, b) => toNum(b.act.distance_km) - toNum(a.act.distance_km)).slice(0, 6)

  // activities per year in this place
  const byYear = {}
  for (const g of here) {
    const y = (g.date || '').slice(0, 4)
    if (y) byYear[y] = (byYear[y] || 0) + 1
  }
  const yearCols = Object.keys(byYear).sort().map((y) => ({ label: y, value: byYear[y] }))

  return (
    <DetailFrame
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Where', to: '/where' },
        { label: name },
      ]}
      title={name}
      subtitle={isCountry ? 'Country' : 'Tanzanian region'}
      prev={prev}
      next={next}
    >
      <section aria-label="Totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--4">
          <StatCard value={fmtInt(row.activities)} label="Activities" source="Strava GPS" />
          <StatCard value={fmtNum(row.distance_km, 0)} unit="km" label="Distance" source="Strava GPS" />
          <StatCard value={fmtNum(row.moving_time_h, 0)} unit="h" label="Moving time" source="Strava GPS" />
          <StatCard value={fmtInt(row.elevation_m)} unit="m" label="Elevation" source="Strava GPS" />
        </div>
        <p className="text-muted" style={{ marginTop: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
          {isCountry ? 'First logged here' : 'Active here'}: {(row.first_activity_date || '').slice(0, 10)}
          {row.last_activity_date ? ` to ${(row.last_activity_date || '').slice(0, 10)}` : ''}
          {row.top_sport ? ` · most common sport: ${prettySport(row.top_sport)}` : ''}.
        </p>
      </section>

      {yearCols.length > 1 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure title={`Activities per year in ${name}`} source="Strava GPS">
            <Columns data={yearCols} unit="activities" formatY={(v) => fmtInt(v)} height={200} />
          </Figure>
        </section>
      )}

      {notable.length > 0 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
            Notable activities here
          </p>
          <DataTable
            caption={`Longest activities in ${name}`}
            columns={[
              { key: 'date', label: 'Date', mono: true, render: (r) => (r.date || '').slice(0, 10) },
              { key: 'sport', label: 'Sport', render: (r) => prettySport(r.sport) },
              { key: 'km', label: 'km', align: 'right', mono: true, render: (r) => fmtNum(r.act.distance_km) },
            ]}
            rows={notable}
          />
          <p className="source" style={{ marginTop: 'var(--sp-3)' }}>
            Source: Strava GPS + Activity Log
          </p>
        </section>
      )}
    </DetailFrame>
  )
}

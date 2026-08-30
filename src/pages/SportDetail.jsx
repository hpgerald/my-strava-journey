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

export default function SportDetail() {
  const { sportId } = useParams()
  const sports = useTable('sport_breakdown')
  const activities = useTable('activities')

  if (!sports.length) return <DetailFrame title="Loading…" crumbs={[{ label: 'Home', to: '/' }]} />

  const idx = sports.findIndex((s) => slugify(s.sport) === sportId)
  if (idx === -1) {
    return <NotFound message={`No sport called "${sportId}" appears in this history.`} />
  }
  const s = sports[idx]
  const name = prettySport(s.sport)

  // sibling paging, in sport_breakdown order (by activity count)
  const prev = idx > 0 ? { to: `/sports/${slugify(sports[idx - 1].sport)}`, label: prettySport(sports[idx - 1].sport) } : { to: '/sports', label: 'All sports' }
  const next =
    idx < sports.length - 1
      ? { to: `/sports/${slugify(sports[idx + 1].sport)}`, label: prettySport(sports[idx + 1].sport) }
      : null

  // per-sport rows from the master log
  const rows = activities.filter((a) => a.sport_type === s.sport)

  // yearly distance (or count, if this sport records no distance)
  const hasDistance = toNum(s.distance_km) > 0
  const byYear = {}
  for (const r of rows) {
    const y = r.year || (r.date || '').slice(0, 4)
    if (!y) continue
    byYear[y] = byYear[y] || { dist: 0, count: 0 }
    byYear[y].dist += toNum(r.distance_km) || 0
    byYear[y].count += 1
  }
  const yearItems = Object.keys(byYear)
    .sort()
    .map((y) => ({
      label: y,
      value: hasDistance ? byYear[y].dist : byYear[y].count,
      display: hasDistance ? fmtNum(byYear[y].dist, 0) : fmtInt(byYear[y].count),
      unit: hasDistance ? 'km' : 'activities',
    }))

  // standout activities
  const sortKey = hasDistance ? 'distance_km' : 'moving_time_min'
  const notable = [...rows]
    .sort((a, b) => toNum(b[sortKey]) - toNum(a[sortKey]))
    .slice(0, 6)

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Sports', to: '/sports' }, { label: name }]}
      title={name}
      subtitle={`${fmtInt(s.activities)} activities logged`}
      prev={prev}
      next={next}
    >
      <section aria-label="Totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--4">
          <StatCard value={fmtInt(s.activities)} label="Activities" source="Overview" />
          {hasDistance && <StatCard value={fmtNum(s.distance_km, 0)} unit="km" label="Distance" source="Overview" />}
          <StatCard value={fmtNum(s.moving_time_h, 0)} unit="h" label="Moving time" source="Overview" />
          {toNum(s.elevation_m) > 0 && (
            <StatCard value={fmtInt(s.elevation_m)} unit="m" label="Elevation" source="Overview" />
          )}
        </div>
      </section>

      {yearItems.length > 0 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            title={hasDistance ? 'Distance by year' : 'Activities by year'}
            source="Activity Log"
          >
            <Columns
              data={yearItems.map((y) => ({ label: y.label, value: y.value }))}
              unit={hasDistance ? 'km' : 'activities'}
              formatY={(v) => (hasDistance ? fmtNum(v, 0) : fmtInt(v))}
            />
          </Figure>
        </section>
      )}

      {notable.length > 0 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
            Standout {name.toLowerCase()} activities
          </p>
          <DataTable
            caption={`Longest ${name} activities`}
            columns={[
              { key: 'date', label: 'Date', mono: true, render: (r) => (r.date || '').slice(0, 10) },
              ...(hasDistance ? [{ key: 'distance_km', label: 'km', align: 'right', mono: true, render: (r) => fmtNum(r.distance_km) }] : []),
              { key: 'elevation_gain_m', label: 'Elev m', align: 'right', mono: true, render: (r) => fmtInt(r.elevation_gain_m) },
              { key: 'kudos', label: 'Kudos', align: 'right', mono: true, render: (r) => fmtInt(r.kudos) },
            ]}
            rows={notable}
          />
          <p className="source" style={{ marginTop: 'var(--sp-3)' }}>
            Source: Activity Log
          </p>
        </section>
      )}
    </DetailFrame>
  )
}

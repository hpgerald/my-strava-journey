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

const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const PLURAL = { Run: 'runs', Walk: 'walks', TrailRun: 'trail runs', Hike: 'hikes' }

export default function SportDetail() {
  const { sportId } = useParams()
  const sports = useTable('sport_breakdown')
  const activities = useTable('activities')

  if (!sports.length) return <DetailFrame title="Loading…" crumbs={[{ label: 'Home', to: '/' }]} />

  const idx = sports.findIndex((s) => slugify(s.sport) === sportId)
  if (idx === -1 || !FOOT.has(sports[idx].sport)) {
    return <NotFound message={`No sport called "${sportId}" appears in this history.`} />
  }
  const s = sports[idx]
  const name = prettySport(s.sport)

  // sibling paging through the four sports on foot, busiest first, the same
  // set the Sports chapter opens; the ends lead back to that chapter
  const foot = sports.filter((x) => FOOT.has(x.sport))
  const fi = foot.findIndex((x) => x.sport === s.sport)
  const link = (x) => ({ to: `/sports/${slugify(x.sport)}`, label: prettySport(x.sport) })
  const prev = fi > 0 ? link(foot[fi - 1]) : { to: '/sports', label: 'All sports' }
  const next = fi >= 0 && fi < foot.length - 1 ? link(foot[fi + 1]) : { to: '/sports', label: 'All sports' }

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
      subtitle={`${fmtInt(s.activities)} ${PLURAL[s.sport] || 'outings'} so far`}
      prev={prev}
      next={next}
    >
      <section aria-label="Totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--4">
          <StatCard value={fmtInt(s.activities)} label="Outings" />
          {hasDistance && <StatCard value={fmtNum(s.distance_km, 0)} unit="km" label="Distance" />}
          <StatCard value={fmtNum(s.moving_time_h, 0)} unit="h" label="Moving time" />
          {toNum(s.elevation_m) > 0 && (
            <StatCard value={fmtInt(s.elevation_m)} unit="m" label="Climbed" />
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
            My longest {PLURAL[s.sport] || 'outings'}
          </p>
          <DataTable
            caption={`My longest ${PLURAL[s.sport] || 'outings'}`}
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

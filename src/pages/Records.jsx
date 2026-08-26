import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import DataTable from '../components/DataTable.jsx'
import Figure from '../charts/Figure.jsx'
import Columns from '../charts/Columns.jsx'
import Scatter from '../charts/Scatter.jsx'
import BarChart from '../charts/BarChart.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

// Foot-based sport types: the running/walking/hiking that this record is really
// about. Rides, sails and indoor workouts are set aside where they'd skew a view.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const day = (d) => (d || '').slice(0, 10)

export default function Records() {
  const prActs = useTable('pr_activities')
  const activities = useTable('activities')
  const lifetime = useTable('lifetime_totals')
  const { prev, next } = useSectionPaging('/records')

  const foot = activities.filter((a) => FOOT.has(a.sport_type))

  // scatter: foot-based activities only (rides removed so distances are comparable)
  const withGeom = foot.filter((a) => toNum(a.distance_km) > 0 || toNum(a.elevation_gain_m) > 0)
  const topDist = new Set([...withGeom].sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km)).slice(0, 12).map((a) => a.id))
  const topElev = new Set([...withGeom].sort((a, b) => toNum(b.elevation_gain_m) - toNum(a.elevation_gain_m)).slice(0, 12).map((a) => a.id))
  const scatter = withGeom.map((a) => ({
    x: toNum(a.distance_km) || 0,
    y: toNum(a.elevation_gain_m) || 0,
    hi: topDist.has(a.id) || topElev.has(a.id),
    label: a.name,
  }))

  // longest, split by foot sport
  const longestOf = (type, n = 10) =>
    activities
      .filter((a) => a.sport_type === type && toNum(a.distance_km) > 0)
      .sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km))
      .slice(0, n)
      .map((a, i) => ({ rank: i + 1, name: a.name, distance_km: a.distance_km, date: day(a.date) }))
  const longestRuns = longestOf('Run')
  const longestWalks = longestOf('Walk')

  // highest climbs, foot-based only
  const highestFoot = foot
    .filter((a) => toNum(a.elevation_gain_m) > 0)
    .sort((a, b) => toNum(b.elevation_gain_m) - toNum(a.elevation_gain_m))
    .slice(0, 10)
    .map((a, i) => ({ rank: i + 1, name: a.name, sport: a.sport_type, elevation_m: a.elevation_gain_m, date: day(a.date) }))

  // most kudos, split by foot sport (top 5 each)
  const kudosOf = (type, n = 5) =>
    activities
      .filter((a) => a.sport_type === type && toNum(a.kudos) > 0)
      .sort((a, b) => toNum(b.kudos) - toNum(a.kudos))
      .slice(0, n)
      .map((a) => ({
        label: a.name,
        value: toNum(a.kudos),
        display: fmtInt(a.kudos),
        unit: 'kudos',
        sub: `· ${day(a.date)}`,
      }))
  const kudosRuns = kudosOf('Run')
  const kudosWalks = kudosOf('Walk')

  // personal records set per year
  const prByYear = {}
  for (const r of prActs) {
    const y = (r.date || '').slice(0, 4)
    if (!y) continue
    prByYear[y] = (prByYear[y] || 0) + (toNum(r.pr_count) || 0)
  }
  const prCols = Object.keys(prByYear).sort().map((y) => ({ label: y, value: prByYear[y] }))

  const life = (n) => (lifetime.find((r) => (r.metric || '').toLowerCase().includes(n)) || {}).value

  const longestCols = [
    { key: 'rank', label: '#', mono: true },
    { key: 'name', label: 'Activity', wrap: true },
    { key: 'distance_km', label: 'km', align: 'right', mono: true, render: (r) => fmtNum(r.distance_km) },
    { key: 'date', label: 'Date', mono: true },
  ]

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Records' }]}
      number="04"
      title="Records"
      subtitle="Longest, highest, most-loved"
      lede="The far ends of the data: the longest days out on foot, the steepest climbs, and the activities that pulled in the most kudos."
      prev={prev}
      next={next}
    >
      <section aria-label="Record totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--3">
          <StatCard value={fmtInt(life('personal records'))} label="Personal records set" source="Overview" />
          <StatCard value={fmtInt(life('achievements'))} label="Segment achievements" source="Overview" />
          <StatCard value={fmtInt(life('kudos'))} label="Kudos received" source="Overview" />
        </div>
      </section>

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Every foot activity: distance against climb"
          note="Each dot is one run, walk, trail run or hike, plotted by how far and how high it went. Rides are left out so the distances stay comparable. The orange dots are the record-setters at the far edges."
          source="Activity Log"
        >
          <Scatter
            points={scatter}
            xTitle="distance (km)"
            yTitle="elevation (m)"
            xUnit="km"
            yUnit="m"
            formatX={(v) => fmtInt(v)}
            formatY={(v) => fmtInt(v)}
          />
        </Figure>
      </section>

      {prCols.length > 1 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            title="Personal records set per year"
            note="When the personal bests landed, counting every activity that set at least one."
            source="Personal Records"
          >
            <Columns data={prCols} unit="PRs" formatY={(v) => fmtInt(v)} />
          </Figure>
        </section>
      )}

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>Longest runs</p>
            <DataTable caption="Longest runs by distance" columns={longestCols} rows={longestRuns} />
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>Longest walks</p>
            <DataTable caption="Longest walks by distance" columns={longestCols} rows={longestWalks} />
          </div>
        </div>
        <p className="source" style={{ marginTop: 'var(--sp-3)' }}>Source: Activity Log</p>
      </section>

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
          Ten highest climbs, on foot
        </p>
        <DataTable
          caption="Highest foot activities by elevation gain"
          columns={[
            { key: 'rank', label: '#', mono: true },
            { key: 'name', label: 'Activity', wrap: true },
            { key: 'sport', label: 'Sport', render: (r) => prettySport(r.sport) },
            { key: 'elevation_m', label: 'Elev m', align: 'right', mono: true, render: (r) => fmtInt(r.elevation_m) },
            { key: 'date', label: 'Date', mono: true },
          ]}
          rows={highestFoot}
        />
        <p className="source" style={{ marginTop: 'var(--sp-3)' }}>Source: Activity Log. Rides excluded.</p>
      </section>

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Most kudos: runs"
            note="The five runs that drew the biggest cheers."
            source="Activity Log"
            columns={['Run', 'Kudos']}
            rows={kudosRuns.map((k) => [k.label, k.display])}
          >
            <BarChart data={kudosRuns} accent showRank />
          </Figure>
          <Figure
            title="Most kudos: walks"
            note="The five walks that drew the biggest cheers."
            source="Activity Log"
            columns={['Walk', 'Kudos']}
            rows={kudosWalks.map((k) => [k.label, k.display])}
          >
            <BarChart data={kudosWalks} accent showRank />
          </Figure>
        </div>
      </section>
    </DetailFrame>
  )
}

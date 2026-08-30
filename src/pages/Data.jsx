import DetailFrame from '../components/DetailFrame.jsx'
import { useData, useTables } from '../context/DataContext.jsx'
import { CSV_FILES } from '../data/registry.js'

const GROUPS = [
  {
    title: 'Activity data',
    items: [
      ['activities', 'Every activity, one row each (the master log).'],
      ['activity_geo', 'Per-activity GPS start point, country and region.'],
    ],
  },
  {
    title: 'Totals & trends',
    items: [
      ['lifetime_totals', 'The ten headline lifetime figures.'],
      ['sport_breakdown', 'Totals per sport type.'],
      ['yearly_totals', 'All-sport totals by year.'],
      ['yearly_by_sport', 'Distance by year and sport.'],
      ['monthly_totals', 'All-sport totals by month.'],
    ],
  },
  {
    title: 'Records',
    items: [
      ['pr_longest', 'Ten longest activities.'],
      ['pr_elevation', 'Ten highest climbs.'],
      ['pr_activities', 'Every activity that set a personal record.'],
      ['kudos_leaderboard', 'Most-kudoed activities.'],
      ['most_repeated_titles', 'Most-used activity titles.'],
    ],
  },
  {
    title: 'Effort & zones',
    items: [
      ['hr_zones', 'Heart-rate zone boundaries.'],
      ['power_zones', 'Cycling power zone boundaries.'],
      ['pace_zones', 'Running pace zone boundaries.'],
      ['relative_effort_by_year', 'Relative effort and cadence per year.'],
    ],
  },
  {
    title: 'Geography',
    items: [
      ['countries', 'Activities, distance and more by country.'],
      ['tanzania_regions', 'The same, by Tanzanian region.'],
    ],
  },
  {
    title: 'Patterns, gear & fun',
    items: [
      ['weekday_patterns', 'Activity by day of week.'],
      ['time_of_day_patterns', 'Activity by time of day.'],
      ['indoor_outdoor', 'Indoor/trainer versus outdoor.'],
      ['streaks', 'Longest and current active streaks.'],
      ['gear', 'Shoes and bikes.'],
      ['fun_journey', 'Distance as marathons, Everests and more.'],
    ],
  },
  {
    title: 'Derived & site content',
    items: [
      ['comparisons', 'The then-versus-now figures behind the dashboard.'],
      ['timeline', 'Dated milestones.'],
      ['glossary', 'Term definitions.'],
      ['nav_index', 'Site navigation structure.'],
      ['meta', 'Coverage, units and refresh info.'],
    ],
  },
]

export default function Data() {
  const { data } = useData()
  useTables(CSV_FILES)
  const rowCount = (name) => (data && data[name] ? data[name].length : '—')

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Data' }]}
      title="The data"
      subtitle="What powers the site"
      lede="The whole site runs off the tables below. Here is what each one holds and how it was put together. This is my own activity data, so it is shown for reference rather than offered as a download."
    >
      {GROUPS.map((g) => (
        <section key={g.title} style={{ paddingTop: 'var(--sp-6)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>
            {g.title}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {g.items.map(([name, desc]) => (
              <li
                key={name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(10rem, 14rem) 1fr auto',
                  gap: 'var(--sp-4)',
                  alignItems: 'baseline',
                  padding: 'var(--sp-3) 0',
                  borderTop: '1px solid var(--rule-faint)',
                }}
              >
                <span className="mono" style={{ fontWeight: 600 }}>
                  {name}.csv
                </span>
                <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {desc}
                </span>
                <span className="source" style={{ whiteSpace: 'nowrap' }}>
                  {rowCount(name)} rows
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>
          Method, in brief
        </p>
        <div className="measure stack">
          <p>
            The figures come from Strava, pulled through the Strava API. Per-sheet totals are read
            straight from a companion workbook; the geographic files are built by decoding each
            activity's GPS start point and placing it with offline boundary and place data.
          </p>
          <p>
            Numbers are never invented. Where a value was unavailable it is left blank and logged.
            The geographic totals cover the 1,116 activities that carry GPS; indoor and trainer
            sessions have none. The country and region maps are approximate cartography, and the
            full method notes ship with the project.
          </p>
        </div>
      </section>
    </DetailFrame>
  )
}

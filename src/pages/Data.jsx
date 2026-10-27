import DetailFrame from '../components/DetailFrame.jsx'
import { useData, useTables } from '../context/DataContext.jsx'
import { CSV_FILES } from '../data/registry.js'

const GROUPS = [
  {
    title: 'Activity data',
    items: [
      ['activities', 'Every activity, one row each. Everything else is built from this.'],
      ['activity_geo', 'The country and region each activity started in.'],
    ],
  },
  {
    title: 'Totals & trends',
    items: [
      ['lifetime_totals', 'The main totals since the first upload.'],
      ['sport_breakdown', 'Totals for each sport on foot, and for other activities.'],
      ['yearly_totals', 'Totals by year.'],
      ['yearly_by_sport', 'Distance by year and sport.'],
      ['monthly_totals', 'Totals by month.'],
    ],
  },
  {
    title: 'Records',
    items: [
      ['pr_longest', 'My ten longest outings on foot.'],
      ['pr_elevation', 'My ten biggest climbs on foot.'],
      ['pr_activities', 'Every activity that set a personal record.'],
      ['kudos_leaderboard', 'The activities with the most kudos.'],
      ['most_repeated_titles', 'How often my most-used titles came up, without the titles.'],
    ],
  },
  {
    title: 'Effort & zones',
    items: [
      ['hr_zones', 'Heart-rate zone boundaries.'],
      ['pace_zones', 'Running pace zone boundaries.'],
      ['relative_effort_by_year', 'Relative effort and cadence by year.'],
    ],
  },
  {
    title: 'Geography',
    items: [
      ['countries', 'Outings, distance and climb by country.'],
      ['tanzania_regions', 'The same for each region of Tanzania.'],
    ],
  },
  {
    title: 'Patterns, gear & fun',
    items: [
      ['weekday_patterns', 'Outings by day of the week.'],
      ['time_of_day_patterns', 'Outings by time of day.'],
      ['indoor_outdoor', 'Indoors against outside.'],
      ['streaks', 'My longest and current streaks.'],
      ['gear', 'My shoes and how far each pair went.'],
      ['fun_journey', 'My distance and climb as marathons, Everests and so on.'],
    ],
  },
  {
    title: 'Derived & site content',
    items: [
      ['comparisons', 'Then-and-now figures.'],
      ['timeline', 'Milestones with their dates.'],
      ['glossary', 'What the terms mean.'],
      ['nav_index', 'The chapters and their order.'],
      ['meta', 'Dates covered, units and when it was last refreshed.'],
    ],
  },
]

export default function Data() {
  const { data } = useData()
  useTables(CSV_FILES)
  const rowCount = (name) => (data && data[name] ? data[name].length : '–')
  // activities that carry GPS = all located countries (everything but the indoor bucket)
  const gpsCount = (data && data.countries
    ? data.countries.filter((c) => c.country && !/Indoor/.test(c.country)).reduce((s, c) => s + (Number(c.activities) || 0), 0)
    : 0) || 1116

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Data' }]}
      title="The data"
      subtitle="The tables behind the site"
      lede="Everything on this site comes from the tables below. It is my own activity data, so I list it here and do not offer it as a download."
    >
      {GROUPS.map((g) => (
        <section key={g.title} style={{ paddingTop: 'var(--sp-6)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>
            {g.title}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {g.items.map(([name, desc]) => (
              <li key={name} className="ds-row">
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
            Every week I pull my latest activities from Strava through an MCP server into one raw
            file. Python scripts rebuild every table above from it. The geographic files place each
            activity&rsquo;s GPS start point with offline boundary and place data, and activity names
            and exact locations are removed before anything is published.
          </p>
          <p>
            I did not make up any number. If a value was not available, I left it blank. The country and region totals
            cover the {gpsCount.toLocaleString()} activities with GPS, because indoor sessions do not have any. The maps
            are close but not exact, especially near borders.
          </p>
        </div>
      </section>
    </DetailFrame>
  )
}

import { Navigate } from 'react-router-dom'
import { useData, useTables } from '../context/DataContext.jsx'
import { CSV_FILES } from '../data/registry.js'

const SPORT = { Walk: 'walk', Run: 'run', TrailRun: 'trail run', Hike: 'hike' }
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const word = (n) => WORD[n] || String(n)

const GROUPS = [
  {
    title: 'Activity data',
    items: [
      ['activities', 'Every activity, one row each. Everything else is built from this.'],
      ['activity_geo', 'The country and region each activity started in.'],
      ['data_cleaning', 'The activities left out: saved twice on two devices, or not mine.'],
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
      ['pr_activities', 'Every activity that set a PR.'],
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
      ['weather_days', 'Each day, its place and the rain and heat at the middle of that region.'],
      ['weather_months', 'The rain of each place, month by month.'],
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

export function DataBody() {
  const { data } = useData()
  useTables(CSV_FILES)
  const rowCount = (name) => (data && data[name] ? data[name].length : '–')
  const clean = (data && data.data_cleaning) || []
  const notMine = clean.filter((c) => c.kind === 'Not mine').length
  // activities that carry GPS = all located countries (everything but the indoor bucket)
  const gpsCount = (data && data.countries
    ? data.countries.filter((c) => c.country && !/Indoor/.test(c.country)).reduce((s, c) => s + (Number(c.activities) || 0), 0)
    : 0) || 1116

  return (
    <>
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

      {clean.length ? (
        <section style={{ paddingTop: 'var(--sp-7)' }} aria-labelledby="ds-clean">
          <p className="eyebrow" id="ds-clean" style={{ marginBottom: 'var(--sp-3)' }}>
            Data cleaning
          </p>
          <div className="measure stack">
            <p>
              Strava keeps everything I upload, including a few outings my devices saved twice and {word(notMine)} that{' '}
              {notMine === 1 ? 'was' : 'were'} not mine. They stay in Strava, and I leave all {word(clean.length)} out of every table and chart here. The
              copy I keep is the one with the race name or the full recording.
            </p>
          </div>
          <ul style={{ listStyle: 'none', margin: 'var(--sp-4) 0 0', padding: 0 }}>
            {clean.map((c) => (
              <li key={c.date} className="ds-row">
                <span className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDay(c.date)}</span>
                <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {c.reason}{c.kept ? ` Kept: ${c.kept}.` : ''}
                </span>
                <span className="source" style={{ whiteSpace: 'nowrap' }}>
                  {SPORT[c.sport] || 'another activity'}{Number(c.distance_km) ? `, ${Number(c.distance_km).toFixed(1)} km` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
    </>
  )
}

// the tables now live on the colophon (About); this address lands there
export default function Data() {
  return <Navigate to="/about?s=about-data" replace />
}

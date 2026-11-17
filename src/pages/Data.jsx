import { Navigate } from 'react-router-dom'
import { useData, useTables } from '../context/DataContext.jsx'
import { CSV_FILES } from '../data/registry.js'

const SPORT = { Walk: 'walk', Run: 'run', TrailRun: 'trail run', Hike: 'hike' }
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const word = (n) => WORD[n] || String(n)
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
// the three kinds of data cleaning, each with one line that explains all its rows
const CLEAN_KINDS = [
  { kind: 'Two devices', title: 'Saved on two devices', why: true, lede: 'One outing saved twice, on two devices or twice by the watch. I keep the copy with the race name or the full route.' },
  { kind: 'Same run saved twice', title: 'Treadmill runs saved twice', why: false, lede: 'In 2019 and 2020 some treadmill runs were saved twice: once as totals only, with no recording, and once in full with heart rate, a little later the same day. I keep the full one.' },
  { kind: 'Not mine', title: 'Not mine', why: true, lede: 'Two activities sit in places I could not have been at that time.' },
]

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
        <section key={g.title} className="ds-sec">
          <p className="eyebrow">{g.title}</p>
          <ul className="ds-list">
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
        <section className="ds-sec ds-sec--major" aria-labelledby="ds-clean">
          <p className="eyebrow" id="ds-clean">Data cleaning</p>
          <p className="ds-lede">
            Strava keeps everything I upload, including a few outings saved twice and {word(notMine)}{' '}
            {notMine === 1 ? 'activity that was' : 'that were'} not mine. They stay in Strava, and I leave all {word(clean.length)} out of every table and chart here.
          </p>
          {CLEAN_KINDS.map((k) => {
            const rows = clean.filter((c) => c.kind === k.kind)
            if (!rows.length) return null
            return (
              <div key={k.kind} className="dc">
                <p className="dc__k">{k.title} · {rows.length}</p>
                <p className="dc__lede">{k.lede}</p>
                <div className={`dc__t${k.why ? '' : ' dc__t--3'}`} role="table" aria-label={k.title}>
                  <div className="dc__r dc__r--h" role="row">
                    <span role="columnheader">Date</span>
                    <span role="columnheader">Left out</span>
                    <span role="columnheader">Kept</span>
                    {k.why ? <span role="columnheader">Why</span> : null}
                  </div>
                  {rows.map((c) => (
                    <div key={c.date} className="dc__r" role="row">
                      <span role="cell" className="dc__d">{fmtDay(c.date)}</span>
                      <span role="cell">{cap(SPORT[c.sport] || 'another activity')}{Number(c.distance_km) ? `, ${Number(c.distance_km).toFixed(1)} km` : ''}</span>
                      <span role="cell">{c.kept || 'nothing that day'}</span>
                      {k.why ? <span role="cell" className="dc__w">{c.reason}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      <section className="ds-sec ds-sec--major">
        <p className="eyebrow">Method, in brief</p>
        <p className="ds-lede">
          Every week I pull my latest activities from Strava through an MCP server into one raw
          file. Python scripts rebuild every table above from it. The geographic files place each
          activity&rsquo;s GPS start point with offline boundary and place data, and activity names
          and exact locations are removed before anything is published.
        </p>
        <p className="ds-lede">
          I did not make up any number. If a value was not available, I left it blank. The country and region totals
          cover the {gpsCount.toLocaleString()} activities with GPS, because indoor sessions do not have any. The maps
          are close but not exact, especially near borders.
        </p>
      </section>
    </>
  )
}

// the tables now live on the colophon (About); this address lands there
export default function Data() {
  return <Navigate to="/about?s=about-data" replace />
}

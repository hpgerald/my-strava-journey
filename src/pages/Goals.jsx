import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import GoalRings from '../charts/GoalRings.jsx'
import RasKilomoni from '../charts/RasKilomoni.jsx'
import KiliHalf from '../charts/KiliHalf.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const longDate = (iso) => {
  const d = new Date(iso + 'T00:00:00Z')
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}
const clock = (min) => { const t = Math.round(min); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const paceOf = (min, km) => { const p = min / (km || 1); const m = Math.floor(p); const s = Math.round((p - m) * 60); return `${m}:${String(s).padStart(2, '0')}` }

// The same targets are held up against every year (the choice: one fixed bar,
// so the years can be compared on equal terms). Edit these to change the goals.
const RUN_SET = new Set(['Run', 'TrailRun'])
const FOOT_SET = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const GOALS = [
  { key: 'walk', label: 'Walk', unit: 'km', target: 1000, color: 'var(--grey-55)', note: 'walking only' },
  { key: 'run', label: 'All runs', unit: 'km', target: 1000, color: 'var(--accent)', note: 'treadmill, road and trail' },
  { key: 'elev', label: 'Foot elevation', unit: 'm', target: 24000, color: 'var(--ink)', note: 'walks, runs and hikes' },
]

const fmtVal = (v, unit) => `${fmtInt(v)} ${unit}`

export default function Goals() {
  const activities = useTable('activities')
  const rasKilomoni = useTable('ras_kilomoni')
  const { prev, next } = useSectionPaging('/goals')

  // Ras Kilomoni: a 2026 challenge to reach one headland fifty times, numbered I..L.
  const rk = [...rasKilomoni].sort((a, b) => Number(a.day) - Number(b.day))
  const rkRuns = rk.filter((r) => r.sport === 'Run' || r.sport === 'TrailRun').length
  const rkWalks = rk.length - rkRuns
  const rkKm = rk.reduce((a, r) => a + (toNum(r.distance_km) || 0), 0)
  const rkTarget = 50

  // Kilimanjaro Half Marathon: one edition a year, and faster each time.
  const kiliHalf = useTable('kili_half')
  const kiliProfile = useTable('kili_half_profile')
  const kh = [...kiliHalf].sort((a, b) => a.date.localeCompare(b.date))
  const khFirst = kh[0]
  const khLast = kh[kh.length - 1]
  const khFaster = kh.length ? (toNum(khFirst.moving_min) - toNum(khLast.moving_min)) : 0
  const khStops = (r) => Math.round(toNum(r.elapsed_min) - toNum(r.moving_min))

  // per-year totals for each tracked metric
  const agg = {}
  for (const a of activities) {
    const y = a.year
    if (!y) continue
    const e = (agg[y] = agg[y] || { walk: 0, run: 0, elev: 0 })
    const km = toNum(a.distance_km) || 0
    const el = toNum(a.elevation_gain_m) || 0
    if (a.sport_type === 'Walk') e.walk += km
    if (RUN_SET.has(a.sport_type)) e.run += km
    if (FOOT_SET.has(a.sport_type)) e.elev += el
  }
  // significant years only: a real training year, not the early dabbling
  const years = Object.keys(agg)
    .filter((y) => agg[y].walk + agg[y].run >= 300 || agg[y].elev >= 3000)
    .sort()
  const latest = years[years.length - 1]

  // pace for the year in progress (only if the latest data year is the real one)
  const now = new Date()
  const realYear = String(now.getUTCFullYear())
  const inProgress = latest === realYear
  const yStart = Date.UTC(now.getUTCFullYear(), 0, 1)
  const yEnd = Date.UTC(now.getUTCFullYear() + 1, 0, 1)
  const paceFrac = inProgress ? (Date.now() - yStart) / (yEnd - yStart) : null

  const metricsFor = (y) => GOALS.map((g) => ({ key: g.key, label: g.label, value: agg[y][g.key], target: g.target, color: g.color }))
  const pct = (y, k) => {
    const g = GOALS.find((x) => x.key === k)
    return (agg[y][k] / g.target) * 100
  }

  // current-year status per metric: ahead/behind pace and projection
  const status = !latest ? [] : GOALS.map((g) => {
    const v = agg[latest][g.key]
    const p = (v / g.target) * 100
    const expected = paceFrac != null ? g.target * paceFrac : null
    const delta = expected != null ? v - expected : null
    const projection = paceFrac ? v / paceFrac : null
    return { ...g, value: v, pct: p, expected, delta, projection, done: v >= g.target }
  })

  const closed = (y) => GOALS.filter((g) => agg[y][g.key] >= g.target).length

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Goals' }]}
      number="09"
      title="Goals"
      subtitle="The targets, year by year."
      lede={`Three targets, held up against every year on equal terms: 1,000 km walking, 1,000 km across all running, and 24,000 metres of climbing on foot. Each ring fills toward its goal${inProgress ? `, and for ${latest}, still in progress, a notch marks where today's pace sits` : ''}. A closed ring means the year cleared the bar.`}
      prev={prev}
      next={next}
    >
      {/* This year, up close */}
      {latest && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            n="01"
            title={`${latest}: the year so far`}
            note={inProgress
              ? `Where ${latest} stands against the three targets, with the pace notch set to today. Fill past the notch means ahead of schedule; short of it means behind. The projection reads the current rate straight through to December.`
              : `How ${latest} finished against the three targets.`}
            source="Activity Log"
            tableCaption={`${latest} progress against each target`}
            columns={['Goal', 'So far', 'Target', 'Progress']}
            rows={status.map((s) => [s.label, fmtVal(s.value, s.unit), fmtVal(s.target, s.unit), `${Math.round(s.pct)}%`])}
          >
            <div className="goalhero">
              <GoalRings metrics={metricsFor(latest)} size={260} pace={paceFrac} />
              <ul className="goalhero__list">
                {status.map((s) => (
                  <li key={s.key} className="goalhero__row">
                    <span className="goalhero__dot" style={{ background: s.color }} />
                    <div className="goalhero__main">
                      <span className="goalhero__label">{s.label} <span className="goalhero__note">{s.note}</span></span>
                      <span className="goalhero__nums mono">{fmtVal(s.value, s.unit)} <span className="goalhero__of">/ {fmtVal(s.target, s.unit)}</span></span>
                    </div>
                    <div className="goalhero__side">
                      <span className={`goalhero__pct${s.done ? ' goalhero__pct--done' : ''}`}>{Math.round(s.pct)}%</span>
                      {inProgress && s.delta != null && (
                        <span className="goalhero__pace">
                          {s.done ? 'target cleared' : `${s.delta >= 0 ? '+' : ''}${fmtInt(s.delta)} ${s.unit} vs pace`}
                        </span>
                      )}
                      {inProgress && !s.done && s.projection != null && (
                        <span className="goalhero__proj">on track for {fmtVal(s.projection, s.unit)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Figure>
        </section>
      )}

      {/* Every year, same bar */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="02"
          title="Every year against the same three rings"
          note="One glyph per year, the same targets each time. Scan a single ring colour down the years to see when a goal was cleared and when it fell short. Running cleared the bar early and often; walking and the big elevation number are the harder climbs."
          source="Activity Log"
          tableCaption="Percent of each target reached, by year"
          columns={['Year', 'Walk', 'All runs', 'Foot elevation', 'Rings closed']}
          rows={[...years].reverse().map((y) => [y, `${Math.round(pct(y, 'walk'))}%`, `${Math.round(pct(y, 'run'))}%`, `${Math.round(pct(y, 'elev'))}%`, `${closed(y)}/3`])}
        >
          <div className="goalgrid">
            {[...years].reverse().map((y) => (
              <div key={y} className={`goalgrid__cell${y === latest ? ' goalgrid__cell--now' : ''}`}>
                <div className="goalgrid__yr mono">{y}{y === latest && inProgress ? <span className="goalgrid__live"> so far</span> : null}</div>
                <GoalRings metrics={metricsFor(y)} size={150} track={9} gap={5} pace={y === latest ? paceFrac : null} />
                <ul className="goalgrid__stats">
                  {GOALS.map((g) => (
                    <li key={g.key}>
                      <span className="goalgrid__sw" style={{ background: g.color }} />
                      <span className="goalgrid__slbl">{g.label}</span>
                      <span className="goalgrid__spct mono">{Math.round(pct(y, g.key))}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Figure>
        <div className="chart-legend" style={{ marginTop: 'var(--sp-4)' }}>
          {GOALS.map((g) => (
            <span key={g.key}><i className="chart-swatch" style={{ background: g.color }} /> {g.label} &middot; {fmtInt(g.target)} {g.unit}</span>
          ))}
          <span><i className="chart-swatch" style={{ background: 'var(--grey-10)' }} /> to go</span>
        </div>
      </section>

      {/* A different kind of goal: fifty trips to one place */}
      {rk.length > 0 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="03"
            title="Fifty trips to Ras Kilomoni"
            note={`Not every goal is a distance. Through 2026 one destination kept pulling the training back to it, the Ras Kilomoni headland, and the trips were numbered as they went, I to L. The target was a clean fifty, and the wall fills exactly: ${rkWalks} reached at a walk, ${rkRuns} on the run, no more and no fewer. The bars below drop each trip onto the calendar from ${longDate(rk[0].date)} to ${longDate(rk[rk.length - 1].date)}, the busy weeks and the long gaps laid bare, each bar as tall as that day was far. Trip fifty fell on the same day as the 2,000th activity of the whole record, a milestone landing on a milestone.`}
            source="Activity Log (named-trip series)"
            tableCaption="Every Ras Kilomoni trip in order, with date, sport and distance"
            columns={['Trip', 'Date', 'Sport', 'km']}
            rows={rk.map((r) => [`Ras Kilomoni ${r.roman}`, r.date, r.sport, fmtNum(toNum(r.distance_km) || 0, 1)])}
          >
            <ul className="rask__stats">
              <li className="rask__stat"><span className="rask__statv rask__statv--accent">{rk.length} / {rkTarget}</span><span className="rask__statl">trips, target met</span></li>
              <li className="rask__stat"><span className="rask__statv">{fmtInt(rkKm)} km</span><span className="rask__statl">covered getting there</span></li>
              <li className="rask__stat"><span className="rask__statv">{rkWalks} &middot; {rkRuns}</span><span className="rask__statl">walks &middot; runs</span></li>
              <li className="rask__stat"><span className="rask__statv">{longDate(rk[0].date)}</span><span className="rask__statl">first trip, to Aug 28</span></li>
            </ul>
            <RasKilomoni rows={rk} />
          </Figure>
        </section>
      )}

      {/* An annual date: the Kilimanjaro Half Marathon, faster every year */}
      {kh.length > 1 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="04"
            title="Four years at the Kilimanjaro Half"
            note={`One race has come round every year since ${khFirst.year}: the Kilimanjaro Half Marathon, the same twenty-one kilometres each time. ${kh.length} editions in an unbroken row, and quicker at every one. The finish came down from ${clock(toNum(khFirst.moving_min))} in ${khFirst.year} to ${clock(toNum(khLast.moving_min))} in ${khLast.year}, ${Math.round(khFaster)} minutes off the clock, the pace easing from ${paceOf(toNum(khFirst.moving_min), toNum(khFirst.distance_km))} to ${paceOf(toNum(khLast.moving_min), toNum(khLast.distance_km))} per kilometre. The standing around shrank even faster, from ${khStops(khFirst)} minutes lost to stops in the first to just ${khStops(khLast)} in the latest. Drawn from the actual GPS tracks, the terrain up top is the course itself, a real 268 metre climb to the turnaround near 9 km before it falls away home; beneath it, one pace ribbon a year, every stretch coloured by how fast it was run there. Read down the years and the ribbons warm as the race quickens; read across and every year drags on the climb and flies on the descent.`}
            source="Activity Log + Strava GPS streams"
            tableCaption="Each Kilimanjaro Half Marathon: distance, finish and pace"
            columns={['Year', 'Date', 'km', 'Finish', 'Pace /km', 'On course']}
            rows={kh.map((r) => [r.year, r.date, fmtNum(toNum(r.distance_km), 1), clock(toNum(r.moving_min)), paceOf(toNum(r.moving_min), toNum(r.distance_km)), clock(toNum(r.elapsed_min))])}
          >
            <ul className="rask__stats">
              <li className="rask__stat"><span className="rask__statv rask__statv--accent">{kh.length} in a row</span><span className="rask__statl">years, {khFirst.year}&ndash;{khLast.year}</span></li>
              <li className="rask__stat"><span className="rask__statv">{clock(toNum(khFirst.moving_min))} &rarr; {clock(toNum(khLast.moving_min))}</span><span className="rask__statl">finish, faster each year</span></li>
              <li className="rask__stat"><span className="rask__statv">{paceOf(toNum(khFirst.moving_min), toNum(khFirst.distance_km))} &rarr; {paceOf(toNum(khLast.moving_min), toNum(khLast.distance_km))}</span><span className="rask__statl">min per km</span></li>
              <li className="rask__stat"><span className="rask__statv">{Math.round(khFaster)} min</span><span className="rask__statl">off the finish vs {khFirst.year}</span></li>
            </ul>
            <KiliHalf rows={kh} profile={kiliProfile} />
          </Figure>
        </section>
      )}
    </DetailFrame>
  )
}

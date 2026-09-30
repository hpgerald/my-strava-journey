import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import GoalRings from '../charts/GoalRings.jsx'
import RasKilomoni from '../charts/RasKilomoni.jsx'
import KiliHalf from '../charts/KiliHalf.jsx'
import MonthChain from '../charts/MonthChain.jsx'
import HalfClub from '../charts/HalfClub.jsx'
import DoubleThousand from '../charts/DoubleThousand.jsx'
import DistanceArc from '../charts/DistanceArc.jsx'
import CenturyMonths from '../charts/CenturyMonths.jsx'
import DistanceExtremes from '../charts/DistanceExtremes.jsx'
import StageRace from '../charts/StageRace.jsx'
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

// A titled break that groups a run of figures into one movement of the page.
function Movement({ num, eyebrow, title, lede }) {
  return (
    <header className="movement">
      <span className="movement__num" aria-hidden="true">{num}</span>
      <div className="movement__body">
        <p className="movement__eyebrow">{eyebrow}</p>
        <h2 className="movement__title">{title}</h2>
        <p className="movement__lede">{lede}</p>
      </div>
    </header>
  )
}

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

  // Silent goals unearthed from the data.
  const monthly = useTable('monthly_totals')
  const yearlyTotals = useTable('yearly_totals')
  const FOOT_ALL = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
  const RUN_ALL = new Set(['Run', 'TrailRun'])
  // month streak: consecutive active months ending at the latest
  const activeMonths = [...new Set(monthly.map((m) => m.month))].sort()
  const nextMonth = (m) => { let y = +m.slice(0, 4), mm = +m.slice(5, 7) + 1; if (mm > 12) { mm = 1; y += 1 } return `${y}-${String(mm).padStart(2, '0')}` }
  let monthStreak = 0
  if (activeMonths.length) {
    const set = new Set(activeMonths)
    let cur = activeMonths[activeMonths.length - 1]
    while (set.has(cur)) { monthStreak += 1; let y = +cur.slice(0, 4), mm = +cur.slice(5, 7) - 1; if (mm < 1) { mm = 12; y -= 1 } cur = `${y}-${String(mm).padStart(2, '0')}` }
  }
  const sparkLabel = activeMonths.length ? (() => {
    const set = new Set(activeMonths); let cur = activeMonths[activeMonths.length - 1], prev = cur
    while (set.has(cur)) { prev = cur; let y = +cur.slice(0, 4), mm = +cur.slice(5, 7) - 1; if (mm < 1) { mm = 12; y -= 1 } cur = `${y}-${String(mm).padStart(2, '0')}` }
    return `${MONTHS[+prev.slice(5, 7) - 1]} ${prev.slice(0, 4)}`
  })() : ''
  // half-marathon club
  const halfCount = activities.filter((a) => FOOT_ALL.has(a.sport_type) && (toNum(a.distance_km) || 0) >= 21.0975).length
  // double thousand: latest year with both run>=1000 and walk>=1000
  const yrAgg = {}
  for (const a of activities) { const y = a.year; if (!y) continue; const e = (yrAgg[y] = yrAgg[y] || { run: 0, walk: 0 }); const km = toNum(a.distance_km) || 0; if (RUN_ALL.has(a.sport_type)) e.run += km; if (a.sport_type === 'Walk') e.walk += km }
  const doubleYears = Object.keys(yrAgg).filter((y) => yrAgg[y].run >= 1000 && yrAgg[y].walk >= 1000).sort()
  const dblYear = doubleYears[doubleYears.length - 1]
  const topRunYear = Object.keys(yrAgg).reduce((b, y) => (yrAgg[y].run > (yrAgg[b] ? yrAgg[b].run : 0) ? y : b), Object.keys(yrAgg)[0])
  const topRun = topRunYear ? yrAgg[topRunYear].run : 0
  // arc peak
  const arcPeak = [...yearlyTotals].sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km))[0]
  // century months: how many cleared 100 km, and the longest consecutive run
  const monthSet = {}
  for (const mm of monthly) monthSet[mm.month] = toNum(mm.distance_km)
  const calMonths = Object.keys(monthSet).sort()
  let centuryCount = 0, centuryBest = 0, cCur = 0
  if (calMonths.length) {
    const nextM = (m) => { let y = +m.slice(0, 4), mo = +m.slice(5, 7) + 1; if (mo > 12) { mo = 1; y += 1 } return `${y}-${String(mo).padStart(2, '0')}` }
    let c = calMonths[0]
    const end = calMonths[calMonths.length - 1]
    while (c <= end) {
      const over = (monthSet[c] || 0) >= 100
      if (over) { centuryCount += 1; cCur += 1; centuryBest = Math.max(centuryBest, cCur) } else cCur = 0
      c = nextM(c)
    }
  }
  const maxMonthKm = calMonths.length ? Math.max(...Object.values(monthSet)) : 0

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
      {/* ===== Movement I: the goals set out loud ===== */}
      <Movement
        num="I"
        eyebrow="Movement one"
        title="The set goals"
        lede="Three targets, chosen in advance and held up against every year on the same terms."
      />

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

      {/* ===== Movement II: the recurring, named goals ===== */}
      <Movement
        num="II"
        eyebrow="Movement two"
        title="The kept dates"
        lede="Two goals that came round again and again, a place and a race, each one returned to on purpose."
      />

      {/* A different kind of goal: fifty trips to one place */}
      {rk.length > 0 && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            n="03"
            title="Fifty trips to Ras Kilomoni"
            note={`Not every goal is a distance. Through 2026 one destination kept pulling the training back to it, the Ras Kilomoni headland, and the trips were numbered as they went, I to L. The target was a clean fifty, and the wall fills exactly: ${rkWalks} reached at a walk, ${rkRuns} on the run, no more and no fewer. The bars below drop each trip onto the calendar from ${longDate(rk[0].date)} to ${longDate(rk[rk.length - 1].date)}, the busy weeks and the long gaps laid bare, each bar as tall as that day was far. Trip fifty fell on the same day as the 2,000th activity of the whole record, a milestone landing on a milestone.`}
            source="Activity Log (named-trip series)"
            tableCaption="Every Ras Kilomoni trip in order, with date, sport and distance"
            columns={['Trip', 'Date', 'Sport', 'km']}
            rows={rk.map((r) => [`Ras Kilomoni ${r.roman}`, r.date, r.sport, fmtNum(toNum(r.distance_km) || 0, 1)])}
          >
            <div className="figduo">
              <ul className="ledger">
                <li className="ledger__item"><span className="ledger__v ledger__v--accent">{rk.length} / {rkTarget}</span><span className="ledger__l">trips, target met</span></li>
                <li className="ledger__item"><span className="ledger__v">{fmtInt(rkKm)} km</span><span className="ledger__l">covered getting there</span></li>
                <li className="ledger__item"><span className="ledger__v">{rkWalks} &middot; {rkRuns}</span><span className="ledger__l">walks &middot; runs</span></li>
                <li className="ledger__item"><span className="ledger__v">{longDate(rk[0].date)}</span><span className="ledger__l">first trip, to Aug 28</span></li>
              </ul>
              <div className="figduo__main"><RasKilomoni rows={rk} /></div>
            </div>
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

      {/* ===== Movement III: the goals never set out loud ===== */}
      <Movement
        num="III"
        eyebrow="Movement three"
        title="The silent goals"
        lede="Standards the data kept without anyone naming them: streaks held, thresholds crossed, a shape drawn over seven years."
      />

      {/* Silent goal: every month since the spark */}
      {monthly.length > 12 && monthStreak > 6 && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            n="05"
            title="Every month since the spark"
            note={`Some goals were never set out loud. This is one: since ${sparkLabel}, not a single calendar month has gone by without an activity. That is ${monthStreak} months in an unbroken row, more than five years, still running. It began as a tentative return that June, then roared to life in July; the opening years flicker with gaps, but from there the grid is solid. Each cell is a month, shaded by the ground it covered on foot.`}
            source="Monthly Trends"
            tableCaption="Distance on foot by month"
            columns={['Month', 'Activities', 'km on foot']}
            rows={[...monthly].sort((a, b) => b.month.localeCompare(a.month)).map((m) => [m.month, m.activities, fmtNum(toNum(m.distance_km), 0)])}
          >
            <div className="figduo">
              <ul className="ledger">
                <li className="ledger__item"><span className="ledger__v ledger__v--accent">{monthStreak} months</span><span className="ledger__l">unbroken, still going</span></li>
                <li className="ledger__item"><span className="ledger__v">{sparkLabel}</span><span className="ledger__l">streak begins</span></li>
                <li className="ledger__item"><span className="ledger__v">0</span><span className="ledger__l">missed since</span></li>
              </ul>
              <div className="figduo__main"><MonthChain months={monthly} /></div>
            </div>
          </Figure>
        </section>
      )}

      {/* Silent goal: the half-marathon club */}
      {halfCount > 5 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="06"
            title="The road to eighty-three"
            note={`For most people twenty-one kilometres is a race entered once and remembered forever. Here it is a habit. This line is a running tally of every outing that went the half-marathon distance or beyond, stacked in the order they happened: ${halfCount} of them. It rockets up through 2021 and 2022 when the long day was almost routine, levels off through the leaner years, and climbs hard again lately. The one full marathon is marked, and the four-in-four-days of the stage race shows as a near-vertical jump.`}
            source="Activity Log"
            tableCaption="Outings of 21.1 km or more, by distance"
            columns={['Count', 'Threshold']}
            rows={[[String(halfCount), '21.1 km or more, on foot']]}
          >
            <ul className="rask__stats">
              <li className="rask__stat"><span className="rask__statv rask__statv--accent">{halfCount}</span><span className="rask__statl">times past the half</span></li>
              <li className="rask__stat"><span className="rask__statv">1</span><span className="rask__statl">full marathon</span></li>
              <li className="rask__stat"><span className="rask__statv">4 in 4 days</span><span className="rask__statl">the stage-race jump</span></li>
            </ul>
            <HalfClub activities={activities} />
          </Figure>
        </section>
      )}

      {/* Silent goal: the double thousand */}
      {dblYear && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="07"
            title="The double thousand"
            note={`Each year throws two arms: how far it ran, to the right, and how far it walked, to the left, on one shared scale. Dashed marks stand at a thousand kilometres on each side. The big years fling a long running arm but a stubby walking one, and the walking years never run as far; almost every year clears a thousand on one side alone. ${dblYear} is the first to stretch past a thousand on both, ${Math.round(yrAgg[dblYear].run)} run and ${Math.round(yrAgg[dblYear].walk)} walked, the only year to span the full width.`}
            source="Activity Log"
            tableCaption="Running and walking distance by year"
            columns={['Year', 'km run', 'km walked', 'Both 1,000?']}
            rows={Object.keys(yrAgg).filter((y) => yrAgg[y].run + yrAgg[y].walk >= 200).sort().map((y) => [y, fmtInt(yrAgg[y].run), fmtInt(yrAgg[y].walk), yrAgg[y].run >= 1000 && yrAgg[y].walk >= 1000 ? 'yes' : 'no'])}
          >
            <ul className="rask__stats">
              <li className="rask__stat"><span className="rask__statv rask__statv--accent">{dblYear}</span><span className="rask__statl">first double thousand</span></li>
              <li className="rask__stat"><span className="rask__statv">{fmtInt(yrAgg[dblYear].run)} &middot; {fmtInt(yrAgg[dblYear].walk)}</span><span className="rask__statl">km run &middot; walked</span></li>
              <li className="rask__stat"><span className="rask__statv">{fmtInt(topRun)} km</span><span className="rask__statl">biggest running year, {topRunYear}</span></li>
            </ul>
            <DoubleThousand activities={activities} />
          </Figure>
        </section>
      )}

      {/* Silent goal: the seven-year arc */}
      {yearlyTotals.length > 3 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="08"
            title="The seven-year arc"
            note={`The whole journey in one line. Two near-dormant opening years, then the habit ignites and 2021 and 2022 pour out almost three thousand kilometres each, ${arcPeak ? Math.round(toNum(arcPeak.distance_km)).toLocaleString('en-US') : ''} at the peak. A dip follows, then the climb back. The dashed line is the 2,400 kilometres set as a target in 2021, and cleared. Distance on foot only.`}
            source="Yearly Trends"
            tableCaption="Distance on foot by year"
            columns={['Year', 'km on foot', 'Activities']}
            rows={[...yearlyTotals].sort((a, b) => b.year.localeCompare(a.year)).map((r) => [r.year, fmtNum(toNum(r.distance_km), 0), r.activities])}
          >
            <DistanceArc years={yearlyTotals} target={2400} inProgressYear={latest} />
          </Figure>
        </section>
      )}

      {/* Silent goal: the century months */}
      {monthly.length > 12 && centuryCount > 5 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="09"
            title="The century months"
            note={`A hundred kilometres on foot in a calendar month is a quiet standard to hold. It has been held ${centuryCount} times. Each column here is a month, and the part that rises above the 100 km waterline is the stretch that cleared it; the caps, read across, are the months that made it. The longest unbroken run reached ${centuryBest} months in a row before a quieter month broke it.`}
            source="Monthly Trends"
            tableCaption="Distance on foot by month, against the 100 km line"
            columns={['Month', 'km on foot', 'Century?']}
            rows={[...monthly].sort((a, b) => b.month.localeCompare(a.month)).map((mm) => [mm.month, fmtNum(toNum(mm.distance_km), 0), toNum(mm.distance_km) >= 100 ? 'yes' : 'no'])}
          >
            <ul className="rask__stats">
              <li className="rask__stat"><span className="rask__statv rask__statv--accent">{centuryCount} months</span><span className="rask__statl">cleared 100 km</span></li>
              <li className="rask__stat"><span className="rask__statv">{centuryBest} in a row</span><span className="rask__statl">longest run</span></li>
              <li className="rask__stat"><span className="rask__statv">{fmtInt(maxMonthKm)} km</span><span className="rask__statl">the biggest month</span></li>
            </ul>
            <CenturyMonths months={monthly} line={100} />
          </Figure>
        </section>
      )}

      {/* ===== Movement IV: the rare extremes ===== */}
      <Movement
        num="IV"
        eyebrow="Movement four"
        title="The far edges"
        lede="The two efforts that stand at the outer limit of the whole record, each run exactly once."
      />

      {/* Silent goal: the lone marathon */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <Figure
          n="10"
          title="The lone marathon"
          note="Exactly once has a full 42 kilometres been run in a single day, and it was run hard: 42.75 km in 2 hours 56, a shade over four minutes a kilometre, on a flat May morning in 2022. Set against a normal long day, it is twice the distance covered at better than half the usual pace, and it stands alone as the furthest ever gone between one sunrise and the next."
          source="Activity Log"
          tableCaption="The one full marathon, against a normal long day"
          columns={['Effort', 'Distance', 'Time', 'Pace']}
          rows={[['A normal long day', '21.1 km', 'varies', 'varies'], ['The full marathon', '42.75 km', '2:56:44', '4:08/km']]}
        >
          <ul className="rask__stats">
            <li className="rask__stat"><span className="rask__statv rask__statv--accent">2:56:44</span><span className="rask__statl">the only full marathon</span></li>
            <li className="rask__stat"><span className="rask__statv">4:08 /km</span><span className="rask__statl">sub-three-hours, flat</span></li>
            <li className="rask__stat"><span className="rask__statv">42.75 km</span><span className="rask__statl">one flat May morning, 2022</span></li>
          </ul>
          <DistanceExtremes />
        </Figure>
      </section>

      {/* The special challenge: the 100 km four-day stage race */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="11"
          title="The 100 km stage race"
          note="One challenge stands apart from every other: 100 kilometres covered across four straight evenings in March 2023, 25 kilometres each night, back to back. The furthest ever gone at all, and the story is in the pacing. After two steady openers he found another gear, dropping close to half a minute a kilometre to run the third evening the quickest of the four, then holding it on the last. Ten and a half hours of moving over four nights, and getting faster as it wore on."
          source="Activity Log (named-race series)"
          tableCaption="Each evening of the 100 km stage race"
          columns={['Evening', 'Date', 'Distance', 'Time', 'Pace']}
          rows={[['Day 1', 'Mar 24, 2023', '25.0 km', '2:42', '6:29/km'], ['Day 2', 'Mar 25, 2023', '25.1 km', '2:42', '6:27/km'], ['Day 3', 'Mar 26, 2023', '25.1 km', '2:30', '5:59/km'], ['Day 4', 'Mar 27, 2023', '25.1 km', '2:33', '6:06/km']]}
        >
          <ul className="rask__stats">
            <li className="rask__stat"><span className="rask__statv rask__statv--accent">100 km</span><span className="rask__statl">four nights, back to back</span></li>
            <li className="rask__stat"><span className="rask__statv">5:59 /km</span><span className="rask__statl">quickest, the third night</span></li>
            <li className="rask__stat"><span className="rask__statv">10:27</span><span className="rask__statl">moving, in all</span></li>
          </ul>
          <StageRace />
        </Figure>
      </section>
    </DetailFrame>
  )
}

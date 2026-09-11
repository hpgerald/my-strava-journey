import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import GoalRings from '../charts/GoalRings.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, toNum } from '../lib/format.js'

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
  const { prev, next } = useSectionPaging('/goals')

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
    </DetailFrame>
  )
}

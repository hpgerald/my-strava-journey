import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import StatCard from '../components/StatCard.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Figure from '../charts/Figure.jsx'
import AreaLine from '../charts/AreaLine.jsx'
import DotGrid from '../charts/DotGrid.jsx'
import Columns from '../charts/Columns.jsx'
import BarChart from '../charts/BarChart.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import HeatStrip from '../charts/HeatStrip.jsx'
import HeroRotator from '../charts/HeroRotator.jsx'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

function yearsBetween(a, b) {
  if (!a || !b) return null
  const start = new Date(a)
  const end = new Date(b)
  if (isNaN(start) || isNaN(end)) return null
  return Math.round((end - start) / (365.25 * 24 * 3600 * 1000))
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DIST_EDGES = [0, 2, 4, 6, 8, 10, 12, 15, 20, 30, Infinity]
const DIST_LABELS = ['0–2', '2–4', '4–6', '6–8', '8–10', '10–12', '12–15', '15–20', '20–30', '30+']
const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Round a set of counts to integer percentages that sum to exactly 100
// (largest-remainder method), so a breakdown never reads 101%.
function pctsTo100(counts) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  const raw = counts.map((c) => (c / total) * 100)
  const out = raw.map(Math.floor)
  let left = 100 - out.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < left; k++) out[order[k % order.length].i] += 1
  return out
}

export default function Home() {
  const lifetime = useTable('lifetime_totals')
  const meta = useKeyed('meta', 'key', 'value')
  const countries = useTable('countries')
  const fun = useTable('fun_journey')
  const activityLog = useTable('activities')
  const nav = useTable('nav_index')

  const life = (needle) => lifetime.find((r) => (r.metric || '').toLowerCase().includes(needle)) || {}

  const activities = life('activities').value
  const km = life('total km').value
  const elevation = life('elevation').value
  const streak = life('longest streak').value

  const years = yearsBetween(meta.coverage_start, meta.coverage_end)
  const countryCount = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS').length
  const everests = (fun.find((f) => (f.comparison || '').includes('Everest')) || {}).value
  const kudos = life('kudos').value
  const hoursMoving = life('hours moving').value

  // the rotating headline metrics — every number worth leading with
  const heroMetrics = [
    { value: toNum(activities), word: 'activities' },
    { value: toNum(km), word: 'km moved' },
    { value: toNum(elevation), word: 'm climbed' },
    { value: toNum(streak), word: 'days unbroken' },
    { value: countryCount, word: 'countries' },
    { value: toNum(kudos), word: 'kudos' },
    { value: toNum(hoursMoving), word: 'hours moving' },
  ].filter((m) => Number.isFinite(m.value) && m.value > 0)

  // fun equivalents of the totals, for the space beside the cards
  const funv = (needle) => toNum((fun.find((f) => (f.comparison || '').toLowerCase().includes(needle)) || {}).value)
  const funFacts = [
    { num: fmtInt(funv('marathon')), suffix: '', label: 'marathons' },
    { num: fmtNum(funv('kilimanjaro'), 1), suffix: '×', label: 'up Kilimanjaro' },
    { num: fmtNum(funv('everest'), 1), suffix: '×', label: 'up Everest' },
    { num: String(Math.round(funv('moon') * 100)), suffix: '%', label: 'to the Moon' },
  ].filter((f) => f.num && f.num !== 'NaN' && f.num !== '0')

  // ---- Derived series for the front-page charts ----
  const hours = Array.from({ length: 24 }, () => 0)
  const weekday = Object.fromEntries(WEEKDAYS.map((w) => [w, 0]))
  const distCounts = DIST_LABELS.map(() => 0)
  const months = Array(12).fill(0)
  const daySet = new Set()
  const kudosYear = {}
  for (const a of activityLog) {
    const h = parseInt(a.hour, 10)
    if (Number.isFinite(h) && h >= 0 && h < 24) hours[h] += 1
    if (a.weekday in weekday) weekday[a.weekday] += 1
    const d = toNum(a.distance_km)
    if (d > 0) {
      for (let i = 0; i < DIST_LABELS.length; i++) {
        if (d > DIST_EDGES[i] && d <= DIST_EDGES[i + 1]) { distCounts[i] += 1; break }
      }
    }
    const mo = parseInt((a.date || '').slice(5, 7), 10)
    if (mo >= 1 && mo <= 12) months[mo - 1] += 1
    const dstr = (a.date || '').slice(0, 10)
    if (dstr) daySet.add(dstr)
    const y = (a.date || '').slice(0, 4)
    if (y) {
      kudosYear[y] = kudosYear[y] || { s: 0, n: 0 }
      kudosYear[y].s += toNum(a.kudos) || 0
      kudosYear[y].n += 1
    }
  }

  const weekdayData = WEEKDAYS.map((w) => ({
    label: w.slice(0, 3),
    value: weekday[w],
    display: fmtInt(weekday[w]),
  }))
  const distData = DIST_LABELS.map((l, i) => ({ label: l, value: distCounts[i] }))
  const kudosPts = Object.keys(kudosYear)
    .sort()
    .map((y) => ({ x: Date.UTC(Number(y), 6, 1), y: kudosYear[y].s / Math.max(1, kudosYear[y].n), label: y }))

  // seasonality: activities per calendar month
  const monthCells = MONTHS_FULL.map((m, i) => ({ short: MONTHS_SHORT[i], label: m, value: months[i] }))

  // consistency: how soon the next active day comes, and share of days active
  const sortedDays = [...daySet].sort()
  let gNext = 0, gTwo = 0, gMore = 0
  for (let i = 1; i < sortedDays.length; i++) {
    const diff = Math.round((Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1])) / 86400000)
    if (diff === 1) gNext += 1
    else if (diff === 2) gTwo += 1
    else gMore += 1
  }
  const gapPcts = pctsTo100([gNext, gTwo, gMore]) // integer percentages summing to exactly 100
  const gapData = [
    { label: 'The next day', value: gNext, display: `${gapPcts[0]}%` },
    { label: 'Two days later', value: gTwo, display: `${gapPcts[1]}%` },
    { label: 'Three or more', value: gMore, display: `${gapPcts[2]}%` },
  ]
  const activeDays = sortedDays.length
  const spanDays = sortedDays.length > 1
    ? Math.round((Date.parse(sortedDays[sortedDays.length - 1]) - Date.parse(sortedDays[0])) / 86400000) + 1
    : 1
  const pctActiveDays = Math.round((activeDays / spanDays) * 100)

  // one dot per activity, in chronological order, tagged with its year
  const items = activityLog
    .map((a) => ({
      t: Date.parse((a.date || '').replace(' ', 'T')),
      year: Number((a.date || '').slice(0, 4)),
      date: a.date,
      sport: a.sport_type,
      name: a.name,
    }))
    .filter((d) => Number.isFinite(d.t) && d.year)
    .sort((a, b) => a.t - b.t)
  const gridYears = [...new Set(items.map((d) => d.year))].sort((a, b) => a - b)
  const yearCounts = gridYears.map((y) => [String(y), fmtInt(items.filter((d) => d.year === y).length)])

  const menuItems = nav
    .filter((r) => r.route !== '/')
    .map((r, i) => ({ ...r, number: String(i + 1).padStart(2, '0') }))

  return (
    <Layout>
      <Container>
        {/* ---- Type-led hero: headline left, key figures stacked right --- */}
        <section className="hero">
          <div className="hero__main">
            <p className="eyebrow">
              {years ? `${years} years` : 'Seven years'} · {meta.coverage_start?.slice(0, 4) || '2019'}
              &ndash;{meta.coverage_end?.slice(0, 4) || '2026'} · Strava
            </p>
            <h1
              className="display hero__head"
              aria-label={`${years || 7} years, ${fmtInt(activities)} activities, one habit.`}
            >
              <span aria-hidden="true">
                <span className="hero__anchor">{years || 7} years.</span>
                <HeroRotator className="hero__slot" metrics={heroMetrics} />
                <span className="hero__anchor">One habit.</span>
              </span>
            </h1>
            <p className="measure hero__lede" style={{ fontSize: 'var(--fs-md)' }}>
              Seven years of my Strava history, in one place. It began with a single lunch ride in
              2019 and turned into a near-daily habit: running, walking, hiking and riding, mostly
              around Tanzania and, over time, in {countryCount || 'seven'} countries.
            </p>
            <div className="hero__extra">
              <p className="eyebrow">Put another way, that is</p>
              <ul className="funfacts">
                {funFacts.map((f, i) => (
                  <li key={i}>
                    <span className="funfacts__num">
                      {f.num}
                      {f.suffix ? <span className="funfacts__suffix">{f.suffix}</span> : null}
                    </span>
                    <span className="funfacts__lbl">{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="hero__cards" aria-label="Headline figures">
            <StatCard value={fmtInt(km)} unit="km" label="Distance moved" note="Roughly a third of the way around the planet." />
            <StatCard value={fmtInt(elevation)} unit="m" label="Vertical climbed" note="Climbing grew from incidental to a core part of the training." />
            <StatCard value={fmtInt(streak)} unit="days" label="Longest active streak" note="Consecutive active days, and still counting." />
          </div>
        </section>
      </Container>

      {/* ---- The signature chart, beside the section menu --------------- */}
      <Container>
        <hr className="rule" />
        <div className="grid grid--2" style={{ alignItems: 'start', paddingBlock: 'var(--sp-6)' }}>
          <div>
            <Figure
              title="Every activity, one dot"
              note={`One dot for each of the ${fmtInt(activityLog.length)} activities, in order from the first upload to the latest. The colour deepens with the year, so the thin pale start and the dense recent seasons show at a glance. Hover any dot.`}
              source="Activity Log"
              tableCaption="Activities by year"
              columns={['Year', 'Activities']}
              rows={yearCounts}
            >
              <DotGrid items={items} years={gridYears} />
            </Figure>
            <div style={{ borderTop: '1px solid var(--rule-faint)', marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)' }}>
              <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Reading the dots</p>
              <p className="measure" style={{ margin: 0, color: 'var(--fg-muted)' }}>
                The first two years are a thin, pale band, just a couple of dozen activities each.
                Then July 2021 arrives as a wall of colour and never lets up: around three hundred
                activities a year, every year since. The darkest dots are the most recent.
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-1)' }}>Explore</p>
            <h2 className="display" style={{ fontSize: 'var(--fs-xl)', margin: '0 0 var(--sp-4)' }}>
              Eight ways in.
            </h2>
            <IndexHub items={menuItems} compact />
          </div>
        </div>
      </Container>

      {/* ---- Deep-dive highlights: four things the data shows ----------- */}
      <Container>
        <hr className="rule" />
        <div className="section-head">
          <p className="eyebrow">A closer look</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
            Six things the data shows.
          </h2>
        </div>
        <div className="grid grid--2" style={{ gap: 'var(--sp-8) var(--sp-7)', paddingBottom: 'var(--sp-7)' }}>
          <Figure
            title="When the day gets moving"
            note="Every activity by the hour it started. Two windows stand out: a dawn crowd around 6–7am and a bigger one at dusk, 5–7pm."
            source="Activity Log"
            tableCaption="Activities by hour of day"
            columns={['Hour', 'Activities']}
            rows={hours.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={hours} unit="activities" />
          </Figure>

          <Figure
            title="A week with no day off"
            note="Activities by weekday. The load spreads remarkably evenly; Saturday only just edges the rest. Consistency, not weekend heroics."
            source="Activity Log"
            tableCaption="Activities by weekday"
            columns={['Weekday', 'Activities']}
            rows={WEEKDAYS.map((w) => [w, fmtInt(weekday[w])])}
          >
            <BarChart data={weekdayData} accent />
          </Figure>

          <Figure
            title="The shape of a typical outing"
            note="How far each activity went, grouped by distance. The typical outing is about 6 km, but the tail runs all the way past 100."
            source="Activity Log"
            tableCaption="Activities by distance band (km)"
            columns={['Distance (km)', 'Activities']}
            rows={distData.map((d) => [d.label, fmtInt(d.value)])}
          >
            <Columns data={distData} height={260} unit="activities" formatY={(v) => fmtInt(v)} />
          </Figure>

          <Figure
            title="When the crowd arrived"
            note="Average kudos per activity, year by year. Near silence for the first two seasons, then a following took off in 2021 and stuck."
            source="Activity Log"
            tableCaption="Average kudos per activity by year"
            columns={['Year', 'Avg kudos']}
            rows={kudosPts.map((p) => [p.label, fmtInt(p.y)])}
          >
            <AreaLine points={kudosPts} height={260} yUnit="avg kudos" formatX={(p) => p.label} formatY={(v) => fmtInt(v)} />
          </Figure>

          <Figure
            title="The year has a season"
            note="Activities by month of the year, all seven years stacked. Training peaks in the cool dry season; July is the busiest month, and the short rains around September are the quietest."
            source="Activity Log"
            tableCaption="Activities by calendar month"
            columns={['Month', 'Activities']}
            rows={monthCells.map((m) => [m.label, fmtInt(m.value)])}
          >
            <HeatStrip cells={monthCells} unit="activities" cellHeight={48} />
          </Figure>

          <Figure
            title="Rarely a day off"
            note={`Once a day has an activity, how soon is the next active day? Four times in five it is the very next day. Across seven years, ${pctActiveDays}% of all calendar days had at least one activity.`}
            source="Activity Log"
            tableCaption="Days until the next active day"
            columns={['Gap to next active day', 'Share']}
            rows={gapData.map((g) => [g.label, g.display])}
          >
            <BarChart data={gapData} accent />
          </Figure>
        </div>
      </Container>
    </Layout>
  )
}

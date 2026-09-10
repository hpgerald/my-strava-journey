import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import StatCard from '../components/StatCard.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Figure from '../charts/Figure.jsx'
import DotGrid from '../charts/DotGrid.jsx'
import BarChart from '../charts/BarChart.jsx'
import UnitColumns from '../charts/UnitColumns.jsx'
import DistCurve from '../charts/DistCurve.jsx'
import CrowdStems from '../charts/CrowdStems.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import HeatStrip from '../charts/HeatStrip.jsx'
import HeroRotator from '../charts/HeroRotator.jsx'
import ContourField from '../charts/ContourField.jsx'
import IgnitionStream from '../charts/IgnitionStream.jsx'
import FootFlip from '../charts/FootFlip.jsx'
import { useEffect } from 'react'
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
// distance and elevation are foot-only across the site
const FOOT_HOME = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
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
  useEffect(() => {
    document.title = 'My Strava Journey · Seven Years of Training, Read as Data'
  }, [])
  const lifetime = useTable('lifetime_totals')
  const meta = useKeyed('meta', 'key', 'value')
  const countries = useTable('countries')
  const fun = useTable('fun_journey')
  const activityLog = useTable('activities')
  const monthlyTotals = useTable('monthly_totals')
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

  // the rotating headline metrics: every number worth leading with
  const heroMetrics = [
    { value: toNum(activities), word: 'activities' },
    { value: toNum(km), word: 'km on foot' },
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
    if (d > 0 && FOOT_HOME.has(a.sport_type)) {
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
  // distance vs climb by foot sport, for the flip
  const FOOT_ORDER = ['Run', 'Walk', 'TrailRun', 'Hike']
  const FOOT_NAME = { Run: 'Run', Walk: 'Walk', TrailRun: 'Trail', Hike: 'Hike' }
  const footAgg = Object.fromEntries(FOOT_ORDER.map((k) => [k, { dist: 0, elev: 0 }]))
  for (const a of activityLog) {
    if (footAgg[a.sport_type]) { footAgg[a.sport_type].dist += toNum(a.distance_km) || 0; footAgg[a.sport_type].elev += toNum(a.elevation_gain_m) || 0 }
  }
  const footFlipData = FOOT_ORDER.map((k) => ({ key: k, label: FOOT_NAME[k], dist: footAgg[k].dist, elev: footAgg[k].elev }))
  // median + max distance, and the median's position along the band axis
  const distancesSorted = activityLog
    .filter((a) => FOOT_HOME.has(a.sport_type))
    .map((a) => toNum(a.distance_km))
    .filter((d) => d > 0)
    .sort((a, b) => a - b)
  const medianKm = distancesSorted.length ? distancesSorted[Math.floor(distancesSorted.length / 2)] : 0
  const maxKm = distancesSorted.length ? distancesSorted[distancesSorted.length - 1] : 0
  const eIdx = DIST_EDGES.findIndex((e, i) => i < DIST_EDGES.length - 1 && medianKm > DIST_EDGES[i] && medianKm <= DIST_EDGES[i + 1])
  const medianAt = eIdx >= 0
    ? eIdx + (medianKm - DIST_EDGES[eIdx]) / ((DIST_EDGES[eIdx + 1] === Infinity ? DIST_EDGES[eIdx] + 5 : DIST_EDGES[eIdx + 1]) - DIST_EDGES[eIdx])
    : 0
  // kudos per year as lollipop points, with the activity count for dot size
  const kudosStems = Object.keys(kudosYear)
    .sort()
    .map((y) => ({ label: y, value: Math.round((kudosYear[y].s / Math.max(1, kudosYear[y].n)) * 10) / 10, n: kudosYear[y].n }))

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
          <div className="hero__atlas" aria-hidden="true">
            <ContourField />
          </div>
          <div className="hero__plate" aria-hidden="true" />
          <div className="hero__main">
            <p className="atlas-cap">
              <span className="atlas-cap__mark">Plate 01</span>
              <span className="atlas-cap__rule" aria-hidden="true" />
              <span>
                {years ? `${years} years` : 'Seven years'} · {meta.coverage_start?.slice(0, 4) || '2019'}
                &ndash;{meta.coverage_end?.slice(0, 4) || '2026'} · Strava
              </span>
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
              It started at noon on 17 August 2019 with a 31 km bike ride, then went quiet for two
              years. In July 2021 the habit switched on and never switched off. Seven years of it,
              mostly on foot, mostly around Tanzania, reaching {countryCount || 'seven'} countries and
              logged on more than half of every day since.
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
            <StatCard value={fmtInt(km)} unit="km" label="Distance on foot" note="Running, walking and hiking only. Nearly a third of the way around the equator." />
            <StatCard value={fmtInt(elevation)} unit="m" label="Vertical climbed" note="Nine and a half times the height of Everest. Most of it walked, not run." />
            <StatCard value={fmtInt(streak)} unit="days" label="Longest active streak" note="The longest gap-free run yet, and still counting." />
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
              note={`One dot per activity, ${fmtInt(activityLog.length)} of them, oldest to newest, colour deepening with the year. The two thin pale years at the top are 2019 and 2020. Then July 2021 lands as a wall of colour and the page never breathes again. Hover any dot.`}
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
                For two years this was a hobby: 27 activities in 2019, 35 in 2020. Then July 2021
                flipped a switch. Two activities that June became fifty-eight in July, and every year
                since has cleared 270. The darkest dots, the most recent, are packed solid.
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

      {/* ---- The Switch: the narrative centerpiece --------------------- */}
      <Container>
        <hr className="rule" />
        <div style={{ paddingBlock: 'var(--sp-7)' }}>
          <Figure
            title="The switch"
            note="Activities per month across seven years, gaps and all. For two years it barely registered. Then in July 2021 it turned on, and it has not turned off since. This single month is the whole story of the site."
            source="Monthly Trends"
            tableCaption="Activities per month"
            columns={['Month', 'Activities']}
            rows={monthlyTotals.map((mm) => [mm.month, mm.activities])}
          >
            <IgnitionStream rows={monthlyTotals} switchMonth="2021-07" />
          </Figure>
        </div>
      </Container>

      {/* ---- The flip: distance vs climb by sport ---------------------- */}
      <Container>
        <hr className="rule" />
        <div className="grid grid--2" style={{ alignItems: 'center', gap: 'var(--sp-6) var(--sp-8)', paddingBlock: 'var(--sp-7)' }}>
          <Figure
            title="Walking climbs, running runs"
            note="Each sport's share of the total on the left as distance, on the right as climb. Follow a ribbon across and it flips."
            source="Activity Log"
            tableCaption="Share of distance and share of elevation by foot sport"
            columns={['Sport', 'Distance km', 'Climb m']}
            rows={footFlipData.map((d) => [d.label, fmtInt(d.dist), fmtInt(d.elev)])}
          >
            <FootFlip items={footFlipData} />
          </Figure>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>The surprise</p>
            <h2 className="display" style={{ fontSize: 'var(--fs-xl)', margin: '0 0 var(--sp-3)', lineHeight: 1.08 }}>
              Running owns the distance. Walking owns the vertical.
            </h2>
            <p className="measure text-muted" style={{ margin: 0 }}>
              Running is 63% of the kilometres and only 13% of the climb. Flip to elevation and the balance
              inverts: walking and the trails carry three-quarters of it. A single trail run is a fraction of the
              distance and a third of all the vertical. Home is flat; the metres are earned uphill, on foot.
            </p>
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
            note="Every activity by the hour it started. Two rushes: a small dawn crowd near 6am and a much larger one after work. Evening, 5 to 8pm, is the busiest window by far, and 6pm the single busiest hour."
            source="Activity Log"
            tableCaption="Activities by hour of day"
            columns={['Hour', 'Activities']}
            rows={hours.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={hours} unit="activities" />
          </Figure>

          <Figure
            title="A week with no day off"
            note="Every activity stacked by weekday, one block per twenty-five. The striking part is how level the towers are: Tuesday 254, Saturday 329, nothing in between standing out. No rest day, just a slight weekend lean."
            source="Activity Log"
            tableCaption="Activities by weekday"
            columns={['Weekday', 'Activities']}
            rows={WEEKDAYS.map((w) => [w, fmtInt(weekday[w])])}
          >
            <UnitColumns data={weekdayData} unit={25} />
          </Figure>

          <Figure
            title="The shape of a typical outing"
            note={`Every foot outing by distance, drawn as a silhouette. Two peaks, not one: a tall stack of short 4 to 6 km sessions, the daily bread, then a second wave of 10 to 12 km runs. The median is ${fmtNum(medianKm, 1)} km; nothing on foot passes ${fmtInt(maxKm)} km. Rides are left out entirely.`}
            source="Activity Log"
            tableCaption="Foot activities by distance band (km)"
            columns={['Distance (km)', 'Activities']}
            rows={distData.map((d) => [d.label, fmtInt(d.value)])}
          >
            <DistCurve
              data={distData}
              medianLabel={`median ${fmtNum(medianKm, 1)} km`}
              medianAt={medianAt}
              tailNote={`longest: ${fmtInt(maxKm)} km`}
            />
          </Figure>

          <Figure
            title="When the crowd arrived"
            note="Average kudos per activity, year by year. For two years almost nobody watched, barely one kudos a session. Then in 2021, the same month the training took off, an audience arrived and peaked near 42 in 2023. The crowd followed the consistency, not the reverse."
            source="Activity Log"
            tableCaption="Average kudos per activity by year"
            columns={['Year', 'Avg kudos']}
            rows={kudosStems.map((p) => [p.label, fmtInt(p.value)])}
          >
            <CrowdStems points={kudosStems} inflection="2021" />
          </Figure>

          <Figure
            title="The year has a season"
            note="Activities by calendar month, all seven years stacked. July, deep in the cool dry season, is the busiest by a clear margin; February is the thinnest. The training has a season, and it tracks the weather."
            source="Activity Log"
            tableCaption="Activities by calendar month"
            columns={['Month', 'Activities']}
            rows={monthCells.map((m) => [m.label, fmtInt(m.value)])}
          >
            <HeatStrip cells={monthCells} unit="activities" cellHeight={48} />
          </Figure>

          <Figure
            title="Rarely a day off"
            note={`Once a day has an activity, the next usually comes fast: four times in five, it is the very next day. Across seven years, ${pctActiveDays}% of all calendar days carry at least one activity, and gaps of three days or more happen less than once in ten.`}
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

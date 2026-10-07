import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import StatCard from '../components/StatCard.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Figure from '../charts/Figure.jsx'
import DotGrid from '../charts/DotGrid.jsx'
import BarChart from '../charts/BarChart.jsx'
import HeatStrip from '../charts/HeatStrip.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import IndoorOutdoor from '../charts/IndoorOutdoor.jsx'
import HeroRotator from '../charts/HeroRotator.jsx'
import ContourField from '../charts/ContourField.jsx'
import SwitchStep from '../charts/SwitchStep.jsx'
import SwitchReveal from '../charts/SwitchReveal.jsx'
import FootFlip from '../charts/FootFlip.jsx'
// WeekLevel (even-week band) retired from the home opener; still available for Rhythm.
import EveryDayField from '../charts/EveryDayField.jsx'
import HabitMomentum from '../charts/HabitMomentum.jsx'
import TransitionMatrix from '../charts/TransitionMatrix.jsx'
import LorenzCurve from '../charts/LorenzCurve.jsx'
import { computeHabitMomentum } from '../lib/habitMomentum.js'
import { lorenz, topShare } from '../lib/stats.js'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { fmtInt, toNum } from '../lib/format.js'
import { prettySport } from '../lib/slug.js'
import { buildYearSummaries } from '../lib/yearStats.js'
import YearCharacters from '../components/YearCharacters.jsx'

const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function yearsBetween(a, b) {
  if (!a || !b) return null
  const start = new Date(a)
  const end = new Date(b)
  if (isNaN(start) || isNaN(end)) return null
  return Math.round((end - start) / (365.25 * 24 * 3600 * 1000))
}

// distance and elevation are foot-only across the site
const FOOT_HOME = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
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
  const activityGeo = useTable('activity_geo')
  const monthlyTotals = useTable('monthly_totals')
  const sportBreakdown = useTable('sport_breakdown')
  const nav = useTable('nav_index')

  // per-year character narrative (shared with the Year in Sport report)
  const geoByKey = useMemo(() => {
    const m = {}
    for (const g of activityGeo) m[g.activity_key] = g
    return m
  }, [activityGeo])
  const yearSummaries = useMemo(
    () => (activityLog.length ? buildYearSummaries(activityLog, geoByKey) : []),
    [activityLog, geoByKey]
  )
  const bestBy = (f) => yearSummaries.reduce((m, y) => (f(y.stats) > (m ? f(m.stats) : -1) ? y : m), null)
  const peakYr = bestBy((s) => s.n)
  const elevYr = bestBy((s) => s.elev)
  const ctryYr = bestBy((s) => s.countries.length)
  const latestSum = yearSummaries[yearSummaries.length - 1]
  const streakMonths = latestSum ? Math.max(1, Math.floor(latestSum.stats.streakLen / 30.44)) : 9

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

  // ---- unique, personal reframes (computed, not clichéd comparisons) ----
  const halfCount = activityLog.filter((a) => FOOT_HOME.has(a.sport_type) && (toNum(a.distance_km) || 0) >= 21.0975).length
  const activeMonthsH = [...new Set(monthlyTotals.map((mm) => mm.month).filter(Boolean))].sort()
  let monthStreak = 0
  if (activeMonthsH.length) {
    const set = new Set(activeMonthsH)
    let cur = activeMonthsH[activeMonthsH.length - 1]
    while (set.has(cur)) { monthStreak += 1; let y = +cur.slice(0, 4), mo = +cur.slice(5, 7) - 1; if (mo < 1) { mo = 12; y -= 1 } cur = `${y}-${String(mo).padStart(2, '0')}` }
  }
  const spanDaysMeta = meta.coverage_start && meta.coverage_end
    ? Math.max(1, Math.round((Date.parse(meta.coverage_end) - Date.parse(meta.coverage_start)) / 86400000))
    : 1
  const cadence = activityLog.length ? activityLog.length / spanDaysMeta : 0

  // the rotating headline metrics: the numbers NOT already shown in the three
  // cards (distance, vertical, streak live there), so the headline never mid-counts
  // a figure the reader is also reading solid beside it.
  const heroMetrics = [
    { value: toNum(activities), word: 'activities' },
    { value: monthStreak, word: 'months unbroken' },
    { value: halfCount, word: 'half-marathons' },
    { value: countryCount, word: 'countries' },
    { value: toNum(kudos), word: 'kudos' },
    { value: toNum(hoursMoving), word: 'hours moving' },
  ].filter((m) => Number.isFinite(m.value) && m.value > 0)

  // personal reframes for the "put another way" row
  const funv = (needle) => toNum((fun.find((f) => (f.comparison || '').toLowerCase().includes(needle)) || {}).value)
  const funFacts = [
    { num: fmtInt(funv('marathon')), suffix: '', label: 'marathons of distance' },
    { num: String(monthStreak), suffix: '', label: 'months, every one since the spark' },
    { num: String(halfCount), suffix: '', label: 'times past the half-marathon' },
    { num: cadence ? cadence.toFixed(2) : '', suffix: '', label: 'activities a day, seven years running' },
  ].filter((f) => f.num && f.num !== 'NaN' && f.num !== '0')

  // ---- Derived series for the front-page charts ----
  const hours = Array.from({ length: 24 }, () => 0)
  const months = Array(12).fill(0)
  const daySet = new Set()
  for (const a of activityLog) {
    const h = parseInt(a.hour, 10)
    if (Number.isFinite(h) && h >= 0 && h < 24) hours[h] += 1
    const mo = parseInt((a.date || '').slice(5, 7), 10)
    if (mo >= 1 && mo <= 12) months[mo - 1] += 1
    const dstr = (a.date || '').slice(0, 10)
    if (dstr) daySet.add(dstr)
  }

  // distance vs climb by foot sport, for the flip
  const FOOT_ORDER = ['Run', 'Walk', 'TrailRun', 'Hike']
  const FOOT_NAME = { Run: 'Run', Walk: 'Walk', TrailRun: 'Trail', Hike: 'Hike' }
  const footAgg = Object.fromEntries(FOOT_ORDER.map((k) => [k, { dist: 0, elev: 0 }]))
  for (const a of activityLog) {
    if (footAgg[a.sport_type]) { footAgg[a.sport_type].dist += toNum(a.distance_km) || 0; footAgg[a.sport_type].elev += toNum(a.elevation_gain_m) || 0 }
  }
  const footFlipData = FOOT_ORDER.map((k) => ({ key: k, label: FOOT_NAME[k], dist: footAgg[k].dist, elev: footAgg[k].elev }))

  // the switch as a rate: activities per calendar month before vs from July 2021
  const switchRate = (() => {
    const SW = '2021-07'
    const ym = (s) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7))
    const months = monthlyTotals.map((mm) => mm.month).filter(Boolean).sort()
    if (!months.length) return null
    let before = 0
    let after = 0
    for (const mm of monthlyTotals) {
      const n = toNum(mm.activities) || 0
      if (mm.month < SW) before += n
      else after += n
    }
    const bSpan = ym('2021-06') - ym(months[0]) + 1
    const aSpan = ym(months[months.length - 1]) - ym(SW) + 1
    return { before: before / bSpan, after: after / aSpan }
  })()

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

  // ---- opener data ----
  const DAY = 86400000
  // A. concentration of distance across days, for the Lorenz curve (Opener 2)
  const dailyFootKm = useMemo(() => {
    const m = {}
    for (const a of activityLog) {
      if (FOOT_HOME.has(a.sport_type)) { const d = (a.date || '').slice(0, 10); if (d) m[d] = (m[d] || 0) + (toNum(a.distance_km) || 0) }
    }
    return Object.values(m).filter((v) => v > 0)
  }, [activityLog])
  const lorenzData = useMemo(() => lorenz(dailyFootKm), [dailyFootKm])
  const top10Share = Math.round(topShare(dailyFootKm, 0.1) * 100)
  const top20Share = Math.round(topShare(dailyFootKm, 0.2) * 100)
  // B. every-day field: the ongoing streak range, for the highlight band
  const edFirst = sortedDays[0]
  const edLast = sortedDays[sortedDays.length - 1]
  const edStreak = useMemo(() => {
    if (!sortedDays.length) return {}
    let startMs = Date.parse(edLast)
    while (daySet.has(new Date(startMs - DAY).toISOString().slice(0, 10))) startMs -= DAY
    return { start: new Date(startMs).toISOString().slice(0, 10), end: edLast }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog, edLast])
  const edTotalDays = (edFirst && edLast) ? Math.round((Date.parse(edLast) - Date.parse(edFirst)) / DAY) + 1 : 0
  // C. habit momentum: the Markov transition curves (momentum vs rust)
  const momentum = useMemo(
    () => (edFirst ? computeHabitMomentum(daySet, edFirst, edLast, '2021-07-01', 30) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activityLog, edFirst, edLast]
  )
  const mBefore = momentum ? Math.round(momentum.before.p11 * 100) : 35
  const mAfter = momentum ? Math.round(momentum.origin * 100) : 82
  const mDeep = momentum && momentum.stick.length ? Math.round(momentum.stick[momentum.stick.length - 1].p * 100) : 99
  const mRest = momentum && momentum.rebound.length ? Math.round(momentum.rebound[momentum.rebound.length - 1].p * 100) : 33

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

  // indoor share by year, for the "off the treadmill" figure's table fallback
  const trainerTrue = (v) => { const s = String(v).trim().toLowerCase(); return s === '1' || s === 'true' || s === 'yes' }
  const ioAgg = {}
  for (const a of activityLog) {
    const y = (a.date || '').slice(0, 4)
    if (!/^\d{4}$/.test(y)) continue
    const e = (ioAgg[y] = ioAgg[y] || { indoor: 0, n: 0 })
    if (trainerTrue(a.trainer)) e.indoor += 1
    e.n += 1
  }
  const indoorYearRows = Object.keys(ioAgg).sort().map((y) => [y, `${Math.round((ioAgg[y].indoor / ioAgg[y].n) * 100)}%`])
  // geography and sport tables (from their source CSVs)
  const geoLocated = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS')
  const geoRows = geoLocated.map((c) => [c.country, fmtInt(c.activities)])
  // group by display name so the hidden data table matches the chart and never
  // names the quiet sports (they fold into one "Other activity" row)
  const sportRows = (() => {
    const by = new Map()
    for (const s of sportBreakdown) {
      if (!s.sport) continue
      const label = prettySport(s.sport)
      by.set(label, (by.get(label) || 0) + (toNum(s.activities) || 0))
    }
    return [...by.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => [label, fmtInt(n)])
  })()

  // use each chapter's own number from nav_index so the index matches the number
  // shown on the chapter's own page (02-10), not a re-sequenced 01-09
  const menuItems = nav.filter((r) => r.route !== '/')

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
              {years || 7} years of training, and no two of them alike. It took two years to catch,
              then July 2021 flipped a switch that has not flipped back. Every year since has had its
              own character: a peak of {peakYr ? fmtInt(peakYr.stats.n) : '443'} activities, a year
              that climbed over {elevYr ? (Math.floor(elevYr.stats.elev / 1000) * 1000).toLocaleString() : '21,000'} metres
              on foot, another that reached {ctryYr ? ctryYr.stats.countries.length : 6} countries, and the
              one running now that has not missed a day in {streakMonths} months.
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
            <StatCard value={fmtInt(km)} unit="km" label="Distance on foot" note="Run, walked and hiked. That alone is close to a third of the way around the equator." />
            <StatCard value={fmtInt(elevation)} unit="m" label="Vertical climbed" note="About nine and a half Everests of climbing, and most of it came on walks, not runs." />
            <StatCard value={fmtInt(streak)} unit="days" label="Longest active streak" note="The longest run of days without a gap so far, and it is still going." />
          </div>
        </section>
      </Container>

      {/* ===== OPENER OPTION 1 · the physics of the habit (momentum) ===== */}
      {momentum && (
        <Container>
          <hr className="rule" />
          <div className="opener" style={{ paddingBlock: 'var(--sp-7)' }}>
            <div className="section-head">
              <p className="eyebrow">Opener 1 &middot; The physics of the habit</p>
              <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>A streak keeps itself going.</h2>
              <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>
                Read day by day, the training behaves like a Markov chain: what you do today shifts the odds for tomorrow. The deeper a streak runs the more certain the next day gets, up to {mDeep}% once a month is on the board; stop, and a few days off slide the odds of coming back down to {mRest}%. On the left is how those odds move. On the right is the engine driving them.
              </p>
            </div>
            <div className="opener2col">
              <div>
                <HabitMomentum stick={momentum.stick} rebound={momentum.rebound} origin={momentum.origin} />
                <p className="source fig__source" style={{ marginTop: 'var(--sp-3)' }}>Source: Activity Log &middot; daily active/rest series since July 2021</p>
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Today &rarr; tomorrow</p>
                <TransitionMatrix p11={momentum.after.p11} p01={momentum.after.p01} beforeP11={momentum.before.p11} activeFrac={momentum.activeFrac} />
              </div>
            </div>
          </div>
        </Container>
      )}

      {/* ===== OPENER OPTION 2 · how evenly the distance is shared (Lorenz) ===== */}
      {dailyFootKm.length > 20 && (
        <div className="bleed bleed--level">
          <Container>
            <div className="opener" style={{ paddingBlock: 'var(--sp-7)' }}>
              <div className="opener2col opener2col--text">
                <div className="section-head" style={{ margin: 0 }}>
                  <p className="eyebrow">Opener 2 &middot; Who does the work</p>
                  <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>The big days pull more than their weight.</h2>
                  <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 0' }}>
                    Sort every active day by how far it went and stack them up. The busiest tenth of days hold about {top10Share}% of all the ground, and the top fifth hold {top20Share}%. The gap between the curve and the straight line of a perfectly even record is the Gini coefficient, {lorenzData.gini.toFixed(2)}, a moderate lean rather than a handful of epic days doing everything.
                  </p>
                </div>
                <LorenzCurve points={lorenzData.points} gini={lorenzData.gini} markP={0.9} unitLabel="distance on foot" />
              </div>
              <p className="source fig__source" style={{ marginTop: 'var(--sp-4)' }}>Source: Activity Log &middot; daily foot distance, {dailyFootKm.length} active days</p>
            </div>
          </Container>
        </div>
      )}

      {/* ===== OPENER OPTION 3 · every single day ===== */}
      {edFirst && (
        <Container>
          <hr className="rule" />
          <div className="opener" style={{ paddingBlock: 'var(--sp-7)' }}>
            <div className="section-head">
              <p className="eyebrow">Opener 3 &middot; Every single day</p>
              <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
                Active <span style={{ color: 'var(--accent)' }}>{fmtInt(activeDays)}</span> of {fmtInt(edTotalDays)} days.
              </h2>
              <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>
                One square for every day since the first run. The lit ones carried an activity, more than half of all of them. The long dark band is the 353-day silence; the bright run at the end is the streak still going.
              </p>
            </div>
            <EveryDayField firstISO={edFirst} lastISO={edLast} activeSet={daySet} streakStartISO={edStreak.start} streakEndISO={edStreak.end} />
            <div className="chart-legend" style={{ marginTop: 'var(--sp-4)' }}>
              <span><i className="chart-swatch" style={{ background: 'var(--grey-10)' }} /> rest day</span>
              <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> active</span>
              <span><i className="chart-swatch" style={{ background: 'var(--accent-ink)' }} /> current streak</span>
            </div>
          </div>
        </Container>
      )}

      {/* ---- Seven years, seven characters: the per-year narrative ------ */}
      {yearSummaries.length > 0 && (
        <Container>
          <hr className="rule" />
          <div style={{ paddingBlock: 'var(--sp-7)' }}>
            <div className="section-head">
              <p className="eyebrow">No two years the same</p>
              <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
                Seven years, seven characters.
              </h2>
              <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 0' }}>
                The habit held the whole way, but each year ran differently. Here is the one thing that
                set each apart. Open any year for its full report.
              </p>
            </div>
            <YearCharacters summaries={yearSummaries} />
          </div>
        </Container>
      )}

      {/* ---- The signature image: every activity, one dot -------------- */}
      <Container>
        <hr className="rule" />
        <div className="dotfig" style={{ paddingBlock: 'var(--sp-6)' }}>
          <Figure
            title="Every activity, one dot"
            note={`The first two years barely register: 27 outings in 2019, 35 in 2020, a couple a month. Then the back half of 2021 cracks it open to 328, and 2022 tops out at 443, the busiest there has been. The quiet surprise is what comes after. The count stops climbing and settles around 300 a year, roughly six a week, and it has sat there four years running. 2026 passed 300 before the year was even out. The spike started the habit. The flat bands under it are the habit just carrying on.`}
            source="Activity Log"
            tableCaption="Activities by year"
            columns={['Year', 'Activities']}
            rows={yearCounts}
          >
            <DotGrid items={items} years={gridYears} />
          </Figure>
        </div>
      </Container>

      {/* ---- The Switch: the narrative climax, full-bleed -------------- */}
      <div className="bleed bleed--switch">
        <Container>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>When did this become a habit?</p>
          <Figure
            title="The switch"
            note="Two quiet years, a few entries a month at most. Then June 2021 logs two activities and July logs fifty-eight. The data never says why it happened, only that from that month on the quiet never really came back. Drag the marker to walk through the months."
            source="Monthly Trends"
            tableCaption="Activities per month"
            columns={['Month', 'Activities']}
            rows={monthlyTotals.map((mm) => [mm.month, mm.activities])}
          >
            <SwitchReveal rows={monthlyTotals} switchMonth="2021-07" />
          </Figure>
          {switchRate && (
            <div className="grid grid--2" style={{ alignItems: 'center', gap: 'var(--sp-6) var(--sp-8)', paddingTop: 'var(--sp-6)' }}>
              <Figure
                n="01"
                title="A hobby, then a habit"
                note="Before July 2021 it ran at under three activities a month. Since then it has held near thirty-one. Eleven times as often, five years without settling back."
                source="Monthly Trends"
                tableCaption="Activities per month, before July 2021 versus since"
                columns={['Era', 'Activities / month']}
                rows={[['Before Jul 2021', switchRate.before.toFixed(1)], ['Since', switchRate.after.toFixed(1)]]}
              >
                <SwitchStep before={switchRate.before} after={switchRate.after} />
              </Figure>
              <div>
                <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>The multiplier</p>
                <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
                  Two-point-eight a month became thirty-one.
                </p>
                <p className="text-muted" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}>
                  No single week looks dramatic on its own. Stack it all into a rate and the jump is hard to miss: eleven times as often, and it never came back down.
                </p>
              </div>
            </div>
          )}
        </Container>
      </div>

      {/* ---- The flip: distance vs climb by sport ---------------------- */}
      <Container>
        <div className="grid grid--2" style={{ alignItems: 'center', gap: 'var(--sp-6) var(--sp-8)', paddingBlock: 'var(--sp-7)' }}>
          <Figure
            title="Walking climbs, running runs"
            note="Distance down the left, climb down the right, one ribbon per foot sport. A sport that is a fat band for distance can be a sliver for climb, and the other way round. Watch running make the switch."
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

      {/* ---- A closer look: six habit charts, three clean rows --------- */}
      <Container>
        <hr className="rule" />
        <div className="section-head">
          <p className="eyebrow">A closer look</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-lg)' }}>
            Six smaller things the data shows.
          </h2>
        </div>
        <div className="grid grid--2 closer-grid" style={{ gap: 'var(--sp-8) var(--sp-7)', paddingBottom: 'var(--sp-7)' }}>
          {/* Row 1 — the range of it: where, then what */}
          <Figure
            title="Where in the world"
            note={`Wherever a GPS fix could place an activity, grouped by country. More than nine in ten happened at home in Tanzania. The rest is travel, scattered thin across ${geoLocated.length - 1} other countries, a few activities apiece, down to a single run in the farthest of them.`}
            source="Strava GPS + point-in-polygon"
            tableCaption="Located activities by country"
            columns={['Country', 'Activities']}
            rows={geoRows}
            footer={(
              <>
                <p className="eyebrow">The far countries</p>
                <p>Kenya and Malawi, the near neighbours, hold three in four of the away activities between them. The rest thin out fast: a pair in Rwanda, and beyond them a handful of one-off stops, down to a single run in 2026 that added the newest stamp of all.</p>
                <p>The shape is lopsided by design. Nine in ten pins fall inside Tanzania, most of them looped through Dodoma and Dar es Salaam. The away days are stretched thin across three continents and seven years, and nearly all of them are a single trip that never came round again.</p>
              </>
            )}
          >
            <GeoBubbles rows={countries} />
          </Figure>

          <Figure
            title="Every way to move"
            note="Each foot sport is a tile, bigger the more often it was done. Walking and running take almost the whole frame. Everything off the feet is gathered into one other bucket, counted but never broken out. Four in five outings still happen on two feet."
            source="Strava Overview"
            tableCaption="Activities by sport type"
            columns={['Sport', 'Activities']}
            rows={sportRows}
            footer={(
              <>
                <p className="eyebrow">The shape of it</p>
                <p>Set walking and running aside and everything else together makes up barely a sixth of every outing. The log holds other ways of moving too, but the centre of gravity never drifts far from two feet on the ground.</p>
              </>
            )}
          >
            <SportTreemap rows={sportBreakdown} />
          </Figure>

          {/* Row 2 — the rhythm of it: hour of day, then time of year */}
          <Figure
            title="When the day gets moving"
            note="Sorted by the hour each one began. There are two rushes. A thin dawn crowd shows up near 6am, then a much bigger one after work. Five to eight in the evening carries the day, and 6pm is the busiest hour on the clock."
            source="Activity Log"
            tableCaption="Activities by hour of day"
            columns={['Hour', 'Activities']}
            rows={hours.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={hours} unit="activities" />
          </Figure>

          <Figure
            title="The year has a season"
            note="Seven years of months laid on top of each other. July wins by a distance, right in the cool dry season, while February is the emptiest. The training keeps a calendar, and it belongs to the weather, not the gym."
            source="Activity Log"
            tableCaption="Activities by calendar month"
            columns={['Month', 'Activities']}
            rows={monthCells.map((m) => [m.label, fmtInt(m.value)])}
            footer={(
              <>
                <p className="eyebrow">A weather habit</p>
                <p>The calendar the body keeps is Tanzania&rsquo;s, not the gym&rsquo;s. The long dry season runs June to October, cool and rainless on the central plateau, and those are the months that swell here.</p>
                <p>The thin months line up with the short rains in November and the hot build-up around February. Seven years on it hardly shifts: the training keeps the weather's calendar.</p>
              </>
            )}
          >
            <HeatStrip cells={monthCells} unit="activities" cellHeight={56} />
          </Figure>

          {/* Row 3 — the habit of it: the move outside, then the streak */}
          <Figure
            title="Off the treadmill"
            note="Every year split into indoor sessions and outdoor ones, stacked to a hundred percent. Early on, nearly two in three started indoors on a machine. By last year that was down to about one in six. Little by little, the habit walked out the door."
            source="Activity Log"
            tableCaption="Indoor share of activities by year"
            columns={['Year', 'Indoor share']}
            rows={indoorYearRows}
          >
            <IndoorOutdoor activities={activityLog} />
          </Figure>

          <Figure
            title="Rarely a day off"
            note={`After an active day, the next one tends to follow straight away: four times in five it is the very next day. Over seven years, ${pctActiveDays}% of all calendar days carry something, and a gap of three days or more shows up less than once in ten.`}
            source="Activity Log"
            tableCaption="Days until the next active day"
            columns={['Gap to next active day', 'Share']}
            rows={gapData.map((g) => [g.label, g.display])}
          >
            <BarChart data={gapData} accent />
          </Figure>
        </div>
      </Container>

      {/* ---- The far edges: greatest-hits teaser into the best pages --- */}
      <div className="bleed bleed--edges">
        <Container>
          <div className="section-head" style={{ paddingBottom: 'var(--sp-5)' }}>
            <p className="eyebrow">The far edges</p>
            <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
              The records hiding in the data.
            </h2>
            <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 0' }}>
              Records the seven years turned up without any fuss. A few worth pulling out.
            </p>
          </div>
          <ul className="edges">
            <li><Link className="edgecard" to="/goals#marathon">
              <span className="edgecard__stat">2:56:44</span>
              <span className="edgecard__lbl">The one full marathon, run sub&#8209;three&#8209;hours</span>
              <span className="edgecard__foot">
                <span className="edgecard__when mono">May 2022</span>
                <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
              </span>
            </Link></li>
            <li><Link className="edgecard" to="/goals#kili-half">
              <span className="edgecard__stat">4<span className="edgecard__unit">years</span></span>
              <span className="edgecard__lbl">The Kilimanjaro Half, quicker every single time</span>
              <span className="edgecard__foot">
                <span className="edgecard__when mono">2023&ndash;2026</span>
                <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
              </span>
            </Link></li>
            <li><Link className="edgecard" to="/goals#stage-race">
              <span className="edgecard__stat">100<span className="edgecard__unit">km</span></span>
              <span className="edgecard__lbl">A stage race, four evenings back to back</span>
              <span className="edgecard__foot">
                <span className="edgecard__when mono">Mar 2023</span>
                <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
              </span>
            </Link></li>
            <li><Link className="edgecard" to="/goals#month-streak">
              <span className="edgecard__stat">{monthStreak}<span className="edgecard__unit">months</span></span>
              <span className="edgecard__lbl">Every calendar month, unbroken and still going</span>
              <span className="edgecard__foot">
                <span className="edgecard__when mono">since Jun 2021</span>
                <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
              </span>
            </Link></li>
          </ul>
        </Container>
      </div>

      {/* ---- The exit: the full index -------------------------------- */}
      <Container>
        <div style={{ paddingBlock: 'var(--sp-7)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-1)' }}>Explore</p>
          <h2 className="display" style={{ fontSize: 'var(--fs-2xl)', margin: '0 0 var(--sp-5)' }}>
            {cap(NUMWORD[menuItems.length] || String(menuItems.length))} ways in.
          </h2>
          <IndexHub items={menuItems} compact />
        </div>
      </Container>
    </Layout>
  )
}

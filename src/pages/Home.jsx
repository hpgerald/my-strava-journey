import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Figure from '../charts/Figure.jsx'
import DotGrid from '../charts/DotGrid.jsx'
import BarChart from '../charts/BarChart.jsx'
import HeatStrip from '../charts/HeatStrip.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import IndoorOutdoor from '../charts/IndoorOutdoor.jsx'
import SwitchStep from '../charts/SwitchStep.jsx'
import SwitchReveal from '../charts/SwitchReveal.jsx'
import FootFlip from '../charts/FootFlip.jsx'
// WeekLevel (even-week band) retired from the home opener; still available for Rhythm.
import EveryDayField from '../charts/EveryDayField.jsx'
import HabitMomentum from '../charts/HabitMomentum.jsx'
import TransitionMatrix from '../charts/TransitionMatrix.jsx'
import LorenzCurve from '../charts/LorenzCurve.jsx'
import DecileBars from '../charts/DecileBars.jsx'
import HeartbeatYears from '../charts/HeartbeatYears.jsx'
import { computeHabitMomentum } from '../lib/habitMomentum.js'
import { lorenz, topShare } from '../lib/stats.js'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { fmtInt, toNum } from '../lib/format.js'
import { prettySport } from '../lib/slug.js'
import { buildYearSummaries } from '../lib/yearStats.js'
import YearCharacters from '../components/YearCharacters.jsx'
import FieldNote from '../components/FieldNote.jsx'
import HeroYears from '../components/HeroYears.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { Reveal } from '../components/Reveal.jsx'

const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function yearsBetween(a, b) {
  if (!a || !b) return null
  const start = new Date(a)
  const end = new Date(b)
  if (isNaN(start) || isNaN(end)) return null
  return Math.floor((end - start) / (365.25 * 24 * 3600 * 1000))
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

  // consecutive calendar months with activity, for the month-streak record below
  const activeMonthsH = [...new Set(monthlyTotals.map((mm) => mm.month).filter(Boolean))].sort()
  let monthStreak = 0
  if (activeMonthsH.length) {
    const set = new Set(activeMonthsH)
    let cur = activeMonthsH[activeMonthsH.length - 1]
    while (set.has(cur)) { monthStreak += 1; let y = +cur.slice(0, 4), mo = +cur.slice(5, 7) - 1; if (mo < 1) { mo = 12; y -= 1 } cur = `${y}-${String(mo).padStart(2, '0')}` }
  }

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
  // the slices the section quotes, all from the same lined-up days
  const work = useMemo(() => {
    const v = dailyFootKm.slice().sort((a, b) => a - b)
    const n = v.length
    if (!n) return null
    const total = v.reduce((a, b) => a + b, 0) || 1
    const shares = Array(10).fill(0)
    v.forEach((d, i) => { shares[Math.min(9, Math.floor((i * 10) / n))] += d / total })
    const k10 = Math.max(1, Math.round(n * 0.1))
    const k1 = Math.max(1, Math.round(n * 0.01))
    const big = v.filter((d) => d >= 10)
    return {
      n, total, shares,
      half: shares.slice(0, 5).reduce((a, b) => a + b, 0),
      fifth: topShare(v, 0.2),
      tenth: topShare(v, 0.1),
      tenthFrom: v[n - k10],
      k1, one: topShare(v, 0.01),
      bigN: big.length,
      bigShare: big.reduce((a, b) => a + b, 0) / total,
    }
  }, [dailyFootKm])
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
  // waypoints on the two curves, and what the two daily odds predict long-run
  const pc = (v) => Math.round((v || 0) * 100)
  const stickAt = (L) => (momentum ? momentum.stick.find((s) => s.L === L) || momentum.stick[momentum.stick.length - 1] : null)
  const offAt = (g) => (momentum ? momentum.rebound.find((r) => r.g === g) || momentum.rebound[momentum.rebound.length - 1] : null)
  const mWeek = stickAt(7)
  const mThreeWk = stickAt(21)
  const mOneOff = offAt(1)
  const mFiveOff = momentum ? momentum.rebound[momentum.rebound.length - 1] : null
  const mSteady = momentum ? momentum.after.p01 / (1 - momentum.after.p11 + momentum.after.p01) : 0

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

  // hero: typical outing size and the current unbroken streak
  const medFootKm = (() => {
    const ds = activityLog.filter((a) => FOOT_HOME.has(a.sport_type)).map((a) => toNum(a.distance_km) || 0).filter((v) => v > 0).sort((x, y) => x - y)
    if (!ds.length) return 6
    const m = Math.floor(ds.length / 2)
    return ds.length % 2 ? ds[m] : (ds[m - 1] + ds[m]) / 2
  })()
  const curStreak = (edStreak.start && edStreak.end)
    ? Math.round((Date.parse(edStreak.end) - Date.parse(edStreak.start)) / DAY) + 1
    : toNum(streak)
  const ctryMost = ctryYr ? ctryYr.stats.countries.length : 6
  // the last year before the long silence (its bars are grey on the band)
  const quietUntil = (() => {
    let best = 0, before = null
    for (let i = 1; i < sortedDays.length; i++) {
      const d = Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1])
      if (d > best) { best = d; before = sortedDays[i - 1] }
    }
    return before ? Number(before.slice(0, 4)) : 2020
  })()
  // one line per year, written to fill two lines of its cell; figures come from
  // that year's own stats so they stay true on every refresh
  const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
  const statsOf = Object.fromEntries(yearSummaries.map((ys) => [ys.year, ys.stats]))
  const YEAR_LINE = {
    2019: (s) => `Started in August, mostly indoors: ${n0(s.footKm)} km in under five months.`,
    2020: (s) => `Went quiet for close to a year. Just ${n0(s.footKm)} km, less than the year before.`,
    2021: (s) => `Caught, nearly ten times the activity, and a ${s.streakLen}-day streak.`,
    2022: () => 'The busiest year, and the one marathon: 42.7 km in 2 hours 57.',
    2023: (s) => `Climbed the most: ${n0(s.elev)} m, more than twice the height of Everest.`,
    2024: (s) => `Reached the most countries, ${s.countries.length} of them, from Rwanda to Saudi Arabia.`,
    2025: (s) => `Had the steepest day: ${n0(s.highestClimb && s.highestClimb.val)} m in one outing, close to two vertical km.`,
    2026: (s) => {
      const elapsed = Math.round((Date.parse(s.endISO) - Date.UTC(2026, 0, 1)) / 86400000) + 1
      return s.activeDays >= elapsed
        ? `Not finished, and every one of its ${s.activeDays} days so far has an activity.`
        : `Not finished: ${s.activeDays} active days so far, the year still being written.`
    },
  }
  const heroYears = gridYears.map((y) => ({
    y,
    n: items.filter((d) => d.year === y).length,
    fact: YEAR_LINE[y] && statsOf[y] ? YEAR_LINE[y](statsOf[y]) : '',
  }))

  // use each chapter's own number from nav_index so the index matches the number
  // shown on the chapter's own page (02-10), not a re-sequenced 01-09
  const menuItems = nav.filter((r) => r.route !== '/')

  return (
    <Layout>
      <Container>
        {/* ---- Type-led hero: headline left, key figures stacked right --- */}
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="visually-hidden">
            {years || 7} years, {fmtInt(activities)} activities, one habit.
          </h1>

          <HeartbeatYears activities={activityLog} km={km} elevation={elevation} streak={curStreak} />

          <Reveal as="p" className="hero__statement">
            The record is built from days too small to notice. The usual outing is {Math.round(medFootKm)} km,
            about an hour, a walk or an easy run. What makes it add up is how often it happens: something on{' '}
            {pctActiveDays}% of all days across {years || 7} years, and a streak {fmtInt(curStreak)} days deep as you
            read this. Showing up daily adds up.
          </Reveal>

          <HeroYears years={heroYears} quietUntil={quietUntil} />
        </section>
      </Container>

      {/* ===== How the streak holds: momentum + today/tomorrow grid ===== */}
      {momentum && mWeek && mOneOff && mFiveOff && (
        <Container>
          <hr className="rule" />
          <section className="sgrid" aria-labelledby="streak-title">
            <div className="sgrid__head">
              <p className="eyebrow">How the streak holds</p>
              <h2 id="streak-title" className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
                A streak is easier to keep than to restart.
              </h2>
            </div>

            <Reveal as="p" className="sgrid__statement">
              Every day out makes the next one more likely, and every day off makes coming back harder. Move today and
              there is an {mAfter}% chance you move tomorrow. Keep going for a week and it is {pc(mWeek.p)}%; after three
              weeks, {pc(mThreeWk.p)}%. Stop for {['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][mFiveOff.g] || mFiveOff.g} days
              and it falls to {pc(mFiveOff.p)}%.
            </Reveal>

            <OddsRow
              title="Chance the next day is active"
              items={[
                { value: mFiveOff.p, label: `after ${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][mFiveOff.g] || mFiveOff.g} days off`, tone: 'rest' },
                { value: mOneOff.p, label: 'after one day off', tone: 'rest' },
                { value: momentum.origin, label: 'if you moved today', tone: 'move' },
                { value: mWeek.p, label: 'after a week on a roll', tone: 'move' },
              ]}
            />

            <div className="sgrid__pair">
              <figure className="sgrid__fig sgrid__fig--chart">
                <figcaption className="sgrid__figtitle">The odds, day by day</figcaption>
                <HabitMomentum stick={momentum.stick} rebound={momentum.rebound} origin={momentum.origin} />
              </figure>
              <figure className="sgrid__fig sgrid__fig--mx">
                <figcaption className="sgrid__figtitle">Given today, the chance of tomorrow</figcaption>
                <TransitionMatrix p11={momentum.after.p11} p01={momentum.after.p01} />
              </figure>
              <p className="sgrid__note sgrid__note--chart">
                <b>How to read it.</b> The dashed line is a day you moved. Each step right is one more day in a row; each
                step left is one more day since you last moved. The orange line climbs and flattens near {mDeep}%. The grey
                line drops fast: a single day off already brings the odds down to {pc(mOneOff.p)}%.
              </p>
              <p className="sgrid__note sgrid__note--mx">
                <b>Why it holds.</b> Each row adds up to 100%. Those two numbers, {mAfter}% after a day out and{' '}
                {pc(momentum.after.p01)}% after a day off, predict that {pc(mSteady)}% of days should be active in the long
                run. Since 2021, {pc(momentum.activeFrac)}% were. Before the habit caught, a day out led to another only{' '}
                {mBefore}% of the time.
              </p>
            </div>
            <p className="source">Source: Activity Log &middot; every day marked active or rest, measured since the habit caught in 2021</p>
          </section>
        </Container>
      )}

      {/* ===== Who does the work: how the distance spreads across days ===== */}
      {work && work.n > 20 && (
        <div className="bleed bleed--level">
          <Container>
            <section className="sgrid" aria-labelledby="work-title">
              <div className="sgrid__head">
                <p className="eyebrow">Who does the work</p>
                <h2 id="work-title" className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
                  The busiest tenth of days carry as much as the quietest half.
                </h2>
              </div>

              <Reveal as="p" className="sgrid__statement">
                Line up all {fmtInt(work.n)} days on foot from shortest to longest. The busiest tenth, every day over{' '}
                {Math.floor(work.tenthFrom)} km, carry {pc(work.tenth)}% of the {fmtInt(work.total)} km. That is as much as
                the quietest half put together. The big days matter, yet no handful of them makes the record: the{' '}
                {work.k1} biggest days of all carry under {Math.ceil(work.one * 100)}%.
              </Reveal>

              <OddsRow
                title="Share of all distance on foot"
                items={[
                  { value: work.half, label: 'the quietest half of days', tone: 'rest' },
                  { value: work.fifth, label: 'the busiest fifth of days', tone: 'move' },
                  { value: work.tenth, label: 'the busiest tenth of days', tone: 'move' },
                  { value: work.one, label: `the ${work.k1} biggest days`, tone: 'move' },
                ]}
              />

              <div className="sgrid__pair">
                <figure className="sgrid__fig sgrid__fig--chart">
                  <figcaption className="sgrid__figtitle">Every day, added up</figcaption>
                  <LorenzCurve points={lorenzData.points} gini={lorenzData.gini} markP={0.9} />
                </figure>
                <figure className="sgrid__fig sgrid__fig--mx">
                  <figcaption className="sgrid__figtitle">Each tenth of days, by its share</figcaption>
                  <DecileBars shares={work.shares} />
                </figure>
                <p className="sgrid__note sgrid__note--chart">
                  <b>How to read it.</b> Days run left to right from shortest to longest, and the line adds up their
                  distance as it goes. If every day were the same length it would follow the dashed diagonal. The shaded
                  gap is the Gini coefficient, one number for how uneven a split is: 0 means every day equal, 1 means a
                  single day did everything. Here it is {lorenzData.gini.toFixed(2)}.
                </p>
                <p className="sgrid__note sgrid__note--mx">
                  <b>Why it matters.</b> In an even record each tenth would carry 10%. The shortest tenth carries{' '}
                  {(work.shares[0] * 100).toFixed(1)}%, the longest {(work.shares[9] * 100).toFixed(1)}%. Days of 10 km or
                  more are {fmtInt(work.bigN)} of the {fmtInt(work.n)}, {work.bigN < work.n / 2 ? 'under half' : `${pc(work.bigN / work.n)}%`}, and they carry {pc(work.bigShare)}% of
                  the distance. The short days keep the habit; the long ones build the kilometres.
                </p>
              </div>
              <p className="source">Source: Activity Log &middot; daily distance on foot (run, walk, trail run, hike), {fmtInt(work.n)} days</p>
            </section>
          </Container>
        </div>
      )}

      {/* ===== Every single day: the active-day field ===== */}
      {edFirst && (
        <Container>
          <hr className="rule" />
          <div className="opener" style={{ paddingBlock: 'var(--sp-7)' }}>
            <div className="section-head">
              <p className="eyebrow">Every single day</p>
              <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
                Active <span style={{ color: 'var(--accent)' }}>{fmtInt(activeDays)}</span> of {fmtInt(edTotalDays)} days.
              </h2>
              <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>
                More than half of every single day since the first run carried an activity. One square per day, lit when something was logged. The long dark band is the 353-day silence. The bright run on the end is the streak, still going. Showing up daily adds up, and here is what it adds up to.
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
            note={`The habit did not build slowly; it switched on. The first two years are nearly empty, a couple of dots a month. Then 2021 jumps straight to over three hundred. What happens next is the real point: it stops climbing and holds near three hundred a year, four years running. The jump lit the habit. The flat years are the habit refusing to fade.`}
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
            note="There is an exact moment the hobby became a habit. For two years the record sits near empty, a few entries a month, sometimes none. Then one month it turns over: two activities become fifty-eight, almost overnight, and the calendar never goes blank again. The data does not say what caused it, only that from here on there is no going back. Drag the marker to move through the months."
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
                note="Before the switch it ran a couple of times a month, the pace of a passing interest. After, it settled near thirty a month and stayed. Eleven times as often, and it never slipped back."
                source="Monthly Trends"
                tableCaption="Activities per month, before the 2021 switch versus since"
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
                  No single week looks dramatic. Line the weeks up as a monthly rate and the jump is impossible to miss: eleven times as often, and it held. A habit is built from unremarkable days.
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
            note="Running is a wide band for distance and a thin one for climb. Walking is the reverse. Distance on the left, climb on the right, one ribbon per foot sport. Watch running move from one side to the other."
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
              Here is the thing most people get backwards. Running is 63% of the kilometres but only 13% of the
              climb; it stays quick and flat, mostly on a treadmill. The metres come from somewhere else. Switch to
              elevation and it flips: walking and the trails carry three-quarters of every vertical metre. A single
              trail run covers little ground and a third of all the climbing. Home is flat. The height is earned
              slowly, uphill, on foot.
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
            note={`This is a story told from home. More than nine in ten activities happened in Tanzania; the rest is travel, thin across ${geoLocated.length - 1} other countries, a few each, down to a single run in the farthest. Every activity a GPS fix could place, grouped by country.`}
            source="Strava GPS + point-in-polygon"
            tableCaption="Located activities by country"
            columns={['Country', 'Activities']}
            rows={geoRows}
            footer={(
              <>
                <p className="eyebrow">The far countries</p>
                <p>Kenya and Malawi, the near neighbours, hold three in four of the away activities between them. After that it drops off fast: a pair in Rwanda, then a scatter of one-off stops, down to one run in 2026, the newest pin on the map.</p>
                <p>The shape is lopsided for a reason. Nine in ten fixes fall inside Tanzania, most looped through Dodoma and Dar es Salaam. The away days are spread across three continents and seven years, and nearly all were a single trip that never came round again.</p>
              </>
            )}
          >
            <GeoBubbles rows={countries} />
          </Figure>

          <Figure
            title="Every way to move"
            note="Four outings in five happen on two feet. Walking and running fill almost the whole frame; each foot sport is a tile, bigger the more often it was done, and everything off the feet folds into one bucket, counted but not split out."
            source="Strava Overview"
            tableCaption="Activities by sport type"
            columns={['Sport', 'Activities']}
            rows={sportRows}
            footer={(
              <>
                <p className="eyebrow">The shape of it</p>
                <p>Set walking and running aside and the rest is barely a sixth of all outings. There are other ways of moving in the log, but the weight of it stays on the ground, on two feet.</p>
              </>
            )}
          >
            <SportTreemap rows={sportBreakdown} />
          </Figure>

          {/* Row 2 — the rhythm of it: hour of day, then time of year */}
          <Figure
            title="When the day gets moving"
            note="Two windows own the day. A small group heads out near 6am; a much bigger one goes after work, with five to eight in the evening carrying the day and 6pm the single busiest hour. Every activity sorted by the hour it began."
            source="Activity Log"
            tableCaption="Activities by hour of day"
            columns={['Hour', 'Activities']}
            rows={hours.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={hours} unit="activities" />
          </Figure>

          <Figure
            title="The year has a season"
            note="The training keeps the weather's calendar. July is the busiest month by far, deep in the cool dry season; February, hot and building toward the rains, is the emptiest. Seven years of months laid on top of each other."
            source="Activity Log"
            tableCaption="Activities by calendar month"
            columns={['Month', 'Activities']}
            rows={monthCells.map((m) => [m.label, fmtInt(m.value)])}
            footer={(
              <>
                <p className="eyebrow">A weather habit</p>
                <p>The long dry season runs June to October, cool and rainless on the central plateau, and those are the months that fill up here.</p>
                <p>The thin months line up with the short rains in November and the heat around February. Seven years on, the shape barely moves.</p>
              </>
            )}
          >
            <HeatStrip cells={monthCells} unit="activities" cellHeight={56} />
          </Figure>

          {/* Row 3 — the habit of it: the move outside, then the streak */}
          <Figure
            title="Off the treadmill"
            note="Year by year, the habit walked outside. Early on, nearly two in three sessions were indoors on a machine. By last year, about one in six. Each year split into indoor and outdoor, stacked to 100%."
            source="Activity Log"
            tableCaption="Indoor share of activities by year"
            columns={['Year', 'Indoor share']}
            rows={indoorYearRows}
          >
            <IndoorOutdoor activities={activityLog} />
          </Figure>

          <Figure
            title="Rarely a day off"
            note={`Once you go out, the next day tends to follow. Four times in five, the very next day carries something too. Over seven years, ${pctActiveDays}% of all calendar days have an activity, and a gap of three days or more turns up less than once in ten.`}
            source="Activity Log"
            tableCaption="Days until the next active day"
            columns={['Gap to next active day', 'Share']}
            rows={gapData.map((g) => [g.label, g.display])}
          >
            <BarChart data={gapData} accent />
          </Figure>
        </div>
      </Container>

      <Container>
        <FieldNote seed="/home" />
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
              Seven years turned these up on their own, no plan required. A few worth pulling out, each one opens its full story.
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

      {/* ---- The quiet close, then the full index -------------------- */}
      <Container>
        <div style={{ paddingBlock: 'var(--sp-7)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Still unfinished</p>
          <p className="measure" style={{ fontSize: 'var(--fs-lg)', lineHeight: 1.4, margin: '0 0 var(--sp-7)' }}>
            The record is dense enough now to look permanent. It is still made one ordinary day at a
            time, and the last dot is only ever the most recent.
          </p>
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

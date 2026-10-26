import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import IndexHub from '../components/IndexHub.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import IndoorOutdoor from '../charts/IndoorOutdoor.jsx'
import FootFlip from '../charts/FootFlip.jsx'
// WeekLevel (even-week band) retired from the home opener; kept in charts/
import HabitMomentum from '../charts/HabitMomentum.jsx'
import TransitionMatrix from '../charts/TransitionMatrix.jsx'
import LorenzCurve from '../charts/LorenzCurve.jsx'
import DecileBars from '../charts/DecileBars.jsx'
import StorySection from '../components/StorySection.jsx'
import ColBars from '../charts/ColBars.jsx'
import DaySplit from '../charts/DaySplit.jsx'
import MonthGrid from '../charts/MonthGrid.jsx'
import PairBars from '../charts/PairBars.jsx'
import TwoLines from '../charts/TwoLines.jsx'
import HeartbeatYears from '../charts/HeartbeatYears.jsx'
import { computeHabitMomentum } from '../lib/habitMomentum.js'
import { lorenz, topShare } from '../lib/stats.js'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { fmtInt, toNum } from '../lib/format.js'
import { buildYearSummaries } from '../lib/yearStats.js'
import YearCharacters from '../components/YearCharacters.jsx'
import FieldNote from '../components/FieldNote.jsx'
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

export default function Home() {
  useEffect(() => {
    document.title = 'My Strava Journey · Seven Years of Training, Read as Data'
  }, [])
  const lifetime = useTable('lifetime_totals')
  const meta = useKeyed('meta', 'key', 'value')
  const countries = useTable('countries')
  const activityLog = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const monthlyTotals = useTable('monthly_totals')
  const sportBreakdown = useTable('sport_breakdown')
  const tzRegions = useTable('tanzania_regions')
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
  const ctryYr = bestBy((s) => s.countries.length)

  const life = (needle) => lifetime.find((r) => (r.metric || '').toLowerCase().includes(needle)) || {}

  const activities = life('activities').value
  const km = life('total km').value
  const elevation = life('elevation').value
  const streak = life('longest streak').value

  const years = yearsBetween(meta.coverage_start, meta.coverage_end)

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
  const daySet = new Set()
  for (const a of activityLog) {
    const h = parseInt(a.hour, 10)
    if (Number.isFinite(h) && h >= 0 && h < 24) hours[h] += 1
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


  // share of all calendar days with an activity
  const sortedDays = [...daySet].sort()
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

  // indoor share by year, for the "off the treadmill" section
  const trainerTrue = (v) => { const s = String(v).trim().toLowerCase(); return s === '1' || s === 'true' || s === 'yes' }
  const ioAgg = {}
  for (const a of activityLog) {
    const y = (a.date || '').slice(0, 4)
    if (!/^\d{4}$/.test(y)) continue
    const e = (ioAgg[y] = ioAgg[y] || { indoor: 0, n: 0 })
    if (trainerTrue(a.trainer)) e.indoor += 1
    e.n += 1
  }

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
  // ---- How each year was made: time per active day, cut into outings ----
  const shapeRows = yearSummaries.map((ys) => ({
    year: ys.year, perDay: ys.stats.minPerActiveDay, outings: ys.stats.outingsPerDay,
    avgMin: ys.stats.avgOutingMin, multi: ys.stats.multiShare,
  }))
  const habitShape = shapeRows.filter((r) => r.year > quietUntil)
  const shapeMulti = habitShape.length ? habitShape.reduce((b, r) => (r.multi > b.multi ? r : b)) : null
  const shapeNow = shapeRows[shapeRows.length - 1]
  const perDayLo = shapeRows.length ? Math.min(...shapeRows.map((r) => r.perDay)) : 0
  const perDayHi = shapeRows.length ? Math.max(...shapeRows.map((r) => r.perDay)) : 0

  // ---- 1. Where in the world: home against away, and where at home the climbing is ----
  const located = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS')
  const locN = located.reduce((t, c) => t + (toNum(c.activities) || 0), 0)
  const tzRow = located.find((c) => c.country === 'Tanzania')
  const tzN = tzRow ? toNum(tzRow.activities) || 0 : 0
  const awayRows = located.filter((c) => c.country !== 'Tanzania').sort((a, b) => (toNum(b.activities) || 0) - (toNum(a.activities) || 0))
  const awayN = locN - tzN
  const awayTop2 = awayRows.slice(0, 2)
  const awayTop2N = awayTop2.reduce((t, c) => t + (toNum(c.activities) || 0), 0)
  const regTotA = tzRegions.reduce((t, r) => t + (toNum(r.activities) || 0), 0) || 1
  const regTotE = tzRegions.reduce((t, r) => t + (toNum(r.elevation_m) || 0), 0) || 1
  const regSorted = [...tzRegions].sort((a, b) => (toNum(b.activities) || 0) - (toNum(a.activities) || 0))
  const regShown = regSorted.slice(0, 4)
  const regRest = regSorted.slice(4)
  const regionRows = [
    ...regShown.map((r) => ({ label: r.region, a: (toNum(r.activities) || 0) / regTotA, b: (toNum(r.elevation_m) || 0) / regTotE })),
    ...(regRest.length ? [{
      label: `${regRest.length} other regions`, short: `${regRest.length} others`,
      a: regRest.reduce((t, r) => t + (toNum(r.activities) || 0), 0) / regTotA,
      b: regRest.reduce((t, r) => t + (toNum(r.elevation_m) || 0), 0) / regTotE,
    }] : []),
  ]
  const climbTop2 = [...tzRegions].sort((a, b) => (toNum(b.elevation_m) || 0) - (toNum(a.elevation_m) || 0)).slice(0, 2)
  const climbTop2A = climbTop2.reduce((t, r) => t + (toNum(r.activities) || 0), 0) / regTotA
  const climbTop2E = climbTop2.reduce((t, r) => t + (toNum(r.elevation_m) || 0), 0) / regTotE
  const busiestRegion = regSorted[0]

  // ---- 2. Every way to move: the mix, and walks against runs by year ----
  const sportOf = (t) => (t === 'Walk' ? 'walk' : t === 'Run' ? 'run' : t === 'TrailRun' || t === 'Hike' ? 'trail' : 'other')
  const mixN = { walk: 0, run: 0, trail: 0, other: 0 }
  for (const a of activityLog) mixN[sportOf(a.sport_type)] += 1
  const mixTot = activityLog.length || 1
  const walkByYear = yearSummaries.map((ys) => ys.stats.walkN)
  const runByYear = yearSummaries.map((ys) => ys.stats.runN)
  const walkLeadIdx = (() => {
    for (let i = 0; i < walkByYear.length; i++) {
      if (walkByYear.slice(i).every((w, k) => w > runByYear[i + k]) && walkByYear[i] > 20) return i
    }
    return -1
  })()
  const walkLeadYear = walkLeadIdx >= 0 ? gridYears[walkLeadIdx] : null

  // ---- 3. When the day gets moving: hour bands and the week ----
  const hourShare = (lo, hi) => hours.slice(lo, hi).reduce((t, v) => t + v, 0) / (activityLog.length || 1)
  const peakHour = hours.indexOf(Math.max(...hours))
  const fmtHour = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
  const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const weekN = WEEK.map((d) => activityLog.filter((a) => a.weekday === d).length)
  const weekMax = Math.max(...weekN), weekMin = Math.min(...weekN)
  const weekAvg = weekN.reduce((t, v) => t + v, 0) / 7

  // ---- 4. The year has a season: share of days active, by month ----
  const DIM = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  // full calendar years after the long silence ended (the year it ended is partial)
  const gapEndYear = (() => {
    let best = 0, after = null
    for (let i = 1; i < sortedDays.length; i++) {
      const d = Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1])
      if (d > best) { best = d; after = sortedDays[i] }
    }
    return after ? Number(after.slice(0, 4)) : 2021
  })()
  const fullYears = gridYears.filter((y) => y > gapEndYear && y < (gridYears[gridYears.length - 1] || 0))
  const monthShare = Array.from({ length: 12 }, (_, m) => {
    let act = 0, all = 0
    for (const y of fullYears) {
      const pre = `${y}-${String(m + 1).padStart(2, '0')}-`
      act += sortedDays.filter((d) => d.startsWith(pre)).length
      all += DIM(y, m)
    }
    return all ? act / all : 0
  })
  const fullShare = (() => {
    let act = 0, all = 0
    for (const y of fullYears) { act += sortedDays.filter((d) => d.startsWith(`${y}-`)).length; all += (y % 4 === 0 ? 366 : 365) }
    return all ? act / all : 0
  })()
  const dipIdx = [...monthShare.keys()].sort((a, b) => monthShare[a] - monthShare[b]).slice(0, 2).sort((a, b) => a - b)
  const bestIdx = monthShare.indexOf(Math.max(...monthShare))
  const midShare = [...monthShare].sort((a, b) => a - b)[6]
  const othersLo = Math.min(...monthShare.filter((_, i) => !dipIdx.includes(i) && i !== bestIdx))
  const othersHi = Math.max(...monthShare.filter((_, i) => !dipIdx.includes(i) && i !== bestIdx))
  const monthCellsGrid = (() => {
    const first = sortedDays[0], last = sortedDays[sortedDays.length - 1]
    const out = {}
    for (const y of gridYears) {
      out[y] = Array.from({ length: 12 }, (_, m) => {
        const mm = `${y}-${String(m + 1).padStart(2, '0')}`
        if (!first || mm < first.slice(0, 7) || mm > last.slice(0, 7)) return null
        const d0 = mm === first.slice(0, 7) ? Number(first.slice(8, 10)) : 1
        const d1 = mm === last.slice(0, 7) ? Number(last.slice(8, 10)) : DIM(y, m)
        const act = sortedDays.filter((d) => d.startsWith(mm + '-')).length
        return act / Math.max(1, d1 - d0 + 1)
      })
    }
    return out
  })()
  const dipYears = fullYears.filter((y) => {
    const yr = sortedDays.filter((d) => d.startsWith(`${y}-`)).length / (y % 4 === 0 ? 366 : 365)
    return dipIdx.every((m) => (monthCellsGrid[y][m] ?? 1) < yr)
  }).length
  const MONTH_NAME = MONTHS_FULL

  // ---- 5. Off the treadmill: indoor share by year and by sport ----
  const indoorBy = { walk: [0, 0], run: [0, 0], trail: [0, 0], other: [0, 0] }
  for (const a of activityLog) { const k = sportOf(a.sport_type); indoorBy[k][1] += 1; if (trainerTrue(a.trainer)) indoorBy[k][0] += 1 }
  const indoorShare = (k) => (indoorBy[k][1] ? indoorBy[k][0] / indoorBy[k][1] : 0)
  const ioYears = Object.keys(ioAgg).sort()
  const ioFirst = ioYears.length ? ioAgg[ioYears[0]] : null
  const ioLast = ioYears.length ? ioAgg[ioYears[ioYears.length - 1]] : null
  const runKm = activityLog.filter((a) => a.sport_type === 'Run').reduce((t, a) => t + (toNum(a.distance_km) || 0), 0)
  const runKmIn = activityLog.filter((a) => a.sport_type === 'Run' && trainerTrue(a.trainer)).reduce((t, a) => t + (toNum(a.distance_km) || 0), 0)

  // ---- 6. Walking climbs, running runs: shares and climb per km ----
  const flipTot = footFlipData.reduce((t, d) => ({ dist: t.dist + d.dist, elev: t.elev + d.elev }), { dist: 0, elev: 0 })
  const flipOf = (k) => footFlipData.find((d) => d.key === k) || { dist: 0, elev: 0 }
  const fShare = (k, f) => (flipTot[f] ? flipOf(k)[f] / flipTot[f] : 0)
  const mPerKm = (k) => (flipOf(k).dist ? flipOf(k).elev / flipOf(k).dist : 0)

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
            Most of my days on foot are small. My usual outing is {Math.round(medFootKm)} km, about an hour, a walk or an
            easy run. What adds up is how often it happens: I&rsquo;ve done something on {pctActiveDays}% of all days across{' '}
            {years || 7} years, and as you read this my streak is {fmtInt(curStreak)} days deep.
          </Reveal>

          {yearSummaries.length > 0 && (
            <YearCharacters summaries={yearSummaries} quietUntil={quietUntil} current={gridYears[gridYears.length - 1]} />
          )}
        </section>
      </Container>

      {/* ===== How the streak holds: momentum + today/tomorrow grid ===== */}
      {momentum && mWeek && mOneOff && mFiveOff && (
        <Container>
          <hr className="rule" />
          <section className="sgrid" aria-labelledby="streak-title">
            <div className="sgrid__head">
              <p className="eyebrow">How the streak holds</p>
              <h2 id="streak-title" className="section-head__title">Keeping beats&nbsp;restarting.</h2>
              <p className="section-head__sub">Every day I go out makes the next one more likely. Every day off makes coming back harder.</p>
            </div>

            <Reveal as="p" className="sgrid__statement">
              Once I&rsquo;ve been out today, there&rsquo;s an {mAfter}% chance I go out tomorrow. After a week in a row it&rsquo;s{' '}
              {pc(mWeek.p)}%, and after three weeks {pc(mThreeWk.p)}%. If I stop for {['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][mFiveOff.g] || mFiveOff.g} days,
              it drops to {pc(mFiveOff.p)}%. That&rsquo;s the pattern in my log: a streak is easier to keep going than to start again.
            </Reveal>

            <OddsRow
              title="Chance the next day is active"
              items={[
                { value: mFiveOff.p, label: `after ${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][mFiveOff.g] || mFiveOff.g} days off`, tone: 'rest' },
                { value: mOneOff.p, label: 'after one day off', tone: 'rest' },
                { value: momentum.origin, label: 'after a day out', tone: 'move' },
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
                <b>How to read it.</b> The dashed line is a day I went out. Each step right is one more day in a row; each
                step left is one more day since I last went out. The orange line climbs and flattens near {mDeep}%. The grey
                line drops fast: a single day off already brings the odds down to {pc(mOneOff.p)}%.
              </p>
              <p className="sgrid__note sgrid__note--mx">
                <b>Why it holds.</b> Each row adds up to 100%. Those two numbers, {mAfter}% after a day out and{' '}
                {pc(momentum.after.p01)}% after a day off, predict that {pc(mSteady)}% of days should be active in the long
                run. Since 2021, {pc(momentum.activeFrac)}% of my days were. Before the habit caught, a day out led to another only{' '}
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
                <h2 id="work-title" className="section-head__title">The busy days do the&nbsp;work.</h2>
                <p className="section-head__sub">The busiest tenth of days carry {pc(work.tenth)}% of the distance.</p>
              </div>

              <Reveal as="p" className="sgrid__statement">
                If I line up all {fmtInt(work.n)} of my days on foot from shortest to longest, the busiest tenth, every day
                over {Math.floor(work.tenthFrom)} km, carries {pc(work.tenth)}% of my {fmtInt(work.total)} km. That&rsquo;s as much
                as my quietest half put together. The big days matter, yet no handful of them makes the record: my{' '}
                {work.k1} biggest days carry under {Math.ceil(work.one * 100)}%.
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
                  the distance. The short days keep my habit going; the long ones build the kilometres.
                </p>
              </div>
              <p className="source">Source: Activity Log &middot; daily distance on foot (run, walk, trail run, hike), {fmtInt(work.n)} days</p>
            </section>
          </Container>
        </div>
      )}

      {/* ===== How each year was made: same time a day, cut differently ===== */}
      {shapeRows.length > 2 && shapeMulti && (
        <Container>
          <hr className="rule" />
          <StorySection
            id="years-title"
            eyebrow="How each year was made"
            title="The time per day held."
            sub="What changed is how I split that time between outings."
            statement={<>
              On a day when I&rsquo;m out, my time moving has hardly changed: between {Math.round(perDayLo)} and{' '}
              {Math.round(perDayHi)} minutes in every year. What changed is how I split it. In {shapeMulti.year},{' '}
              {pc(shapeMulti.multi)}% of my active days had two or more outings, and the average outing ran{' '}
              {Math.round(shapeMulti.avgMin)} minutes. In {shapeNow.year} it&rsquo;s mostly one outing a day: {pc(shapeNow.multi)}% of
              days double up, and the average outing runs {Math.round(shapeNow.avgMin)} minutes.
            </>}
            odds={{
              title: 'How the days were split',
              items: [
                { value: shapeMulti.multi, label: `of active days doubled up in ${shapeMulti.year}`, tone: 'rest' },
                { value: shapeNow.multi, label: `of active days doubled up in ${shapeNow.year}`, tone: 'move' },
                { num: shapeMulti.avgMin, unit: ' min', label: `the average outing in ${shapeMulti.year}`, tone: 'rest' },
                { num: shapeNow.avgMin, unit: ' min', label: `the average outing in ${shapeNow.year}`, tone: 'move' },
              ],
            }}
            left={{ title: 'A typical active day, year by year', node: <DaySplit rows={shapeRows} quietUntil={quietUntil} /> }}
            right={{
              title: 'Days with two or more outings',
              node: (
                <ColBars
                  items={shapeRows.map((r) => ({
                    label: String(r.year), short: `'${String(r.year).slice(2)}`, value: r.multi, display: `${pc(r.multi)}%`,
                    tone: r.year <= quietUntil ? 'quiet' : r.year === shapeNow.year ? 'big' : 'mid',
                  }))}
                  max={0.6} ticks={[0, 0.2, 0.4, 0.6]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                  xCap="year &rarr;" yCap="share of active days &uarr;"
                  aria={`Share of active days with two or more outings: ${shapeRows.map((r) => `${r.year} ${pc(r.multi)}%`).join(', ')}.`}
                />
              ),
            }}
            leftNote={<>
              <b>How to read it.</b> Each row is one year. The bar is the minutes moving on an average active day, and each
              block inside it is one average outing. Short blocks side by side mean days of doubles. One long block means
              a single long outing.
            </>}
            rightNote={<>
              <b>Why it matters.</b> The time I give it each day has held steady from the first year to now. What changed
              is the shape of my day: from two shorter outings to one longer one.
            </>}
            source="Activity Log · moving time and outings per active day, by year"
          />
        </Container>
      )}

      {/* ===== A closer look: six smaller things, each on the section recipe ===== */}
      <Container>
        <hr className="rule" />
        <div className="closer-head">
          <p className="eyebrow">A closer look</p>
          <h2 className="section-head__title">Six smaller&nbsp;findings.</h2>
        </div>

        {/* 1. Where in the world */}
        {locN > 0 && tzN > 0 && (
          <StorySection
            id="where-title"
            eyebrow="1 · Where in the world"
            title="Two regions do the climbing."
            sub={`Two regions of Tanzania hold ${pc(climbTop2E)}% of the metres climbed.`}
            statement={<>
              {fmtInt(tzN)} of my {fmtInt(locN)} outings with a GPS start point are in Tanzania, {pc(tzN / locN)}%. The
              other {fmtInt(awayN)} are spread over {awayRows.length} countries, {pc(awayTop2N / Math.max(1, awayN))}% of
              them in {awayTop2.map((c) => c.country).join(' and ')}. Inside Tanzania, {busiestRegion && busiestRegion.region} is
              where I go out most, but my climbing happens somewhere else: {climbTop2.map((r) => r.region).join(' and ')} hold{' '}
              {pc(climbTop2A)}% of my outings and {pc(climbTop2E)}% of the metres I&rsquo;ve climbed.
            </>}
            odds={{
              title: 'Where the outings happen',
              items: [
                { value: tzN / locN, label: 'of located outings are in Tanzania', tone: 'move' },
                { value: awayN / locN, label: `abroad, across ${awayRows.length} countries`, tone: 'rest' },
                { value: climbTop2A, label: `of Tanzania's outings are in ${climbTop2.map((r) => r.region).join(' and ')}`, tone: 'rest' },
                { value: climbTop2E, label: "of Tanzania's climbing is there", tone: 'move' },
              ],
            }}
            left={{ title: 'Home against away', node: <GeoBubbles rows={countries} /> }}
            right={{
              title: 'Inside Tanzania: share of outings and of climb',
              node: <PairBars rows={regionRows} aLabel="share of outings" bLabel="share of climb" aShort="outings" bShort="climb"
                aria={`Tanzania regions, share of outings and share of climb: ${regionRows.map((r) => `${r.label} ${pc(r.a)}% and ${pc(r.b)}%`).join('; ')}.`} />,
            }}
            leftNote={<>
              <b>How to read it.</b> Only outings with a GPS start point can be placed; treadmill sessions and other
              indoor work cannot, so {fmtInt(activityLog.length - locN)} outings sit outside this view. The disc is
              Tanzania. The list is every other country, with the year it was first reached.
            </>}
            rightNote={<>
              <b>Why it matters.</b> Each row is a region. The grey ring is its share of the outings in Tanzania, the orange dot its share of the climb, and the number on the right is the gap in percentage points. Rows run from the biggest climb surplus to the biggest shortfall.
              {busiestRegion ? ` ${busiestRegion.region} is my everyday ground, and it’s flat by comparison.` : ''} The metres
              come from my trips to the mountains.
            </>}
            source="Strava GPS start points · countries and Tanzania regions, distance and climb on foot"
          />
        )}

        {/* 2. Every way to move */}
        <hr className="rule rule--faint" />
        <StorySection
          id="move-title"
          eyebrow="2 · Every way to move"
          title={walkLeadYear ? 'Walks took over.' : 'Walking leads.'}
          sub={walkLeadYear ? `I’ve walked more often than I’ve run every year since ${walkLeadYear}.` : 'Walking is my most common outing.'}
          statement={<>
            Of my {fmtInt(activityLog.length)} outings, {fmtInt(mixN.walk)} are walks and {fmtInt(mixN.run)} are runs. Trail
            runs and hikes add {fmtInt(mixN.trail)}, and everything off my feet is {pc(mixN.other / mixTot)}%.
            {walkLeadYear ? ` My walks overtook my runs in ${walkLeadYear} and have stayed ahead every year since.` : ''}
          </>}
          odds={{
            title: 'Share of all outings',
            items: [
              { value: mixN.walk / mixTot, label: 'walks', tone: 'move' },
              { value: mixN.run / mixTot, label: 'runs', tone: 'move' },
              { value: mixN.trail / mixTot, label: 'trail runs and hikes', tone: 'move' },
              { value: mixN.other / mixTot, label: 'other activities, off the feet', tone: 'rest' },
            ],
          }}
          left={{ title: 'Every outing, by sport', node: <SportTreemap rows={sportBreakdown} /> }}
          right={{
            title: 'Walks against runs, year by year',
            node: <TwoLines years={gridYears} a={{ label: 'Run', values: runByYear }} b={{ label: 'Walk', values: walkByYear }}
              cross={walkLeadIdx} crossLabel={walkLeadYear ? `walks lead from ${walkLeadYear}` : null}
              aria={`Walks and runs per year. ${gridYears.map((y, i) => `${y}: ${walkByYear[i]} walks, ${runByYear[i]} runs`).join('. ')}.`} />,
          }}
          leftNote={<>
            <b>How to read it.</b> Each tile is a sport, sized by how many outings it has. The four sports on foot are named;
            everything else, from bikes to the gym, folds into one tile.
          </>}
          rightNote={<>
            <b>Why it matters.</b> Running carried my first years. Walking took over once the habit set in and has
            led since. Trail runs are counted on their own, so they are not in the run line.
            {gridYears.length ? ` ${gridYears[gridYears.length - 1]} is still in progress.` : ''}
          </>}
          source="Activity Log · outings by sport type"
        />

        {/* 3. When the day gets moving */}
        <hr className="rule rule--faint" />
        <StorySection
          id="hours-title"
          eyebrow="3 · When the day gets moving"
          title="Both ends of the working day."
          sub="I fit most outings in early in the morning or in the evening."
          statement={<>
            If I sort every outing by the hour it began, {pc(hourShare(16, 21))}% start between 4 and 9 in the evening, with{' '}
            {fmtHour(peakHour)} the busiest hour. Another {pc(hourShare(0, 10))}% start before 10 in the morning. The middle of
            the day, 10am to 4pm, holds just {pc(hourShare(10, 16))}%. My week is flatter: the quietest day still has{' '}
            {pc(weekMin / weekMax)}% of the busiest day&rsquo;s outings.
          </>}
          odds={{
            title: 'When outings start',
            items: [
              { value: hourShare(0, 10), label: 'before 10 in the morning', tone: 'move' },
              { value: hourShare(10, 16), label: 'between 10am and 4pm', tone: 'rest' },
              { value: hourShare(16, 21), label: 'between 4 and 9pm', tone: 'move' },
              { value: hourShare(21, 24), label: 'after 9pm', tone: 'rest' },
            ],
          }}
          left={{ title: 'Every outing, by the hour it began', node: <RadialHours counts={hours} unit="activities" max={400} /> }}
          right={{
            title: 'Every outing, by day of the week',
            node: (
              <ColBars
                items={WEEK.map((d, i) => ({
                  label: d.slice(0, 3), short: d.slice(0, 1), value: weekN[i], display: fmtInt(weekN[i]),
                  tone: weekN[i] === weekMax ? 'big' : weekN[i] === weekMin ? 'quiet' : 'mid',
                }))}
                max={weekMax * 1.12} ticks={[0, 100, 200, 300]} tickFmt={(v) => v} H={400}
                xCap="day of the week &rarr;" yCap="outings &uarr;"
                aria={`Outings by weekday: ${WEEK.map((d, i) => `${d} ${weekN[i]}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>
            <b>How to read it.</b> Midnight is at the top and the hours run clockwise. Each spoke is one hour; the longer and
            darker it is, the more outings started then. The two bulges are early morning and evening.
          </>}
          rightNote={<>
            <b>Why it matters.</b> {WEEK[weekN.indexOf(weekMax)]} is the busiest day and {WEEK[weekN.indexOf(weekMin)]} the
            quietest, but the gap is small. I fit my outings around the working day, morning or evening, on every day of
            the week.
          </>}
          source="Activity Log · start hour and weekday of every outing"
        />

        {/* 4. The year has a season */}
        {fullYears.length > 1 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="season-title"
              eyebrow="4 · The year has a season"
              title="Two thin months."
              sub={`${MONTH_NAME[dipIdx[0]]} and ${MONTH_NAME[dipIdx[1]]} are the quietest months of the year.`}
              statement={<>
                Take my {fullYears.length === 4 ? 'four' : fullYears.length} full years since the habit caught,{' '}
                {fullYears[0]} to {fullYears[fullYears.length - 1]}, and count the days I was active in each month.
                Across the year it&rsquo;s {pc(fullShare)}%. {MONTH_NAME[bestIdx]} is my strongest month at {pc(monthShare[bestIdx])}%.{' '}
                {MONTH_NAME[dipIdx[0]]} and {MONTH_NAME[dipIdx[1]]} are the weakest, {pc(monthShare[dipIdx[0]])}% and{' '}
                {pc(monthShare[dipIdx[1]])}%. Every other month sits between {pc(othersLo)}% and {pc(othersHi)}%.
              </>}
              odds={{
                title: `Share of days active, ${fullYears[0]} to ${fullYears[fullYears.length - 1]}`,
                items: [
                  { value: monthShare[bestIdx], label: `in ${MONTH_NAME[bestIdx]}, the strongest month`, tone: 'rest' },
                  { value: midShare, label: 'in a typical month', tone: 'rest' },
                  { value: monthShare[dipIdx[0]], label: `in ${MONTH_NAME[dipIdx[0]]}`, tone: 'move' },
                  { value: monthShare[dipIdx[1]], label: `in ${MONTH_NAME[dipIdx[1]]}`, tone: 'move' },
                ],
              }}
              left={{
                title: 'Share of days active, by month',
                node: (
                  <ColBars
                    items={monthShare.map((v, i) => ({
                      label: MONTHS_SHORT[i], short: MONTHS_SHORT[i].slice(0, 1), value: v, display: `${pc(v)}`,
                      tone: dipIdx.includes(i) ? 'big' : 'quiet',
                    }))}
                    max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                    refLine={{ value: fullShare, label: `whole year · ${pc(fullShare)}%`, short: `year ${pc(fullShare)}%` }}
                    xCap={`month, ${fullYears[0]} to ${fullYears[fullYears.length - 1]} →`} yCap="share of days active ↑"
                    aria={`Share of days active by month, ${fullYears[0]} to ${fullYears[fullYears.length - 1]}: ${monthShare.map((v, i) => `${MONTH_NAME[i]} ${pc(v)}%`).join(', ')}.`}
                  />
                ),
              }}
              right={{
                title: 'Every month of the record',
                node: <MonthGrid years={gridYears} cells={monthCellsGrid} mark={dipIdx}
                  markLabel={`${MONTH_NAME[dipIdx[0]].slice(0, 3)} and ${MONTH_NAME[dipIdx[1]].slice(0, 3)}`} />,
              }}
              leftNote={<>
                <b>How to read it.</b> Each bar is the share of that month's days with at least one activity, added up over
                the full years. The dashed line is the whole year. Orange marks the two weakest months.
              </>}
              rightNote={<>
                <b>Why it matters.</b> The dip is in {dipYears === fullYears.length ? 'every one' : `${dipYears}`} of the{' '}
                {fullYears.length === 4 ? 'four' : fullYears.length} full years: both months fall below that year's own share.
                My log doesn&rsquo;t say why, and I won&rsquo;t guess. In {gridYears[gridYears.length - 1]} the streak has filled them too.
              </>}
              source="Activity Log · days with at least one activity, by month"
            />
          </>
        )}

        {/* 5. Off the treadmill */}
        {ioFirst && ioLast && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="indoor-title"
              eyebrow="5 · Off the treadmill"
              title="The treadmill is fading."
              sub="It has always been a running habit, and I use it less and less."
              statement={<>
                In {ioYears[0]}, {pc(ioFirst.indoor / ioFirst.n)}% of my sessions were indoors. So far in{' '}
                {ioYears[ioYears.length - 1]} it&rsquo;s {pc(ioLast.indoor / ioLast.n)}%. Nearly all my indoor time is running:{' '}
                {pc(indoorShare('run'))}% of my runs were on a treadmill, against {pc(indoorShare('walk'))}% of my walks. Of the{' '}
                {fmtInt(runKm)} km I&rsquo;ve run, {fmtInt(runKmIn)} km were indoors.
              </>}
              odds={{
                title: 'Share of sessions indoors',
                items: [
                  { value: ioFirst.indoor / ioFirst.n, label: `of sessions in ${ioYears[0]}`, tone: 'rest' },
                  { value: ioLast.indoor / ioLast.n, label: `of sessions in ${ioYears[ioYears.length - 1]}`, tone: 'move' },
                  { value: indoorShare('run'), label: 'of all runs', tone: 'rest' },
                  { value: indoorShare('walk'), label: 'of all walks', tone: 'move' },
                ],
              }}
              left={{ title: 'Indoors and outdoors, year by year', node: <IndoorOutdoor activities={activityLog} height={360} heightNarrow={300} /> }}
              right={{
                title: 'Share indoors, by sport',
                node: (
                  <ColBars
                    items={[
                      { label: 'Run', value: indoorShare('run'), display: `${pc(indoorShare('run'))}%`, tone: 'big' },
                      { label: 'Other', value: indoorShare('other'), display: `${pc(indoorShare('other'))}%`, tone: 'mid' },
                      { label: 'Walk', value: indoorShare('walk'), display: `${pc(indoorShare('walk'))}%`, tone: 'quiet' },
                      { label: 'Trail & hike', short: 'Trail', value: indoorShare('trail'), display: `${pc(indoorShare('trail'))}%`, tone: 'quiet' },
                    ]}
                    max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                    xCap="sport &rarr;" yCap="share of sessions indoors &uarr;"
                    aria={`Share of sessions indoors: runs ${pc(indoorShare('run'))}%, other activities ${pc(indoorShare('other'))}%, walks ${pc(indoorShare('walk'))}%, trail runs and hikes ${pc(indoorShare('trail'))}%.`}
                  />
                ),
              }}
              leftNote={<>
                <b>How to read it.</b> Each year is split into indoor and outdoor sessions, stacked to 100%. The orange line is
                the waterline: outdoors below it, indoors above. Indoor means Strava marked it as a trainer session: a treadmill, a
                bike stand or the gym.
              </>}
              rightNote={<>
                <b>Why it matters.</b> My walks, trail runs and hikes happen outside. Running is the one I took indoors, so
                the fall in indoor share is my running moving outside, onto roads and trails.
              </>}
              source="Activity Log · trainer flag on each session"
            />
          </>
        )}

        {/* 6. Walking climbs, running runs */}
        <hr className="rule rule--faint" />
        <StorySection
          id="flip-title"
          eyebrow="6 · Walking climbs, running runs"
          title="Two jobs on foot."
          sub="Running owns the distance. Walking owns the vertical."
          statement={<>
            Running is {pc(fShare('Run', 'dist'))}% of my kilometres on foot and only {pc(fShare('Run', 'elev'))}% of my
            climb, because most of it is flat, on a treadmill. Walking is {pc(fShare('Walk', 'dist'))}% of the kilometres
            and {pc(fShare('Walk', 'elev'))}% of the climb. Trail runs and hikes are{' '}
            {pc(fShare('TrailRun', 'dist') + fShare('Hike', 'dist'))}% of the distance and carry{' '}
            {pc(fShare('TrailRun', 'elev') + fShare('Hike', 'elev'))}% of the climb.
          </>}
          odds={{
            title: 'Share of distance and climb on foot',
            items: [
              { value: fShare('Run', 'dist'), label: 'of the distance is running', tone: 'move' },
              { value: fShare('Run', 'elev'), label: 'of the climb is running', tone: 'rest' },
              { value: fShare('Walk', 'elev'), label: 'of the climb is walking', tone: 'move' },
              { value: fShare('TrailRun', 'elev') + fShare('Hike', 'elev'), label: 'of the climb is trail runs and hikes', tone: 'move' },
            ],
          }}
          left={{ title: 'Distance against climb, by sport', node: <FootFlip items={footFlipData} /> }}
          right={{
            title: 'Metres climbed per kilometre',
            node: (
              <ColBars
                items={[
                  { label: 'Run', value: mPerKm('Run'), display: mPerKm('Run').toFixed(1), tone: 'quiet' },
                  { label: 'Walk', value: mPerKm('Walk'), display: mPerKm('Walk').toFixed(1), tone: 'mid' },
                  { label: 'Trail run', short: 'Trail', value: mPerKm('TrailRun'), display: mPerKm('TrailRun').toFixed(1), tone: 'big' },
                  { label: 'Hike', value: mPerKm('Hike'), display: mPerKm('Hike').toFixed(1), tone: 'big' },
                ]}
                max={Math.ceil(mPerKm('Hike') / 20) * 20 || 100} ticks={[0, 20, 40, 60, 80, 100].filter((t) => t <= (Math.ceil(mPerKm('Hike') / 20) * 20 || 100))}
                tickFmt={(v) => v}
                xCap="sport &rarr;" yCap="metres climbed per km &uarr;"
                aria={`Metres climbed per kilometre: run ${mPerKm('Run').toFixed(1)}, walk ${mPerKm('Walk').toFixed(1)}, trail run ${mPerKm('TrailRun').toFixed(1)}, hike ${mPerKm('Hike').toFixed(1)}.`}
              />
            ),
          }}
          leftNote={<>
            <b>How to read it.</b> The left column splits all the distance on foot by sport, the right column splits all the
            climb. Each ribbon joins one sport's two shares. Running is thick on the left and thin on the right.
          </>}
          rightNote={<>
            <b>Why it matters.</b> A kilometre of hiking climbs {Math.round(mPerKm('Hike'))} m, a trail run{' '}
            {Math.round(mPerKm('TrailRun'))} m, a walk {Math.round(mPerKm('Walk'))} m and a run {mPerKm('Run').toFixed(1)} m.
            The height in my record was earned slowly, uphill, on foot.
          </>}
          source="Activity Log · distance and climb on foot (run, walk, trail run, hike)"
        />
      </Container>

      <Container>
        <FieldNote seed="/home" align="wide" />
      </Container>

      {/* ---- The far edges: greatest-hits teaser into the best pages --- */}
      <div className="bleed bleed--edges">
        <Container>
          <section className="sgrid" aria-labelledby="edges-title">
          <div className="sgrid__head">
            <p className="eyebrow">The far edges</p>
            <h2 id="edges-title" className="section-head__title">Records hiding in the&nbsp;data.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            Four things from seven years that stand apart from the rest. Each one opens its full story.
          </Reveal>
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
          </section>
        </Container>
      </div>

      {/* ---- The quiet close, then the full index -------------------- */}
      <Container>
        <section className="sgrid" aria-labelledby="explore-title">
          <div className="sgrid__head">
            <p className="eyebrow">Still unfinished</p>
            <h2 id="explore-title" className="section-head__title">
              {cap(NUMWORD[menuItems.length] || String(menuItems.length))} ways in.
            </h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            My record is thick enough now to look permanent. It&rsquo;s still made one ordinary day at a time, and tomorrow
            is the next one. Every page below opens one part of it.
          </Reveal>
          <IndexHub items={menuItems} compact />
        </section>
      </Container>
    </Layout>
  )
}

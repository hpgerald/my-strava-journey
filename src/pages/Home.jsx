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
import { isNamedCountry } from '../lib/geo.js'
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
  const ctryYr = bestBy((s) => s.countriesNamed)

  const life = (needle) => lifetime.find((r) => (r.metric || '').toLowerCase().includes(needle)) || {}

  const activities = life('activities').value
  const km = life('total km').value
  const elevation = life('elevation').value
  const streak = life('longest streak').value

  const years = yearsBetween(meta.coverage_start, meta.coverage_end)

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
  const ctryMost = ctryYr ? ctryYr.stats.countriesNamed : 5
  // the habit: the first day after the longest silence, how often I have gone out since, and the longest break since
  const habitStartISO = (() => {
    let best = 0, at = sortedDays[0] || '2021-06-01'
    for (let i = 1; i < sortedDays.length; i++) { const g = Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1]); if (g > best) { best = g; at = sortedDays[i] } }
    return at
  })()
  const habitDays = sortedDays.filter((d) => d >= habitStartISO)
  const habitShare = sortedDays.length ? habitDays.length / Math.max(1, Math.round((Date.parse(sortedDays[sortedDays.length - 1]) - Date.parse(habitStartISO)) / DAY) + 1) : 0
  const habitPhrase = habitShare >= 0.7 ? 'about three days in every four' : habitShare >= 0.6 ? 'about two days in every three' : 'more than half of all days'
  const habitMaxBreak = habitDays.reduce((m, d, i) => (i ? Math.max(m, Math.round((Date.parse(d) - Date.parse(habitDays[i - 1])) / DAY) - 1) : 0), 0)
  const streakFrom = edStreak.start ? `${MONTHS_FULL[parseInt(edStreak.start.slice(5, 7), 10) - 1]} ${edStreak.start.slice(0, 4)}` : ''
  // the usual walk, then and now
  const walkMedOf = (y) => { const ds = activityLog.filter((a) => a.sport_type === 'Walk' && Number(a.year) === y).map((a) => toNum(a.distance_km) || 0).sort((x, z) => x - z); return ds.length ? ds[Math.floor(ds.length / 2)] : 0 }
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
  // the other African countries by name; anything outside Africa is one "others" count
  const awayRows = located.filter((c) => c.country !== 'Tanzania' && isNamedCountry(c.country)).sort((a, b) => (toNum(b.activities) || 0) - (toNum(a.activities) || 0))
  const awayN = locN - tzN
  const awayNamedN = awayRows.reduce((t, c) => t + (toNum(c.activities) || 0), 0)
  const othersN = awayN - awayNamedN
  const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
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
            {NUMWORD[years] ? cap(NUMWORD[years]) : years} years ago I was going out now and then, mostly on a treadmill. Today I
            go out every day. The change did not come from big days. Most of my outings are simple, a walk or an easy run of
            about {Math.round(medFootKm)} km, around one hour. It came from going out often. Since I came back in{' '}
            {MONTHS_FULL[parseInt(habitStartISO.slice(5, 7), 10) - 1]} {habitStartISO.slice(0, 4)}, I have gone out on {habitPhrase}
            {streakFrom ? `, and since ${streakFrom} I have not missed a single day` : ''}. Each year had its own character, and
            you can open any of them below.
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
              <h2 id="streak-title" className="section-head__title">One day leads to the&nbsp;next.</h2>
            </div>

            <Reveal as="p" className="sgrid__statement">
              <i lang="sw">Usipoziba ufa utajenga ukuta</i>: if you do not fill a crack, you will end up building a wall. The
              best thing my log taught me is that going out builds on itself. One day out makes the next one more likely, and after
              a week in a row it is almost certain I will go out again. Before the habit set in, one day out led to another only{' '}
              {mBefore}% of the time. The danger is on the other side: after a few days off, starting again is hard. So I protect
              the chain, and on a tired day a short walk is enough.
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
            </div>
          </section>
        </Container>
      )}

      {/* ===== Who does the work: how the distance spreads across days ===== */}
      {work && work.n > 20 && (
        <div className="bleed bleed--level">
          <Container>
            <section className="sgrid" aria-labelledby="work-title">
              <div className="sgrid__head">
                <p className="eyebrow">Big days and small days</p>
                <h2 id="work-title" className="section-head__title">The long days carry a&nbsp;lot.</h2>
              </div>

              <Reveal as="p" className="sgrid__statement">
                The surprise here is that my total was not built by big days. My long days, over {Math.floor(work.tenthFrom)} km,
                carry about as much distance as my quieter half of days together, and no single day, not even the marathon, moves
                the total much. Most of my kilometres come from ordinary days of 10 km or more: {pc(work.bigShare)}% of the distance
                from {work.bigN < work.n / 2 ? 'less than half' : 'about half'} of my days. The short days fill the gaps and keep the
                habit alive.
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
              </div>
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
            eyebrow="How my days are shaped"
            title="Same time, fewer outings."
            statement={<>
              I did not find more time. I used it differently. On a day out I still move for about {Math.round(perDayLo)} to{' '}
              {Math.round(perDayHi)} minutes, the same in every year. In {shapeMulti.year} I split it into two sessions, often a run
              in the morning and a walk in the evening. Over the years the two became one longer outing, often a long walk. The
              same hour, but each outing now goes further.
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
            source="Activity Log · moving time and outings per active day, by year"
          />
        </Container>
      )}

      {/* ===== A closer look: six smaller things, each on the section recipe ===== */}
      <Container>
        <hr className="rule" />
        <div className="closer-head">
          <p className="eyebrow">A closer look</p>
          <h2 className="section-head__title">Six more things I&nbsp;found.</h2>
        </div>

        {/* 1. Where in the world */}
        {locN > 0 && tzN > 0 && (
          <StorySection
            id="where-title"
            eyebrow="1 · Where I go"
            title="The climbing is in two&nbsp;regions."
            statement={<>
              Tanzania is my training ground, and the places where I live are flat. {busiestRegion && busiestRegion.region}, where I
              go out most, gives almost no climbing, so for the hills I travel to {climbTop2.map((r) => r.region).join(' and ')}.
              Those two regions hold only a small part of my outings but most of my metres. My trips across the border, to{' '}
              {andList(awayRows.map((c) => c.country))}, were short, a few days each
              {othersN > 0 ? `, plus ${NUMWORD[othersN] || othersN} outings I count as others` : ''}.
            </>}
            odds={{
              title: 'Where the outings happen',
              items: [
                { value: tzN / locN, label: 'of located outings are in Tanzania', tone: 'move' },
                { value: awayN / locN, label: 'outside Tanzania', tone: 'rest' },
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
            source="Strava GPS start points · countries and Tanzania regions, distance and climb on foot"
          />
        )}

        {/* 2. Every way to move */}
        <hr className="rule rule--faint" />
        <StorySection
          id="move-title"
          eyebrow="2 · Walking and running"
          title={walkLeadYear ? 'Walks took over.' : 'Walking leads.'}
          statement={<>
            My story started with running and turned into walking. In {gridYears[0]} almost every outing was a run, most of them on
            the treadmill. Since {walkLeadYear || 'then'} I have walked more often than I have run, every year, and my walks grew from
            short ones under {Math.ceil(walkMedOf(2021))} km in 2021 to about {Math.round(walkMedOf(gridYears[gridYears.length - 1]))} km
            now. From the end of 2021 the hills came in too, with trail runs and hikes. I did not plan this change. It happened
            slowly, and the log only showed it to me later.
          </>}
          odds={{
            title: 'Share of all outings',
            items: [
              { value: mixN.walk / mixTot, label: 'walks', tone: 'move' },
              { value: mixN.run / mixTot, label: 'runs', tone: 'move' },
              { value: mixN.trail / mixTot, label: 'trail runs and hikes', tone: 'move' },
              { value: mixN.other / mixTot, label: 'other activities', tone: 'rest' },
            ],
          }}
          left={{ title: 'Every outing, by sport', node: <SportTreemap rows={sportBreakdown} /> }}
          right={{
            title: 'Walks against runs, year by year',
            node: <TwoLines years={gridYears} a={{ label: 'Run', values: runByYear }} b={{ label: 'Walk', values: walkByYear }}
              cross={walkLeadIdx} crossLabel={walkLeadYear ? `walks lead from ${walkLeadYear}` : null}
              aria={`Walks and runs per year. ${gridYears.map((y, i) => `${y}: ${walkByYear[i]} walks, ${runByYear[i]} runs`).join('. ')}.`} />,
          }}
          source="Activity Log · outings by sport type"
        />

        {/* 3. When the day gets moving */}
        <hr className="rule rule--faint" />
        <StorySection
          id="hours-title"
          eyebrow="3 · Time of day"
          title="Mornings and evenings."
          statement={<>
            My outings live around the working day, early in the morning and in the evening, with {fmtHour(peakHour)} the busiest
            hour. Each sport found its own time. Walks fill the evenings, the treadmill takes the early mornings and late nights,
            and trail runs and hikes wait for the weekend. But the habit itself does not wait for the weekend.{' '}
            {WEEK[weekN.indexOf(weekMax)]} is my busiest day and {WEEK[weekN.indexOf(weekMin)]} the quietest, and the gap between
            them is small.
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
          source="Activity Log · start hour and weekday of every outing"
        />

        {/* 4. The year has a season */}
        {fullYears.length > 1 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="season-title"
              eyebrow="4 · Through the year"
              title="Two quieter months."
              statement={<>
                {dipYears === fullYears.length ? 'Every year' : 'In most years'} since the habit started, {MONTH_NAME[dipIdx[0]]} and {MONTH_NAME[dipIdx[1]]} have been my weakest
                months. My log does not tell me why, and I do not want to guess. What I like is {gridYears[gridYears.length - 1]}:
                the streak has covered both of them
                {edStreak.start && edStreak.start < `${gridYears[gridYears.length - 1]}-${String(dipIdx[0] + 1).padStart(2, '0')}-01` ? ', every single day' : ''}.
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
              eyebrow="5 · Indoors and out"
              title="Less treadmill every year."
              statement={<>
                I came out of the treadmill room slowly. In the early years most of my running was indoors, early in the morning
                or late in the evening, and my only full marathon was run there too. My walks were almost always outside, so the
                change is my running moving onto the roads and trails. Only recently has more of my running been outside than
                inside. Of the {fmtInt(runKm)} km I have run, {fmtInt(runKmIn)} km were still on the treadmill.
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
              source="Activity Log · trainer flag on each session"
            />
          </>
        )}

        {/* 6. Walking climbs, running runs */}
        <hr className="rule rule--faint" />
        <StorySection
          id="flip-title"
          eyebrow="6 · Distance and climb"
          title="Where the height comes from."
          statement={<>
            Running gave me the kilometres, but walking and the hills gave me the height. So much of my running was on a flat
            treadmill that it carries very little of my climbing. The climbing came slowly, on foot, at walking pace. For every
            kilometre a hike climbs about{' '}
            {NUMWORD[Math.round(mPerKm('Hike') / Math.max(1, mPerKm('Walk')))] || Math.round(mPerKm('Hike') / Math.max(1, mPerKm('Walk')))} times
            as much as a walk, and my biggest climbs all came in the mountains of Morogoro, Kilimanjaro and Manyara.
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
          source="Activity Log · distance and climb on foot (run, walk, trail run, hike)"
        />
      </Container>

      <Container>
        <FieldNote seed="/home" align="wide" />
      </Container>

      {/* ---- The quiet close, then the full index -------------------- */}
      <Container>
        <section className="sgrid" aria-labelledby="explore-title">
          <div className="sgrid__head">
            <p className="eyebrow">Read on</p>
            <h2 id="explore-title" className="section-head__title">
              {cap(NUMWORD[menuItems.length] || String(menuItems.length))} more chapters.
            </h2>
          </div>
          <IndexHub items={menuItems} compact />
        </section>
      </Container>
    </Layout>
  )
}

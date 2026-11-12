import Layout from '../components/Layout.jsx'
import Eyebrow from '../components/Eyebrow.jsx'
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
import { memo, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { fmtInt, toNum } from '../lib/format.js'
import { buildYearSummaries } from '../lib/yearStats.js'
import { isNamedCountry } from '../lib/geo.js'
import YearCharacters from '../components/YearCharacters.jsx'
import Part from '../components/Part.jsx'
import { Moments, Lesson, HandOff, RasPart } from '../components/StoryBits.jsx'
import { buildChronicle } from '../lib/chronicle.js'
import Verdict from '../components/Verdict.jsx'
import { MOUNTAINS } from '../lib/mountainList.js'
import { numOf } from '../lib/chapters.js'
import FieldNote from '../components/FieldNote.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { useHeroLive } from '../motion/heroLive.js'
import { SITE_TITLE } from '../lib/siteTitle.js'
import HeroBoard from '../components/HeroBoard.jsx'
import { Reveal } from '../components/Reveal.jsx'
import BookStory, { BookRead } from '../components/BookStory.jsx'
import { useBook } from '../components/BookContext.js'
import Marquee from '../motion/Marquee.jsx'

const NONE = []
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
const fmtDayLong = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MONTHS_FULL[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`

// The page itself only gathers its tables. The site loads its tables one at a
// time and each arrival redraws every reader of them, so the heavy work lives
// in HomeBody below, which redraws only when its own tables change.
export default function Home() {
  useEffect(() => {
    document.title = SITE_TITLE
  }, [])
  usePartJump()
  const lifetime0 = useTable('lifetime_totals')
  const metaRows = useTable('meta')
  const countries0 = useTable('countries')
  const activityLog0 = useTable('activities')
  const activityGeo0 = useTable('activity_geo')
  const monthlyTotals0 = useTable('monthly_totals')
  const sportBreakdown0 = useTable('sport_breakdown')
  const tzRegions0 = useTable('tanzania_regions')
  const nav0 = useTable('nav_index')
  const homeReady = [lifetime0, countries0, activityLog0, activityGeo0, monthlyTotals0, sportBreakdown0, tzRegions0, nav0].every((t) => t.length > 0)
  // the tables arrive one by one; the page works from all of them at once, so
  // until the last one is in, every figure below is worked out from nothing
  const ready = (t) => (homeReady ? t : NONE)
  // the front board paints first; the chapters below it are drawn right after
  // as an interruptible update, so a slow phone can still answer a tap while
  // they are built, and they arrive all at once, so nothing on screen moves
  const [restOn, setRestOn] = useState(false)
  useEffect(() => { if (homeReady && !restOn) startTransition(() => setRestOn(true)) }, [homeReady, restOn])
  return (
    <HomeBody
      homeReady={homeReady} restOn={restOn} metaRows={metaRows}
      lifetime={ready(lifetime0)}
      countries={ready(countries0)}
      activityLog={ready(activityLog0)}
      activityGeo={ready(activityGeo0)}
      monthlyTotals={ready(monthlyTotals0)}
      sportBreakdown={ready(sportBreakdown0)}
      tzRegions={ready(tzRegions0)}
      nav={ready(nav0)}
    />
  )
}

// a link from the spine on another page lands here with ?part=n: scroll to
// that part once it has been drawn
function usePartJump() {
  const { search } = useLocation()
  useEffect(() => {
    const n = new URLSearchParams(search).get('part')
    if (!n) return undefined
    let tries = 0
    const t = setInterval(() => {
      const el = document.getElementById(`part-${n}`)
      if (el || ++tries > 40) { clearInterval(t); if (el) el.scrollIntoView({ block: 'start' }) }
    }, 150)
    return () => clearInterval(t)
  }, [search])
}

// The cold open: the board holds the screen while three beats pass over it,
// the layoff, the comeback and the streak, each lighting its own stretch of the
// bars. The beat follows the scroll, so the reader sets the pace; without motion
// the board stands still and the same story is told in the parts below.
function ColdOpen({ heroRef, beats, ...board }) {
  const scene = useRef(null)
  const [beat, setBeat] = useState(0)
  useEffect(() => {
    const el = scene.current
    if (!el || !beats.length) return undefined
    let raf = 0
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = Math.max(1, r.height - window.innerHeight)
      const p = Math.min(1, Math.max(0, -r.top / run))
      const b = p < 0.1 ? 0 : Math.min(beats.length, 1 + Math.floor(((p - 0.1) / 0.9) * beats.length))
      setBeat((x) => (x === b ? x : b))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    read()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [beats.length])
  return (
    <div className="shero-scene" data-fx="pin" ref={scene}>
      <section className="shero" aria-hidden="true" ref={heroRef}>
        <HeroBoard {...board} beats={beats} beat={beat} />
      </section>
      <div className={`shero-scene__run${beats.length ? ' shero-scene__run--beats' : ''}`} aria-hidden="true" />
    </div>
  )
}

const HomeBody = memo(function HomeBody({ homeReady, restOn, metaRows, lifetime, countries, activityLog, activityGeo, monthlyTotals, sportBreakdown, tzRegions, nav }) {
  const book = useBook()
  const heroRef = useHeroLive()
  const meta = useMemo(() => {
    const out = {}
    for (const r of metaRows) out[r.key] = r.value
    return out
  }, [metaRows])

  // per-year character narrative (shared with the Year in Sport report)
  // the biggest single climb of a hike, and where it started
  const bigHike = useMemo(() => {
    let best = null
    for (const a of activityLog) if (a.sport_type === 'Hike' && (!best || (toNum(a.elevation_gain_m) || 0) > (toNum(best.elevation_gain_m) || 0))) best = a
    if (!best) return { m: 0, region: '' }
    const g = activityGeo.find((x) => x.activity_key === best.activity_key)
    return { m: Math.round(toNum(best.elevation_gain_m) || 0), region: g && g.country === 'Tanzania' ? g.region : '' }
  }, [activityLog, activityGeo])
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
  // the first outing of the current streak, and how the first year compares with the months now
  const streakFirst = edStreak.start ? activityLog.filter((a) => (a.date || '').slice(0, 10) === edStreak.start).sort((x, z) => (x.date < z.date ? -1 : 1))[0] : null
  const firstYearN = gridYears.length ? activityLog.filter((a) => Number(a.year) === gridYears[0]).length : 0
  const nowMonthsMin = (() => { const y = gridYears[gridYears.length - 1]; const c = {}; for (const a of activityLog) if (Number(a.year) === y) { const k = (a.date || '').slice(0, 7); c[k] = (c[k] || 0) + 1 } const v = Object.values(c); return v.length ? Math.min(...v) : 0 })()
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
  const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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

  // ---- My Book: the facts behind the longer story under each section ----
  const nowYear = gridYears[gridYears.length - 1]
  const n0 = (v) => fmtInt(Math.round(v || 0))
  const pcs = (v) => Math.round((v || 0) * 100)
  const habitBreaks = habitDays.map((d, i) => (i ? Math.round((Date.parse(d) - Date.parse(habitDays[i - 1])) / DAY) - 1 : 0)).filter((g) => g > 0)
  const breaksOne = habitBreaks.filter((g) => g === 1).length
  const breaksFive = habitBreaks.filter((g) => g >= 5).length
  const preDays = sortedDays.filter((d) => d < habitStartISO).length
  const nowDays = sortedDays.filter((d) => d.startsWith(`${nowYear}-`)).length
  const dayKm = [...dailyFootKm].sort((x, z) => x - z)
  const dayKmTot = dayKm.reduce((t, v) => t + v, 0) || 1
  const medDayKm = dayKm.length ? dayKm[Math.floor(dayKm.length / 2)] : 0
  const bigDays = dayKm.filter((v) => v >= 20)
  const smallDays = dayKm.filter((v) => v < 5)
  const sumKm = (xs) => xs.reduce((t, v) => t + v, 0)
  const sportKm = (t, y, indoor) => activityLog.filter((a) => a.sport_type === t && Number(a.year) === y && (indoor == null || trainerTrue(a.trainer) === indoor)).reduce((s2, a) => s2 + (toNum(a.distance_km) || 0), 0)
  const peakHourOf = (y) => { const c = Array(24).fill(0); for (const a of activityLog) if (Number(a.year) === y) { const h = parseInt(a.hour, 10); if (h >= 0 && h < 24) c[h] += 1 } return c.indexOf(Math.max(...c)) }
  const shapeOf = (y) => shapeRows.find((r) => r.year === y)
  const indoorRunShare = (y) => { const all = sportKm('Run', y); return all ? sportKm('Run', y, true) / all : 0 }
  const runPeakYear = gridYears.reduce((b, y) => (sportKm('Run', y) > sportKm('Run', b) ? y : b), gridYears[0])
  const hikeN = activityLog.filter((a) => a.sport_type === 'Hike').length
  const km30Top = (() => { const m = {}; const byDay = {}; for (const a of activityLog) if (FOOT_HOME.has(a.sport_type)) { const d = (a.date || '').slice(0, 10); byDay[d] = (byDay[d] || 0) + (toNum(a.distance_km) || 0) } for (const [d, v] of Object.entries(byDay)) if (v >= 30) m[d.slice(0, 4)] = (m[d.slice(0, 4)] || 0) + 1; return Object.entries(m).sort((x, z) => z[1] - x[1])[0]?.[0] || '' })()

  // the Record and the book, each with its own chapter number from nav_index
  const menuItems = nav.filter((r) => r.category !== 'story')

  // the hero's strip: outings in every month of the record, and the month the
  // current streak began
  const heroMonths = (() => {
    if (!sortedDays.length) return []
    const c = {}
    for (const a of activityLog) { const k = (a.date || '').slice(0, 7); if (k) c[k] = (c[k] || 0) + 1 }
    const out = []
    let [y, m] = sortedDays[0].slice(0, 7).split('-').map(Number)
    const end = sortedDays[sortedDays.length - 1].slice(0, 7)
    for (let k = `${y}-${String(m).padStart(2, '0')}`; k <= end; m === 12 ? (y++, m = 1) : m++, k = `${y}-${String(m).padStart(2, '0')}`) out.push({ k, n: c[k] || 0 })
    return out
  })()
  const heroStreakFrom = edStreak.start ? edStreak.start.slice(0, 7) : '9999-99'
  // the longest silence in the record and the month the habit came back after it
  const heroGap = (() => {
    let best = null
    for (let i = 1; i < sortedDays.length; i++) {
      const g = Math.round((Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1])) / 86400000) - 1
      if (!best || g > best.days) best = { days: g, from: new Date(Date.parse(sortedDays[i - 1]) + 86400000).toISOString().slice(0, 7), back: sortedDays[i].slice(0, 7) }
    }
    return best
  })()
  // outings a month before the layoff, and in the year after the comeback
  const preMonthAvg = (() => { const m = heroGap ? heroMonths.filter((x) => x.k < heroGap.from) : []; return m.length ? m.reduce((s, x) => s + x.n, 0) / m.length : 0 })()
  const postMonthAvg = (() => { const m = heroGap ? heroMonths.filter((x) => x.k > heroGap.back).slice(0, 12) : []; return m.length ? m.reduce((s, x) => s + x.n, 0) / m.length : 0 })()
  const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const heroStreakLabel = edStreak.start ? `${MON3[parseInt(edStreak.start.slice(5, 7), 10) - 1]} ${edStreak.start.slice(0, 4)}` : ''

  // ---- the sections of the page, each by name: the book keeps them in its own
  // order, the site tells them as a story in time
  const secStreak = momentum && mWeek && mOneOff && mFiveOff && (
        <Container>
          <hr className="rule" />
          <section className="sgrid" aria-labelledby="streak-title">
            <div className="sgrid__head">
              <Eyebrow>How the streak holds</Eyebrow>
              <h2 id="streak-title" className="section-head__title">One day leads to the&nbsp;next.</h2>
              <Verdict cases={[1, 2]} />
            </div>

            <Reveal as="p" className="sgrid__statement">
              The hardest day to go out is the day after a break. The longer a chain of days runs, the easier the next day gets,
              and the longer a break runs, the harder it is to end. On a tired day, a short walk is enough to keep the chain.
            </Reveal>

            <OddsRow
              title="Chance the next day is active"
              items={[
                { value: mFiveOff.p, label: `after ${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][mFiveOff.g] || mFiveOff.g} zero days`, tone: 'rest' },
                { book: true, value: mOneOff.p, label: 'after one zero day', tone: 'rest' },
                { book: true, value: momentum.origin, label: 'after a day out', tone: 'move' },
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
            <BookRead items={[
              ['The odds, day by day', 'The middle point is a day I went out. Going right, each step is one more day on the streak, and the orange line is the chance I go out again the next day. Going left, each step is one more zero day, and the grey line is the chance I come back the next day. The gap between the two sides is the lesson: a chain is easier to keep than to restart.', <HabitMomentum />],
              ['Given today, the chance of tomorrow', 'Read it by row. The top row starts from a day I went out, the bottom row from a zero day. In each row the left box is the chance I go out tomorrow and the right box the chance I rest, and the two add up to 100%. The darker the box, the more likely that next day.', <TransitionMatrix />],
            ]} />
            <BookStory>{[
              `Since I came back I have taken ${n0(habitBreaks.length)} breaks of one day or more. ${n0(breaksOne)} of them were a single day, and only ${n0(breaksFive)} lasted five days or more. The longest was ${NUMWORD[habitMaxBreak] || habitMaxBreak} days.`,
              'The left side of the chart is the part I watch. Each extra day of rest makes the next one easier to take, and after five zero days I am more likely to stay in than to go out. So on a tired day I take a short walk.',
              `The right side is the reward. The longer the chain, the closer the next day comes to certain. In ${nowYear} I have not had a single zero day, so this year the whole story sits on the right.`,
            ]}</BookStory>
          </section>
        </Container>
      )
  const secWork = work && work.n > 20 && (
        <div className="bleed bleed--level">
          <Container>
            <section className="sgrid" aria-labelledby="work-title">
              <div className="sgrid__head">
                <Eyebrow>Big days and small days</Eyebrow>
                <h2 id="work-title" className="section-head__title">The long days carry a&nbsp;lot.</h2>
              </div>

              <Reveal as="p" className="sgrid__statement">
                Most of my distance came from plain days of 10 km or more. Even my marathon, the longest day I have, is less than half
                of one percent of the total, so no single day decides much. The short days in between kept me going out.
              </Reveal>

              <OddsRow
                title="Share of all distance on foot"
                items={[
                  { value: work.half, label: 'the quietest half of days', tone: 'rest' },
                  { book: true, value: work.fifth, label: 'the busiest fifth of days', tone: 'move' },
                  { book: true, value: work.tenth, label: 'the busiest tenth of days', tone: 'move' },
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
              <BookRead items={[
                ['Every day, added up', 'Every day I went out on foot is lined up from the shortest on the left to the longest on the right, and the line adds up the distance as it goes. If every day were the same size, the line would follow the dashed diagonal. The more it sags below the diagonal, the more of the total comes from the long days.', <LorenzCurve />],
                ['Each tenth of days, by its share', 'The same days, cut into ten equal groups from the shortest tenth on the left to the longest on the right. Each bar is that group\u2019s share of all my distance on foot. If every day were equal, every bar would stop at the dashed 10% line.', <DecileBars />],
              ]} />
              <BookStory>{[
                `My usual day on foot is about ${medDayKm.toFixed(1)} km. Half of my days out are shorter than that and half are longer. The very long days carry a lot for how few they are: ${n0(bigDays.length)} days of 20 km or more gave ${pcs(sumKm(bigDays) / dayKmTot)}% of all my kilometres.`,
                `${n0(dayKm.filter((v) => v >= 30).length)} of my days on foot reached 30 km or more, and the year with the most of them was ${km30Top}.`,
                `At the other end are ${n0(smallDays.length)} days under 5 km. Together they gave only ${pcs(sumKm(smallDays) / dayKmTot)}% of the distance, so on a chart of kilometres they almost disappear. On a chart of days they count the same as a marathon. Each one kept the chain going.`,
              ]}</BookStory>
            </section>
          </Container>
        </div>
      )
  const secYears = shapeRows.length > 2 && shapeMulti && (
        <Container>
          <hr className="rule" />
          <StorySection
            id="years-title"
            eyebrow="How my days are shaped"
            title="Same time, fewer outings."
            statement={<>
              My time each day has stayed the same. I just use it differently now. A day out has always been about{' '}
              {Math.round(perDayLo)} to {Math.round(perDayHi)} minutes. In the early years I split it, a run in the morning and a walk
              in the evening. Now it is usually one longer outing.
            </>}
            odds={{
              title: 'How the days were split',
              items: [
                { book: true, value: shapeMulti.multi, label: `of active days doubled up in ${shapeMulti.year}`, tone: 'rest' },
                { book: true, value: shapeNow.multi, label: `of active days doubled up in ${shapeNow.year}`, tone: 'move' },
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
            read={[
              'One row for each year. The length of the bar is the minutes I spent moving on a day I went out. The bar is cut into blocks, one for each outing on a typical day, so many short blocks mean I split the day and one long block means one longer outing. Grey rows are the years before the long layoff, and orange is this year.',
              'Each bar is a year, and its height is the share of my days out that had two or more outings. The higher the bar, the more often I split the day.',
            ]}
            story={[
              `In 2021 I did about ${shapeOf(2021) ? shapeOf(2021).outings.toFixed(1) : ''} outings on an average day out. In ${nowYear} it is ${shapeNow.outings.toFixed(1)}. The time stayed about the same, and only the number of pieces changed.`,
              `Much of the change came from walking. My usual walk in 2021 was under ${Math.ceil(walkMedOf(2021))} km, a short walk that fits between other things. Now my usual walk is about ${Math.round(walkMedOf(nowYear))} km, and a walk like that takes one long block of the day. My runs moved the same way, from short treadmill sessions to longer runs outside.`,
              'One long outing also means one start, one finish and one upload, and then the day is done.',
            ]}
            source="Activity Log · moving time and outings per active day, by year"
          />
        </Container>
      )
  const secWhere = locN > 0 && tzN > 0 && (
          <StorySection
            id="where-title"
            eyebrow="Where I go"
            title="The climbing is in two&nbsp;regions."
            statement={<>
              If I want to climb, I have to travel. Where I go out most, the ground is flat. One hike in Morogoro climbed almost 2,000 m,
              and in {busiestRegion && busiestRegion.region}, where I go out most, it would take me about sixty outings to climb that much.
            </>}
            odds={{
              title: 'Where the outings happen',
              items: [
                { book: true, value: tzN / locN, label: 'of located outings are in Tanzania', tone: 'move' },
                { book: true, value: awayN / locN, label: 'outside Tanzania', tone: 'rest' },
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
            read={[
              'The big disc is Tanzania, and the number in it is the share of my outings with a GPS start that began there. The other African countries are listed beside it with the year I first went out there. Anything outside Africa is counted together as others.',
              'Each region of Tanzania has two bars: the first is its share of my outings there, the second its share of my climbing. The number at the end is the gap. A region with more climbing than outings is where the hills are.',
            ]}
            story={[
              `${regSorted[0] ? regSorted[0].region : ''} and ${regSorted[1] ? regSorted[1].region : ''}, where I go out most, hold ${pcs(((toNum(regSorted[0]?.activities) || 0) + (toNum(regSorted[1]?.activities) || 0)) / regTotA)}% of my outings in Tanzania and only ${pcs(((toNum(regSorted[0]?.elevation_m) || 0) + (toNum(regSorted[1]?.elevation_m) || 0)) / regTotE)}% of the climbing. That is what flat ground looks like in a log.`,
              `${climbTop2.map((r) => r.region).join(' and ')} are the other way round. I go there less, but most of my metres up were done there. Every big climb in this record came on a trip.`,
              awayRows.length ? `Outside Tanzania I have gone out in ${andList(awayRows.map((r) => r.country))}. ${awayRows[0].country} comes first, with ${n0(toNum(awayRows[0].activities))} outings over a few visits.` : '',
            ]}
            source="Strava GPS start points · countries and Tanzania regions, distance and climb on foot"
          />
        )
  const secMove = (
        <>
        <hr className="rule rule--faint" />
        <StorySection
          id="move-title"
          eyebrow="Walking and running"
          title={walkLeadYear ? 'Walks took over.' : 'Walking leads.'}
          statement={<>
            I chose walking. Running for me is mostly indoors, a hard session when time is short. Walking takes me outside, where I
            can enjoy nature, and it builds perseverance. In 2021 my usual walk was under {Math.ceil(walkMedOf(2021))} km,
            and this year it is about {Math.round(walkMedOf(gridYears[gridYears.length - 1]))} km. Since {walkLeadYear || 'then'} I have
            walked more often than I have run, every year.
          </>}
          odds={{
            title: 'Share of all outings',
            items: [
              { value: mixN.walk / mixTot, label: 'walks', tone: 'move' },
              { value: mixN.run / mixTot, label: 'runs', tone: 'move' },
              { book: true, value: mixN.trail / mixTot, label: 'trail runs and hikes', tone: 'move' },
              { book: true, value: mixN.other / mixTot, label: 'other activities', tone: 'rest' },
            ],
          }}
          left={{ title: 'Every outing, by sport', node: <SportTreemap rows={sportBreakdown} /> }}
          right={{
            title: 'Walks against runs, year by year',
            node: <TwoLines years={gridYears} a={{ label: 'Run', values: runByYear }} b={{ label: 'Walk', values: walkByYear }}
              cross={walkLeadIdx} crossLabel={walkLeadYear ? `walks lead from ${walkLeadYear}` : null}
              aria={`Walks and runs per year. ${gridYears.map((y, i) => `${y}: ${walkByYear[i]} walks, ${runByYear[i]} runs`).join('. ')}.`} />,
          }}
          read={[
              'Each block is a kind of outing, sized by how many times I did it. Walks and runs are the two big blocks. Everything that is not on foot sits together in one grey block called other activities.',
              'Two lines count my walks and my runs each year. Where the walk line rises above the run line, walking became my more common outing, and the mark shows the year it happened.',
            ]}
          story={[
              `Walking grew in number first. ${walkLeadYear ? `From ${walkLeadYear} on, every year has had more walks than runs.` : ''} In ${nowYear} I have done ${n0(walkByYear[walkByYear.length - 1])} walks and ${n0(runByYear[runByYear.length - 1])} runs so far.`,
              sportKm('Walk', nowYear) > sportKm('Run', nowYear) ? `Then it grew in distance. ${nowYear} is the first year my walks covered more kilometres than my runs, ${n0(sportKm('Walk', nowYear))} km against ${n0(sportKm('Run', nowYear))} km.` : `Then it grew in distance. My walks have covered ${n0(sportKm('Walk', nowYear))} km in ${nowYear}.`,
              `Running is still a big part of my week. My biggest running year was ${runPeakYear}, with ${n0(sportKm('Run', runPeakYear))} km, most of it on the treadmill.`,
            ]}
          source="Activity Log · outings by sport type"
        />
        </>
  )
  const secHours = (
        <>
        <hr className="rule rule--faint" />
        <StorySection
          id="hours-title"
          cases={[4]}
          eyebrow="Time of day"
          title="Mornings and evenings."
          statement={<>
            The habit fits around an office job, so it does not wait for the weekend. Most outings start early in the morning or in the
            evening, with {fmtHour(peakHour)} the busiest hour, and every day of the week gets about the same share. When I am chasing
            a target it can be very early or very late: one walk started just before two in the morning, and one run almost at midnight.
          </>}
          odds={{
            title: 'When outings start',
            items: [
              { value: hourShare(0, 10), label: 'before 10 in the morning', tone: 'move' },
              { book: true, value: hourShare(10, 16), label: 'between 10am and 4pm', tone: 'rest' },
              { value: hourShare(16, 21), label: 'between 4 and 9pm', tone: 'move' },
              { book: true, value: hourShare(21, 24), label: 'after 9pm', tone: 'rest' },
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
          read={[
              'A 24-hour clock with midnight at the top and noon at the bottom. Each spoke is one hour, and its length is the number of outings that started in that hour. The long spokes on the left and right are my mornings and evenings.',
              'One bar for each day of the week, counting every outing that started on it. The orange bar is the busiest day and the grey bar the quietest.',
            ]}
          story={[
              `${(() => { const hs = gridYears.filter((y) => y > quietUntil && y < nowYear).map(peakHourOf); return hs.length && hs.every((h) => h >= 16) ? `From ${gridYears.find((y) => y > quietUntil)} to ${nowYear - 1} my busiest hour was always in the late afternoon or evening, after the working day.` : 'For most years my busiest hour was in the evening, after the working day.' })()} ${peakHourOf(nowYear) < 12 ? `In ${nowYear} it moved to ${fmtHour(peakHourOf(nowYear))}, and the mornings took the lead.` : `In ${nowYear} it is ${fmtHour(peakHourOf(nowYear))}.`}`,
              `The weekend holds ${pcs((weekN[0] + weekN[6]) / (activityLog.length || 1))}% of all my outings, close to the 29% an even week would give. Saturday is a little busier than the rest, and the gap between the busiest and quietest day is ${n0(weekMax - weekMin)} outings over seven years.`,
            ]}
          source="Activity Log · start hour and weekday of every outing"
        />
        </>
  )
  const secSeason = fullYears.length > 1 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="season-title"
              cases={[5]}
              eyebrow="Through the year"
              title="Two quieter months."
              statement={<>
                {MONTH_NAME[dipIdx[0]]} and {MONTH_NAME[dipIdx[1]]} have been my weakest months{' '}
                {dipYears === fullYears.length ? 'every year' : 'most years'}, and the quietest of all was September 2024, with
                only eight days out. In {gridYears[gridYears.length - 1]} I went
                out on every day of both.
              </>}
              odds={{
                title: `Share of days active, ${fullYears[0]} to ${fullYears[fullYears.length - 1]}`,
                items: [
                  { book: true, value: monthShare[bestIdx], label: `in ${MONTH_NAME[bestIdx]}, the strongest month`, tone: 'rest' },
                  { value: midShare, label: 'in a typical month', tone: 'rest' },
                  { book: true, value: monthShare[dipIdx[0]], label: `in ${MONTH_NAME[dipIdx[0]]}`, tone: 'move' },
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
              read={[
              `One bar for each month, showing the share of its days that had an outing, from ${fullYears[0]} to ${fullYears[fullYears.length - 1]}. The dashed line is the level for the whole year. The two orange bars are the quieter months.`,
              'Years run down and months run across. Each cell is one month, shaded by the share of its days with an outing: pale is a thin month and deep orange is a month with something almost every day. The bracket marks the two quieter months.',
            ]}
              story={[
              `The start of the year is my strongest time. ${MONTH_NAME[bestIdx]} has the highest share of active days, and ${[0, 1, 2].every((m) => monthShare[m] > fullShare) ? 'January, February and March are all above the level for the whole year' : 'the first months of the year are mostly above the level for the whole year'}.`,
              `The months grow fuller as the years go on. In the grid, the rows from 2021 on are much darker than the first two, and the row for ${nowYear} is solid, every month with something every day.`,
              'The end of 2024 shows how quickly it can turn. September 2024 was my quietest month since the comeback, and from the last day of October I went out every day to the end of the year.',
            ]}
              source="Activity Log · days with at least one activity, by month"
            />
          </>
        )
  const secIndoor = ioFirst && ioLast && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="indoor-title"
              eyebrow="Indoors and out"
              title="Less treadmill every year."
              statement={<>
                The treadmill is where I learned to run. Of the {fmtInt(runKm)} km I have run, {fmtInt(runKmIn)} km were on it, and my
                only full marathon too. Only recently has more of my running moved outside.
              </>}
              odds={{
                title: 'Share of sessions indoors',
                items: [
                  { value: ioFirst.indoor / ioFirst.n, label: `of sessions in ${ioYears[0]}`, tone: 'rest' },
                  { value: ioLast.indoor / ioLast.n, label: `of sessions in ${ioYears[ioYears.length - 1]}`, tone: 'move' },
                  { book: true, value: indoorShare('run'), label: 'of all runs', tone: 'rest' },
                  { book: true, value: indoorShare('walk'), label: 'of all walks', tone: 'move' },
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
              read={[
              'Each year is split in two and always adds up to 100%: outings indoors on a machine at the top, outings outside at the bottom. When the line between them climbs, more of that year moved outside.',
              'The share of each kind of outing that was done indoors. Runs are mostly indoors, while walks, trail runs and hikes almost never are.',
            ]}
              story={[
              `${pcs(indoorRunShare(2021)) === pcs(indoorRunShare(2022)) ? `In both 2021 and 2022, ${pcs(indoorRunShare(2021))}%` : `In 2021 and 2022, ${pcs(indoorRunShare(2021))}% and ${pcs(indoorRunShare(2022))}%`} of my running kilometres were on the treadmill, more than 2,000 km a year. In 2025 the share fell to ${pcs(indoorRunShare(2025))}%, and in ${nowYear} it is ${pcs(indoorRunShare(nowYear))}%.`,
              `The treadmill has not gone away. I have run ${n0(sportKm('Run', nowYear, true))} km on it in ${nowYear}. The long runs are the ones that moved outside.`,
              'Walks almost never happen indoors. For me a walk means going outside, and that is part of why the outside grew as walking grew.',
            ]}
              source="Activity Log · trainer flag on each session"
            />
          </>
        )
  const secFlip = (
        <>
        <hr className="rule rule--faint" />
        <StorySection
          id="flip-title"
          eyebrow="Distance and climb"
          title="Where the height comes from."
          statement={<>
            Running gives me the kilometres, and walking and the hills give me the height. I climb about{' '}
            {mPerKm('Run').toFixed(1)} m for every kilometre I run. At that rate I would need to run more than{' '}
            {fmtInt(Math.floor(bigHike.m / Math.max(0.1, mPerKm('Run')) / 100) * 100)} km to match my biggest hike, {bigHike.m >= 1900 && bigHike.m < 2000 ? 'almost 2,000' : fmtInt(bigHike.m)} m{bigHike.region ? ` in ${bigHike.region}` : ''}.
          </>}
          odds={{
            title: 'Share of distance and climb on foot',
            items: [
              { value: fShare('Run', 'dist'), label: 'of the distance is running', tone: 'move' },
              { value: fShare('Run', 'elev'), label: 'of the climb is running', tone: 'rest' },
              { book: true, value: fShare('Walk', 'elev'), label: 'of the climb is walking', tone: 'move' },
              { book: true, value: fShare('TrailRun', 'elev') + fShare('Hike', 'elev'), label: 'of the climb is trail runs and hikes', tone: 'move' },
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
          read={[
              'Two stacked columns: on the left each sport\u2019s share of my distance on foot, on the right its share of my climbing. A ribbon joins the two shares of the same sport. A ribbon that narrows climbs less than its distance, and one that widens climbs more.',
              'The average metres climbed for every kilometre, for each sport. A taller bar means steeper ground.',
            ]}
          story={[
              `A kilometre of hiking climbs about ${Math.round(mPerKm('Hike') / Math.max(0.1, mPerKm('Run')))} times more than a kilometre of running. Hikes are rare in my log, only ${n0(hikeN)} of them, and still they gave ${pcs(fShare('Hike', 'elev'))}% of all my climbing.`,
              `If I had only run, seven years would have given me ${n0(flipOf('Run').elev)} m of climbing, about ${(flipOf('Run').elev / 8849).toFixed(1)} times the height of Everest. With the walks and the hills, the total is ${Math.floor(flipTot.elev / Math.max(1, flipOf('Run').elev))} times as much.`,
              `Trail runs sit in between. They are ${pcs(fShare('TrailRun', 'dist'))}% of my distance and ${pcs(fShare('TrailRun', 'elev'))}% of my climbing. Walks are the quiet worker: they gave more climbing than any other sport, because there are so many of them.`,
            ]}
          source="Activity Log · distance and climb on foot (run, walk, trail run, hike)"
        />
        </>
  )

  // ---- the story: a cold open, then six parts in the order they happened ----
  // the cold open: three beats over the board, from the layoff to the streak
  const heroBeats = heroGap ? [
    { k: 'The layoff', t: `Then I stopped. For ${n0(heroGap.days)} days there is nothing in the log.` },
    { k: 'The comeback', t: `When I came back, about ${n0(preMonthAvg)} outings a month became about ${n0(postMonthAvg)}.` },
    { k: 'The streak', t: `Since ${heroStreakLabel} I have not missed a day: ${n0(toNum(curStreak))} days in a row.` },
  ] : []
  const nOf = (y) => { const s = yearSummaries.find((x) => x.year === y); return s ? s.stats.n : 0 }
  // the moments of the timeline, to be set inside the parts they belong to
  const chron = activityLog.length ? buildChronicle(activityLog, activityGeo, [], []) : null
  const events = chron ? chron.events : []
  const lastMonth = heroMonths.length ? heroMonths[heroMonths.length - 1].k : '9999-12'
  // three numbers and the strip of days for each year card
  const yearFacts = (() => {
    const out = {}
    for (const a of activityLog) {
      const y = (a.date || '').slice(0, 4), d = (a.date || '').slice(0, 10)
      if (!y) continue
      const o = out[y] || (out[y] = { n: 0, km: 0, days: new Set() })
      o.n += 1
      if (FOOT_HOME.has(a.sport_type)) o.km += toNum(a.distance_km) || 0
      o.days.add(d)
    }
    return out
  })()
  const plates = (ys) => {
    const s = yearSummaries.filter((y) => ys.includes(y.year))
    return s.length ? <Container><YearCharacters facts={yearFacts} streakFrom={edStreak.start || ''} summaries={s} quietUntil={quietUntil} current={gridYears[gridYears.length - 1]} title={s.length > 1 ? 'The years of this part' : 'The year of this part'} /></Container> : null
  }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthOf = (ym) => `${MONTHS[parseInt(ym.slice(5, 7), 10) - 1]} ${ym.slice(0, 4)}`

  return (
    <Layout>
      {!book && (
        <ColdOpen heroRef={heroRef} beats={heroBeats}

            months={heroMonths} streakFrom={heroStreakFrom} streakSinceLabel={heroStreakLabel}
            gap={heroGap ? { days: heroGap.days, fromKey: heroGap.from } : null} comebackKey={heroGap ? heroGap.back : null}
            nums={{ n: activityLog.length, km: Math.round(toNum(km) || 0), elev: Math.round(toNum(elevation) || 0), streak: Math.round(toNum(curStreak) || 0) }}
        />
      )}
      {/* the sections wait for all their tables, so they arrive together and nothing below the front page jumps */}
      {homeReady && restOn && (<>
      <Container>
        {/* ---- Type-led hero: headline left, key figures stacked right --- */}
        <section className="hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="visually-hidden">
            Gerald Tesha: {years || 7} years on foot, {fmtInt(activities)} activities, one habit.
          </h1>

          <HeartbeatYears activities={activityLog} km={km} elevation={elevation} streak={curStreak} quiet={!book} />

          <Reveal as="p" className="hero__statement">
            Going often has done more for me than going far. In {gridYears[0]}, my first year, I went out {firstYearN} times.
            {nowMonthsMin >= firstYearN ? ' Now I do that in a month.' : ' Now I come close to that in a single month.'} Most days are a
            walk or an easy run of about an hour, and those ordinary days are where nearly all of this comes from.
          </Reveal>

          <BookStory>{[
            `Seven years sounds long, but most of this record comes from the last five. Before the long layoff I went out on ${n0(preDays)} days in total. In ${nowYear} alone I have gone out on ${n0(nowDays)}. The habit really started in the middle of 2021, when I came back, and it has stayed since.`,
            'In the sky above, every dot is one outing, placed by its date and by the hour it started, and bigger for a longer distance. The empty band is the long layoff. After it, the dots never thin out again, and the two thick bands of mornings and evenings run all the way to today.',
            'Each part below opens with its years as cards, one line each. Read them in order and the same thing repeats: every year after the pause is much fuller than the two before it.',
          ]}</BookStory>
        </section>
      </Container>
      {book ? null : <Marquee items={['Haba na haba hujaza kibaba', 'Pole pole ndio mwendo', 'Bandu bandu humaliza gogo', 'Kawia ufike', 'Kesho tena']} speed={46} tone="ink" size="lg" />}

      <Part n="1" name="Before the habit" years="2019 to mid 2021" spine="2019" from={heroMonths.length ? heroMonths[0].k : undefined} to={heroGap ? heroGap.from : undefined}
        line={`It did not look like a habit yet: ${n0(nOf(2019))} outings in my first year, ${n0(nOf(2020))} in my second.`}
        story={['I heard about Strava and decided to give it a try. The push to move came from Jocko Willink and his words, discipline equals freedom. I listened to many of his episodes, and to the story of David Goggins too.']}>
        {plates([2019, 2020])}
        <Moments events={events} from={heroMonths.length ? heroMonths[0].k : ''} to={heroGap ? heroGap.from : ''} />
        {heroGap ? (
          <div className="spart-gap" data-fx="">
            <Container>
              <p className="spart-gap__t">Nothing in the log from {monthOf(heroGap.from)} to {monthOf(heroGap.back)}.</p>
              <p className="spart-gap__s">I changed jobs and moved from Arusha to Kilimanjaro, in the time of COVID-19. For almost a year I did nothing.</p>
            </Container>
          </div>
        ) : null}
        <Lesson to="wm-days" title="Keep the days." />
        <HandOff n="2" name="The comeback" years="mid 2021 to 2022" />
      </Part>

      <Part n="2" name="The comeback" years="mid 2021 to 2022" spine="2021" from={heroGap ? heroGap.back : undefined} to="2022-12"
        line={`From ${n0(nOf(2020))} outings in a year to ${n0(nOf(2021))}, then ${n0(nOf(2022))}.`}
        story={[`A medical check-up told me to move about 30 minutes a day, so I started again. Since then my longest layoff has been ${NUMWORD[habitMaxBreak] || habitMaxBreak} days.`]}>
        {plates([2021, 2022])}
        {secStreak}
        {secWork}
        {secYears}
        {secIndoor ? <Container>{secIndoor}</Container> : null}
        <Moments events={events} from={heroGap ? heroGap.back : ''} to="2022-12" />
        <Lesson to="wm-small" title="Streak savers count." />
        <HandOff n="3" name="The mountains" years="2023" />
      </Part>

      <Part n="3" name="The mountains" years="2023" spine="2023" from="2023-01" to="2023-12"
        line="This was the year the habit left the flat ground: Kilimanjaro in March, Hanang in April, and Bondwa Peak, where I trained for Kilimanjaro."
        story={['In the same March I took a challenge from the Activate Uganda team: 25 km a day for four days in a row, on the treadmill, on dates I chose.']}>
        {plates([2023])}
        <Container>
          {book ? <p className="spart-ref">{MOUNTAINS.filter((m) => m.part === 3).map((m) => `${m.name}, chapter ${Number(numOf(m.to))}`).join(' · ')}</p> : (
            <ul className="spart-doors">
              {MOUNTAINS.filter((m) => m.part === 3).map((m) => (
                <li key={m.id}><Link to={m.to} className={`mtn-next__link mtn-next__link--${m.id}`}><b>{m.name}</b><span>{m.line}</span></Link></li>
              ))}
            </ul>
          )}
        </Container>
        <Moments events={events} from="2023-01" to="2023-12" />
        <Lesson to="wm-long" title="Long days come in bunches." />
        <HandOff n="4" name="The road" years="2024" />
      </Part>

      <Part n="4" name="The road" years="2024" spine="2024" from="2024-01" to="2024-12"
        line="Wherever I went that year, the shoes came with me."
        story={['A remote job and a few consultancies took me across borders, and the habit came along.']}>
        {plates([2024])}
        {secWhere ? <Container>{secWhere}<p className="mtn-link"><Link to="/where">Every place I have been out →</Link></p></Container> : null}
        <Moments events={events} from="2024-01" to="2024-12" />
        <Lesson to="wm-floor" title="Keep a floor." />
        <HandOff n="5" name="No zero days" years="2025 to 2026" />
      </Part>

      <Part n="5" name="No zero days" years="2025 to 2026" spine="2025" from="2025-01" to={heroMonths.length ? heroMonths[heroMonths.length - 1].k : undefined}
        line="The streak that is still going started in the last days of 2025."
        story={['I started it on purpose. My first target is to reach 31 December 2026 without a zero day.']}>
        {plates([2025, 2026])}
        <Container>
          {book ? <p className="spart-ref">{MOUNTAINS.filter((m) => m.part === 5).map((m) => `${m.name}, chapter ${Number(numOf(m.to))}`).join(' · ')}</p> : (
            <ul className="spart-doors spart-doors--one">
              {MOUNTAINS.filter((m) => m.part === 5).map((m) => (
                <li key={m.id}><Link to={m.to} className={`mtn-next__link mtn-next__link--${m.id}`}><b>{m.name}</b><span>{m.line}</span></Link></li>
              ))}
            </ul>
          )}
        </Container>
        <Container>
          {secMove}
          {secHours}
          {secSeason}
          {secFlip}
        </Container>
        <RasPart />
        <Moments events={events} from="2025-01" to={lastMonth} />
        <Lesson to="wm-maths" title="How a year adds up." />
        <HandOff n="6" name="What it taught me" years="Looking back" />
      </Part>

      <Part n="6" name="What it taught me" years="Looking back" spine="Now"
        line="Seven years of logging, read back as a few plain lessons.">
        <Container>
          {book ? <p className="spart-ref">What It Means, chapter {Number(numOf('/what-it-means'))}</p> : <p className="mtn-link"><Link to="/what-it-means">Read the lessons →</Link></p>}
        </Container>
      </Part>

      <Container>
        <FieldNote seed="/home" align="wide" />
      </Container>

      {book ? null : (<>
      {/* ---- The Record: the whole analysis, chapter by chapter ---- */}
      <Container>
        <section className="sgrid" aria-labelledby="explore-title">
          <div className="sgrid__head">
            <Eyebrow>The Record</Eyebrow>
            <h2 id="explore-title" className="section-head__title">
              {cap(NUMWORD[menuItems.length] || String(menuItems.length))} more chapters.
            </h2>
          </div>
          <IndexHub items={menuItems} />
        </section>
      </Container>
      </>)}
      </>)}
    </Layout>
  )
})

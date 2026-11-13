import { useMemo, useState, useRef, useEffect } from 'react'
import { numOf } from '../lib/chapters.js'
import Eyebrow from '../components/Eyebrow.jsx'
import { useParams } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import { useBook } from '../components/BookContext.js'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import BookStory, { BookLesson } from '../components/BookStory.jsx'
import OutingSky from '../charts/OutingSky.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import YearMonths from '../charts/YearMonths.jsx'
import YearProgress from '../charts/YearProgress.jsx'
import YearCalendar from '../charts/YearCalendar.jsx'
import YearRank from '../charts/YearRank.jsx'
import YearMoment, { momentText } from '../charts/YearMoment.jsx'
import { YearRing, KmWaffle, WeekRidge, RankBoard, BestDay, MonthStack } from '../charts/YearSet.jsx'
import YearDistances from '../charts/YearDistances.jsx'
import YearVsPrev, { vsPrevTitle } from '../charts/YearVsPrev.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import FootFlip from '../charts/FootFlip.jsx'
import ColBars from '../charts/ColBars.jsx'
import DecileBars from '../charts/DecileBars.jsx'
import TransitionMatrix from '../charts/TransitionMatrix.jsx'
import TailOutlier from '../charts/TailOutlier.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import PairBars from '../charts/PairBars.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { computeYearStats, YEAR_THEME, YEAR_REPORT } from '../lib/yearStats.js'
import { buildYearReport } from '../lib/yearReport.js'
import { fmtInt, toNum } from '../lib/format.js'
import { isNamedCountry } from '../lib/geo.js'

const MONTH_L = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EVEREST = 8849
const DAR_DODOMA_KM = 450 // Dar es Salaam to Dodoma by road, one way
const pc = (v) => Math.round((v || 0) * 100)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const monthOf = (iso) => (iso ? MONTH_F[parseInt(iso.slice(5, 7), 10) - 1] : '')
const fmtMonth = (iso) => (iso ? `${MONTH_L[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MONTH_L[parseInt(iso.slice(5, 7), 10) - 1]}` : '')
// a date in another year carries its year
const fmtDayIn = (iso, Y) => (iso ? `${fmtDay(iso)}${Number(iso.slice(0, 4)) !== Y ? ` ${iso.slice(0, 4)}` : ''}` : '')
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)
const chg = (cur, prv) => (prv > 0 ? (cur - prv) / prv : null)
const chgTxt = (c) => (c == null ? '' : c >= 0 ? `up ${pc(c)}%` : `down ${pc(-c)}%`)
const more = (c, up, down) => (c == null ? 'no comparable' : c >= 1 ? `${Math.round(1 + c)} times as ${up === 'more' ? 'much' : up}` : c >= 0 ? `${pc(c)}% ${up}` : `${pc(-c)}% ${down}`)
// a change with its noun, read naturally: "9 times the outings" or "8% more outings"
const moreN = (c, noun) => (c != null && c >= 1 ? `${Math.round(1 + c)} times the ${noun}` : `${more(c, 'more', noun === 'outings' ? 'fewer' : 'less')} ${noun}`)

// one record card on the four-column grid
function RecordCard({ kicker, value = 0, unit, label, sub, decimals = 0, text = null, tone }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1100 })
  return (
    <li ref={ref} className={`yrec${inView ? ' is-in' : ''}${tone ? ` yrec--${tone}` : ''}`}>
      <p className="yrec__k">{kicker}</p>
      <p className="yrec__v">
        {text != null ? text : v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yrec__u">{unit}</span> : null}
      </p>
      <p className="yrec__l">{label}</p>
      {sub ? <p className="yrec__s">{sub}</p> : null}
    </li>
  )
}

export default function YearInSport({ year: bookYear } = {}) {
  const book = useBook()
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const { prev, next } = useSectionPaging('/numbers')

  const years = useMemo(
    () => [...new Set(activities.map((a) => Number(a.year)).filter(Boolean))].sort((a, b) => a - b),
    [activities]
  )
  const latest = years.length ? years[years.length - 1] : 2026
  const { year: yearParam } = useParams()
  const [picked, setPicked] = useState(null)
  useEffect(() => {
    const y = Number(yearParam)
    setPicked(years.includes(y) ? y : null)
  }, [yearParam, years])
  const activeYear = bookYear ?? picked ?? latest
  const idp = (k) => (book ? `${k}-${activeYear}` : k)

  const geoByKey = useMemo(() => {
    const m = {}
    for (const g of activityGeo) m[g.activity_key] = g
    return m
  }, [activityGeo])
  const recordFirst = useMemo(() => activities.reduce((m, a) => (!m || a.date < m ? a.date : m), ''), [activities])
  const recordLast = useMemo(() => activities.reduce((m, a) => (a.date > m ? a.date : m), ''), [activities])

  const allStats = useMemo(
    () => (activities.length ? years.map((y) => computeYearStats(y, activities, geoByKey)) : []),
    [years, activities, geoByKey]
  )
  const s = allStats.find((x) => x.year === activeYear) || null
  const prevYear = years.includes(activeYear - 1) ? activeYear - 1 : null
  const ps = prevYear ? allStats.find((x) => x.year === prevYear) : null
  const r = useMemo(
    () => (s ? buildYearReport(activeYear, activities, geoByKey, recordFirst.slice(0, 10), recordLast.slice(0, 10)) : null),
    [s, activeYear, activities, geoByKey, recordFirst, recordLast]
  )
  const yearActs = useMemo(() => activities.filter((a) => Number(a.year) === activeYear), [activities, activeYear])

  const pickerRef = useRef(null)
  const scrollToTop = () => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const onPickerKey = (e) => {
    const i = years.indexOf(activeYear)
    if (e.key === 'ArrowRight' && i < years.length - 1) { setPicked(years[i + 1]); e.preventDefault() }
    if (e.key === 'ArrowLeft' && i > 0) { setPicked(years[i - 1]); e.preventDefault() }
  }

  if (!s || !r) {
    return <DetailFrame crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]} number={numOf('/numbers')} title="Year in Sport" subtitle="Pick a year. See the whole story." />
  }

  const Y = activeYear
  const isPartial = Y === latest && s.endISO.slice(5) < '12-31'
  const so = isPartial ? ' so far' : ''
  // while the year runs, last year up to the same day, so a part year can be
  // read against a part year too
  const psSame = (() => {
    if (!isPartial || !ps) return null
    const md = s.endISO.slice(5, 10)
    const FT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
    const t = { n: 0, footKm: 0, hours: 0, elev: 0, kudos: 0, prs: 0 }
    for (const a of activities) {
      if (Number(a.year) !== prevYear || (a.date || '').slice(5, 10) > md) continue
      const v = (k) => toNum(a[k]) || 0
      t.n += 1
      t.hours += v('moving_time_min') / 60
      t.kudos += v('kudos')
      t.prs += v('prs')
      if (FT.has(a.sport_type)) { t.footKm += v('distance_km'); t.elev += v('elevation_gain_m') }
    }
    return t
  })()
  const vsRows = ps ? [
    { label: 'Outings', cur: s.n, prev: ps.n, same: psSame?.n },
    { label: 'Km on foot', cur: Math.round(s.footKm), prev: Math.round(ps.footKm), same: psSame && Math.round(psSame.footKm), unit: 'km' },
    { label: 'Hours moving', cur: Math.round(s.hours), prev: Math.round(ps.hours), same: psSame && Math.round(psSame.hours), unit: 'h' },
    { label: 'Metres climbed', cur: Math.round(s.elev), prev: Math.round(ps.elev), same: psSame && Math.round(psSame.elev), unit: 'm' },
    { label: 'Kudos', cur: Math.round(s.kudos), prev: Math.round(ps.kudos), same: psSame && Math.round(psSame.kudos) },
    { label: 'PRs', cur: Math.round(s.prs), prev: Math.round(ps.prs), same: psSame?.prs },
  ] : null
  const theme = YEAR_THEME[Y] || `${Y} in sport`

  // ---- the months ----
  const firstMo = r.startISO.slice(0, 4) === String(Y) ? parseInt(r.startISO.slice(5, 7), 10) - 1 : 0
  const lastMo = parseInt(r.endISO.slice(5, 7), 10) - 1
  const moIdx = []
  for (let i = firstMo; i <= lastMo; i++) moIdx.push(i)
  const moActs = moIdx.map((i) => s.monthsActivities[i])
  const busy = moIdx[moActs.indexOf(Math.max(...moActs))]
  const quiet = moIdx[moActs.indexOf(Math.min(...moActs.filter((v) => v > 0)))]
  const activeMonths = moActs.filter((v) => v > 0).length
  const perMonth = s.n / Math.max(1, moIdx.length)
  const monthsData = MONTH_L.map((label, i) => ({ m: i + 1, label, activities: s.monthsActivities[i], km: s.monthsKm[i] }))

  // ---- the mix ----
  const mix = { walk: 0, run: 0, trail: 0, other: 0 }
  for (const a of yearActs) mix[a.sport_type === 'Walk' ? 'walk' : a.sport_type === 'Run' ? 'run' : a.sport_type === 'TrailRun' || a.sport_type === 'Hike' ? 'trail' : 'other'] += 1
  const lead = mix.walk >= mix.run ? ['Walks', mix.walk, 'runs', mix.run] : ['Runs', mix.run, 'walks', mix.walk]
  const footKmAll = r.flip.reduce((t, d) => t + d.dist, 0) || 1
  const footElAll = r.flip.reduce((t, d) => t + d.elev, 0) || 1
  const flipOf = (k) => r.flip.find((d) => d.key === k) || { dist: 0, elev: 0 }
  const climber = r.flip.length ? r.flip.reduce((b, d) => (d.elev / footElAll > b.elev / footElAll ? d : b), r.flip[0]) : null

  // ---- the hours ----
  const hs = (lo, hi) => s.hours24.slice(lo, hi).reduce((t, v) => t + v, 0) / Math.max(1, s.n)
  const morning = hs(0, 10), midday = hs(10, 16), evening = hs(16, 21), late = hs(21, 24)
  const peakHour = s.hours24.indexOf(Math.max(...s.hours24))
  const fmtH = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
  const wkMax = Math.max(...s.weekday7), wkMin = Math.min(...s.weekday7)
  // every weekday that shares the top or bottom count, Sunday first
  const tiedDays = (v) => { const d = WEEK.filter((_, i) => s.weekday7[i] === v); return d.length > 1 ? `${d.slice(0, -1).join(', ')} and ${d[d.length - 1]}` : d[0] }

  // ---- the days ----
  const pctDays = r.activeShare
  const gapsTot = Math.max(1, r.gaps.total)
  const dTot = Math.max(1, r.multi.one + r.multi.two + r.multi.more)
  const multiDays = r.multi.two + r.multi.more

  // ---- the distances ----
  const longestFoot = s.biggestFoot ? s.biggestFoot.val : 0
  const meanFoot = r.tail ? r.tail.mean : 0

  // ---- against the other years ----
  const rankSeries = allStats.map((x) => ({ year: x.year, value: x.n }))
  const rankOf = (f) => 1 + allStats.filter((x) => f(x) > f(s)).length
  const rankN = rankOf((x) => x.n), rankKm = rankOf((x) => x.footKm), rankEl = rankOf((x) => x.elev)

  // ---- records ----
  const everests = s.elev / EVEREST
  // sections are numbered in the order they render, so a small year with fewer
  // sections still counts 1, 2, 3 without gaps
  let secN = 0
  const num = () => ++secN
  // a year with only a few outings gets a short report on the site: the months,
  // the sports, the calendar and its place among the years. The charts that
  // need many outings to say anything are left for the fuller years. My Book
  // prints every year in full.
  const thin = !book && s.n < 60
  const wkStep = wkMax > 100 ? 50 : wkMax > 40 ? 20 : wkMax > 15 ? 5 : 2
  const wkTicks = []
  const wkKmMax = Math.max(1, ...r.weekly.series.map((w) => w.km))
  const wkKmStep = wkKmMax > 150 ? 50 : wkKmMax > 60 ? 25 : 10
  const wkKmTicks = []
  for (let t = 0; t <= wkKmMax * 1.1; t += wkKmStep) wkKmTicks.push(t)
  for (let t = 0; t <= wkMax * 1.15; t += wkStep) wkTicks.push(t)

  // only African countries are named or counted; anything else is "others"
  const nCountries = r.countries.filter((c) => isNamedCountry(c.country)).length
  const othersN = r.countries.filter((c) => !isNamedCountry(c.country)).reduce((t, c) => t + c.activities, 0)

  // ---- My Book: facts for the longer story under each section ----
  const kmOf = (a) => Number(a.distance_km) || 0
  const FOOTS = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
  const footActs = yearActs.filter((a) => FOOTS.has(a.sport_type))
  const allFootKm = allStats.reduce((t, x) => t + x.footKm, 0) || 1
  const kudosPer = s.n ? s.kudos / s.n : 0
  const avgKm = (t) => { const xs = yearActs.filter((a) => a.sport_type === t); return xs.length ? xs.reduce((u, a) => u + kmOf(a), 0) / xs.length : 0 }
  const half = Math.ceil(moIdx.length / 2)
  const kmFirst = moIdx.slice(0, half).reduce((t, i) => t + s.monthsKm[i], 0)
  const kmSecond = moIdx.slice(half).reduce((t, i) => t + s.monthsKm[i], 0)
  const months100 = moIdx.filter((i) => s.monthsKm[i] >= 100).length
  const tOf = (a) => { const t = (a.date || '').slice(11, 16); return t }
  const byClock = yearActs.filter((a) => (a.date || '').length >= 16).slice().sort((a, b) => (tOf(a) < tOf(b) ? -1 : 1))
  const earliest = byClock[0], latestOut = byClock[byClock.length - 1]
  const isWkend = (a) => a.weekday === 'Saturday' || a.weekday === 'Sunday'
  const wkendFoot = footActs.filter(isWkend), wkdayFoot = footActs.filter((a) => !isWkend(a))
  const avgOf = (xs) => (xs.length ? xs.reduce((u, a) => u + kmOf(a), 0) / xs.length : 0)
  const restByDay = (() => {
    const c = Array(7).fill(0)
    const d0 = Date.parse(r.startISO + 'T00:00:00Z'), d1 = Date.parse(r.endISO + 'T00:00:00Z')
    for (let t = d0; t <= d1; t += 86400000) { const iso = new Date(t).toISOString().slice(0, 10); if (!s.activeSet.has(iso)) c[new Date(t).getUTCDay()] += 1 }
    return c
  })()
  const restTop = restByDay.indexOf(Math.max(...restByDay))
  const halfUp = footActs.filter((a) => kmOf(a) >= 21.0975).length
  const tenUp = footActs.length ? footActs.filter((a) => kmOf(a) >= 10).length / footActs.length : 0
  const wkKms = r.weekly.series.map((w) => w.km)
  const under10wk = wkKms.filter((k) => k < 10).length
  const noGps = s.n - r.located
  const rankH = rankOf((x) => x.hours), rankP = rankOf((x) => x.prs), rankK = rankOf((x) => x.kudos)
  const elevTop = moIdx.reduce((b, i) => (s.monthsElev[i] > s.monthsElev[b] ? i : b), moIdx[0])
  const moreThanPrev = ps ? moIdx.filter((i) => s.monthsActivities[i] > ps.monthsActivities[i]).length : 0
  const runsAll = yearActs.filter((a) => a.sport_type === 'Run')
  const runsTread = runsAll.filter((a) => ['yes', 'true', '1'].includes(String(a.trainer).trim().toLowerCase())).length
  const trailN = yearActs.filter((a) => a.sport_type === 'TrailRun').length, hikeN = yearActs.filter((a) => a.sport_type === 'Hike').length
  const hourOf = (a) => parseInt(a.hour, 10)
  const amActs = yearActs.filter((a) => hourOf(a) < 10), pmActs = yearActs.filter((a) => hourOf(a) >= 16 && hourOf(a) < 21)
  const shareOf = (xs, t) => (xs.length ? xs.filter((a) => a.sport_type === t).length / xs.length : 0)
  const before6 = yearActs.filter((a) => hourOf(a) < 6).length
  const fullWeeks = (() => { let n = 0; const d0 = Date.parse(r.startISO + 'T00:00:00Z'), d1 = Date.parse(r.endISO + 'T00:00:00Z'); for (let t = d0; t + 6 * 86400000 <= d1; t += 86400000) { const dow = new Date(t).getUTCDay(); if (dow) continue; let all = true; for (let k = 0; k < 7; k++) if (!s.activeSet.has(new Date(t + k * 86400000).toISOString().slice(0, 10))) { all = false; break } if (all) n++ } return n })()
  const twoDays = r.multi.two + r.multi.more
  const under3 = footActs.filter((a) => kmOf(a) < 3).length
  const km10Share = (() => { const t = footActs.reduce((u, a) => u + kmOf(a), 0) || 1; return footActs.filter((a) => kmOf(a) >= 10).reduce((u, a) => u + kmOf(a), 0) / t })()
  const bestWk = r.weekly.series.reduce((b, w) => (w.km > b.km ? w : b), r.weekly.series[0] || { w: 0, km: 0 })
  const bestWkISO = new Date((bestWk.w * 7 + 3) * 86400000).toISOString().slice(0, 10)
  const wk50 = wkKms.filter((k) => k >= 50).length
  const firstSeen = (() => { const m = {}; for (const a of activities) { const g = geoByKey[a.activity_key]; if (g && g.country === 'Tanzania' && g.region && (!m[g.region] || a.date < m[g.region])) m[g.region] = a.date } return m })()
  const newRegs = Object.entries(firstSeen).filter(([, d]) => Number(d.slice(0, 4)) === Y).map(([k]) => k)
  const abroadN = r.countries.filter((c) => c.country !== 'Tanzania').reduce((t, c) => t + c.activities, 0)
  const bestKmYear = allStats.reduce((b, x) => (x.footKm > b.footKm ? x : b), allStats[0])
  const kmPerOut = (x) => (x.footN ? x.footKm / x.footN : 0)
  const rankKpo = rankOf((x) => kmPerOut(x))
  const hillShare = (() => { const tot = r.flip.reduce((t, d) => t + d.elev, 0); return tot ? r.flip.filter((d) => d.key === 'TrailRun' || d.key === 'Hike').reduce((t, d) => t + d.elev, 0) / tot : 0 })()
  const domOf = (xs) => { const c = { runs: 0, walks: 0, 'other activities': 0, 'trail runs and hikes': 0 }; for (const a of xs) c[a.sport_type === 'Run' ? 'runs' : a.sport_type === 'Walk' ? 'walks' : a.sport_type === 'TrailRun' || a.sport_type === 'Hike' ? 'trail runs and hikes' : 'other activities'] += 1; const k = Object.keys(c).sort((x, z) => c[z] - c[x])[0]; return [k, xs.length ? c[k] / xs.length : 0] }
  const sportWord = (sp) => ({ Run: 'run', Walk: 'walk', 'Trail Run': 'trail run', TrailRun: 'trail run', Hike: 'hike' }[sp] || 'outing')

  // ---- the site: the year in five pictures ----
  const span = Math.round((Date.parse(r.endISO) - Date.parse(r.startISO)) / 864e5) + 1
  const kmTop = moIdx.reduce((b, i) => (s.monthsKm[i] > s.monthsKm[b] ? i : b), moIdx[0])
  const NOUN = { Walk: ['walking', 'walks'], Run: ['running', 'runs'], TrailRun: ['trail running', 'trail runs'], Hike: ['hiking', 'hikes'] }
  const byDist = [...r.flip].sort((p, q) => q.dist - p.dist)
  const leadK = byDist[0] ? byDist[0].key : null
  const climbK = r.flip.length ? r.flip.reduce((b, d) => (d.elev > b.elev ? d : b), r.flip[0]).key : null
  const shareOfDist = (k) => (r.flip.find((d) => d.key === k)?.dist || 0) / footKmAll
  const shareOfElev = (k) => (r.flip.find((d) => d.key === k)?.elev || 0) / footElAll
  const wkSorted = wkKms.slice().sort((p, q) => p - q), wkMed = wkSorted[Math.floor(wkSorted.length / 2)] || 0
  const bestAct = footActs.length ? footActs.reduce((b, a) => (kmOf(a) > kmOf(b) ? a : b), footActs[0]) : null
  const bestRegion = bestAct ? (geoByKey[bestAct.activity_key] || {}).region : null
  const SPORT_ONE = { Walk: 'walk', Run: 'run', TrailRun: 'trail run', Hike: 'hike' }
  const MEASURES = [
    { label: 'Outings', f: (x) => x.n, fmt: (v) => n0(v), noun: 'outings' },
    { label: 'Km on foot', f: (x) => x.footKm, fmt: (v) => `${n0(v)} km`, noun: 'distance on foot' },
    { label: 'Metres climbed', f: (x) => x.elev, fmt: (v) => `${n0(v)} m`, noun: 'climbing' },
    { label: 'Hours moving', f: (x) => x.hours, fmt: (v) => `${n0(v)} h`, noun: 'hours on the move' },
    { label: 'Days out', f: (x) => x.activeDays, fmt: (v) => n0(v), noun: 'days out' },
    { label: 'Longest outing', f: (x) => (x.biggestFoot ? x.biggestFoot.val : 0), fmt: (v) => `${v.toFixed(1)} km`, noun: 'the longest outing' },
  ]
  const rankRows = MEASURES.map((mz) => ({ label: mz.label, fmt: mz.fmt, values: allStats.map((x) => ({ y: x.year, v: mz.f(x) })) }))
  const firsts = MEASURES.filter((mz) => 1 + allStats.filter((x) => mz.f(x) > mz.f(s)).length === 1)
  const Sec = ({ n, id, k, title, text, facts, cap, wide, children }) => (
    <>
      <hr className="rule rule--faint" />
      <section className="sgrid yset" aria-labelledby={idp(id)}>
        <div className={`yset__grid${wide ? ' yset__grid--wide' : ''}`}>
          <div className="yset__words">
            <p className="yset__k">{n} · {k}</p>
            <h2 id={idp(id)} className="yset__t">{title}</h2>
            {text.filter(Boolean).map((t, i) => <p key={i} className="yset__p">{t}</p>)}
            {facts && facts.filter(Boolean).length ? (
              <dl className="yset__facts">
                {facts.filter(Boolean).map((f) => <div key={f.l} className={f.hot ? 'is-hot' : ''}><dt>{f.l}</dt><dd>{f.v}</dd></div>)}
              </dl>
            ) : null}
          </div>
          <figure className="yset__fig">
            {children}
            {cap ? <figcaption className="yset__cap">{cap}</figcaption> : null}
          </figure>
        </div>
      </section>
    </>
  )
  // the hours and the usual outing
  const amShare = morning, pmShare = evening
  const busiestDay = WEEK[s.weekday7.indexOf(Math.max(...s.weekday7))]
  const quietestDay = WEEK[s.weekday7.indexOf(Math.min(...s.weekday7))]
  const twoHumps = s.peakBins && s.peakBins.length >= 2 && Math.abs(s.peakBins[0] - s.peakBins[1]) >= 3
  const pkSorted = (s.peakBins || []).slice().sort((p, q) => p - q)
  const dayRatio = Math.max(...s.weekday7) / Math.max(1, Math.min(...s.weekday7))
  const bestMonthEl = moIdx.reduce((b, i) => (s.monthsElev[i] > s.monthsElev[b] ? i : b), moIdx[0])
  const monthsOver100 = moIdx.filter((i) => s.monthsKm[i] >= 100).length
  const siteSections = (
    <>
      <Sec n={num()} id="ys-ring" k="Every day of the year"
        title={r.restDays === 0 ? 'No zero day.' : pctDays >= 0.8 ? 'Almost every day.' : pctDays >= 0.4 ? 'Most days, not all.' : 'A quiet year.'}
        text={[
          r.restDays === 0 ? 'A day out does not have to be a big day. Some days are short, and they still count.'
            : pctDays >= 0.8 ? `A missed day did not break the year. My longest gap was ${word(r.longGap.len)} ${r.longGap.len === 1 ? 'day' : 'days'}, and then I was out again.`
              : pctDays >= 0.4 ? (s.streakLen >= 21 ? 'The year came in good stretches, some of them weeks long, with gaps between.' : 'I went out often, but the gaps kept coming back.')
                : 'The habit had not caught yet. The outings came in small bunches with long quiet spells between them.',
        ]}
        facts={[
          { l: `days out, of ${n0(span)}${so}`, v: n0(s.activeDays) },
          { l: s.streakGoing ? 'days in a row, still going' : 'days in a row, the longest run', v: n0(s.streakLen), hot: true },
          { l: 'zero days', v: n0(r.restDays) },
        ]}
        cap="Longer spokes are bigger days. The dark arc is my longest run of days in a row.">
        <YearRing year={Y} acts={yearActs} startISO={r.startISO} endISO={r.endISO} streak={{ len: s.streakLen, startISO: s.streakStartISO, endISO: s.streakEndISO }}
          aria={`Every day of ${Y} as a ring: ${n0(s.activeDays)} days with an outing out of ${n0(span)}, the longest run ${n0(s.streakLen)} days.`} />
      </Sec>

      {s.footKm >= 20 ? (
        <Sec n={num()} id="ys-months" k="Month by month"
          title={`${MONTH_F[kmTop]} was the big one.`}
          text={[
            kmFirst > kmSecond * 1.15 && !isPartial ? 'I started the year strong and eased off after the middle.'
              : kmSecond > kmFirst * 1.15 ? 'The year got stronger as it went on.'
                : 'No single month carried the year. The kilometres came in steadily, month after month.',
            s.monthsElev[bestMonthEl] >= 300 && bestMonthEl !== kmTop ? `The hills came in ${MONTH_F[bestMonthEl]}, when I climbed the most.` : s.monthsElev[bestMonthEl] >= 300 ? 'It was also the month I climbed the most.' : '',
          ]}
          facts={[
            { l: `km on foot in ${MONTH_F[kmTop]}`, v: n0(s.monthsKm[kmTop]), hot: true },
            { l: 'months past 100 km', v: `${monthsOver100} of ${moIdx.length}` },
            s.monthsElev[bestMonthEl] >= 300 ? { l: `m climbed in ${MONTH_F[bestMonthEl]}`, v: n0(s.monthsElev[bestMonthEl]) } : null,
          ]}
          cap="The orange mark on top of each month is its climbing.">
          <MonthStack year={Y} acts={yearActs} aria={`Kilometres on foot each month of ${Y}: ${moIdx.map((i) => `${MONTH_F[i]} ${n0(s.monthsKm[i])} km`).join(', ')}.`} />
        </Sec>
      ) : null}

      {leadK && s.footKm >= 20 ? (
        <Sec n={num()} id="ys-waf" k="Where the kilometres came from"
          title={`${cap(NOUN[leadK][0])} carried the year.`}
          text={[
            climbK && s.elev >= 100 && climbK !== leadK ? `For height I needed the hills, and ${NOUN[climbK][1]} gave me most of it.` : climbK && s.elev >= 100 ? `${cap(NOUN[climbK][1])} gave me most of the height too.` : '',
            runsAll.length ? (runsTread === runsAll.length ? 'Every run of the year was on the treadmill.' : runsTread === 0 ? 'I did not run on the treadmill once.' : runsTread / runsAll.length >= 0.5 ? 'Most of my running was still on the treadmill.' : 'Most of my running had moved outside.') : '',
          ]}
          facts={[
            { l: `of the distance from ${NOUN[leadK][1]}`, v: `${pc(shareOfDist(leadK))}%`, hot: true },
            climbK && s.elev >= 100 ? { l: `of the climbing from ${NOUN[climbK][1]}`, v: `${pc(shareOfElev(climbK))}%` } : null,
            runsAll.length ? { l: 'runs on the treadmill', v: `${runsTread} of ${runsAll.length}` } : null,
          ]}>
          <KmWaffle acts={yearActs} aria={`Kilometres on foot in ${Y} by sport: ${byDist.map((d) => `${d.label} ${n0(d.dist)} km`).join(', ')}.`} />
        </Sec>
      ) : null}

      {r.weekly.series.length >= 8 ? (
        <Sec n={num()} id="ys-ridge" k="Week by week" wide
          title={under10wk === 0 ? 'No thin week.' : r.weekly.cv < 0.45 ? 'Steady weeks.' : 'Big weeks and thin ones.'}
          text={[
            under10wk === 0 ? 'Even my quiet weeks kept a floor.' : r.weekly.cv < 0.45 ? 'Week after week the distance held, without deep drops.' : 'The year came in bursts: big weeks, then thin ones.',
          ]}
          facts={[
            { l: 'the biggest week', v: `${n0(bestWk.km)} km`, hot: true },
            { l: 'a middle week', v: `${n0(wkMed)} km` },
            { l: 'weeks under 10 km', v: n0(under10wk) },
            { l: 'weeks past 50 km', v: n0(wk50) },
          ]}
          cap="Weeks run Sunday to Saturday. A mark under the line is a week under 10 km.">
          <WeekRidge series={r.weekly.series} aria={`Kilometres on foot each week of ${Y}: the biggest week ${n0(bestWk.km)} km, a middle week ${n0(wkMed)} km, ${under10wk} weeks under 10 km.`} />
        </Sec>
      ) : null}

      {s.n >= 30 ? (
        <Sec n={num()} id="ys-hours" k="The hours of the day"
          title={pmShare >= amShare ? 'After the working day.' : 'Before the working day.'}
          text={[
            pmShare >= amShare ? 'I went out once work was done, in the late afternoon or evening.' : 'I went out early, before work.',
            dayRatio < 1.35 ? `Every day of the week got its turn, with ${busiestDay} only a little ahead.` : `${busiestDay} was my surest day of the week.`,
          ]}
          facts={[
            { l: 'the busiest hour', v: fmtH(peakHour), hot: true },
            { l: 'began before 10am', v: `${pc(amShare)}%` },
            { l: 'began between 4 and 9pm', v: `${pc(pmShare)}%` },
          ]}
          cap="Midnight is at the top. A longer spoke is a busier hour.">
          <RadialHours counts={s.hours24} unit="activities" max={420} />
        </Sec>
      ) : null}

      {s.footN >= 25 && s.medianFoot > 0 ? (
        <Sec n={num()} id="ys-usual" k="The usual outing"
          title={twoHumps ? `Two favourite distances: ${pkSorted[0]} and ${pkSorted[1]} km.` : `One favourite distance: ${s.peakBins[0]} km.`}
          text={[
            twoHumps ? 'Most outings were one or the other, and few fell in between.' : 'Most outings were about that long, and the longer days were few.',
            meanFoot > s.medianFoot * 1.1 ? 'A few long days pulled my average up.' : '',
          ]}
          facts={[
            { l: 'the middle outing', v: `${s.medianFoot.toFixed(1)} km`, hot: true },
            { l: 'the average outing', v: `${meanFoot.toFixed(1)} km` },
            { l: 'outings of 10 km or more', v: `${pc(tenUp)}%` },
          ]}
          cap="The orange columns are the distances I came back to most.">
          <YearDistances bins={s.footBins} peaks={s.peakBins} />
        </Sec>
      ) : null}

      {bestAct ? (
        <Sec n={num()} id="ys-best" k="The biggest day" wide
          title={`${cap(SPORT_ONE[bestAct.sport_type] || 'outing')} of the year.`}
          text={[
            s.medianFoot > 0 ? `Big days are rare. This one was ${(kmOf(bestAct) / s.medianFoot).toFixed(1)} times my ordinary outing of the year.` : '',
            s.highestClimb && s.highestClimb.date === s.biggestFoot?.date && Number(bestAct.elevation_gain_m) >= 100 ? 'It was also the day with the most climbing.' : '',
          ]}
          cap="The small dots are all my other outings of the year.">
          <div className="ybest__big"><b>{kmOf(bestAct).toFixed(1)}</b><span>km on foot</span></div>
          <ul className="ybest__facts">
            <li><b>{fmtDay(bestAct.date.slice(0, 10))}</b>{SPORT_ONE[bestAct.sport_type]}</li>
            <li><b>{hm(Number(bestAct.moving_time_min) || 0)}</b>moving</li>
            {Number(bestAct.elevation_gain_m) >= 20 ? <li><b>{n0(bestAct.elevation_gain_m)} m</b>climbed</li> : null}
            {bestRegion ? <li><b>{bestRegion}</b>region</li> : null}
          </ul>
          <BestDay acts={yearActs} aria={`The biggest outing on foot of ${Y}, ${kmOf(bestAct).toFixed(1)} km, against every other outing of the year.`} />
        </Sec>
      ) : null}

      {s.n >= 10 ? (
        <Sec n={num()} id="ys-shelf" k="The year's shelf" wide
          title="What the year adds up to."
          text={['The year in things I can picture: Everest, and the road from Dar es Salaam to Dodoma.']}>
          <ul className="yrecs yrecs--shelf">
            {s.longestTime && s.longestTime.val > 0 ? <RecordCard kicker="Longest on foot" text={hm(s.longestTime.val)} label="of moving time in one outing" sub={fmtMonth(s.longestTime.date)} /> : null}
            {s.highestClimb && s.highestClimb.val > 0 ? <RecordCard kicker="Most climbed" value={Math.round(s.highestClimb.val)} unit="m" label="of climb in one outing" sub={fmtMonth(s.highestClimb.date)} /> : null}
            {s.hardest && s.hardest.val > 0 ? <RecordCard kicker="Hardest effort" value={Math.round(s.hardest.val)} label="relative effort, Strava's score for how hard it was" sub={fmtMonth(s.hardest.date)} /> : null}
            <RecordCard kicker="Most cheered" value={s.mostKudos ? s.mostKudos.kudos : 0} label="kudos on one outing" sub={s.mostKudos ? fmtMonth(s.mostKudos.date) : ''} />
            <RecordCard kicker="PRs" value={Math.round(s.prs)} label="best times on Strava segments" sub={`${Y}`} tone="hot" />
            <RecordCard kicker="Everests" value={everests} decimals={1} unit="×" label={`the height of Everest, from ${n0(s.elev)} m climbed`} sub={`${Y}`} />
            <RecordCard kicker="Dar to Dodoma" value={s.footKm / DAR_DODOMA_KM} decimals={1} unit="×" label="the road from Dar es Salaam to Dodoma, on foot" sub={`${n0(s.footKm)} km on foot`} />
            <RecordCard kicker="Hours moving" value={Math.round(s.hours)} unit="h" label={`about ${n0(s.hours / 24)} full days and nights`} sub={`${Y}`} />
          </ul>
        </Sec>
      ) : null}

      {allStats.length > 1 ? (
        <Sec n={num()} id="ys-rank" k="Against the other years" wide
          title={firsts.length ? `My best year for ${firsts[0].noun}.` : `${cap(ORD[rankKm - 1])} of ${years.length} for distance.`}
          text={[
            bestKmYear && bestKmYear.year !== Y ? `My best year for distance is still ${bestKmYear.year}, and this one reached ${pc(s.footKm / bestKmYear.footKm)}% of it.` : 'No other year has covered more distance on foot.',

          ]}
          cap="The orange dot is this year.">
          <RankBoard rows={rankRows} year={Y} partial={false} aria={`${Y} against the other years: ${rankRows.map((rw) => `${rw.label} ${rw.fmt(rw.values.find((v) => v.y === Y).v)}`).join(', ')}.`} />
        </Sec>
      ) : null}
    </>
  )

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]}
      number={numOf('/numbers')}
      title="Year in Sport"
      subtitle="Pick a year and read it."
      prev={prev}
      next={next}
    >
      {!book && <div ref={pickerRef} className="yis-picker" role="group" aria-label="Choose a year" onKeyDown={onPickerKey}>
        {years.map((y) => (
          <button key={y} type="button" className={`yis-picker__yr${y === Y ? ' is-on' : ''}`} aria-pressed={y === Y} onClick={() => setPicked(y)}>
            {y}
          </button>
        ))}
      </div>}

      <div key={Y} className="yis-report">
        {/* ===== the year in one view ===== */}
        <section className="sgrid yis-top" aria-labelledby={idp('yis-title')}>
          <div className="sgrid__head">
            <Eyebrow>{Y}{isPartial ? ' · still running' : ''}</Eyebrow>
            <h2 id={idp('yis-title')} className="section-head__title">{theme}.</h2>
          </div>
          {book ? (YEAR_REPORT[Y] && <Reveal as="p" className="sgrid__statement">{YEAR_REPORT[Y](s)}</Reveal>) : <Reveal as="p" className="sgrid__statement">{momentText(Y, s)}</Reveal>}
          <OddsRow
            title={`${Y} in four numbers${ps ? `, against ${prevYear}` : ''}`}
            items={[
              { num: s.n, unit: '', label: `outings${ps ? `, ${chgTxt(chg(s.n, ps.n))}` : ''}`, tone: 'move' },
              { num: s.footKm, unit: ' km', label: `on foot${ps ? `, ${chgTxt(chg(s.footKm, ps.footKm))}` : ''}`, tone: 'move' },
              { num: s.elev, unit: ' m', label: `climbed${ps ? `, ${chgTxt(chg(s.elev, ps.elev))}` : ''}`, tone: 'move' },
              { num: s.hours, unit: ' h', label: `moving${ps ? `, ${chgTxt(chg(s.hours, ps.hours))}` : ''}`, tone: 'move' },
            ]}
          />
          {book ? <OutingSky activities={yearActs} year={Y} recordFirstISO={recordFirst.slice(0, 10)} recordLastISO={recordLast.slice(0, 10)} fullStreak={{ len: s.streakLen, startISO: s.streakStartISO, endISO: s.streakEndISO }} fullGap={r ? r.longGap : null} /> : null}
          <BookLesson of={<OutingSky />} />
          <BookStory>{[
            `Each dot above is one outing of ${Y}, placed by its day across the year and by the hour it started, and a bigger dot is a longer distance. The marks pick out the longest silence of the year, the longest run of days and the three biggest days.`,
            `${s.hours >= 48 ? `The ${n0(s.hours)} hours I spent moving in ${Y} come to about ${n0(s.hours / 24)} full days and nights. ` : ''}${Y} holds ${pc(s.footKm / allFootKm) || '<1'}% of all the kilometres I have covered on foot. ${kudosPer < 2 ? `Almost nobody followed me yet, and the whole year brought ${n0(s.kudos)} kudos.` : `The people who follow me gave ${n0(s.kudos)} kudos over the year, about ${n0(kudosPer)} for each outing${s.prs ? `, and I set ${n0(s.prs)} PRs on Strava segments` : ''}.`}`,
          ]}</BookStory>
        </section>

        {!book && siteSections}

        {book && (<>
        {/* ===== 1. month by month ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-months')}
          eyebrow={`${num()} · Month by month`}
          title={`${MONTH_F[busy]} was the busiest.`}
          statement={<>
            {(() => {
              const kmTop = moIdx.reduce((b, i) => (s.monthsKm[i] > s.monthsKm[b] ? i : b), moIdx[0])
              const half = Math.ceil(moIdx.length / 2), a = moIdx.slice(0, half), b = moIdx.slice(half)
              const avg = (xs) => xs.reduce((t, i) => t + s.monthsActivities[i], 0) / Math.max(1, xs.length)
              const shape = !b.length ? '' : avg(a) > avg(b) * 1.15 ? ' The year started strong and slowed down later.' : avg(b) > avg(a) * 1.15 ? ' The year started slowly and grew stronger as it went.' : ' The months stayed fairly even from start to end.'
              return `${kmTop === busy ? `${MONTH_F[busy]} was my biggest month for distance too, with ${n0(s.monthsKm[busy])} km on foot.` : `The most distance came in ${MONTH_F[kmTop]}, with ${n0(s.monthsKm[kmTop])} km on foot.`}${shape}${activeMonths === moIdx.length ? ' There was no empty month.' : ` I went out in only ${word(activeMonths)} of the ${word(moIdx.length)} months.`}`
            })()}
            {isPartial && quiet === lastMo ? ` ${MONTH_F[quiet]} is not finished yet.` : ''}
          </>}
          odds={{
            title: `${Y} by the month`,
            items: [
              { book: true, num: s.monthsActivities[busy], unit: '', label: `outings in ${MONTH_F[busy]}`, tone: 'move' },
              { book: true, num: s.monthsActivities[quiet], unit: '', label: `in ${MONTH_F[quiet]}, the quietest`, tone: 'rest' },
              { num: perMonth, unit: '', label: 'outings in an average month', tone: 'move' },
              { book: true, num: s.footKm / Math.max(1, moIdx.length), unit: ' km', label: 'on foot in an average month', tone: 'move' },
            ],
          }}
          left={{ title: 'Outings, month by month', node: <YearMonths months={monthsData} /> }}
          right={{ title: 'The kilometres adding up', node: <YearProgress cum={s.cumByMonth} lastMonth={s.lastActiveMonth} total={s.footKm} /> }}
          read={[
              'One bar for each month, as tall as the number of outings that month. The busiest month is labelled.',
              'The line adds up my kilometres on foot through the year, month by month. A steep part is a big month and a flat part is a quiet one.',
            ]}
          story={[
              moIdx.length > 1 ? `In the first ${word(half)} months I covered ${n0(kmFirst)} km on foot, and in the last ${word(moIdx.length - half)} ${n0(kmSecond)} km.${isPartial ? ' The last month is not finished yet.' : kmSecond > kmFirst * 1.15 ? ' The line gets steeper as the year goes on.' : kmFirst > kmSecond * 1.15 ? ' The line flattens as the year goes on.' : ' The line climbs at an even slope.'}` : '',
              months100 ? (months100 === moIdx.length ? `Every month${so} passed 100 km on foot.` : `${cap(word(months100))} of the ${word(moIdx.length)} months passed 100 km on foot.`) : 'No month reached 100 km on foot. The distance was still to come.',
              s.monthsElev[elevTop] >= 100 ? `My biggest month for climbing was ${MONTH_F[elevTop]}, with ${n0(s.monthsElev[elevTop])} m on foot.` : '',
              ps ? `Month against month, ${word(moreThanPrev)} of the ${word(moIdx.length)} months had more outings than the same month of ${prevYear}.` : '',
            ]}
          source="Activity Log · outings and distance on foot, by month"
        />

        {/* ===== 2. how it moved ===== */}
        {s.n >= 10 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-mix')}
              eyebrow={`${num()} · How it moved`}
              title={`${lead[0]} led ${Y}.`}
              statement={<>
                {lead[0]} led the year, {lead[1]} of my {fmtInt(s.n)} outings{so}, against {lead[3]} {lead[2]}
                {mix.trail === 1 ? ' and one trail run or hike' : mix.trail ? ` and ${mix.trail} trail runs or hikes` : ''}.
                {flipOf('Run').dist / footKmAll > 0.5 ? (lead[0] === 'Walks' ? ' Running still gave me most of my distance' : ' Running gave me most of my distance') : (lead[0] === 'Runs' ? ' Walking still gave me most of my distance' : ' Walking gave me most of my distance')}
                {climber ? ((climber.key === 'Walk') === (flipOf('Run').dist / footKmAll <= 0.5) && (climber.key === 'Walk' || climber.key === 'Run') ? ' and the biggest share of the climbing.' : `, and ${climber.label === 'Trail' ? 'trail running' : climber.label.toLowerCase() + 'ing'} gave me the biggest share of the climbing.`) : '.'}
                {s.trailKm >= 1 ? ` I ran ${n0(s.trailKm)} km on trails.` : ''}
              </>}
              odds={{
                title: 'Share of all outings',
                items: [
                  { book: true, value: mix.walk / s.n, label: 'walks', tone: 'move' },
                  { book: true, value: mix.run / s.n, label: 'runs', tone: 'move' },
                  { book: true, value: mix.trail / s.n, label: 'trail runs and hikes', tone: 'move' },
                  { book: true, value: mix.other / s.n, label: 'other activities', tone: 'rest' },
                ],
              }}
              left={{ title: 'Every outing, by sport', node: <SportTreemap rows={r.sportRows} /> }}
              right={{ title: 'Distance against climb, on foot', node: r.flip.length >= 2 ? <FootFlip items={r.flip} /> : <p className="yis-empty">Only one sport on foot this year.</p> }}
              read={[
              'Each block is a kind of outing, sized by how many times I did it. Everything that is not on foot sits together in one grey block called other activities.',
              'Two stacked columns: on the left each sport\u2019s share of my distance on foot that year, on the right its share of the climbing. A ribbon joins the two shares of the same sport, so a ribbon that widens climbs more than its distance.',
            ]}
              story={[
              `My average walk this year was ${avgKm('Walk').toFixed(1)} km and my average run ${avgKm('Run').toFixed(1)} km.${s.longestWalk && s.longestWalk.km >= 10 ? ` The longest walk was ${s.longestWalk.km.toFixed(1)} km.` : ''}`,
              runsAll.length ? `${cap(word(runsTread))} of my ${word(runsAll.length)} runs were on the treadmill${runsTread === runsAll.length ? ', every single one' : runsTread / runsAll.length < 0.5 ? ', fewer than half' : ''}.` : '',
              trailN + hikeN ? `I did ${trailN ? `${word(trailN)} trail ${trailN === 1 ? 'run' : 'runs'}` : ''}${trailN && hikeN ? ' and ' : ''}${hikeN ? `${word(hikeN)} ${hikeN === 1 ? 'hike' : 'hikes'}` : ''}. ${hillShare >= 0.25 ? `Together they gave ${pc(hillShare)}% of the year\u2019s climbing.` : 'They added only a little to the climbing that year.'}` : 'There were no trail runs or hikes this year, so the climbing came from walks and runs.',
              mix.other ? `The other activities were ${pc(mix.other / s.n)}% of my outings. They count as days out, and they add nothing to the distance or the climb.` : '',
            ]}
              source="Activity Log · outings by sport, distance and climb on foot"
            />
          </>
        )}

        {/* ===== 3. when it happened ===== */}
        {s.n >= 10 && !thin && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-hours')}
              eyebrow={`${num()} · When it happened`}
              title={evening >= morning ? 'The evenings led.' : 'The mornings led.'}
              statement={<>
                The {evening >= morning ? 'evenings' : 'mornings'} were my time in {Y}{(evening >= morning) === (peakHour >= 12) ? `, and ${fmtH(peakHour)} was the busiest hour.` : `, though the single busiest hour was ${fmtH(peakHour)}.`}{' '}
                {tiedDays(wkMax)} {tiedDays(wkMax).includes(' and ') ? 'were my busiest days' : 'was my busiest day'} and {tiedDays(wkMin)} the quietest
                {wkMin / wkMax > 0.75 ? ', but not by much' : ''}. {pc(s.weekendShare)}% of my outings were on a Saturday or Sunday,
                {s.weekendShare > 0.35 ? ' more than an even week would give.' : s.weekendShare < 0.24 ? ' less than an even week would give.' : ' about what an even week would give.'}
              </>}
              odds={{
                title: 'When outings started',
                items: [
                  { value: morning, label: 'before 10am', tone: 'move' },
                  { book: true, value: midday, label: 'between 10am and 4pm', tone: 'rest' },
                  { book: true, value: evening, label: 'between 4 and 9pm', tone: 'move' },
                  { book: true, value: late, label: 'after 9pm', tone: 'rest' },
                ],
              }}
              left={{ title: 'Every outing, by the hour it began', node: <RadialHours counts={s.hours24} unit="activities" max={400} /> }}
              right={{
                title: 'Every outing, by day of the week',
                node: (
                  <ColBars
                    items={WEEK.map((d, i) => ({ label: d.slice(0, 3), short: d.slice(0, 1), value: s.weekday7[i], display: String(s.weekday7[i]), tone: s.weekday7[i] === wkMax ? 'big' : s.weekday7[i] === wkMin ? 'quiet' : 'mid' }))}
                    max={wkMax * 1.15} ticks={wkTicks} xCap="day of the week &rarr;" yCap="outings &uarr;" H={400}
                    aria={`Outings by weekday in ${Y}: ${WEEK.map((d, i) => `${d} ${s.weekday7[i]}`).join(', ')}.`}
                  />
                ),
              }}
              read={[
              'A 24-hour clock with midnight at the top and noon at the bottom. Each spoke is one hour, and its length is the number of outings that started in that hour.',
              'One bar for each day of the week, counting every outing that started on it. The orange bar is the busiest day and the grey bar the quietest.',
            ]}
              story={[
              earliest && latestOut ? `The earliest start of the year was at ${tOf(earliest)} on ${fmtDay(earliest.date)}, and the latest at ${tOf(latestOut)} on ${fmtDay(latestOut.date)}.` : '',
              amActs.length >= 5 && pmActs.length >= 5 ? (domOf(amActs)[0] !== domOf(pmActs)[0] ? `The mornings and the evenings held different outings. ${cap(domOf(amActs)[0])} were ${pc(domOf(amActs)[1])}% of my outings before 10am, and ${domOf(pmActs)[0]} were ${pc(domOf(pmActs)[1])}% of my outings between 4 and 9pm.` : `${cap(domOf(amActs)[0])} led both ends of the day: ${pc(domOf(amActs)[1])}% of my outings before 10am and ${pc(domOf(pmActs)[1])}% of those between 4 and 9pm.`) : '',
              before6 ? `${cap(word(before6))} ${before6 === 1 ? 'outing' : 'outings'} started before 6am.` : '',
              wkendFoot.length >= 5 && wkdayFoot.length >= 5 ? `My outings on foot at the weekend averaged ${avgOf(wkendFoot).toFixed(1)} km, against ${avgOf(wkdayFoot).toFixed(1)} km on a weekday.${avgOf(wkendFoot) > avgOf(wkdayFoot) * 1.2 ? ' The weekend is when the longer outings fit.' : ''}` : '',
            ]}
              source="Activity Log · start hour and weekday of every outing"
            />
          </>
        )}

        {/* ===== 4. every day of the year ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-days')}
          eyebrow={`${num()} · Every day of the year`}
          title={r.restDays === 0 ? `Not one day missed${so}.` : `Out on ${pc(pctDays)}% of days${so}.`}
          statement={<>
            {r.restDays === 0
              ? 'Not one day was skipped. Some days it was only something small, but it was something, and the days add up when none of them is skipped.'
              : `My longest streak${s.streakStartISO ? ` went from ${fmtDayIn(s.streakStartISO, Y)} to ${fmtDayIn(s.streakEndISO, Y)}` : ' was short'}.${r.longGap.len >= 2 ? ` My longest ${r.longGap.len >= 7 ? 'layoff' : 'break'} ended on ${fmtDayIn(r.longGap.to, Y)}.` : ''}`}
          </>}
          odds={{
            title: `The days of ${Y}`,
            items: [
              { num: s.activeDays, unit: ' days', label: `with an outing, of ${fmtInt(r.span)}`, tone: 'move' },
              { num: s.streakLen, unit: ' days', label: s.streakGoing ? 'in a row, still going' : 'the longest run in a row', tone: 'move' },
              { book: true, num: r.longGap.len, unit: ' days', label: r.longGap.len >= 7 ? 'the longest layoff' : 'the longest break', tone: 'rest' },
              r.restDays === 0
                ? { book: true, value: multiDays / Math.max(1, s.activeDays), label: 'of days were doubles', tone: 'move' }
                : { book: true, value: r.gaps.total ? r.gaps.next / gapsTot : 0, label: 'of outings followed the very next day', tone: 'move' },
            ],
          }}
          left={{ title: `Every day of ${Y}`, node: <YearCalendar activeSet={s.activeSet} year={Y} endISO={r.endISO} firstISO={r.startISO} streak={{ startISO: s.streakStartISO, endISO: s.streakEndISO }} /> }}
          right={r.restDays === 0 ? {
            title: 'How many outings each day held',
            node: (
              <ColBars
                items={[
                  { label: 'One', value: r.multi.one / dTot, display: `${pc(r.multi.one / dTot)}%`, tone: 'big' },
                  { label: 'Two', value: r.multi.two / dTot, display: `${pc(r.multi.two / dTot)}%`, tone: 'mid' },
                  { label: 'Three or more', short: '3+', value: r.multi.more / dTot, display: `${pc(r.multi.more / dTot)}%`, tone: 'quiet' },
                ]}
                max={1.12} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                xCap="outings in the day &rarr;" yCap="share of days &uarr;"
                aria={`Of the days in ${Y}, ${pc(r.multi.one / dTot)}% held one outing, ${pc(r.multi.two / dTot)}% two and ${pc(r.multi.more / dTot)}% three or more.`}
              />
            ),
          } : {
            title: 'How soon the next outing came',
            node: (
              <ColBars
                items={[
                  { label: 'Next day', value: r.gaps.next / gapsTot, display: `${pc(r.gaps.next / gapsTot)}%`, tone: 'big' },
                  { label: 'Two days', value: r.gaps.two / gapsTot, display: `${pc(r.gaps.two / gapsTot)}%`, tone: 'mid' },
                  { label: 'Three or more', short: '3+', value: r.gaps.more / gapsTot, display: `${pc(r.gaps.more / gapsTot)}%`, tone: 'quiet' },
                ]}
                max={1.12} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                xCap="days until the next outing &rarr;" yCap="share of gaps &uarr;"
                aria={`After an outing day, the next came the next day ${pc(r.gaps.next / gapsTot)}% of the time, two days later ${pc(r.gaps.two / gapsTot)}%, three or more ${pc(r.gaps.more / gapsTot)}%.`}
              />
            ),
          }}
          read={[
              `Every day of ${Y} as a wall calendar, one small month per block with Sunday first. Orange days had an outing, deep orange marks the longest streak, and faint days are zero days.${isPartial ? ' Days still to come are left as outlines.' : ''}`,
              r.restDays === 0 ? 'The share of days that held one outing, two, or three or more.' : 'After each day out, how soon the next outing came: the next day, two days later, or three days or more.',
            ]}
          story={[
              r.restDays === 0 ? 'There is no faint day in the calendar. Some of those days held only a short walk or one of the other activities, and each one counted.' : `There were ${n0(r.restDays)} zero days in ${Y}${so}. More of them fell on a ${WEEK[restTop]} than on any other day of the week.`,
              s.streakLen >= 7 ? `The longest streak was ${n0(s.streakLen)} days, from ${fmtDayIn(s.streakStartISO, Y)} to ${s.streakGoing ? 'now, still going' : fmtDayIn(s.streakEndISO, Y)}.${s.streakLen > s.streakInYear ? ` ${n0(s.streakInYear)} of those days fall in ${Y}, the deep orange stretch in the calendar.` : ' In the calendar it is the deep orange stretch.'}` : 'The days were scattered, with no real streak yet.',
              fullWeeks ? `${cap(word(fullWeeks))} full ${fullWeeks === 1 ? 'week' : 'weeks'}, Sunday to Saturday, had an outing on every day.` : 'No week of the year had an outing on every day.',
              twoDays ? `On ${n0(twoDays)} days I doubled up.` : '',
            ]}
          source="Activity Log · days with at least one outing"
        />

        {/* ===== 5. the typical outing ===== */}
        {s.footN >= 20 && !thin && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-dist')}
              eyebrow={`${num()} · The typical outing`}
              title='The usual outing.'
              statement={<>
                {s.peakBins.length ? `Most of my outings on foot were around ${Math.min(...s.peakBins.slice(0, 2))} km${s.peakBins[1] ? ` or ${Math.max(...s.peakBins.slice(0, 2))} km` : ''}. ` : ''}
                {meanFoot > s.medianFoot ? 'A few long days pulled my average above my usual outing.' : 'The short days pulled my average below my usual outing.'}
                {s.biggestFoot ? ` The longest came in ${monthOf(s.biggestFoot.date)}.` : ''}
              </>}
              odds={{
                title: 'Distance on foot',
                items: [
                  { num: s.medianFoot, dec: 1, unit: ' km', label: 'the middle outing', tone: 'move' },
                  { book: true, num: meanFoot, dec: 1, unit: ' km', label: 'the average outing', tone: 'rest' },
                  { book: true, num: longestFoot, dec: 1, unit: ' km', label: 'the longest', tone: 'move' },
                  { book: true, value: r.top10 || 0, label: 'of the distance on the busiest tenth of days', tone: 'move' },
                ],
              }}
              left={{ title: 'Every outing on foot, by distance', node: <YearDistances bins={s.footBins} peaks={s.peakBins} /> }}
              right={{ title: 'Each tenth of days, by its share', node: r.deciles ? <DecileBars shares={r.deciles} /> : <p className="yis-empty">Too few days on foot to split into tenths.</p> }}
              read={[
              'Every outing on foot grouped by its distance, rounded to the nearest kilometre, one bar each. The orange bars are the distances I came back to most, and the last bar gathers everything of 25 km or more.',
              'All my days on foot that year, cut into ten equal groups from the shortest to the longest. Each bar is that group\u2019s share of the year\u2019s distance, and the dashed line at 10% is what equal days would give.',
            ]}
              story={[
              `${pc(tenUp)}% of my outings on foot this year were 10 km or more${halfUp ? `, and ${word(halfUp)} ${halfUp === 1 ? 'was' : 'were'} a half marathon or longer` : ''}.`,
              footActs.length ? `The outings of 10 km or more gave ${pc(km10Share)}% of the year\u2019s distance on foot. At the other end, ${word(under3)} ${under3 === 1 ? 'outing was' : 'outings were'} shorter than 3 km.` : '',
              s.biggestFoot ? `The longest was ${s.biggestFoot.val.toFixed(1)} km, ${sportWord(s.biggestFoot.sport) === 'outing' ? 'an outing' : `${sportWord(s.biggestFoot.sport) === 'outdoor run' ? 'an' : 'a'} ${sportWord(s.biggestFoot.sport)}`} in ${monthOf(s.biggestFoot.date)}.` : '',
            ]}
              source="Activity Log · distance on foot (run, walk, trail run, hike)"
            />
          </>
        )}

        {/* ===== 6. the maths of the year ===== */}
        {r.tail && s.activeDays >= 40 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-maths')}
              eyebrow={`${num()} · How steady it was`}
              title={r.restDays === 0 ? `No zero day in ${Y}${so}.` : 'One day led to the next.'}
              statement={<>
                {r.restDays === 0 ? '' : `After a day out, I usually went out again. After a zero day, ${r.p01 < 0.5 ? 'I usually rested again' : 'it could go either way'}.`}
                {r.weekly.cv < 0.6 ? ' My weeks were fairly steady.' : r.weekly.cv < 1 ? ' My weeks went up and down a fair bit.' : ' My weeks swung a lot, from almost nothing to very big.'}
                {' '}My biggest week was {n0(Math.max(...r.weekly.series.map((w) => w.km)))} km on foot.
              </>}
              odds={{
                title: 'The year in numbers',
                items: [
                  { value: r.p11, label: 'went out again the day after a day out', tone: 'move' },
                  r.restDays === 0
                    ? { book: true, num: r.weekly.mean, unit: ' km', label: 'in an average week', tone: 'rest' }
                    : { book: true, value: r.p01, label: 'went out the day after a zero day', tone: 'rest' },
                  { book: true, num: r.gini || 0, dec: 2, unit: '', label: 'how uneven my days were, where 0 is all the same', tone: 'rest' },
                  { num: r.tail.mark / r.tail.mean, dec: 1, unit: '×', label: 'my longest outing against the average one', tone: 'move' },
                ],
              }}
              left={r.restDays === 0 ? {
                title: 'Distance on foot, week by week',
                node: (
                  <ColBars
                    items={r.weekly.series.map((w, i) => ({ label: "", short: "", value: w.km, display: '', tone: w.km >= r.weekly.mean ? 'big' : 'quiet' }))}
                    max={wkKmMax * 1.1} ticks={wkKmTicks}
                    tickFmt={(v) => v} refLine={{ value: r.weekly.mean, label: `average week · ${Math.round(r.weekly.mean)} km`, short: `avg ${Math.round(r.weekly.mean)} km` }}
                    xCap="week of the year &rarr;" yCap="km on foot &uarr;"
                    aria={`Distance on foot per week in ${Y}; the average week was ${Math.round(r.weekly.mean)} km.`}
                  />
                ),
              } : { title: 'Given today, the chance of tomorrow', node: <TransitionMatrix p11={r.p11} p01={r.p01} /> }}
              right={{ title: 'The longest outing against all the others', node: <TailOutlier values={r.tail.values} mark={r.tail.mark} mean={r.tail.mean} sd={r.tail.sd} z={r.tail.z} pct={r.tail.pct} unit="km" markLabel="the longest" /> }}
              read={[
              r.restDays === 0 ? 'Each bar is one week of the year, as tall as my distance on foot that week. Orange weeks were above the average week, and the dashed line is the average.' : 'Read it by row. The top row starts from a day I went out, the bottom row from a zero day. In each row the left box is the chance I went out the next day and the right box the chance I rested.',
              'Every outing on foot as a small histogram by distance. The shaded band is the normal range, and the orange mark is the longest outing of the year, with how many times the average it was.',
            ]}
              story={[
              `${under10wk ? `${cap(word(under10wk))} ${under10wk === 1 ? 'week' : 'weeks'} of the year had less than 10 km on foot${Math.min(...wkKms) < 0.5 ? ', and some had none at all' : `, and the quietest had ${n0(Math.min(...wkKms))} km`}.` : `Not one week of the year fell under 10 km on foot. The quietest had ${n0(Math.min(...wkKms))} km.`}`,
              bestWk.km ? `The biggest week began on ${fmtDay(bestWkISO)}, and ${word(wk50)} ${wk50 === 1 ? 'week' : 'weeks'} of the year passed 50 km.` : '',
              r.tail ? `The longest outing stands far out on its own, ${(r.tail.mark / r.tail.mean).toFixed(1)} times my average outing. Days like that are rare, and they are what the normal days make possible.` : '',
            ]}
              source="Activity Log · daily active series, weekly and per-outing distance on foot"
            />
          </>
        )}

        {/* ===== 7. the far edges ===== */}
        {!thin && (
          <>
          <hr className="rule rule--faint" />
          <section className="sgrid" aria-labelledby={idp('yis-edges')}>
            <div className="sgrid__head">
              <Eyebrow>{num()} · Biggest days</Eyebrow>
              <h2 id={idp('yis-edges')} className="section-head__title">The biggest days of {Y}.</h2>
            </div>
            <ul className="yrecs">
              {s.biggestFoot && s.biggestFoot.val > 0 && <RecordCard kicker="Furthest on foot" value={s.biggestFoot.val} decimals={1} unit="km" label="in a single outing" sub={fmtMonth(s.biggestFoot.date)} tone="hot" />}
              {s.longestTime && s.longestTime.val > 0 && <RecordCard kicker="Longest on foot" text={hm(s.longestTime.val)} label="of moving time in one outing" sub={fmtMonth(s.longestTime.date)} />}
              {s.highestClimb && s.highestClimb.val > 0 && <RecordCard kicker="Most climbed" value={Math.round(s.highestClimb.val)} unit="m" label="of climb in one outing" sub={fmtMonth(s.highestClimb.date)} />}
              {s.hardest && s.hardest.val > 0 && <RecordCard kicker="Hardest effort" value={Math.round(s.hardest.val)} label="relative effort, Strava's score for how hard it was" sub={fmtMonth(s.hardest.date)} />}
              <RecordCard kicker="PRs" value={Math.round(s.prs)} label="best times on Strava segments" sub={`${Y}`} tone="hot" />
              <RecordCard kicker="Most cheered" value={s.mostKudos ? s.mostKudos.kudos : 0} label={s.mostKudos ? `kudos on one ${/^other/i.test(s.mostKudos.sport) ? 'other activity' : s.mostKudos.sport.toLowerCase()}` : 'kudos on one outing'} sub={s.mostKudos ? fmtMonth(s.mostKudos.date) : ''} />
              <RecordCard kicker="Everests" value={everests} decimals={1} unit="×" label={`the height of Everest, from ${n0(s.elev)} m climbed`} sub={`${Y}`} />
              <RecordCard kicker="Dar to Dodoma" value={s.footKm / DAR_DODOMA_KM} decimals={1} unit="×" label="the road from Dar es Salaam to Dodoma, on foot" sub={`${n0(s.footKm)} km on foot`} />
            </ul>
            <BookStory>{(() => {
              const big = s.biggestFoot, climb = s.highestClimb, long = s.longestTime
              const out = []
              if (big && big.val > 0 && s.medianFoot > 0) {
                const k = big.val / s.medianFoot
                out.push(`A big day sits far from an ordinary one. My usual outing on foot in ${Y} was ${s.medianFoot.toFixed(1)} km, so the furthest, ${big.val.toFixed(1)} km in ${fmtMonth(big.date).split(' ')[0]}, was ${k >= 10 ? n0(k) : k.toFixed(1)} times a normal day out.`)
              }
              if (big && climb && long && big.val > 0) {
                const sameClimb = climb.date === big.date, sameLong = long.date === big.date
                if (sameClimb && sameLong) out.push('The furthest outing was also the longest in time and the one with the most climbing. One day held all three records of the year.')
                else if (sameLong) out.push(`The furthest outing was also the longest in time, ${hm(long.val)} on my feet. The most climbing came on a different day, ${n0(climb.val)} m in ${fmtMonth(climb.date).split(' ')[0]}.`)
                else if (sameClimb) out.push(`The furthest outing was also the one with the most climbing. The longest in time came on a different day, ${hm(long.val)} in ${fmtMonth(long.date).split(' ')[0]}.`)
                else out.push(`The three biggest days of the year were three different outings: the furthest, the longest in time and the one with the most climbing each came on its own day.`)
              }
              if (ps) {
                const d = Math.round(s.prs) - Math.round(ps.prs)
                out.push(d > 0 ? `I set ${n0(s.prs)} PRs on Strava segments, ${n0(d)} more than in ${ps.year}.` : d < 0 ? `I set ${n0(s.prs)} PRs on Strava segments, ${n0(-d)} fewer than in ${ps.year}.` : `I set ${n0(s.prs)} PRs on Strava segments, the same number as in ${ps.year}.`)
              }
              return out
            })()}</BookStory>
          </section>
          </>
        )}

        </>)}

        {/* ===== 8. where it happened ===== */}
        {r.located >= 15 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-where')}
              eyebrow={`${num()} · Where it happened`}
              title={(r.countries.find((c) => c.country === 'Tanzania')?.activities || 0) / Math.max(1, r.located) > 0.8 ? 'Mostly at home.' : 'Across the border.'}
              statement={<>
                {(() => { const away = r.countries.filter((c) => c.country !== 'Tanzania' && isNamedCountry(c.country)).map((c) => c.country); return away.length ? `Besides Tanzania, I went out in ${away.length > 1 ? `${away.slice(0, -1).join(', ')} and ${away[away.length - 1]}` : away[0]}${othersN ? `, plus ${word(othersN)} ${othersN === 1 ? 'outing' : 'outings'} I count as others` : ''}.` : othersN ? `All but ${word(othersN)} were in Tanzania.` : 'All of them were in Tanzania.' })()}
                {r.regRows ? (() => { const c = r.regRows.filter((x) => !/other/.test(x.label)).reduce((b, x) => (x.b > b.b ? x : b), r.regRows[0]); return ` The climbing was mostly in ${c.label}.` })() : ''}
              </>}
              odds={{
                title: 'Where the outings were',
                items: [
                  { book: true, num: r.located, unit: '', label: 'outings with a GPS start point', tone: 'move' },
                  { num: nCountries, unit: '', label: nCountries === 1 ? 'country' : 'countries', tone: 'move' },
                  { num: r.regionCount, unit: '', label: r.regionCount === 1 ? 'region of Tanzania' : 'regions of Tanzania', tone: 'rest' },
                  { book: true, value: r.regRows ? r.regRows[0].a : 1, label: `of outings in ${r.regRows ? r.regRows[0].label : 'one place'}`, tone: 'move' },
                ],
              }}
              left={{ title: 'Home against away', node: <GeoBubbles rows={r.countries} /> }}
              right={{
                title: 'Inside Tanzania: share of outings and of climb',
                node: r.regRows ? <PairBars rows={r.regRows} aLabel="share of outings" bLabel="share of climb" aShort="outings" bShort="climb"
                  aria={`Tanzania regions in ${Y}: ${r.regRows.map((x) => `${x.label} ${pc(x.a)}% of outings, ${pc(x.b)}% of climb`).join('; ')}.`} /> : <p className="yis-empty">Only one region this year.</p>,
              }}
              read={[
              'The big disc is Tanzania, and the number in it is the share of the year\u2019s outings with a GPS start that began there. Other African countries are listed beside it, and anything outside Africa is counted as others.',
              'Each region of Tanzania has two bars: the first is its share of my outings there that year, the second its share of the climbing. The number at the end is the gap.',
            ]}
              story={[
              noGps ? `${n0(noGps)} outings this year had no GPS start, mostly on the treadmill, so they are not part of these two charts.` : 'Every outing this year had a GPS start, so all of them are on these charts.',
              r.regionCount > 1 ? `I went out in ${word(r.regionCount)} regions of Tanzania this year.` : '',
              newRegs.length ? `${newRegs.length === 1 ? 'One region was' : `${cap(word(newRegs.length))} regions were`} new to my log this year: ${newRegs.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : 'No region of Tanzania was new to my log this year.',
              abroadN ? `${cap(word(abroadN))} ${abroadN === 1 ? 'outing' : 'outings'} began outside Tanzania.` : '',
            ]}
              source="Strava GPS start points · countries and Tanzania regions"
            />
          </>
        )}

        {book && (<>
        {/* ===== 9. against the other years ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-rank')}
          eyebrow={`${num()} · Against the other years`}
          title={`${ORD[rankN - 1][0].toUpperCase() + ORD[rankN - 1].slice(1)} of ${years.length} years.`}
          statement={<>
            For distance on foot it comes {ORD[rankKm - 1]}, and for climbing {ORD[rankEl - 1]}{isPartial ? `, and it is not finished yet` : ''}.
          </>}
          odds={{
            title: ps ? `${Y} against ${prevYear}` : `${Y} among the years`,
            items: ps ? [
              { book: true, value: chg(s.n, ps.n) || 0, sign: true, label: 'outings', tone: (chg(s.n, ps.n) || 0) >= 0 ? 'move' : 'rest' },
              { book: true, value: chg(s.footKm, ps.footKm) || 0, sign: true, label: 'distance on foot', tone: (chg(s.footKm, ps.footKm) || 0) >= 0 ? 'move' : 'rest' },
              { book: true, value: chg(s.elev, ps.elev) || 0, sign: true, label: 'metres climbed', tone: (chg(s.elev, ps.elev) || 0) >= 0 ? 'move' : 'rest' },
              { book: true, value: chg(s.prs, ps.prs) || 0, sign: true, label: 'PRs', tone: (chg(s.prs, ps.prs) || 0) >= 0 ? 'move' : 'rest' },
            ] : [
              { num: rankN, unit: '', label: 'rank by outings', tone: 'move' },
              { num: rankKm, unit: '', label: 'rank by distance', tone: 'move' },
              { num: rankEl, unit: '', label: 'rank by climb', tone: 'move' },
              { book: true, num: years.length, unit: '', label: 'calendar years on record', tone: 'rest' },
            ],
          }}
          left={{ title: 'Outings, year by year', node: <YearRank series={rankSeries} selected={Y} fmt={(v) => fmtInt(v)} /> }}
          right={{
            title: ps ? vsPrevTitle(vsRows, prevYear) : 'The first year',
            node: ps ? (
              <YearVsPrev prevYear={prevYear} sameDay={psSame ? fmtDay(s.endISO) : null} rows={vsRows} />
            ) : <p className="yis-empty">{Y} is where my record starts.</p>,
          }}
          read={[
              `Every year of my record by its number of outings, with ${Y} in orange.`,
              ps ? `Every bar starts at the ${prevYear} total and points to ${Y}, with the ${Y} total at its tip. Orange went up, grey went down, and the longest bar changed the most. When one measure grew many times over, the scale counts in times as many.${psSame ? ` ${Y} is not finished, so the black mark shows where ${prevYear} stood on ${fmtDay(s.endISO)}.` : ''}` : 'The first year has no year before it to compare with.',
            ]}
          story={[
              `By hours moving it comes ${ORD[rankH - 1]}, by PRs ${ORD[rankP - 1]} and by kudos ${ORD[rankK - 1]}.`,
              bestKmYear && bestKmYear.year !== Y ? `Against my best year for distance, ${bestKmYear.year}, it covered ${pc(s.footKm / bestKmYear.footKm)}% as many kilometres on foot.` : `It is my best year for distance on foot.`,
              `For distance per outing on foot, it comes ${ORD[rankKpo - 1]} of the ${word(years.length)} years, at ${kmPerOut(s).toFixed(1)} km each.`,
              isPartial ? 'The year is not finished, so it can still move up these lists.' : '',
            ]}
          source="Activity Log · yearly totals"
        />

        {/* ===== the signature moment ===== */}
        <hr className="rule rule--faint" />
        <section className="yis-sec yis-sec--moment">
          <YearMoment year={Y} stats={s} />
          <BookLesson of={<YearMoment />} />
        </section>

        </>)}

        {!book && <Reveal as="section" className="yis-cta">
          <div className="yis-cta__row">
            {years.includes(Y - 1) && <button type="button" className="yis-cta__btn" onClick={() => { setPicked(Y - 1); scrollToTop() }}>&larr; {Y - 1}</button>}
            <button type="button" className="yis-cta__btn" onClick={scrollToTop}>Pick another year &uarr;</button>
            {years.includes(Y + 1) && <button type="button" className="yis-cta__btn" onClick={() => { setPicked(Y + 1); scrollToTop() }}>{Y + 1} &rarr;</button>}
          </div>
        </Reveal>}
      </div>
    </DetailFrame>
  )
}

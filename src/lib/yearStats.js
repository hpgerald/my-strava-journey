import { toNum } from './format.js'
import { prettySport } from './slug.js'
import { prettyCountry } from './geo.js'

// Per-year statistics computed from the activity log, shared by the Year in Sport
// report and the home page's year-character narrative so both tell the same story
// from the same numbers. Distance and elevation are foot-only; cycling is counted
// but folds into "Other activity" via prettySport.

export const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function maxBy(arr, f) {
  let best = null, bv = -Infinity
  for (const a of arr) { const v = f(a); if (v > bv) { bv = v; best = a } }
  return best
}

export function computeYearStats(year, acts, geo) {
  const ya = acts.filter((a) => Number(a.year) === year)
  const num = (a, k) => toNum(a[k]) || 0
  const footKm = ya.reduce((s, a) => (FOOT.has(a.sport_type) ? s + num(a, 'distance_km') : s), 0)
  const elev = ya.reduce((s, a) => (FOOT.has(a.sport_type) ? s + num(a, 'elevation_gain_m') : s), 0)
  const hours = ya.reduce((s, a) => s + num(a, 'moving_time_min'), 0) / 60
  const kudos = ya.reduce((s, a) => s + num(a, 'kudos'), 0)
  const prs = ya.reduce((s, a) => s + num(a, 'prs'), 0)
  const achievements = ya.reduce((s, a) => s + num(a, 'achievements'), 0)

  const dates = [...new Set(ya.map((a) => (a.date || '').slice(0, 10)).filter(Boolean))].sort()
  const activeSet = new Set(dates)
  let best = 0, cur = 0, prev = null, curStart = null, bStart = null, bEnd = null
  for (const d of dates) {
    const dd = Date.parse(d)
    if (prev != null && dd - prev === 86400000) cur += 1
    else { cur = 1; curStart = d }
    if (cur > best) { best = cur; bStart = curStart; bEnd = d }
    prev = dd
  }

  const monthsActivities = Array(12).fill(0)
  const monthsKm = Array(12).fill(0)
  const monthsElev = Array(12).fill(0)
  const hours24 = Array(24).fill(0)
  const weekday7 = Array(7).fill(0)
  for (const a of ya) {
    const mo = parseInt((a.date || '').slice(5, 7), 10) - 1
    if (mo >= 0 && mo < 12) {
      monthsActivities[mo] += 1
      if (FOOT.has(a.sport_type)) { monthsKm[mo] += num(a, 'distance_km'); monthsElev[mo] += num(a, 'elevation_gain_m') }
    }
    const h = parseInt(a.hour, 10)
    if (h >= 0 && h < 24) hours24[h] += 1
    const wi = WEEK.indexOf(a.weekday)
    if (wi >= 0) weekday7[wi] += 1
  }

  const mixMap = new Map()
  for (const a of ya) {
    const label = prettySport(a.sport_type)
    const e = mixMap.get(label) || { label, n: 0, foot: FOOT.has(a.sport_type) }
    e.n += 1
    mixMap.set(label, e)
  }
  const mix = [...mixMap.values()].sort((a, b) => b.n - a.n)

  const cMap = new Map()
  for (const a of ya) {
    const g = geo[a.activity_key]
    if (g && g.country && !/Indoor/.test(g.country)) {
      const c = prettyCountry(g.country)
      cMap.set(c, (cMap.get(c) || 0) + 1)
    }
  }
  const countries = [...cMap.entries()].map(([country, n]) => ({ country, n }))
    .sort((a, b) => (a.country === 'Other' ? 1 : b.country === 'Other' ? -1 : b.n - a.n))

  const footActs = ya.filter((a) => FOOT.has(a.sport_type))
  const rec = (a, key) => (a ? { date: (a.date || '').slice(0, 10), val: num(a, key), sport: prettySport(a.sport_type) } : null)

  const calories = ya.reduce((s, a) => s + num(a, 'calories'), 0)

  // weeks touched, counted by the Monday that starts each week (avoids ISO edge
  // cases while still counting distinct calendar weeks). weeksElapsed frames a
  // partial year honestly: weeks from Jan 1 to the last recorded day.
  const mondayKey = (iso) => {
    const d = new Date(iso + 'T00:00:00Z')
    const back = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - back)
    return d.toISOString().slice(0, 10)
  }
  const weeksActive = new Set(dates.map(mondayKey)).size
  const endISO = dates.length ? dates[dates.length - 1] : `${year}-12-31`
  const weeksElapsed = dates.length
    ? Math.floor((Date.parse(endISO) - Date.parse(`${year}-01-01`)) / (7 * 86400000)) + 1
    : 0

  // cumulative foot kilometres at each month end, drawn only through the last
  // month that actually carried activity (so a partial year does not flatline).
  let lastActiveMonth = -1
  for (let i = 0; i < 12; i++) if (monthsActivities[i] > 0) lastActiveMonth = i
  const cumByMonth = []
  let acc = 0
  for (let i = 0; i < 12; i++) { acc += monthsKm[i]; cumByMonth.push({ m: i + 1, cum: acc, inRange: i <= lastActiveMonth }) }

  // distribution of foot outings by rounded kilometre, long tail folded at 25+.
  const CAP = 25
  const footBins = Array.from({ length: CAP }, (_, i) => ({ km: i + 1, count: 0, cap: i + 1 === CAP }))
  for (const a of footActs) {
    const d = num(a, 'distance_km')
    if (d < 0.5) continue
    const k = Math.min(CAP, Math.max(1, Math.round(d)))
    footBins[k - 1].count += 1
  }
  const peakBins = [...footBins].filter((b) => b.count > 0).sort((a, b) => b.count - a.count).slice(0, 2).map((b) => b.km)
  const medianFoot = (() => {
    const ds = footActs.map((a) => num(a, 'distance_km')).filter((d) => d >= 0.5).sort((a, b) => a - b)
    if (!ds.length) return 0
    const mid = Math.floor(ds.length / 2)
    return ds.length % 2 ? ds[mid] : (ds[mid - 1] + ds[mid]) / 2
  })()

  const mk = maxBy(ya, (a) => num(a, 'kudos'))
  const mostKudos = mk ? { date: (mk.date || '').slice(0, 10), sport: prettySport(mk.sport_type), kudos: num(mk, 'kudos') } : null

  return {
    year, n: ya.length, footKm, hours, elev, kudos, prs, achievements, calories,
    activeDays: dates.length, activeSet, streakLen: best, streakStartISO: bStart, streakEndISO: bEnd,
    endISO,
    weeksActive, weeksElapsed,
    monthsActivities, monthsKm, monthsElev, hours24, weekday7, mix, countries,
    cumByMonth, lastActiveMonth, footBins, peakBins, medianFoot,
    peakWeekdayIdx: weekday7.indexOf(Math.max(1, ...weekday7)),
    biggestFoot: rec(maxBy(footActs, (a) => num(a, 'distance_km')), 'distance_km'),
    highestClimb: rec(maxBy(footActs, (a) => num(a, 'elevation_gain_m')), 'elevation_gain_m'),
    hardest: rec(maxBy(ya, (a) => num(a, 'relative_effort')), 'relative_effort'),
    longestTime: rec(maxBy(footActs, (a) => num(a, 'moving_time_min')), 'moving_time_min'),
    mostKudos,
    footN: footActs.length,
    walkN: ya.filter((a) => a.sport_type === 'Walk').length,
    runN: ya.filter((a) => a.sport_type === 'Run').length,
  }
}

// One-line theme + headline for the hero of a year's report.
export const YEAR_THEME = {
  2019: 'The quiet debut',
  2020: 'The long pause',
  2021: 'The year it caught',
  2022: 'The busiest year',
  2023: 'The year of vertical',
  2024: 'The traveling year',
  2025: 'The year it pointed uphill',
  2026: 'The unbroken year',
}

// A short character + a data-driven sentence for the home page's seven-years
// narrative. Each line is filled from that year's own numbers.
const num0 = (v) => Math.round(v).toLocaleString()
export const YEAR_CHARACTERS = {
  2019: { label: 'The debut', line: (s) => `A tentative first year: ${s.n} activities in all, almost every one a run, and most of them logged indoors on a treadmill. Barely ${num0(s.footKm)} km across the whole year. Then the record goes quiet.` },
  2020: { label: 'The false start', line: (s) => `Only ${s.n} activities all year. A 23 km run in March, a first trip over the border into Kenya, and then after midsummer the log simply stops for the better part of a year.` },
  2021: { label: 'The switch', line: (s) => `Everything breaks open. Activities jump from 35 to ${s.n}, kudos from 30 to over eight thousand, and on more than half the days out, one session was not enough. July flips it on, and it never flips off.` },
  2022: { label: 'The peak', line: (s) => `The busiest year on record at ${s.n} activities, more than one a day. It holds the single full marathon too, 42.75 km in 2 hours 57, and it is the year walking quietly pulls level with running.` },
  2023: { label: 'The climb', line: (s) => `The year it pointed uphill: ${num0(s.elev)} metres of climbing, more than any year yet. One day on Mount Hanang alone took eight and a half hours and 1,718 metres up, and somewhere in it sat a 100 km race run over four straight nights.` },
  2024: { label: 'The passport', line: (s) => `The map spreads at its widest: ${s.countries.length} countries in one year, as far apart as Rwanda and Saudi Arabia. It opens with a 34 km trail run in January, close to eight hours on the move.` },
  2025: { label: 'The ascent', line: (s) => `One day in March climbs ${num0(s.highestClimb ? s.highestClimb.val : 0)} metres, almost two vertical kilometres between sunrise and sunset, the most ever in a single outing. Later a walk just refuses to end: eleven hours moving, start to finish.` },
  2026: { label: 'Unbroken', line: (s) => `Still going, every single day so far, with more hours moving and more personal records than any year before, ${s.prs} of them. And the clock has shifted earlier: the busiest hour is now six in the morning, out the door and almost always outside.` },
}

// A longer, aggregate read of each year for the Year in Sport report hero. These
// lead with the big patterns (volume, the walk-run split, indoor against outdoor,
// consistency, how the year sits against its neighbours) rather than any single
// outing. Headline figures interpolate live; the qualitative comparisons describe
// settled, past years.
export const YEAR_REPORT = {
  2019: (s) => `A toe in the water. ${s.n} activities, almost every one a run, and more than half of them logged indoors on a treadmill. Foot distance barely cleared ${num0(s.footKm)} km for the whole year, and the longest unbroken streak never reached a week. This is the baseline everything after it is measured against.`,
  2020: (s) => `Still finding its feet, then losing them. ${s.n} activities, mostly short indoor runs, and foot distance that actually slipped below the year before. The one real signal is a first trip into Kenya, the map's first step outside Tanzania. After midsummer the log goes dark for the better part of a year.`,
  2021: (s) => `The year the whole thing changes gear. Activities multiply almost tenfold to ${s.n}, foot distance clears ${num0(s.footKm)} km, and the days start doubling up: on well over half of them, one outing was not the end of it. Walking arrives in force, and the split between indoor and outdoor finally evens out.`,
  2022: (s) => `Peak volume. ${s.n} activities, more than any year before or since, and the first year walking logs more outings than running. Climbing roughly doubles on the year before as the training moves outside, and two days in three now carry something.`,
  2023: (s) => `The year it tilts uphill. The activity count eases back from the peak, but climbing explodes to over ${num0(s.elev)} metres, more than any year on record, and real ground finally beats the treadmill, two outings outside for every one in. Personal records more than double. Less often out the door, but much harder when it happens.`,
  2024: (s) => `The year it travels. The map reaches ${s.countries.length} countries, the widest it ever spreads, while the home rhythm settles at a steady three hundred-odd activities. Foot distance dips as more of the effort goes into trails and travel than into piling up flat kilometres.`,
  2025: (s) => `Almost all of it outdoors now, with barely a quarter of the sessions touching a treadmill. Climbing jumps back toward its high-water mark at over ${num0(s.elev)} metres, and the habit holds near three hundred activities for a third straight year. The pattern has settled, and it points up.`,
  2026: (s) => `The most complete year yet, and still unfinished. More hours moving and more personal records than any year before, ${s.prs} of them, with almost nothing left indoors. Distance is back over ${num0(s.footKm)} km, the climbing near its peak, and the starts have crept to dawn. Every day so far has carried something.`,
}

export function buildYearSummaries(acts, geo) {
  const years = [...new Set(acts.map((a) => Number(a.year)).filter(Boolean))].sort((a, b) => a - b)
  return years.map((y) => {
    const stats = computeYearStats(y, acts, geo)
    const c = YEAR_CHARACTERS[y] || { label: `${y}`, line: (s) => `${s.n} activities across the year.` }
    return { year: y, label: c.label, line: c.line(stats), stats }
  })
}

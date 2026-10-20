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

  // how the year was made: outings per active day, their length, and when
  const perDay = new Map()
  for (const a of ya) { const d = (a.date || '').slice(0, 10); if (d) perDay.set(d, (perDay.get(d) || 0) + 1) }
  const multiDays = [...perDay.values()].filter((v) => v > 1).length
  const movMin = ya.reduce((s2, a) => s2 + num(a, 'moving_time_min'), 0)
  const movSorted = ya.map((a) => num(a, 'moving_time_min')).sort((a, b) => a - b)
  const medMovingMin = movSorted.length ? movSorted[Math.floor((movSorted.length - 1) / 2)] : 0
  const footKmAll = footActs.reduce((s2, a) => s2 + num(a, 'distance_km'), 0)
  const walks = ya.filter((a) => a.sport_type === 'Walk')
  const longWalk = maxBy(walks, (a) => num(a, 'distance_km'))
  const shape = {
    multiShare: dates.length ? multiDays / dates.length : 0,
    outingsPerDay: dates.length ? ya.length / dates.length : 0,
    avgOutingMin: ya.length ? movMin / ya.length : 0,
    minPerActiveDay: dates.length ? movMin / dates.length : 0,
    medMovingMin,
    weekendShare: ya.length ? ya.filter((a) => a.weekday === 'Saturday' || a.weekday === 'Sunday').length / ya.length : 0,
    morningShare: ya.length ? ya.filter((a) => { const h = parseInt(a.hour, 10); return h >= 0 && h < 10 }).length / ya.length : 0,
    walkShare: ya.length ? walks.length / ya.length : 0,
    runShare: ya.length ? ya.filter((a) => a.sport_type === 'Run' || a.sport_type === 'TrailRun').length / ya.length : 0,
    mPerKm: footKmAll ? elev / footKmAll : 0,
    trailKm: ya.reduce((s2, a) => (a.sport_type === 'TrailRun' ? s2 + num(a, 'distance_km') : s2), 0),
    longestWalk: longWalk ? { km: num(longWalk, 'distance_km'), min: num(longWalk, 'moving_time_min') } : null,
  }

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
    ...shape,
  }
}

// One-line theme + headline for the hero of a year's report.
export const YEAR_THEME = {
  2019: 'The quiet start',
  2020: 'The long pause',
  2021: 'The year it changed',
  2022: 'The busiest year',
  2023: 'The year of climbing',
  2024: 'The year it traveled',
  2025: 'The year of the long walk',
  2026: 'The unbroken year',
}

// A short character + a data-driven sentence for the home page's seven-years
// narrative. Each line is filled from that year's own numbers.
const num0 = (v) => Math.round(v).toLocaleString()
// how each year was made, one line per year, written to fill two lines of a card.
// Superlatives are checked against every year so they stay true on each refresh.
const pc0 = (v) => Math.round((v || 0) * 100)
const top = (all, s, k) => all.every((o) => o.year === s.year || (o[k] || 0) < (s[k] || 0))
const bottom = (all, s, k) => all.every((o) => o.year === s.year || (o[k] || 0) > (s[k] || 0))
const most = (ok) => (ok ? ', the most of any year' : '')
export const YEAR_CHARACTERS = {
  2019: { label: 'The quiet start', line: (s, all) => `${pc0(s.weekendShare)}% of outings fell on a Saturday or Sunday${most(top(all, s, 'weekendShare'))}. ${pc0(s.runShare)}% were runs.` },
  2020: { label: 'The false start', line: (s, all) => `${pc0(s.morningShare)}% of outings began before 10 in the morning${most(top(all, s, 'morningShare'))}. Then the log stopped.` },
  2021: { label: 'The switch', line: (s, all) => `Two a day: ${pc0(s.multiShare)}% of active days had two or more outings${most(top(all, s, 'multiShare'))}.` },
  2022: { label: 'The peak', line: (s, all) => `Short and often: the average outing ran ${num0(s.avgOutingMin)} minutes${bottom(all, s, 'avgOutingMin') ? ', the shortest of any year' : ''}.` },
  2023: { label: 'The climb', line: (s, all) => `${num0(s.mPerKm)} m of climb for every km on foot${top(all, s, 'mPerKm') ? ', the steepest year' : ''}, and ${num0(s.trailKm)} km on trails.` },
  2024: { label: 'The passport', line: (s) => `${s.countries.length} countries in one year, and half of all outings done in under ${num0(s.medMovingMin)} minutes.` },
  2025: { label: 'The long walk', line: (s, all) => {
    const lw = s.longestWalk
    const lwTop = lw && all.every((o) => o.year === s.year || !o.longestWalk || o.longestWalk.km < lw.km)
    return `Walks were ${pc0(s.walkShare)}% of outings${most(top(all, s, 'walkShare'))}${lw && lwTop ? `, and the longest walk on record, ${num0(lw.km)} km` : ''}.`
  } },
  2026: { label: 'Unbroken', line: (s) => `One outing a day, and longer: ${num0(s.avgOutingMin)} minutes on average. Only ${pc0(s.multiShare)}% of days doubled up.` },
}

// A longer, aggregate read of each year for the Year in Sport report hero. These
// lead with the big patterns (volume, the walk-run split, indoor against outdoor,
// consistency, how the year sits against its neighbours) rather than any single
// outing. Headline figures interpolate live; the qualitative comparisons describe
// settled, past years.
export const YEAR_REPORT = {
  2019: (s) => `The starting point, and an honest one. ${s.n} activities, almost all runs, more than half of them indoors on a treadmill. Foot distance barely cleared ${num0(s.footKm)} km for the year, and the longest unbroken run never reached a week. Everything that follows is measured against this.`,
  2020: (s) => `A year that stalls. ${s.n} activities, mostly short indoor runs, and foot distance that actually slipped below 2019. The one real marker is a first trip into Kenya, the first activity logged outside Tanzania. Then after midsummer the log goes dark for most of a year.`,
  2021: (s) => `The year it all changes. Activities multiply almost tenfold to ${s.n}, foot distance clears ${num0(s.footKm)} km, and the days start doubling up: on well over half of them, one outing was not enough. Walking arrives in force, and indoor and outdoor finally even out. This is the hinge the whole record turns on.`,
  2022: (s) => `Peak volume. ${s.n} activities, more than any year before or since, and the first year walking logs more outings than running. Climbing roughly doubles as the training moves outdoors, and two days in three now carry something.`,
  2023: (s) => `The year it points uphill. The activity count eases off the peak, but climbing jumps to over ${num0(s.elev)} metres, more than any year on record, and outdoor runs finally outnumber the treadmill two to one. Personal records more than double. Fewer days out, and much harder ones.`,
  2024: (s) => `The year it travels. The map reaches ${s.countries.length} countries, the widest it ever spreads, while home settles into a steady three hundred-odd activities. Foot distance dips as more of the effort goes into trails and travel than flat kilometres.`,
  2025: (s) => `The year it walked. Walks were ${Math.round(s.walkShare * 100)}% of all outings, more than any year before, and it holds the longest walk on record${s.longestWalk ? `, ${num0(s.longestWalk.km)} km in one go` : ''}. Barely a quarter of sessions were on a treadmill, and the habit held near three hundred activities for a third straight year.`,
  2026: (s) => `The most complete year yet, and still unfinished. More hours moving and more personal records than any year before, ${s.prs} of them, with almost nothing left indoors. Distance is back over ${num0(s.footKm)} km, climbing near its peak, and the starts have crept to dawn. Every single day so far has carried something.`,
}

export function buildYearSummaries(acts, geo) {
  const years = [...new Set(acts.map((a) => Number(a.year)).filter(Boolean))].sort((a, b) => a - b)
  const all = years.map((y) => computeYearStats(y, acts, geo))
  return all.map((stats) => {
    const y = stats.year
    const c = YEAR_CHARACTERS[y] || { label: `${y}`, line: (s) => `${s.n} activities across the year.` }
    return { year: y, label: c.label, line: c.line(stats, all), stats }
  })
}

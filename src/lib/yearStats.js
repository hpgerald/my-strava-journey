import { toNum } from './format.js'
import { prettySport } from './slug.js'
import { prettyCountry, OTHER_LABEL } from './geo.js'

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
    .sort((a, b) => (a.country === OTHER_LABEL ? 1 : b.country === OTHER_LABEL ? -1 : b.n - a.n))
  // only the named (African) countries are ever counted
  const countriesNamed = countries.filter((c) => c.country !== OTHER_LABEL).length

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
    monthsActivities, monthsKm, monthsElev, hours24, weekday7, mix, countries, countriesNamed,
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
  2019: 'A small beginning',
  2020: 'The long pause',
  2021: 'The year I came back',
  2022: 'The busiest year',
  2023: 'The year of the hills',
  2024: 'The travel year',
  2025: 'The year of walking',
  2026: 'Every day so far',
}

// A short character + a data-driven sentence for the home page's seven-years
// narrative. Each line is filled from that year's own numbers.
const num0 = (v) => Math.round(v).toLocaleString()
const pc0 = (v) => Math.round((v || 0) * 100)
const top = (all, s, k) => all.every((o) => o.year === s.year || (o[k] || 0) < (s[k] || 0))
const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const w = (n) => W[n] || String(n)
export const YEAR_CHARACTERS = {
  2019: { label: 'A small beginning', line: (s) => `Mostly the treadmill. ${pc0(s.runShare)}% of my outings were runs, many of them on weekends.` },
  2020: { label: 'The pause', line: (s) => `Most outings were early, before 10 in the morning. Then I stopped logging for almost a year.` },
  2021: { label: 'Coming back', line: (s) => `I started again. On ${pc0(s.multiShare)}% of my days out, I went out more than once.` },
  2022: { label: 'The busiest', line: (s) => `Many short outings, about ${num0(s.avgOutingMin)} minutes each.` },
  2023: { label: 'The hills', line: (s) => `More hills. I climbed ${num0(s.mPerKm)} m for every km and ran ${num0(s.trailKm)} km on trails.` },
  2024: { label: 'Travelling', line: (s) => `I went out in ${w(s.countriesNamed)} countries. Half my outings were done in under ${num0(s.medMovingMin)} minutes.` },
  2025: { label: 'Walking', line: (s, all) => {
    const lw = s.longestWalk
    const lwTop = lw && all.every((o) => o.year === s.year || !o.longestWalk || o.longestWalk.km < lw.km)
    return `Walks were ${pc0(s.walkShare)}% of my outings${lw && lwTop ? `, and I did my longest walk, ${num0(lw.km)} km` : ''}.`
  } },
  2026: { label: 'Every day', line: (s) => `Usually one outing a day, a longer one, about ${num0(s.avgOutingMin)} minutes.` },
}

// A longer read of each year for the Year in Sport report hero, in my own voice.
// Headline figures fill in live; the comparisons with other years describe
// settled, past years and were checked against the activity log.
export const YEAR_REPORT = {
  2019: (s) => `Every habit starts small. By the end of my first year I had ${s.n} activities, most of them runs on a treadmill, and the most days I managed in a row was ${s.streakLen}.`,
  2020: () => `A habit can stop very easily. In July I went out in Kenya, my first outing outside Tanzania, and the next day once more, in Arusha. Then I stopped, and it stayed like that for almost a year.`,
  2021: (s) => `Kawia ufike, it is better to arrive late than not to arrive. I came back in June with a 10 km run, after 353 days away. Within weeks I was going out almost every day, and on ${Math.round(s.multiShare * 100)}% of my days out I went out more than once. Everything after grew from this year.`,
  2022: (s) => `When the habit is strong, the big days come. This was my busiest year, and I ran a full marathon on the treadmill, the longest outing in my log. It was also the first year I walked more often than I ran, ${s.walkN} walks to ${s.runN} runs.`,
  2023: (s) => `Fewer outings can still mean more. I went out a bit less than in 2022, but I went to the hills more. In March alone I climbed more than 5,000 m, most of it in Kilimanjaro, and over the year I ran ${num0(s.trailKm)} km on trails.`,
  2024: (s) => `Even in a low year, the days can hold. It was my travel year, with outings in ${w(s.countriesNamed)} countries, and my lowest distance since the habit started. Still, I went out on ${s.activeDays} days.`,
  2025: (s) => `Walking became my main thing. It was ${Math.round(s.walkShare * 100)}% of my outings, and in February I walked 30 km in one go, my longest walk. For the third year in a row I logged about three hundred activities.`,
  2026: () => `Going every day has made it simpler. I have not missed a day this year, and in August my fiftieth trip to Ras Kilomoni was also my 2,000th outing. The year is not over yet. I am thankful the body has carried me this far.`,
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

import { toNum } from './format.js'
import { NAMED_COUNTRIES } from './geo.js'

// The Timeline page's material: every dated moment in the record, built from the
// activity log, the start places and the shoe list on every load. Moments fall
// into lanes (milestones, firsts, places, shoes, streaks and silences) so the
// whole record can be drawn as one chronicle and read as one list.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)
const isoOf = (i) => new Date(i * DAY).toISOString().slice(0, 10)
const modeOf = (a) => (a.sport_type === 'Run' ? (a.trainer === 'Yes' ? 'tread' : 'road') : a.sport_type === 'TrailRun' ? 'trail' : a.sport_type === 'Walk' ? 'walk' : a.sport_type === 'Hike' ? 'hike' : 'other')
const ORD = (n) => `${n.toLocaleString('en-US')}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`

// unbroken runs of days in a sorted list of day numbers
function runs(days) {
  const out = []
  if (!days.length) return out
  let st = days[0]
  for (let i = 1; i <= days.length; i++) {
    if (i < days.length && days[i] - days[i - 1] === 1) continue
    out.push({ start: st, end: days[i - 1], len: days[i - 1] - st + 1 })
    if (i < days.length) st = days[i]
  }
  return out
}

export function buildChronicle(activities, geoRows = [], gearRows = []) {
  const geo = Object.fromEntries(geoRows.map((g) => [g.activity_key, g]))
  const acts = activities.filter((a) => a.date).map((a) => {
    const g = geo[a.activity_key] || {}
    return {
      date: a.date.slice(0, 10), t: Date.parse(String(a.date).replace(' ', 'T') + (String(a.date).length > 10 ? 'Z' : 'T00:00:00Z')),
      sport: a.sport_type, mode: modeOf(a), foot: FOOT.has(a.sport_type), km: toNum(a.distance_km) || 0, elev: toNum(a.elevation_gain_m) || 0,
      country: g.country && !/Indoor/.test(g.country) ? g.country : null, region: g.country === 'Tanzania' ? g.region || null : null, gear: a.gear_id ? String(a.gear_id).replace(/\.0$/, '') : null,
    }
  }).sort((a, b) => a.t - b.t)
  if (!acts.length) return null
  const firstISO = acts[0].date, lastISO = acts[acts.length - 1].date
  const events = []

  // ---- milestones: every 250th outing ----
  const counts = []
  for (let k = 250; k <= acts.length; k += 250) counts.push(k)
  const milestones = [{ n: 1, date: firstISO }, ...counts.map((k) => ({ n: k, date: acts[k - 1].date }))]
  milestones.forEach((m, i) => { m.days = i ? dayIdx(m.date) - dayIdx(milestones[i - 1].date) : 0 })
  for (const m of milestones) if (m.n === 1 || m.n % 500 === 0) events.push({ lane: 'mile', date: m.date, title: m.n === 1 ? 'My first outing' : `My ${ORD(m.n)} outing`, sub: m.n === 1 ? 'where my log starts' : `${m.days} days after the ${ORD(m.n - 250)}`, key: 'ink' })
  events.push({ lane: 'mile', date: lastISO, title: `${acts.length.toLocaleString('en-US')} outings`, sub: 'my latest on record', key: 'road', now: true })

  // ---- firsts on foot ----
  const foot = acts.filter((a) => a.foot)
  const firstOf = (pred) => foot.find(pred) || null
  const firstDefs = [
    ['First 10 km', (f) => f.km >= 10, (f) => `${f.km.toFixed(1)} km`],
    ['First half marathon', (f) => f.km >= 21.0975, (f) => `${f.km.toFixed(1)} km`],
    ['First 30 km', (f) => f.km >= 30, (f) => `${f.km.toFixed(1)} km`],
    ['First marathon', (f) => f.km >= 42.195, (f) => `${f.km.toFixed(1)} km`],
    ['First 500 m climbed', (f) => f.elev >= 500, (f) => `${Math.round(f.elev)} m up`],
    ['First 1,000 m climbed', (f) => f.elev >= 1000, (f) => `${Math.round(f.elev).toLocaleString('en-US')} m up`],
    ['First trail run', (f) => f.sport === 'TrailRun', (f) => `${f.km.toFixed(1)} km`],
    ['First hike', (f) => f.sport === 'Hike', (f) => `${f.km.toFixed(1)} km`],
    ['First half marathon outside', (f) => f.km >= 21.0975 && f.mode !== 'tread', (f) => `${f.km.toFixed(1)} km`],
    ['First half-marathon walk', (f) => f.sport === 'Walk' && f.km >= 21.0975, (f) => `${f.km.toFixed(1)} km`],
  ]
  const firsts = firstDefs.map(([title, pred, sub]) => { const f = firstOf(pred); return f ? { title, date: f.date, t: f.t, mode: f.mode, sport: f.sport, km: f.km, elev: f.elev, detail: sub(f) } : null }).filter(Boolean).sort((a, b) => a.t - b.t)
  for (const f of firsts) events.push({ lane: 'first', date: f.date, title: f.title, sub: f.detail, key: f.mode })

  // ---- places: each country's first outing and every stay abroad ----
  const countryName = (c) => (NAMED_COUNTRIES.has(c) ? c : 'Other')
  const byCountry = new Map()
  // only African countries appear; anything outside Africa is never shown
  for (const a of acts) if (a.country && NAMED_COUNTRIES.has(a.country)) { if (!byCountry.has(a.country)) byCountry.set(a.country, []); byCountry.get(a.country).push(dayIdx(a.date)) }
  const stays = []
  for (const [c, ds] of byCountry) {
    if (c === 'Tanzania') continue
    const u = [...new Set(ds)].sort((x, y) => x - y)
    // days out in the same country within a week of each other belong to one stay
    let st = u[0], prev = u[0], n = 1
    for (let i = 1; i <= u.length; i++) {
      if (i < u.length && u[i] - prev <= 7) { prev = u[i]; n++; continue }
      stays.push({ country: countryName(c), raw: c, start: isoOf(st), end: isoOf(prev), days: n })
      if (i < u.length) { st = u[i]; prev = u[i]; n = 1 }
    }
  }
  stays.sort((a, b) => (a.start < b.start ? -1 : 1))
  const firstAbroad = new Map()
  for (const s of stays) if (!firstAbroad.has(s.raw)) firstAbroad.set(s.raw, s)
  for (const [raw, s] of firstAbroad) events.push({ lane: 'place', date: s.start, title: raw, sub: `${s.days} day${s.days > 1 ? 's' : ''} out on that trip`, key: 'trail' })
  const regionFirst = new Map()
  for (const a of acts) if (a.region && !regionFirst.has(a.region)) regionFirst.set(a.region, a.date)
  const regions = [...regionFirst.entries()].map(([region, date]) => ({ region, date })).sort((a, b) => (a.date < b.date ? -1 : 1))
  regions.forEach((r, i) => events.push({ lane: 'region', date: r.date, title: r.region, sub: `region ${i + 1} of ${regions.length} so far`, key: 'quiet' }))

  // ---- shoes: each pair from its first outing to its last ----
  const gearById = Object.fromEntries(gearRows.map((g) => [String(g.gear_id), g]))
  const gMap = new Map()
  for (const a of acts) if (a.gear && gearById[a.gear]) {
    const g = gMap.get(a.gear) || { id: a.gear, first: a.date, last: a.date, n: 0, km: 0 }
    g.last = a.date; g.n++; g.km += a.foot ? a.km : 0; gMap.set(a.gear, g)
  }
  const shoes = [...gMap.values()].map((g) => ({ ...g, model: gearById[g.id].model, brand: gearById[g.id].brand, retired: gearById[g.id].retired === 'Yes' }))
    .sort((a, b) => (a.first < b.first ? -1 : 1))
  for (const s of shoes) events.push({ lane: 'shoe', date: s.first, title: s.model, sub: `${Math.round(s.km).toLocaleString('en-US')} km in them${s.retired ? '' : ', and still wearing them'}`, key: 'walk' })

  // ---- streaks and silences ----
  const days = [...new Set(acts.map((a) => dayIdx(a.date)))].sort((a, b) => a - b)
  const lastDay = dayIdx(lastISO)
  const streaks = runs(days).filter((r) => r.len >= 20).map((r) => ({ start: isoOf(r.start), end: isoOf(r.end), len: r.len, current: r.end === lastDay }))
  const breaks = []
  for (let i = 1; i < days.length; i++) { const g = days[i] - days[i - 1] - 1; if (g >= 7) breaks.push({ start: isoOf(days[i - 1] + 1), end: isoOf(days[i] - 1), len: g }) }
  for (const s of streaks) if (s.len >= 45) events.push({ lane: 'streak', date: s.start, title: `${s.current ? 'The' : 'A'} ${s.len}-day streak begins`, sub: s.current ? 'still going' : `ends ${s.end}`, key: 'road', streak: s })
  for (const b of breaks) if (b.len >= 60) events.push({ lane: 'streak', date: b.start, title: `${b.len} days without an outing`, sub: `until ${b.end}`, key: 'quiet', silence: true })

  // the longest break inside each year, and the longest since the habit began
  const yearGaps = {}
  for (let i = 1; i < days.length; i++) { const g = days[i] - days[i - 1] - 1; const y = isoOf(days[i - 1]).slice(0, 4); yearGaps[y] = Math.max(yearGaps[y] || 0, g) }
  const silence = breaks.reduce((b, x) => (x.len > b.len ? x : b), { len: 0 })
  const after = breaks.filter((b) => b.start > (silence.end || ''))
  const beforeSilence = silence.start ? acts.filter((a) => a.date < silence.start).length : acts.length
  const maxAfter = days.reduce((m, d, i) => (i && isoOf(days[i - 1]) > (silence.end || '') ? Math.max(m, d - days[i - 1] - 1) : m), 0)

  // ---- monthly outings, for the faint texture under the chronicle ----
  const monthly = new Map()
  for (const a of acts) { const k = a.date.slice(0, 7); monthly.set(k, (monthly.get(k) || 0) + 1) }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return { n: acts.length, firstISO, lastISO, milestones, firsts, stays, regions, shoes, streaks, breaks, yearGaps, silence, after, maxAfter, beforeSilence, monthly: [...monthly.entries()].map(([m, n]) => ({ m, n })), events, dayIdx }
}

import { toNum } from './format.js'
import { NAMED_COUNTRIES } from './geo.js'

// Everything the Where page says, from the activity log joined to each outing's
// start place (country, and region inside Tanzania). Outings count every sport;
// distance and climb count the four sports on foot only, as everywhere on the
// site. Outings with no GPS start (treadmill, gym, indoor) have no place.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)

function agg(rows) {
  const days = new Set(rows.map((r) => r.date))
  return {
    n: rows.length, km: rows.reduce((s, r) => s + r.km, 0), elev: rows.reduce((s, r) => s + r.elev, 0),
    prs: rows.reduce((s, r) => s + r.prs, 0), days: days.size,
    first: rows.reduce((m, r) => (!m || r.date < m ? r.date : m), ''), last: rows.reduce((m, r) => (r.date > m ? r.date : m), ''),
  }
}
// how many places the outings behave like, if spread evenly (1 / sum of squared shares)
const effective = (counts) => { const t = counts.reduce((s, v) => s + v, 0) || 1; return 1 / counts.reduce((s, v) => s + (v / t) ** 2, 0) }

export function buildPlaceReport(activities, geoRows) {
  const geo = Object.fromEntries(geoRows.map((g) => [g.activity_key, g]))
  const rows = activities.filter((a) => a.date).map((a) => {
    const g = geo[a.activity_key] || {}
    const foot = FOOT.has(a.sport_type)
    return {
      sport: a.sport_type, trainer: a.trainer === 'Yes', foot, date: a.date.slice(0, 10), year: Number(a.year),
      km: foot ? toNum(a.distance_km) || 0 : 0, elev: foot ? toNum(a.elevation_gain_m) || 0 : 0, prs: toNum(a.prs) || 0,
      country: g.country && !/Indoor/.test(g.country) ? g.country : null, region: g.country === 'Tanzania' ? g.region || null : null,
    }
  }).sort((a, b) => (a.date < b.date ? -1 : 1))
  const located = rows.filter((r) => r.country)
  const indoor = rows.filter((r) => !r.country)
  const tz = located.filter((r) => r.country === 'Tanzania' && r.region)
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b)
  const lastISO = rows.length ? rows[rows.length - 1].date : ''

  // ---- countries ----
  const cMap = new Map()
  for (const r of located) { if (!cMap.has(r.country)) cMap.set(r.country, []); cMap.get(r.country).push(r) }
  const countries = [...cMap.entries()].map(([country, rs]) => ({ country, ...agg(rs) })).sort((a, b) => b.n - a.n)
  const abroad = countries.filter((c) => c.country !== 'Tanzania')
  const named = abroad.filter((c) => NAMED_COUNTRIES.has(c.country))
  const others = abroad.filter((c) => !NAMED_COUNTRIES.has(c.country))
  const abroadFolded = [...named, ...(others.length ? [{ country: 'Other', ...agg(located.filter((r) => others.some((o) => o.country === r.country))), count: others.length }] : [])]
  const abroadFirstFoot = Object.fromEntries(abroad.map((c) => [c.country, (located.find((r) => r.country === c.country && r.foot) || {}).date || null]))

  // ---- regions of Tanzania ----
  const rMap = new Map()
  for (const r of tz) { if (!rMap.has(r.region)) rMap.set(r.region, []); rMap.get(r.region).push(r) }
  const regions = [...rMap.entries()].map(([region, rs]) => {
    const a = agg(rs)
    const sp = {}
    for (const r of rs) if (r.foot) sp[r.sport] = (sp[r.sport] || 0) + 1
    const top = Object.entries(sp).sort((x, y) => y[1] - x[1])[0]
    return { region, ...a, mpk: a.km ? a.elev / a.km : 0, topSport: top ? top[0] : null, trail: (sp.TrailRun || 0) + (sp.Hike || 0) }
  }).sort((a, b) => b.n - a.n)
  const tzTot = agg(tz)

  // ---- the map growing: each region's first outing ----
  const discovered = regions.map((r) => ({ region: r.region, date: r.first })).sort((a, b) => (a.date < b.date ? -1 : 1))

  // ---- year by year ----
  const topRegions = regions.slice(0, 4).map((r) => r.region)
  const byYear = years.map((y) => {
    const all = rows.filter((r) => r.year === y)
    const t = tz.filter((r) => r.year === y)
    const counts = new Map()
    for (const r of t) counts.set(r.region, (counts.get(r.region) || 0) + 1)
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const shares = Object.fromEntries(topRegions.map((k) => [k, counts.get(k) || 0]))
    shares.Other = t.length - topRegions.reduce((s, k) => s + (counts.get(k) || 0), 0)
    return {
      year: y, n: all.length, indoor: all.filter((r) => !r.country).length, tzN: t.length,
      abroad: all.filter((r) => r.country && r.country !== 'Tanzania').length,
      regionsN: counts.size, leader: sorted[0] ? { region: sorted[0][0], n: sorted[0][1] } : null,
      effective: t.length ? effective([...counts.values()]) : 0,
      top3: t.length ? sorted.slice(0, 3).reduce((s, x) => s + x[1], 0) / t.length : 0,
      newRegions: discovered.filter((d) => d.date.slice(0, 4) === String(y)).map((d) => d.region),
      shares,
    }
  })
  const lifeEffective = effective(regions.map((r) => r.n))

  // ---- indoors, by what was done ----
  const indoorBy = { tread: 0, walk: 0, other: 0 }
  for (const r of indoor) indoorBy[r.sport === 'Run' || r.sport === 'TrailRun' ? 'tread' : r.sport === 'Walk' ? 'walk' : 'other']++

  return {
    n: rows.length, located: located.length, indoor: indoor.length, lastISO, years,
    countries, abroad, abroadFolded, abroadFirstFoot, abroadN: abroad.reduce((s, c) => s + c.n, 0),
    regions, tzTot, discovered, byYear, topRegions, lifeEffective, indoorBy,
    firstISO: rows.length ? rows[0].date : '', dayIdx,
  }
}

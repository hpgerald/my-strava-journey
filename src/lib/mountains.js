// The data behind the mountain chapters and the mountain sections of Records:
// the Kilimanjaro expedition, the long day on Mount Hanang, the trips to Bondwa
// Peak in the Uluguru Mountains, and the GPS lines of each route.

// the Kilimanjaro expedition, March 2023 (scripts/build_kili_expedition.py)
export function buildKX(kxStages, kxProfile) {
    if (!kxStages.length || !kxProfile.length) return null
    const s = kxStages.map((r) => ({ stage: +r.stage, from: r.from_place, to: r.to_place, dist: +r.distance_km, km: +r.recorded_km, climb: +r.climb_m, elapsed: +r.elapsed_min, start: +r.start_alt_m, end: +r.end_alt_m, high: +r.high_alt_m })).sort((a, b) => a.stage - b.stage)
    if (s.length < 5) return null
    const profile = {}
    kxProfile.forEach((r) => { (profile[+r.stage] = profile[+r.stage] || []).push({ f: +r.frac, alt: +r.alt_m }) })
    const climb = s.slice(0, 4).reduce((a, x) => a + x.climb, 0)
    return { s, profile, climb, km: s.reduce((a, x) => a + x.dist, 0), dayClimb: Math.round(s.slice(0, 3).reduce((a, x) => a + x.climb, 0) / 3 / 100) * 100 }
  }

// the long day on Mount Hanang, April 2023 (scripts/build_hanang.py), and the longest days out on foot
export function buildHN(hnRows, activities, geo) {
    if (!hnRows.length || !activities.length) return null
    const key = hnRows[0].activity_key
    const a = activities.find((r) => r.activity_key === key)
    if (!a) return null
    const pts = hnRows.map((r) => ({ t: +r.t_min, alt: +r.alt_m })).sort((p, q) => p.t - q.t)
    const top = pts.reduce((b, p) => (p.alt > b.alt ? p : b), pts[0])
    const at = (min) => pts.reduce((b, p) => (Math.abs(p.t - min) < Math.abs(b.t - min) ? p : b), pts[0]).alt
    const s0 = parseInt(hnRows[0].start.slice(11, 13), 10) * 60 + parseInt(hnRows[0].start.slice(14, 16), 10)
    const near = pts.find((p) => p.alt >= top.alt - 300)
    const FOOTS = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
    const modeOf = (r) => (r.sport_type === 'Run' ? (r.trainer === 'Yes' ? 'tread' : 'road') : r.sport_type === 'TrailRun' ? 'trail' : r.sport_type === 'Walk' ? 'walk' : 'hike')
    const longest = activities.filter((r) => FOOTS.has(r.sport_type)).map((r) => ({ key: r.activity_key, date: r.date.slice(0, 10), mode: modeOf(r), km: +r.distance_km || 0, elev: +r.elevation_gain_m || 0, out: +r.elapsed_time_min || 0, region: (geo[r.activity_key] || {}).region }))
      .sort((p, q) => q.out - p.out)
    const back = longest.filter((r) => r.region === 'Manyara' && r.elev >= 500 && r.date > a.date.slice(0, 10)).sort((p, q) => (p.date < q.date ? -1 : 1))
    return {
      pts, start: hnRows[0].start, date: a.date.slice(0, 10), km: +a.distance_km, climb: +a.elevation_gain_m, out: +a.elapsed_time_min, moving: +a.moving_time_min,
      top, upMin: Math.round(top.t), downMin: Math.round(pts[pts.length - 1].t) - Math.round(top.t), lastUp: top.t - near.t,
      at9: at(21 * 60 - s0), atMid: at(24 * 60 - s0), first: longest[0] && longest[0].key === key, longest: longest.slice(0, 5), back,
    }
  }

export const KX_TOP = 5895 // Uhuru Peak, as signed on the mountain
export const KX_RIM = 5685 // Gilman's Point
export const UHURU = [-3.0758, 37.3533]

const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])

// the GPS lines of one mountain: { trip: [[lat, lng], ...] } (scripts/build_mountains.py)
export function routesOf(rows, mountain) {
  const out = {}
  rows.forEach((r) => { if (r.mountain === mountain) (out[r.trip] = out[r.trip] || []).push([+r.i, +r.lat, +r.lng]) })
  Object.keys(out).forEach((k) => { out[k] = out[k].sort((a, b) => a[0] - b[0]).map((p) => [p[1], p[2]]) })
  return out
}

// the trips of one mountain with their figures from the activity log
export function tripsOf(tripRows, activities, mountain) {
  const byKey = Object.fromEntries(activities.map((a) => [a.activity_key, a]))
  return tripRows.filter((t) => t.mountain === mountain).map((t) => {
    const a = byKey[t.activity_key] || {}
    return {
      trip: t.trip, key: t.activity_key, date: t.date, label: t.label, sky: t.sky, temp: t.temp_c === '' ? null : +t.temp_c, humidity: t.humidity === '' ? null : +t.humidity,
      km: +a.distance_km || 0, climb: +a.elevation_gain_m || 0, out: +a.elapsed_time_min || 0, moving: +a.moving_time_min || 0, start: (a.date || '').slice(11, 16),
    }
  }).sort((p, q) => (p.date < q.date ? -1 : 1))
}

// Uluguru: the trips to Bondwa Peak with their altitude lines, and what the
// Morogoro region adds up to in the whole record
export function buildUluguru(tripRows, profileRows, activities, geo) {
  if (!tripRows.length || !profileRows.length || !activities.length) return null
  const trips = tripsOf(tripRows, activities, 'uluguru')
  if (!trips.length) return null
  const prof = {}
  profileRows.forEach((r) => { (prof[r.trip] = prof[r.trip] || []).push({ i: +r.i, d: +r.d_km, alt: +r.alt_m }) })
  trips.forEach((t) => {
    t.profile = (prof[t.trip] || []).sort((a, b) => a.i - b.i)
    t.lo = Math.min(...t.profile.map((p) => p.alt))
    t.hi = Math.max(...t.profile.map((p) => p.alt))
    t.startAlt = t.profile.length ? t.profile[0].alt : 0
  })
  const foot = activities.filter((a) => FOOT.has(a.sport_type)).map((a) => ({ key: a.activity_key, date: a.date.slice(0, 10), sport: a.sport_type, km: +a.distance_km || 0, climb: +a.elevation_gain_m || 0, region: (geo[a.activity_key] || {}).region || '' }))
  const mor = foot.filter((a) => a.region === 'Morogoro')
  const allClimb = foot.reduce((s, a) => s + a.climb, 0)
  const top20 = [...foot].sort((a, b) => b.climb - a.climb).slice(0, 20)
  const best = [...trips].sort((a, b) => b.climb - a.climb)[0]
  return {
    trips, best,
    n: mor.length, km: mor.reduce((s, a) => s + a.km, 0), climb: mor.reduce((s, a) => s + a.climb, 0),
    share: mor.reduce((s, a) => s + a.climb, 0) / (allClimb || 1),
    inTop20: top20.filter((a) => a.region === 'Morogoro').length,
    bestIsRecord: top20.length && best && top20[0].key === best.key,
    climbs: [...mor].sort((a, b) => b.climb - a.climb).slice(0, 6),
  }
}

// Ngong Hills: one outing along the ridge, with its altitude line, and where
// its climb stands among my outings outside Tanzania
export function buildNgong(tripRows, profileRows, activities, geo) {
  if (!tripRows.length || !profileRows.length || !activities.length) return null
  const trip = tripsOf(tripRows, activities, 'ngong')[0]
  if (!trip) return null
  const pts = profileRows.map((r) => ({ i: +r.i, d: +r.d_km, alt: +r.alt_m, t: +r.t_min })).sort((a, b) => a.i - b.i)
  if (pts.length < 3) return null
  const turnI = pts.reduce((b, q, i) => (q.alt > pts[b].alt ? i : b), 0)
  const start = pts[0], turn = pts[turnI], end = pts[pts.length - 1]
  // the way back: the first point after the turn that is level with the start again
  const levelI = pts.findIndex((q, i) => i > turnI && q.alt <= start.alt)
  const level = levelI > 0 ? pts[levelI] : null
  // the biggest climb in one outing on foot, in each named country
  const best = {}
  activities.forEach((a) => {
    if (!FOOT.has(a.sport_type)) return
    const c = (geo[a.activity_key] || {}).country
    if (!c || c === 'Other') return
    const climb = +a.elevation_gain_m || 0
    if (!best[c] || climb > best[c].climb) best[c] = { country: c, climb, date: a.date.slice(0, 10), km: +a.distance_km || 0, sport: a.sport_type, key: a.activity_key }
  })
  const countries = Object.values(best).sort((a, b) => b.climb - a.climb)
  const abroad = activities.filter((a) => FOOT.has(a.sport_type) && (geo[a.activity_key] || {}).country && (geo[a.activity_key] || {}).country !== 'Tanzania')
    .map((a) => ({ key: a.activity_key, climb: +a.elevation_gain_m || 0, country: geo[a.activity_key].country, sport: a.sport_type }))
    .sort((a, b) => b.climb - a.climb)
  const foot = activities.filter((a) => FOOT.has(a.sport_type)).map((a) => ({ key: a.activity_key, climb: +a.elevation_gain_m || 0 })).sort((a, b) => b.climb - a.climb)
  return {
    trip, pts, start, turn, end, level, turnI,
    hi: turn.alt, lo: Math.min(...pts.map((q) => q.alt)),
    countries,
    abroadTop: abroad.length && abroad[0].key === trip.key,
    abroadNext: abroad.find((a) => a.key !== trip.key) || null,
    rank: foot.findIndex((a) => a.key === trip.key) + 1,
    // the most I had climbed in that country before this day
    before: Math.max(0, ...activities.filter((a) => FOOT.has(a.sport_type) && (geo[a.activity_key] || {}).country === 'Kenya' && a.date.slice(0, 10) < trip.date).map((a) => +a.elevation_gain_m || 0)),
  }
}

// The countdown before a race: on the day k days out I set out to cover k km in
// one outing, never under 5 km. Shared by Goals and the Year in Sport.
// Returns null when the three weeks before the race do not look like one.
const FOOT = ['Run', 'Walk', 'TrailRun', 'Hike']
export function buildCountdown(activities, raceISO) {
  if (!raceISO) return null
  const t0 = Date.parse(raceISO + 'T00:00:00Z')
  const KIND = (a) => (a.sport_type === 'Walk' ? 'walk' : a.sport_type === 'TrailRun' ? 'trail' : a.sport_type === 'Hike' ? 'hike' : a.trainer === 'Yes' ? 'tread' : 'road')
  const byDay = new Map()
  for (const a of activities) {
    if (!FOOT.includes(a.sport_type)) continue
    const d = (a.date || '').slice(0, 10)
    const km = Number(a.distance_km) || 0
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d).push({ km, kind: KIND(a) })
  }
  const days = []
  for (let k = 21; k >= 1; k--) {
    const iso = new Date(t0 - k * 86400000).toISOString().slice(0, 10)
    const xs = (byDay.get(iso) || []).slice().sort((p, q) => q.km - p.km)
    const tot = xs.reduce((s, x) => s + x.km, 0)
    days.push({ iso, k, target: Math.max(5, k), longest: xs.length ? xs[0].km : 0, kind: xs.length ? xs[0].kind : 'walk', rest: xs.length ? tot - xs[0].km : 0, tot })
  }
  const hits = days.filter((d) => d.longest >= d.target - 0.5).length
  if (hits < 18) return null
  const raceKm = (byDay.get(raceISO) || []).reduce((b, x) => Math.max(b, x.km), 0)
  return { days, hits, raceISO, raceKm, total: days.reduce((s, d) => s + d.tot, 0), first: days[0].iso }
}

import { toNum } from './format.js'
import { NAMED_COUNTRIES } from './geo.js'

// The handful of facts My Book opens and closes with, read from the activity log
// and the place table so the prologue, the cover and the epilogue always match
// the chapters that follow. Distance and climb are on foot only.
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const DAY = 86400000
const dayIdx = (iso) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / DAY)
const isoOf = (i) => new Date(i * DAY).toISOString().slice(0, 10)

export function buildBookFacts(activities, geo = []) {
  const acts = activities.filter((a) => a.date).slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  if (!acts.length) return null
  const firstISO = acts[0].date.slice(0, 10)
  const lastISO = acts[acts.length - 1].date.slice(0, 10)
  const first = dayIdx(firstISO), last = dayIdx(lastISO)

  const km = new Map()
  for (const a of acts) {
    const i = dayIdx(a.date)
    km.set(i, (km.get(i) || 0) + (FOOT.has(a.sport_type) ? toNum(a.distance_km) || 0 : 0))
  }
  const days = []
  for (let i = first; i <= last; i++) days.push({ i, on: km.has(i), km: km.get(i) || 0 })

  // the longest silence, and the habit that began when it ended
  const on = [...km.keys()].sort((a, b) => a - b)
  let gap = 0, gapFrom = first, gapTo = first
  for (let k = 1; k < on.length; k++) if (on[k] - on[k - 1] > gap) { gap = on[k] - on[k - 1]; gapFrom = on[k - 1]; gapTo = on[k] }
  const habit = gapTo
  const habitOn = on.filter((i) => i >= habit)
  let maxAfter = 0
  for (let k = 1; k < habitOn.length; k++) maxAfter = Math.max(maxAfter, habitOn[k] - habitOn[k - 1] - 1)
  let streak = 0
  for (let i = last; km.has(i); i--) streak++

  const footKm = acts.reduce((s, a) => s + (FOOT.has(a.sport_type) ? toNum(a.distance_km) || 0 : 0), 0)
  const footElev = acts.reduce((s, a) => s + (FOOT.has(a.sport_type) ? toNum(a.elevation_gain_m) || 0 : 0), 0)
  const hours = acts.reduce((s, a) => s + (toNum(a.moving_time_min) || 0), 0) / 60
  // only African countries are counted; anything else is folded into others
  const countries = new Set(geo.map((g) => g.country).filter((c) => NAMED_COUNTRIES.has(c))).size
  const regions = new Set(geo.filter((g) => g.country === 'Tanzania' && g.region).map((g) => g.region)).size
  const firstAct = acts[0]

  return {
    n: acts.length, firstISO, lastISO, days, footKm, footElev, hours, countries, regions,
    firstSport: firstAct.sport_type, firstKm: toNum(firstAct.distance_km) || 0,
    beforeSilence: acts.filter((a) => dayIdx(a.date) <= gapFrom).length,
    silence: { len: gap - 1, from: isoOf(gapFrom), to: isoOf(gapTo) },
    habitISO: isoOf(habit), habitDays: last - habit + 1, habitActive: habitOn.length, maxAfter, streak,
    years: (last - first + 1) / 365.25,
  }
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const SPORT_LABELS = {
  TrailRun: 'Trail Run',
  PhysicalTherapy: 'Physical Therapy',
  WeightTraining: 'Weight Training',
}

// Cycling variants are counted in every total but never named; they surface as
// a neutral label wherever a sport name would otherwise be shown.
const QUIET_SPORTS = new Set(['Ride', 'GravelRide', 'EBikeRide', 'MountainBikeRide'])

// "TrailRun" -> "Trail Run"; known compounds handled explicitly.
export function prettySport(s) {
  if (!s) return ''
  if (QUIET_SPORTS.has(s)) return 'Other activity'
  if (SPORT_LABELS[s]) return SPORT_LABELS[s]
  return String(s).replace(/([a-z])([A-Z])/g, '$1 $2')
}

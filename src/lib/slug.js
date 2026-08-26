export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const SPORT_LABELS = {
  EBikeRide: 'E-Bike Ride',
  MountainBikeRide: 'Mountain Bike Ride',
  GravelRide: 'Gravel Ride',
  TrailRun: 'Trail Run',
  PhysicalTherapy: 'Physical Therapy',
  WeightTraining: 'Weight Training',
}

// "GravelRide" -> "Gravel Ride"; known compounds handled explicitly.
export function prettySport(s) {
  if (!s) return ''
  if (SPORT_LABELS[s]) return SPORT_LABELS[s]
  return String(s).replace(/([a-z])([A-Z])/g, '$1 $2')
}

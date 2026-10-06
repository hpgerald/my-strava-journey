export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Only the four foot sports are ever named. Everything else the log holds
// (rides, workouts, physio, golf, canoe and the rest) is counted in every total
// but folded into a single neutral "Other activities" label wherever a sport
// name would otherwise appear.
const FOOT_LABELS = {
  Run: 'Run',
  Walk: 'Walk',
  TrailRun: 'Trail Run',
  Hike: 'Hike',
}
export const OTHER_LABEL = 'Other activities'

// A foot sport returns its clean name; anything else returns OTHER_LABEL.
export function prettySport(s) {
  if (!s) return ''
  return FOOT_LABELS[s] || OTHER_LABEL
}

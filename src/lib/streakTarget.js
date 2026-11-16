// The streak targets. The first was a whole calendar year without a zero day,
// 2026; after it the targets go up in odd numbers of calendar years: three
// (2026 to 2028), then five. Everything here is read from the log, so the pages
// change at the first refresh after a target is reached.
export const FIRST_TARGET = '2026-12-31'
export const NEXT_TARGET = '2028-12-31'
const DAY = 864e5
const isoOf = (t) => new Date(t).toISOString().slice(0, 10)

// days: the dates with an outing (any iterable of ISO dates)
export function streakGoal(days) {
  const set = days instanceof Set ? days : new Set(days)
  const last = [...set].sort().pop() || ''
  let full = last >= FIRST_TARGET
  if (full) for (let t = Date.parse('2026-01-01T00:00:00Z'); t <= Date.parse(FIRST_TARGET + 'T00:00:00Z'); t += DAY) if (!set.has(isoOf(t))) { full = false; break }
  return { met: full, last, first: FIRST_TARGET, next: NEXT_TARGET }
}
// "so far" only while the year is still running
export const soFar = (text, running) => (running ? text : String(text).replace(/ so far/g, ''))

import PlaceMap from './PlaceMap.jsx'

// One map of Tanzania's regions, shaded by each region's share of my outings
// there or of my climbing there. Two of them side by side show where I go out
// and where I go up. The three biggest regions are named on the map.
// props: rows [{ region, n, elev }], measure 'n' | 'elev', aria, maxHeight
const NUDGE = { 'Dar es Salaam': [0.07, -0.02], Kilimanjaro: [0.06, -0.03], Arusha: [-0.04, -0.04], Pwani: [0.05, 0.06], Tanga: [0.05, -0.02] }
const pct = (v) => (v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%`)

export function tzShares(rows) {
  const totN = rows.reduce((t, r) => t + (r.n || 0), 0) || 1
  const totE = rows.reduce((t, r) => t + (r.elev || 0), 0) || 1
  return rows.map((r) => ({ region: r.region, n: (100 * (r.n || 0)) / totN, elev: (100 * (r.elev || 0)) / totE }))
}

export default function TzShare({ rows, measure = 'n', aria, maxHeight = 380 }) {
  const sh = tzShares(rows)
  const values = Object.fromEntries(sh.map((r) => [r.region, { [measure]: r[measure] }]))
  const top = sh.filter((r) => r[measure] > 0).sort((a, b) => b[measure] - a[measure]).slice(0, 3).map((r) => r.region)
  const metric = measure === 'n'
    ? { key: 'n', label: 'Outings', unit: 'of the outings', fmt: pct }
    : { key: 'elev', label: 'Climb', unit: 'of the climbing', fmt: pct }
  return (
    <PlaceMap src="data/tz_regions.geojson" nameKey="region" values={values} metrics={[metric]}
      labels={top} nudge={NUDGE} maxHeight={maxHeight} aria={aria} />
  )
}

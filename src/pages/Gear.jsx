import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import Figure from '../charts/Figure.jsx'
import FleetPrints from '../charts/FleetPrints.jsx'
import ShoeRelay from '../charts/ShoeRelay.jsx'
import ShoePersonality from '../charts/ShoePersonality.jsx'
import BurnRate from '../charts/BurnRate.jsx'
import OnePairEra from '../charts/OnePairEra.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const FOOT_TRAIL = new Set(['TrailRun', 'Hike'])
const dayGap = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
const median = (arr) => {
  const s = [...arr].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

export default function Gear() {
  const gear = useTable('gear')
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/gear')

  const shoes = gear.filter((g) => /shoe/i.test(g.type))
  const active = gear.filter((g) => /no/i.test(g.retired))
  const logged = gear.reduce((a, g) => a + (toNum(g.distance_in_log_km) || 0), 0)

  // ---- per-pair stats from the activity log ----
  const stat = {}
  for (const a of activities) {
    const gid = a.gear_id
    if (!gid) continue
    const s = (stat[gid] ||= { acts: 0, km: 0, elev: 0, first: null, last: null, trail: 0, road: 0, paces: [] })
    const km = toNum(a.distance_km) || 0
    const d = (a.date || '').slice(0, 10)
    s.acts += 1; s.km += km; s.elev += toNum(a.elevation_gain_m) || 0
    if (!s.first || d < s.first) s.first = d
    if (!s.last || d > s.last) s.last = d
    if (FOOT_TRAIL.has(a.sport_type)) s.trail += km
    else s.road += km
    if (km > 0.5) s.paces.push((toNum(a.moving_time_min) || 0) / km)
  }

  const shoesData = gear.map((g) => {
    const s = stat[g.gear_id]
    if (!s || !s.first) return null
    const life = dayGap(s.first, s.last) + 1
    return {
      gid: g.gear_id, model: g.model, brand: g.brand, retired: !/no/i.test(g.retired),
      km: s.km, acts: s.acts, first: s.first, last: s.last, life,
      kmMo: s.km / (life / 30.44), steep: s.elev / (s.km || 1), pace: median(s.paces),
      trailPct: (100 * s.trail) / ((s.road + s.trail) || 1), elev: s.elev,
    }
  }).filter(Boolean)

  // ---- the relay: greedy handoff. A pair is the next primary if it debuts at or
  //      after the reigning pair's last day; otherwise it is an overlapping cameo.
  const byFirst = [...shoesData].sort((a, b) => (a.first < b.first ? -1 : 1))
  const primaries = []
  const cameos = []
  let tail = null
  for (const sh of byFirst) {
    if (!tail || sh.first >= tail.last) { primaries.push(sh); tail = sh }
    else cameos.push(sh)
  }
  const start = byFirst[0]?.first
  const end = shoesData.reduce((mx, s) => (s.last > mx ? s.last : mx), byFirst[0]?.last || '')
  primaries.forEach((p, i) => {
    p.reignStart = p.first
    p.reignEnd = i + 1 < primaries.length ? primaries[i + 1].first : end
  })
  const handoffs = primaries.slice(1).map((p, i) => dayGap(primaries[i].last, p.first))
  const cleanHandoffs = handoffs.filter((g) => g >= 0 && g <= 3).length

  // ---- one pair, one era: cumulative km over life for two telling shoes ----
  const monByGid = {}
  for (const a of activities) {
    const gid = a.gear_id; if (!gid) continue
    const mo = (a.date || '').slice(0, 7); if (!/^\d{4}-\d{2}$/.test(mo)) continue
    ;(monByGid[gid] = monByGid[gid] || {})[mo] = (monByGid[gid][mo] || 0) + (toNum(a.distance_km) || 0)
  }
  const buildMonthly = (gid) => {
    const mm = monByGid[gid] || {}
    let cum = 0
    return Object.keys(mm).sort().map((k) => { cum += mm[k]; return { month: k, cum } })
  }
  const PAIR_NOTE = {
    'Lunarglide 7': 'The pair that caught the switch. Most of its kilometres came in the first explosive years, almost all on the road.',
  }
  const makePair = (sh, role) => sh ? {
    ...sh, role, monthly: buildMonthly(sh.gid),
    note: PAIR_NOTE[sh.model] || `${sh.retired ? 'Retired' : 'Still in rotation'} after ${Math.round(sh.km)} km, mostly on the ${sh.trailPct >= 50 ? 'trail' : 'road'}.`,
  } : null
  const workhorse = [...shoesData].sort((a, b) => b.km - a.km)[0]
  const current = [...shoesData].filter((s) => !s.retired).sort((a, b) => b.km - a.km)[0]
  const eraPairs = [
    makePair(workhorse, 'The workhorse'),
    makePair(current && workhorse && current.gid !== workhorse.gid ? current : null, 'On rotation now'),
  ].filter(Boolean)

  // ---- personalities: pace x steepness, sized by distance ----
  const personality = [...shoesData].filter((s) => s.pace > 0).map((s) => ({
    model: s.model, pace: s.pace, steep: s.steep, km: s.km, trail: s.trailPct >= 50, trailPct: s.trailPct,
  }))
  const goat = personality.reduce((b, s) => (s.steep > b.steep ? s : b), personality[0] || { steep: 0, model: '' })

  // ---- burn rate: km per month of life, fastest first ----
  const burn = [...shoesData].sort((a, b) => b.kmMo - a.kmMo)
  const sprinter = burn[0] || { model: '', kmMo: 0 }
  const slow = burn[burn.length - 1] || { model: '', kmMo: 0 }

  // ---- tread strips: the fleet by distance, top six ----
  const treadRows = [...shoesData].sort((a, b) => b.km - a.km).slice(0, 6).map((s) => ({
    label: `${s.brand} ${s.model}`, km: s.km, display: fmtNum(s.km, 0), trail: s.trailPct >= 50, current: !s.retired,
  }))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Gear' }]}
      number="07"
      title="Gear"
      subtitle="Eleven pairs, and how they were worn."
      lede={`Eleven pairs, and almost never two doing the real work at once. One lead pair carries the load until it wears out, then hands straight off to the next within a day, clean ${cleanHandoffs} times out of ${handoffs.length}. One pair alone covered over a thousand kilometres. Some were burned through in a single season, others nursed along for years, and each still wears its job in how fast and how steeply it ran.`}
      prev={prev}
      next={next}
    >
      <section aria-label="Gear totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--3">
          <StatCard value={String(shoes.length)} label="Pairs on record" source="Gear" />
          <StatCard value={fmtNum(logged, 0)} unit=" km" label="Logged in these shoes" source="Gear" />
          <StatCard value={String(active.length)} label="Still in rotation" source="Gear" />
        </div>
      </section>

      {/* The relay */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="01"
          title="The baton never drops"
          note={`Every pair that ever led the rotation, laid end to end. One shoe reigns at a time, the number inside its bar the kilometres it carried, and a baton dot marks each handoff, almost always within a day of the last pair retiring. The Lunarglide 7 held the baton longest, over 500 days. The specialists below, a stray backup, the dedicated trail pairs, only ever came off the bench. Lately the single-driver relay has broken into a three-pair rotation running at once.`}
          source="Activity Log + Gear"
          tableCaption="Each primary pair's reign and the distance it carried"
          columns={['Pair', 'Reign', 'km']}
          rows={primaries.map((p) => [p.model, `${p.reignStart} to ${p.reignEnd}`, fmtNum(p.km, 0)])}
        >
          <ShoeRelay primaries={primaries} cameos={cameos} start={start} end={end} />
        </Figure>
      </section>

      {/* Shoe personalities */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="02"
          title="Every shoe has a character"
          note={`Every pair stands on the pace line, quick on the left and a walker's amble on the right, then rises to how steeply it climbs, a metre of ascent for every kilometre. The road trainers keep low and level, the Lunarglide 5 and Pegasus 37 pure speed on the flat. The trail pairs spike up like mountains, and the ${goat.model.replace(/\s*\(.*\)$/, '')} towers over the whole fleet at over 40 metres of climb per kilometre. Notice the Pegasus Trail climbs as steeply as the far slower Zegama, five minutes a kilometre quicker up the same gradient. Head size is total distance.`}
          source="Activity Log + Gear"
          tableCaption="Median pace, steepness and distance by pair"
          columns={['Pair', 'Pace /km', 'm per km', 'km']}
          rows={[...personality].sort((a, b) => b.steep - a.steep).map((p) => [
            p.model, `${Math.floor(p.pace)}:${String(Math.round((p.pace - Math.floor(p.pace)) * 60)).padStart(2, '0')}`, String(Math.round(p.steep)), fmtNum(p.km, 0)])}
        >
          <ShoePersonality points={personality} />
        </Figure>
      </section>

      {/* Burn rate */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="03"
          title="Sprinters and slow-burners"
          note={`How fast each pair was used up, in kilometres run per month of its life. The spread is enormous. The ${sprinter.model.replace(/\s*\(.*\)$/, '')} was a sprinter, torn through at ${fmtInt(sprinter.kmMo)} km a month, essentially the only shoe worn for that stretch. The ${slow.model.replace(/\s*\(.*\)$/, '')} was the opposite, sipped at ${fmtInt(slow.kmMo)} km a month across its whole life. A hollow dot marks a pair still in rotation.`}
          source="Activity Log + Gear"
          tableCaption="Kilometres per month of life, by pair"
          columns={['Pair', 'km / month', 'Total km']}
          rows={burn.map((r) => [r.model, fmtInt(r.kmMo), fmtNum(r.km, 0)])}
        >
          <BurnRate rows={burn} />
        </Figure>
      </section>

      {/* The fleet by distance */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="04"
          title="The fleet, in footprints"
          note="The six most-worn pairs, each laid out in footprints, one for every 200 kilometres run in it. The Lunarglide 7 leaves the longest trail by far, and carries the accent as the workhorse of the fleet; a ring marks the pairs still in rotation."
          source="Activity Log + Gear"
          tableCaption="Distance logged in the six most-worn pairs"
          columns={['Pair', 'km', 'Terrain']}
          rows={treadRows.map((r) => [r.label, r.display, r.trail ? 'Trail' : 'Road'])}
        >
          <FleetPrints rows={treadRows} />
        </Figure>
      </section>

      {/* One pair, one era */}
      {eraPairs.length > 0 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <div className="section-head">
            <p className="eyebrow">One pair, one era</p>
            <h2 className="section-head__title" style={{ fontSize: 'var(--fs-lg)' }}>
              Two pairs, read closely.
            </h2>
          </div>
          <div className="grid grid--2" style={{ gap: 'var(--sp-5)', paddingTop: 'var(--sp-2)' }}>
            {eraPairs.map((p) => <OnePairEra key={p.gid} pair={p} />)}
          </div>
          <p className="source" style={{ marginTop: 'var(--sp-4)' }}>Source: Activity Log + Gear</p>
        </section>
      )}
    </DetailFrame>
  )
}

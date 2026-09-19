import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import Figure from '../charts/Figure.jsx'
import TerrainAxis from '../charts/TerrainAxis.jsx'
import GhostMiles from '../charts/GhostMiles.jsx'
import TreadWear from '../charts/TreadWear.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

export default function Gear() {
  const gear = useTable('gear')
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/gear')

  const shoes = gear.filter((g) => /shoe/i.test(g.type))
  const active = gear.filter((g) => /no/i.test(g.retired))
  const logged = gear.reduce((a, g) => a + (toNum(g.distance_in_log_km) || 0), 0)

  // terrain split per pair, from the activity log
  const byGear = {}
  for (const a of activities) {
    const id = a.gear_id
    if (!id) continue
    const rec = (byGear[id] ||= { road: 0, trail: 0 })
    const km = toNum(a.distance_km) || 0
    if (a.sport_type === 'TrailRun' || a.sport_type === 'Hike') rec.trail += km
    else rec.road += km
  }
  const trailPctOf = (g) => {
    const rec = byGear[g.gear_id] || { road: 0, trail: 0 }
    return (100 * rec.trail) / ((rec.road + rec.trail) || 1)
  }

  // Curated, not exhaustive: each visual gets only the pairs that carry its story.

  // 1. the workhorses: top pairs by distance logged, as worn tread strips
  const byDist = [...gear]
    .filter((g) => toNum(g.distance_in_log_km) > 0)
    .sort((a, b) => toNum(b.distance_in_log_km) - toNum(a.distance_in_log_km))
  const treadRows = byDist.slice(0, 6).map((g) => ({
    label: `${g.brand} ${g.model}`,
    km: toNum(g.distance_in_log_km),
    display: fmtNum(g.distance_in_log_km, 0),
    trail: trailPctOf(g) >= 50,
    current: /no/i.test(g.retired),
  }))

  // 2. the trail spectrum: the three "Trail"-named pairs, plus the two biggest
  //    road pairs as anchors, so the impostor stands out among company it keeps
  const isNamedTrail = (g) => /trail/i.test(`${g.model} ${g.type}`)
  const trailNamed = gear.filter((g) => isNamedTrail(g) && toNum(g.distance_in_log_km) > 0)
  const roadAnchors = byDist.filter((g) => !isNamedTrail(g)).slice(0, 2)
  const terrainRows = [...trailNamed, ...roadAnchors].map((g) => ({
    label: g.model,
    trailPct: trailPctOf(g),
    km: toNum(g.distance_in_log_km),
    named: isNamedTrail(g),
  }))

  // 3. ghost miles: only pairs that ran a real life before the log (hidden > 50 km)
  const ghostRows = [...gear]
    .map((g) => ({
      label: g.model,
      logged: toNum(g.distance_in_log_km),
      hidden: Math.max(0, toNum(g.strava_total_km) - toNum(g.distance_in_log_km)),
    }))
    .filter((r) => r.hidden > 50)
    .sort((a, b) => (b.logged + b.hidden) - (a.logged + a.hidden))
  const totalHidden = gear.reduce((s, g) => s + Math.max(0, toNum(g.strava_total_km) - toNum(g.distance_in_log_km)), 0)
  const topGhost = ghostRows.reduce((best, r) => (r.hidden > best.hidden ? r : best), ghostRows[0] || { hidden: 0, logged: 0, label: '' })

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Gear' }]}
      number="07"
      title="Gear"
      subtitle="Eleven pairs. The miles in each."
      lede="Eleven pairs on record since late 2021, and they give themselves away. The Lunarglide 7 is the workhorse at 1,778 km. The Lunarglide 6 reads 2,495 km on Strava but only 25 here: it did its living before this log began. And the Zegama Trail, for all its name, spent 618 of its 697 km on the road."
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

      {/* Tread wear: the signature gear metaphor */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="01"
          title="The six that did the miles"
          note="The six most-worn pairs, each drawn as a strip of outsole tread the length of the distance run in it. The Lunarglide 7 is the long workhorse, past 1,700 km on its own and picked out in accent; a filled dot marks the pairs still in rotation. On the most-used soles the heel lugs fade toward the heel, the way real tread wears smooth. The other five pairs sit further down the log and are left off here."
          source="Activity Log + Gear"
          tableCaption="Distance logged in the six most-worn pairs"
          columns={['Pair', 'km', 'Terrain']}
          rows={treadRows.map((r) => [r.label, r.display, r.trail ? 'Trail' : 'Road'])}
        >
          <TreadWear rows={treadRows} />
        </Figure>
      </section>

      {/* Road-to-trail spectrum */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="02"
          title="Three shoes named Trail"
          note="The three pairs with Trail in their name (orange), placed on a line from all-road to all-trail by the share of distance that actually went off-road, with the two biggest road trainers dropped in for scale. Two of the trail shoes sit where you would expect, out on the right. The Zegama Trail does not: it ran nearly nine-tenths of its life on tarmac, marooned among the road pairs. Bubble size is distance."
          source="Activity Log + Gear"
          tableCaption="Off-road share of the trail-named pairs and two road anchors"
          columns={['Pair', 'Trail share', 'km']}
          rows={[...terrainRows].sort((a, b) => b.trailPct - a.trailPct).map((d) => [d.label, `${Math.round(d.trailPct)}%`, fmtNum(d.km, 0)])}
        >
          <TerrainAxis rows={terrainRows} />
        </Figure>
      </section>

      {/* Ghost miles: the hidden life before the log */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="03"
          title="The miles you never see"
          note={`Only the four pairs that lived a life before this log begins. Above the waterline is what the record actually watched them run; below it, submerged and faint, are the earlier miles, worked out from Strava's lifetime odometer. The ${topGhost.label} is almost all iceberg: ${fmtInt(topGhost.logged)} km on the surface, ${fmtInt(topGhost.hidden)} beneath. Across every pair, ${fmtInt(totalHidden)} km ran their course before this history could see them.`}
          source="Gear"
          tableCaption="Distance logged here versus earlier, hidden miles"
          columns={['Pair', 'In this log km', 'Hidden km']}
          rows={ghostRows.map((d) => [d.label, fmtNum(d.logged, 0), fmtNum(d.hidden, 0)])}
        >
          <GhostMiles rows={ghostRows} />
          <div className="chart-legend" style={{ marginTop: 'var(--sp-4)' }}>
            <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> logged in this record</span>
            <span><i className="chart-swatch" style={{ background: 'var(--grey-35)' }} /> hidden, before it</span>
          </div>
        </Figure>
        <p className="source" style={{ marginTop: 'var(--sp-3)' }}>
          Source: Gear. Strava&rsquo;s lifetime odometer may include activities from before this account&rsquo;s earliest
          pulled activity; shoes are linked to activities from late 2021 on, so earlier miles sit below the line.
        </p>
      </section>
    </DetailFrame>
  )
}

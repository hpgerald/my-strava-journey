import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import DataTable from '../components/DataTable.jsx'
import Figure from '../charts/Figure.jsx'
import BarChart from '../charts/BarChart.jsx'
import Dumbbell from '../charts/Dumbbell.jsx'
import GearTimeline from '../charts/GearTimeline.jsx'
import TerrainMix from '../charts/TerrainMix.jsx'
import TreadWear from '../charts/TreadWear.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parseDay = (s) => new Date(`${(s || '').slice(0, 10)}T00:00:00Z`)
const fmtMon = (s) => {
  const d = parseDay(s)
  return `${MON[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`
}

export default function Gear() {
  const gear = useTable('gear')
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/gear')

  const shoes = gear.filter((g) => /shoe/i.test(g.type))
  const active = gear.filter((g) => /no/i.test(g.retired))
  const logged = gear.reduce((a, g) => a + (toNum(g.distance_in_log_km) || 0), 0)

  // link activities to each pair of shoes: first/last day worn, and terrain split
  const byGear = {}
  for (const a of activities) {
    const id = a.gear_id
    if (!id) continue
    const rec = (byGear[id] ||= { first: null, last: null, road: 0, trail: 0 })
    const day = (a.date || '').slice(0, 10)
    if (day) {
      if (!rec.first || day < rec.first) rec.first = day
      if (!rec.last || day > rec.last) rec.last = day
    }
    const km = toNum(a.distance_km) || 0
    if (a.sport_type === 'TrailRun' || a.sport_type === 'Hike') rec.trail += km
    else rec.road += km
  }

  // timeline span across all tracked shoes
  const firsts = Object.values(byGear).map((r) => r.first).filter(Boolean)
  const lasts = Object.values(byGear).map((r) => r.last).filter(Boolean)
  const spanStart = firsts.sort()[0]
  const spanEnd = lasts.sort()[lasts.length - 1]
  const t0 = parseDay(spanStart).getTime()
  const t1 = parseDay(spanEnd).getTime()
  const frac = (day) => (parseDay(day).getTime() - t0) / (t1 - t0)

  const yearTicks = []
  for (let y = parseDay(spanStart).getUTCFullYear() + 1; y <= parseDay(spanEnd).getUTCFullYear(); y++) {
    yearTicks.push({ label: String(y), frac: frac(`${y}-01-01`) })
  }

  // rotation timeline rows, ordered by when each pair first appears
  const timeline = gear
    .map((g) => {
      const rec = byGear[g.gear_id]
      if (!rec || !rec.first) return null
      const trail = rec.trail > rec.road
      return {
        label: `${g.brand} ${g.model}`,
        sub: `${fmtNum(g.distance_in_log_km, 0)} km · ${fmtMon(rec.first)}–${/no/i.test(g.retired) ? 'now' : fmtMon(rec.last)}`,
        startFrac: frac(rec.first),
        endFrac: /no/i.test(g.retired) ? 1 : frac(rec.last),
        current: /no/i.test(g.retired),
        trail,
        _first: rec.first,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a._first < b._first ? -1 : 1))

  // how far each pair carried, within this log
  const byLog = [...gear]
    .filter((g) => toNum(g.distance_in_log_km) > 0)
    .sort((a, b) => toNum(b.distance_in_log_km) - toNum(a.distance_in_log_km))
    .map((g) => ({
      label: `${g.brand} ${g.model}`,
      value: toNum(g.distance_in_log_km),
      display: fmtNum(g.distance_in_log_km, 0),
      unit: 'km',
    }))

  // road vs trail, same order as distance
  const terrain = [...gear]
    .filter((g) => toNum(g.distance_in_log_km) > 0)
    .sort((a, b) => toNum(b.distance_in_log_km) - toNum(a.distance_in_log_km))
    .map((g) => {
      const rec = byGear[g.gear_id] || { road: 0, trail: 0 }
      const tot = rec.road + rec.trail || 1
      return { label: `${g.brand} ${g.model}`, roadPct: (rec.road / tot) * 100, trailPct: (rec.trail / tot) * 100 }
    })

  // odometer vs logged-here: the gap is kit that carried miles before this log
  const gap = [...gear]
    .sort((a, b) => toNum(b.strava_total_km) - toNum(a.strava_total_km))
    .filter((g) => toNum(g.strava_total_km) > 0)
    .slice(0, 8)
    .map((g) => ({
      label: `${g.brand} ${g.model}`,
      a: toNum(g.distance_in_log_km),
      b: toNum(g.strava_total_km),
      aDisplay: fmtNum(g.distance_in_log_km, 0),
      bDisplay: fmtNum(g.strava_total_km, 0),
    }))

  // tread-wear rows: every pair with logged distance, longest-worn first
  const treadRows = [...gear]
    .filter((g) => toNum(g.distance_in_log_km) > 0)
    .sort((a, b) => toNum(b.distance_in_log_km) - toNum(a.distance_in_log_km))
    .map((g) => {
      const rec = byGear[g.gear_id] || { road: 0, trail: 0 }
      return {
        label: `${g.brand} ${g.model}`,
        km: toNum(g.distance_in_log_km),
        display: fmtNum(g.distance_in_log_km, 0),
        trail: rec.trail > rec.road,
        current: /no/i.test(g.retired),
      }
    })

  const sorted = [...gear].sort((a, b) => toNum(b.strava_total_km) - toNum(a.strava_total_km))

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
          title="The tread, worn in by the miles"
          note="Each pair as a strip of outsole tread, its length the distance logged in it. The Lunarglide 7 is the long, worn workhorse; trail shoes carry the accent, and a filled dot marks the pairs still in rotation. On the most-used soles the heel lugs fade, the way real tread wears smooth."
          source="Activity Log + Gear"
          tableCaption="Distance logged in each pair"
          columns={['Pair', 'km', 'Terrain']}
          rows={treadRows.map((r) => [r.label, r.display, r.trail ? 'Trail' : 'Road'])}
        >
          <TreadWear rows={treadRows} />
        </Figure>
      </section>

      {/* The rotation timeline */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="The rotation, pair by pair"
          note="Each bar runs from the first day a pair shows up in the log to the last. Read down the column and it plays like a relay: the Lunarglide 7 carried the big middle years, a road pair and a trail pair often overlap, and three pairs are still in rotation now. Trail shoes are marked."
          source="Activity Log + Gear"
          tableCaption="First and last logged use of each pair of shoes"
          columns={['Pair', 'In the log', 'Terrain']}
          rows={timeline.map((r) => [r.label, r.sub, r.trail ? 'Trail' : 'Road'])}
        >
          <GearTimeline rows={timeline} yearTicks={yearTicks} />
          <div className="chart-legend" style={{ marginTop: 'var(--sp-4)' }}>
            <span><i className="chart-swatch" style={{ background: 'var(--grey-45)' }} /> road pair</span>
            <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> trail pair</span>
            <span><i className="chart-swatch" style={{ background: 'var(--ink)', borderRadius: '50%' }} /> still worn</span>
          </div>
        </Figure>
      </section>

      {/* Distance + terrain, side by side */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="How far each pair carried"
            note="Distance logged within this history. The Lunarglide 7 is the clear workhorse, past 1,700 km on its own."
            source="Gear"
            columns={['Pair', 'km']}
            rows={byLog.map((d) => [d.label, d.display])}
          >
            <BarChart data={byLog} accent showRank />
          </Figure>
          <Figure
            title="Road, trail, or both"
            note="Where each pair actually went. Most are road trainers; only two are dedicated trail shoes, and the Zegama Trail, despite its name, spent most of its life on the road."
            source="Activity Log + Gear"
            tableCaption="Share of each pair's distance on road versus trail"
            columns={['Pair', 'Road %', 'Trail %']}
            rows={terrain.map((d) => [d.label, `${Math.round(d.roadPct)}%`, `${Math.round(d.trailPct)}%`])}
          >
            <TerrainMix rows={terrain} />
          </Figure>
        </div>
      </section>

      {/* Odometer vs logged */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Odometer vs logged here"
          note="Strava's lifetime total for each pair against what shows up in this log. A wide gap, like the Lunarglide 6 with its 2,495 km odometer but only 25 km here, means the pair did most of its work before this record begins."
          source="Gear"
          columns={['Pair', 'Logged here km', 'Strava lifetime km']}
          rows={gap.map((d) => [d.label, d.aDisplay, d.bDisplay])}
        >
          <Dumbbell data={gap} unit="km" />
        </Figure>
      </section>

      {/* Full table */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
          Every pair
        </p>
        <DataTable
          fit
          caption="Gear by Strava lifetime distance"
          columns={[
            { key: 'brand', label: 'Brand' },
            { key: 'model', label: 'Model' },
            { key: 'type', label: 'Type' },
            { key: 'retired', label: 'Retired' },
            { key: 'strava_total_km', label: 'Strava total km', align: 'right', mono: true, render: (r) => fmtNum(r.strava_total_km, 0) },
            { key: 'distance_in_log_km', label: 'In log km', align: 'right', mono: true, render: (r) => fmtNum(r.distance_in_log_km, 0) },
          ]}
          rows={sorted}
        />
        <p className="source" style={{ marginTop: 'var(--sp-3)' }}>
          Source: Gear. Strava total is the pair's all-time odometer and may include activities from before this
          account's earliest pulled activity. Shoes are linked to activities from late 2021 on, so earlier miles are
          uncredited.
        </p>
      </section>
    </DetailFrame>
  )
}

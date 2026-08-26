import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import DataTable from '../components/DataTable.jsx'
import Figure from '../charts/Figure.jsx'
import BarChart from '../charts/BarChart.jsx'
import Dumbbell from '../charts/Dumbbell.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtNum, toNum } from '../lib/format.js'

export default function Gear() {
  const gear = useTable('gear')
  const { prev, next } = useSectionPaging('/gear')

  const shoes = gear.filter((g) => /shoe/i.test(g.type))
  const retired = gear.filter((g) => /yes/i.test(g.retired))
  const logged = gear.reduce((a, g) => a + (toNum(g.distance_in_log_km) || 0), 0)

  const sorted = [...gear].sort((a, b) => toNum(b.strava_total_km) - toNum(a.strava_total_km))

  const byLog = [...gear]
    .sort((a, b) => toNum(b.distance_in_log_km) - toNum(a.distance_in_log_km))
    .filter((g) => toNum(g.distance_in_log_km) > 0)
    .slice(0, 8)
    .map((g) => ({
      label: `${g.brand} ${g.model}`,
      value: toNum(g.distance_in_log_km),
      display: fmtNum(g.distance_in_log_km, 0),
      unit: 'km',
    }))

  // odometer vs logged-here: the gap shows kit that carried miles before this log
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

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Gear' }]}
      number="07"
      title="Gear"
      subtitle="The shoes and bikes that did the work"
      lede="Every pair of shoes and every bike that took a share of the distance. Each one shows two numbers: Strava's own lifetime odometer for the item, and the distance actually logged here."
      prev={prev}
      next={next}
    >
      <section aria-label="Gear totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--3">
          <StatCard value={String(shoes.length)} label="Pairs of shoes" source="Gear" />
          <StatCard value={String(retired.length)} label="Items retired" source="Gear" />
          <StatCard value={fmtNum(logged, 0)} unit="km" label="Distance in this log" source="Gear" />
        </div>
      </section>

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Distance logged here (km)"
            note="How far each item actually carried within this history. The most-used shoes stand out."
            source="Gear"
            columns={['Item', 'km']}
            rows={byLog.map((d) => [d.label, d.display])}
          >
            <BarChart data={byLog} accent showRank />
          </Figure>
          <Figure
            title="Odometer vs logged here"
            note="Strava's lifetime total for each item against what shows up in this log. A wide gap means the kit carried plenty of miles before this record starts."
            source="Gear"
            columns={['Item', 'Logged here km', 'Strava lifetime km']}
            rows={gap.map((d) => [d.label, d.aDisplay, d.bDisplay])}
          >
            <Dumbbell data={gap} unit="km" />
          </Figure>
        </div>
      </section>

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
          Shoes &amp; bikes
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
          Source: Gear. Strava total is the item's all-time odometer and may include activities
          from before this account's earliest pulled activity.
        </p>
      </section>
    </DetailFrame>
  )
}

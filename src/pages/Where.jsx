import { Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import Figure from '../charts/Figure.jsx'
import Choropleth from '../charts/Choropleth.jsx'
import ProportionBar from '../charts/ProportionBar.jsx'
import EquatorArc from '../charts/EquatorArc.jsx'
import TerrainLand from '../charts/TerrainLand.jsx'
import RankSize from '../charts/RankSize.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { slugify } from '../lib/slug.js'
import { NAMED_COUNTRIES } from '../lib/geo.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

export default function Where() {
  const countries = useTable('countries')
  const regions = useTable('tanzania_regions')
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/where')

  // total distance covered on foot, for the equator arc
  const FOOT_W = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
  const footKm = activities.reduce((s, a) => (FOOT_W.has(a.sport_type) ? s + (toNum(a.distance_km) || 0) : s), 0)

  const realCountries = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS')
  const indoor = countries.find((c) => c.country === 'Indoor / no GPS') || {}
  const homeRegion = regions[0] || {}

  // name only the five; everything else folds into one unlinked "Other" segment
  const countrySegments = [...realCountries]
    .filter((c) => NAMED_COUNTRIES.has(c.country))
    .sort((a, b) => toNum(b.activities) - toNum(a.activities))
    .map((c) => ({
      label: c.country,
      value: toNum(c.activities),
      display: fmtInt(c.activities),
      to: `/where/${slugify(c.country)}`,
    }))
  const restCountries = realCountries.filter((c) => !NAMED_COUNTRIES.has(c.country))
  if (restCountries.length) {
    const otherN = restCountries.reduce((s, c) => s + toNum(c.activities), 0)
    countrySegments.push({ label: 'Other', value: otherN, display: fmtInt(otherN) })
  }

  const regionRows = [...regions]
    .sort((a, b) => toNum(b.activities) - toNum(a.activities))
  const regionMax = Math.max(1, ...regionRows.map((r) => toNum(r.activities) || 0))

  // rank-size: every region ranked by activity count, for the power-law plot
  const rankItems = regionRows
    .map((r) => ({ label: r.region, value: toNum(r.activities) || 0 }))
    .filter((d) => d.value > 0)
  const rankTotal = rankItems.reduce((s, d) => s + d.value, 0) || 1
  const topRegionShare = Math.round((100 * (rankItems[0]?.value || 0)) / rankTotal)
  const top3Share = Math.round((100 * rankItems.slice(0, 3).reduce((s, d) => s + d.value, 0)) / rankTotal)

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Where' }]}
      number="05"
      title="Where"
      subtitle="Seven countries. Seventeen regions."
      lede={`${homeRegion.region || 'Dodoma'} is dead flat, and it holds more of this record than anywhere else: thousands of kilometres that give back almost no climb at all. The vertical is hoarded somewhere else entirely. The Kilimanjaro region, barely a tenth of the activities, owns more than a third of every metre ever gained. Home is where the distance lives. The mountains keep the climb.`}
      prev={prev}
      next={next}
    >
      <section aria-label="Geography totals" style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--3">
          <StatCard value={fmtInt(realCountries.length)} label="Countries logged" source="Strava GPS" />
          <StatCard value={fmtInt(regions.length)} label="Tanzanian regions" source="Strava GPS" />
          <StatCard
            value={fmtInt(indoor.activities)}
            label="Indoor / no GPS"
            note="Treadmill and trainer sessions, not placed on any map."
            source="Strava GPS"
          />
        </div>
      </section>

      {/* Distance against the planet */}
      {footKm > 0 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="01"
            title="A third of the way around the Earth"
            note={`All the ground covered on foot, laid against the length of the equator. ${fmtInt(footKm)} kilometres of running, walking and hiking is very nearly a third of the way around the planet, or more than three times the length of Tanzania's own border, most of it looped through a handful of home regions.`}
            source="Activity Log"
            tableCaption="Foot distance against the equator and Tanzania's border"
            columns={['Measure', 'Value']}
            rows={[
              ['Distance on foot', `${fmtInt(footKm)} km`],
              ['Length of the equator', '40,075 km'],
              ['Share of the equator', `${((footKm / 40075) * 100).toFixed(0)}%`],
              ['Times around Tanzania border', fmtNum(footKm / 3861, 1)],
            ]}
          >
            <EquatorArc km={footKm} equatorKm={40075} borderKm={3861} />
          </Figure>
        </section>
      )}

      {/* Signature: the ground underfoot, as a range of hills */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>What ground shaped the training?</p>
        <Figure
          title="Flat at home, steep away"
          note="Every region is a hill. Its height is how steep the ground there is, metres of climb for each kilometre covered, and its width is how much training it holds. Home sits broad and low on the left, where Dodoma and Dar es Salaam carry most of the days over almost no vertical. The mountains stand to the right. Kilimanjaro has been climbed often enough to raise a real hill of its own, and behind Morogoro the Uluguru slopes are the sharpest ground of the lot, reached only now and then."
          source="Strava GPS + Natural Earth admin-1"
          tableCaption="Each Tanzanian region: activities, distance, climb and steepness"
          columns={['Region', 'Activities', 'Distance km', 'Climb m', 'm per km']}
          rows={[...regions]
            .map((r) => ({ r, s: (toNum(r.elevation_m) || 0) / (toNum(r.distance_km) || 1) }))
            .sort((a, b) => a.s - b.s)
            .map(({ r, s }) => [r.region, r.activities, Math.round(toNum(r.distance_km)), Math.round(toNum(r.elevation_m)), s >= 10 ? Math.round(s) : s.toFixed(1)])}
        >
          <TerrainLand rows={regions} />
        </Figure>
      </section>

      {/* Two maps, side by side */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Across Africa"
            note="African countries shaded by how many activities started there. Tanzania is home; Kenya, Malawi, South Africa and Rwanda are trips. The scale is logarithmic, so a single visit still shows."
            source="Strava GPS + Natural Earth"
            tableCaption="Activities by African country"
            columns={['Country', 'Activities', 'Distance km']}
            rows={realCountries
              .filter((c) => !/saudi|kingdom/i.test(c.country))
              .map((c) => [c.country, c.activities, c.distance_km])}
          >
            <Choropleth src="data/africa.geojson" nameKey="name" valueKey="act" unit="activities" maxHeight={460} />
          </Figure>
          <Figure
            title="Tanzania, by region"
            note="Shaded by how many activities started in each region. Dodoma and Dar es Salaam log the most days, but climb draws a different map entirely. Kilimanjaro region holds barely a tenth of the activities and more than a third of every metre gained. Flat at home, steep away."
            source="Strava GPS + Natural Earth admin-1"
            tableCaption="Activities by Tanzanian region"
            columns={['Region', 'Activities', 'Distance km']}
            rows={regionRows.map((r) => [r.region, r.activities, r.distance_km])}
          >
            <Choropleth src="data/tz_regions.geojson" nameKey="region" valueKey="act" unit="activities" maxHeight={460} />
          </Figure>
        </div>
      </section>

      {/* Countries: one stacked bar, clickable */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Every country, as one bar"
          note="Each country's share of all placed activities, home included. Tanzania dominates the frame; the travel countries are slivers, and the farthest few fold into one. Select a named country for its own page."
          source="Strava GPS"
          columns={['Country', 'Activities']}
          rows={countrySegments.map((c) => [c.label, c.display])}
        >
          <ProportionBar segments={countrySegments} unit="acts" />
        </Figure>
      </section>

      {/* The geography obeys a power law */}
      {rankItems.length >= 5 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>How the map concentrates</p>
          <Figure
            title="A few places hold almost everything"
            note={`Rank each region by how often it appears, then plot rank against count with both axes on a log scale. The points drop along a near-straight line, the signature of a power law: the busiest region alone holds ${topRegionShare}% of all placed activity and the top three hold ${top3Share}%, while the long tail of regions is visited once or twice and never again. It is the same lopsided shape that governs city sizes and word frequencies, drawn here from one person's map of home.`}
            source="Strava GPS + Natural Earth admin-1"
            tableCaption="Every region ranked by activity count"
            columns={['Rank', 'Region', 'Activities']}
            rows={rankItems.map((d, i) => [String(i + 1), d.label, fmtInt(d.value)])}
          >
            <RankSize items={rankItems} unit="activities" />
          </Figure>
        </section>
      )}

      {/* Regions: compact clickable index with mini bars */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
          Tanzanian regions
        </p>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
          All {regionRows.length} regions with a logged activity, most active first. Select any for its own page.
        </p>
        <ul className="regindex">
          {regionRows.map((r, i) => {
            const w = Math.max(3, ((toNum(r.activities) || 0) / regionMax) * 100)
            return (
              <li key={i}>
                <Link to={`/where/${slugify(r.region)}`} className="regindex__item">
                  <span className="regindex__head">
                    <span className="regindex__name">{r.region}</span>
                    <span className="regindex__val mono">{fmtInt(r.activities)}</span>
                  </span>
                  <span className="regindex__track" aria-hidden="true">
                    <span className="regindex__fill" style={{ width: `${w}%` }} />
                  </span>
                  <span className="regindex__sub">{fmtNum(r.distance_km, 0)} km</span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="source" style={{ marginTop: 'var(--sp-4)' }}>Source: Strava GPS + Natural Earth admin-1</p>
      </section>
    </DetailFrame>
  )
}

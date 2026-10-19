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
      lede={`${homeRegion.region || 'Dodoma'} is flat, and it holds more of this record than anywhere else: thousands of kilometres that give back almost no climb. The height is kept somewhere else. Kilimanjaro region, barely a tenth of the activities, holds more than a third of every metre ever gained. Home has the distance. The mountains have the climb.`}
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
            note={`${fmtInt(footKm)} kilometres on foot is nearly a third of the way around the planet, and more than three times the length of Tanzania's whole border, almost all of it looped through a handful of home regions. The full distance laid against the length of the equator.`}
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
          note="The ground at home barely climbs; the height comes from a few steep places visited rarely. Dodoma and Dar es Salaam sit broad and low, most of the days over almost no vertical. Kilimanjaro has been climbed often enough to raise a hill of its own, and the Uluguru slopes behind Morogoro are the sharpest ground of all, reached only now and then. Each region is a hill: its height is the steepness of the ground, its width the training it holds."
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
            note="Tanzania is home; everything else is a trip, Kenya, Malawi, South Africa and Rwanda. African countries shaded by how many activities started in each. The shading counts in multiples rather than even steps, a log scale, so even a single visit still shows up next to a thousand."
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
            note="Shaded by how many activities started in each region. Dodoma and Dar es Salaam log the most days, but climb draws a completely different map: Kilimanjaro region holds barely a tenth of the activities and more than a third of every metre gained."
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
          note="Tanzania fills almost the entire bar; the travel countries are thin slivers beside it, and the farthest few fold into one. Each country's share of all placed activities, home included. Select a named country for its own page."
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
            note={`A few places soak up almost all the training, and the rest are visited once and never again. Rank every region from most-visited to least and the busiest alone holds ${topRegionShare}% of all placed activity, the top three hold ${top3Share}%. That steep, regular drop-off has a name, a power law, the same lopsided pattern behind the sizes of cities and how often words are used. Both axes count in multiples, which turns the curve into a near-straight line.`}
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

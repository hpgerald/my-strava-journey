import { Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import Figure from '../charts/Figure.jsx'
import Choropleth from '../charts/Choropleth.jsx'
import ProportionBar from '../charts/ProportionBar.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { slugify } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

export default function Where() {
  const countries = useTable('countries')
  const regions = useTable('tanzania_regions')
  const { prev, next } = useSectionPaging('/where')

  const realCountries = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS')
  const indoor = countries.find((c) => c.country === 'Indoor / no GPS') || {}
  const homeRegion = regions[0] || {}

  const countrySegments = [...realCountries]
    .sort((a, b) => toNum(b.activities) - toNum(a.activities))
    .map((c) => ({
      label: c.country,
      value: toNum(c.activities),
      display: fmtInt(c.activities),
      to: `/where/${slugify(c.country)}`,
    }))

  const regionRows = [...regions]
    .sort((a, b) => toNum(b.activities) - toNum(a.activities))
  const regionMax = Math.max(1, ...regionRows.map((r) => toNum(r.activities) || 0))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Where' }]}
      number="05"
      title="Where"
      subtitle="Seven countries and seventeen regions"
      lede={`Home base is ${homeRegion.region || 'Dodoma'}, but the map runs wider than that: ${realCountries.length} countries and ${regions.length} Tanzanian regions in all. Each place is worked out from where the activity's GPS track starts.`}
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

      {/* Two maps, side by side */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Across Africa"
            note="African countries shaded by how many activities started there. Tanzania is home; Kenya, Malawi, South Africa and Rwanda mark trips. The scale is logarithmic so smaller counts still show."
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
            note="The real regions of Tanzania, each shaded by activity count. Dodoma, Kilimanjaro and Dar es Salaam carry the most; the pale regions are ones not yet logged."
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
          note="Each country's share of all placed activities, home included. Tanzania dominates; the travel countries are the slivers. Select any name for its own page."
          source="Strava GPS"
          columns={['Country', 'Activities']}
          rows={countrySegments.map((c) => [c.label, c.display])}
        >
          <ProportionBar segments={countrySegments} unit="acts" />
        </Figure>
      </section>

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

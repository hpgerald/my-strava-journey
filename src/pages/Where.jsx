import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { Reveal, useInView } from '../components/Reveal.jsx'
import PlaceMap from '../charts/PlaceMap.jsx'
import HBars from '../charts/HBars.jsx'
import ColBars from '../charts/ColBars.jsx'
import StackCols from '../charts/StackCols.jsx'
import PairBars from '../charts/PairBars.jsx'
import CumLine from '../charts/CumLine.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { slugify } from '../lib/slug.js'
import { buildPlaceReport } from '../lib/placeReport.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pc = (v) => Math.round((v || 0) * 100)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const fmtMon = (iso) => (iso ? `${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtMonth = (iso) => (iso ? `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const word = (n) => WORD[n] || String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const andList = (xs) => xs.join(', ').replace(/, ([^,]*)$/, ' and $1')
const tOf = (iso) => Date.parse(iso + 'T12:00:00Z')
const REG_KEYS = ['r0', 'r1', 'r2', 'r3']

// the country ledger beside the Africa map: rows arrive one after another
function Ledger({ children }) {
  const [ref, inView] = useInView()
  return <ol ref={ref} className={`wh-ledger${inView ? ' is-in' : ''}`}>{children}</ol>
}

export default function Where() {
  const activities = useTable('activities')
  const geoRows = useTable('activity_geo')
  const { prev, next } = useSectionPaging('/where')
  const P = useMemo(() => (activities.length && geoRows.length ? buildPlaceReport(activities, geoRows) : null), [activities, geoRows])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'Where' }], number: '05', title: 'Where', subtitle: 'Five countries. Seventeen regions.', prev, next }
  if (!P) return <DetailFrame {...frame} />

  let secN = 0
  const num = () => ++secN
  const lastYear = Number(P.lastISO.slice(0, 4))
  const so = P.lastISO.slice(5) < '12-31' ? ' so far' : ''
  const R = P.regions
  const reg = (name) => R.find((r) => r.region === name) || { n: 0, km: 0, elev: 0, days: 0 }
  const tzC = P.countries.find((c) => c.country === 'Tanzania') || { n: 0 }
  const nCountries = P.namedCountries.length
  const awayNamed = P.abroadFolded.filter((c) => !c.isOther)

  // ---- the maps ----
  const africaValues = Object.fromEntries(P.namedCountries.map((c) => [c.country, { n: c.n, km: c.km, elev: c.elev, days: c.days }]))
  const tzValues = Object.fromEntries(R.map((r) => [r.region, { n: r.n, km: r.km, elev: r.elev, days: r.days }]))
  const metrics = [
    { key: 'n', label: 'Outings', unit: 'outings', fmt: n0 },
    { key: 'km', label: 'Km on foot', unit: 'km on foot', fmt: n0 },
    { key: 'elev', label: 'Climb', unit: 'm climbed', fmt: n0 },
    { key: 'days', label: 'Days', unit: 'days out', fmt: n0 },
  ]
  const top3 = R.slice(0, 3)
  const top3Share = top3.reduce((s, r) => s + r.n, 0) / Math.max(1, P.tzTot.n)

  // ---- flat at home, steep away ----
  const steep = R.slice().filter((r) => r.n >= 30).sort((a, b) => b.mpk - a.mpk).slice(0, 2)
  const steepN = steep.reduce((s, r) => s + r.n, 0) / P.tzTot.n
  const steepE = steep.reduce((s, r) => s + r.elev, 0) / P.tzTot.elev
  const pairRows = R.filter((r) => r.n >= 24).map((r) => ({ label: r.region.replace('Zanzibar Urban/West', 'Zanzibar West'), short: r.region.replace('Dar es Salaam', 'Dar').replace('Zanzibar Urban/West', 'Zanzibar'), a: r.n / P.tzTot.n, b: r.elev / P.tzTot.elev }))
  const gradeRows = R.filter((r) => r.n >= 8).sort((a, b) => b.mpk - a.mpk)
  const tzMpk = P.tzTot.elev / Math.max(1, P.tzTot.km)
  const home = R[0]

  // ---- the lead moving ----
  const habitYears = P.byYear.filter((y) => y.tzN >= 50)
  const leaders = habitYears.map((y) => ({ year: y.year, region: y.leader.region, n: y.leader.n, of: y.tzN }))
  const runOf = (() => { const first = leaders[0]; let i = 0; while (i < leaders.length && leaders[i].region === first.region) i++; return { region: first.region, from: first.year, to: leaders[i - 1].year, after: leaders.slice(i) } })()
  const regKeys = [...P.topRegions.map((r, i) => ({ key: REG_KEYS[i], label: r })), { key: 'rO', label: 'Other regions' }]

  // ---- the map growing ----
  const disc = P.discovered
  const newBy = P.byYear.map((y) => ({ year: y.year, n: y.newRegions.length, names: y.newRegions }))
  const newLast = newBy.find((y) => y.year === lastYear) || { n: 0, names: [] }
  const discSeries = disc.map((d, i) => ({ t: tOf(d.date), v: i + 1 }))
  discSeries.push({ t: tOf(P.lastISO), v: disc.length })
  const discMarks = disc.map((d, i) => ({ t: tOf(d.date), v: i + 1, label: i === 0 || i >= disc.length - newLast.n ? d.region.replace('Dar es Salaam', 'Dar') : '' }))

  // ---- abroad ----
  const AB = P.abroadFolded
  const kenya = P.abroad.find((c) => c.country === 'Kenya')
  const malawi = P.abroad.find((c) => c.country === 'Malawi')
  const sa = P.abroad.find((c) => c.country === 'South Africa')

  // ---- indoors ----
  const iy = P.byYear.map((y) => ({ year: y.year, share: y.n ? y.indoor / y.n : 0 }))
  const iFirst = iy[0], iLast = iy[iy.length - 1]

  // ---- the maths ----
  const eff = P.byYear.filter((y) => y.tzN >= 50)
  const effBest = eff.reduce((b, y) => (y.effective > b.effective + 1e-9 ? y : b), eff[0])
  const effLow = eff.reduce((b, y) => (y.effective < b.effective ? y : b), eff[0])

  const placeCards = [...R.slice(0, 4).map((r) => ({ name: r.region, kind: 'Region', n: r.n, km: r.km, elev: r.elev })),
    ...P.abroad.filter((c) => ['Kenya', 'Malawi', 'South Africa', 'Rwanda'].includes(c.country)).map((c) => ({ name: c.country, kind: 'Country', n: c.n, km: c.km, elev: c.elev }))]

  return (
    <DetailFrame
      {...frame}
      lede="Where I went out: five countries, and seventeen regions here at home in Tanzania."
    >
      <div className="yis-report">
        {/* ===== Africa ===== */}
        <section className="sgrid yis-top" aria-labelledby="wh-title">
          <div className="sgrid__head">
            <p className="eyebrow">Across Africa</p>
            <h2 id="wh-title" className="section-head__title">{pc(tzC.n / P.located)}% began in&nbsp;Tanzania.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            Most of my outings never left home. Of the {n0(P.located)} I can put on a map, {n0(tzC.n)} were in Tanzania. The
            rest were short trips to {andList(awayNamed.map((c) => c.country))}{P.othersN ? `, plus ${word(P.othersN)} that I count as others` : ''}.
            The other {n0(P.indoor)} outings were indoors, so they have no place on the map.
          </Reveal>
          <OddsRow
            title="The outings by place"
            items={[
              { num: nCountries, unit: '', label: 'countries with an outing', tone: 'move' },
              { num: tzC.n, unit: '', label: 'outings in Tanzania', tone: 'move' },
              { num: P.abroadN, unit: '', label: 'outings outside Tanzania', tone: 'move' },
              { num: P.indoor, unit: '', label: 'outings with no GPS start', tone: 'rest' },
            ]}
          />
          <div className="wh-africa">
            <figure className="sgrid__fig wh-africa__map">
              <figcaption className="sgrid__figtitle">Africa, by outings</figcaption>
              <PlaceMap
                src="data/africa.geojson" nameKey="name" values={africaValues} metrics={[metrics[0]]}
                labels={['Tanzania', 'Kenya', 'Malawi', 'South Africa', 'Rwanda']} nudge={{ Rwanda: [-0.09, -0.02], Malawi: [0.08, 0.03] }} maxHeight={620}
                aria="Map of Africa shaded by outings in each country."
              />
            </figure>
            <figure className="sgrid__fig wh-africa__list">
              <figcaption className="sgrid__figtitle">Each country, busiest first</figcaption>
              <Ledger>
                {[tzC, ...AB].map((c, i) => (
                  <li key={c.country} className="wh-ledger__row" style={{ '--d': `${i * 80}ms` }}>
                    <span className="wh-ledger__n mono">{n0(c.n)}</span>
                    <span className="wh-ledger__c">
                      <b>{c.country}</b>
                      <small>{n0(c.km)} km on foot · {n0(c.elev)} m up · {n0(c.days)} days</small>
                      <small>{c.isOther ? `from ${fmtMon(c.first)}` : `first on foot ${fmtMon(P.abroadFirstFoot[c.country] || c.first)}`}</small>
                    </span>
                  </li>
                ))}
              </Ledger>
              <p className="sgrid__note">The darker the country, the more I went out there.</p>
            </figure>
          </div>
          <p className="source">Source: Activity Log and Strava GPS start points · Natural Earth country outlines</p>
        </section>

        {/* ===== 1. Tanzania ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="wh-tz">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Tanzania</p>
            <h2 id="wh-tz" className="section-head__title">{R.length} regions of&nbsp;Tanzania.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            Inside Tanzania, three places carry most of it: {andList(top3.map((r) => r.region))}, with {pc(top3Share)}% of my
            outings between them. {home.region} is where I have spent the most days out, {n0(home.days)} of them.
            {reg('Kilimanjaro').n && reg('Morogoro').n ? ` For climbing it is Kilimanjaro and Morogoro, with ${pc(reg('Kilimanjaro').elev / P.tzTot.elev)}% and ${pc(reg('Morogoro').elev / P.tzTot.elev)}% of my climbing in Tanzania.` : ''}
            {' '}The other {word(R.length - 4)} regions together have {pc(R.slice(4).reduce((s, r) => s + r.n, 0) / P.tzTot.n)}% of my outings.
          </Reveal>
          <OddsRow
            title="Inside Tanzania"
            items={[
              { num: R.length, unit: '', label: 'regions with an outing', tone: 'move' },
              { value: home.n / P.tzTot.n, label: `of the outings in ${home.region}`, tone: 'move' },
              { value: reg('Kilimanjaro').elev / P.tzTot.elev, label: 'of the climb in Kilimanjaro', tone: 'move' },
              { num: P.tzTot.days, unit: ' days', label: 'out in Tanzania', tone: 'rest' },
            ]}
          />
          <figure className="sgrid__fig wh-tzmap">
            <figcaption className="sgrid__figtitle">Tanzania, by region</figcaption>
            <PlaceMap
              src="data/tz_regions.geojson" nameKey="region" values={tzValues} metrics={metrics}
              labels={R.filter((r) => r.n >= 24).map((r) => r.region)} nudge={{ 'Dar es Salaam': [0.06, -0.03], Pwani: [0.03, 0.07], Kilimanjaro: [0.05, -0.02], Arusha: [-0.03, -0.03] }} maxHeight={680}
              aria="Map of Tanzania's regions."
            />
          </figure>
          <div className="sgrid__pair">
            <figure className="sgrid__fig sgrid__fig--chart">
              <figcaption className="sgrid__figtitle">Outings by region</figcaption>
              <div className="sgrid__chart">
                <HBars
                  aria={`Outings by region: ${R.slice(0, 10).map((r) => `${r.region} ${r.n}`).join(', ')}.`}
                  rows={R.slice(0, 10).map((r, i) => ({ key: i < 4 ? REG_KEYS[i] : 'rO', label: r.region, sub: `${n0(r.days)} days · since ${fmtMon(r.first)}`, value: r.n, display: n0(r.n) }))}
                />
              </div>
            </figure>
            <figure className="sgrid__fig sgrid__fig--mx">
              <figcaption className="sgrid__figtitle">Kilometres on foot by region</figcaption>
              <div className="sgrid__chart">
                <HBars
                  aria={`Kilometres on foot by region: ${R.slice().sort((a, b) => b.km - a.km).slice(0, 10).map((r) => `${r.region} ${n0(r.km)}`).join(', ')}.`}
                  rows={R.slice().sort((a, b) => b.km - a.km).slice(0, 10).map((r) => ({ key: P.topRegions.includes(r.region) ? REG_KEYS[P.topRegions.indexOf(r.region)] : 'rO', label: r.region, sub: `${n0(r.elev)} m up`, value: r.km, display: `${n0(r.km)} km` }))}
                />
              </div>
            </figure>
            <p className="sgrid__note sgrid__note--chart">The pale grey regions on the map are the ones I have not been out in yet.</p>
          </div>
          <p className="source">Source: Activity Log and Strava GPS start points · Natural Earth region outlines</p>
        </section>

        {/* ===== 2. flat at home, steep away ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wh-steep"
          eyebrow={`${num()} · Flat at home, hilly away`}
          title={`The climbing is in ${word(steep.length)} regions.`}
          statement={<>
            The places where I go out most are flat. In {home.region} I climbed about {k1(home.mpk)} m for every kilometre, and
            in Dar es Salaam {k1(reg('Dar es Salaam').mpk)} m. {andList(steep.map((r, i) => `${i ? 'in' : 'In'} ${r.region} it was ${n0(r.mpk)} m`))}.
            {' '}That is where {steep.reduce((s, r) => s + r.trail, 0)} of my trail runs and hikes started.
          </>}
          odds={{
            title: 'Metres climbed for each kilometre',
            items: [
              ...steep.map((r) => ({ num: r.mpk, unit: ' m', label: `per km in ${r.region}`, tone: 'move' })),
              { num: home.mpk, dec: 1, unit: ' m', label: `per km in ${home.region}`, tone: 'rest' },
              { num: reg('Dar es Salaam').mpk, dec: 1, unit: ' m', label: 'per km in Dar es Salaam', tone: 'rest' },
            ].slice(0, 4),
          }}
          left={{
            title: 'Share of the outings against share of the climb',
            node: <PairBars rows={pairRows} aLabel="share of outings" bLabel="share of climb" aShort="outings" bShort="climb" aria={`Share of outings and of climb by region: ${pairRows.map((r) => `${r.label} ${pc(r.a)}% of outings, ${pc(r.b)}% of climb`).join('; ')}.`} />,
          }}
          right={{
            title: 'Metres climbed per kilometre, by region',
            node: (
              <HBars
                refLine={{ value: tzMpk, label: `Tanzania average · ${k1(tzMpk)} m` }}
                aria={`Metres climbed per kilometre on foot: ${gradeRows.map((r) => `${r.region} ${k1(r.mpk)}`).join(', ')}.`}
                rows={gradeRows.map((r) => ({ key: r.mpk > tzMpk * 2 ? 'trail' : r.mpk > tzMpk ? 'road' : 'quiet', label: r.region, sub: `${n0(r.km)} km · ${n0(r.n)} outings`, value: r.mpk, display: `${k1(r.mpk)} m` }))}
              />
            ),
          }}
          leftNote={<>Where the orange dot is ahead of the grey ring, the region gave me more climbing than its share.</>}
          rightNote={<>Past the dashed line, it is hillier than my average in Tanzania.</>}
          source="Activity Log and Strava GPS start points · climb and distance on foot"
        />

        {/* ===== 3. the lead moving ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wh-home"
          eyebrow={`${num()} · The busiest region, year by year`}
          title={`${runOf.region} led for ${word(Number(runOf.to) - Number(runOf.from) + 1)} ${Number(runOf.to) === Number(runOf.from) ? 'year' : 'years'}.`}
          statement={<>
            My home base has moved over the years.{' '}
            {(() => { const runs = []; for (const l of leaders) { const last = runs[runs.length - 1]; if (last && last.region === l.region) last.to = l.year; else runs.push({ region: l.region, from: l.year, to: l.year }) } return runs.map((x, i) => `${x.from === x.to ? `In ${x.from}` : `From ${x.from} to ${x.to}`} ${i === 0 ? 'I went out most in' : 'it was'} ${x.region}`).join('. ') + '.' })()}
          </>}
          odds={{
            title: 'The lead, year by year',
            items: leaders.slice(-4).map((l, i, arr) => ({ value: l.n / l.of, label: `${l.region} in ${l.year}${l.year === lastYear ? so : ''}`, tone: i === arr.length - 1 ? 'move' : 'rest' })),
          }}
          left={{
            title: 'Outings in Tanzania by region, year by year',
            node: (
              <StackCols
                keys={regKeys}
                items={P.byYear.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, partial: y.year === lastYear && !!so, display: String(y.tzN), parts: [...P.topRegions.map((r, i) => ({ key: REG_KEYS[i], value: y.shares[r] })), { key: 'rO', value: y.shares.Other }] }))}
                ticks={[0, 50, 100, 150, 200]} yCap="outings &uarr;"
                aria={`Outings in Tanzania each year by region. ${P.byYear.map((y) => `${y.year}: ${P.topRegions.map((r) => `${r} ${y.shares[r]}`).join(', ')}, other ${y.shares.Other}`).join('. ')}.`}
              />
            ),
          }}
          right={{
            title: 'Regions visited each year',
            node: (
              <ColBars
                items={P.byYear.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.regionsN, display: String(y.regionsN), tone: y.regionsN === Math.max(...P.byYear.map((z) => z.regionsN)) ? 'big' : 'mid' }))}
                ticks={[0, 4, 8, 12]} yCap="regions &uarr;"
                aria={`Regions of Tanzania with an outing each year: ${P.byYear.map((y) => `${y.year} ${y.regionsN}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>The four busiest regions have their own colour.</>}
          rightNote={<>The years with the most regions are in orange.</>}
          source="Activity Log and Strava GPS start points · outings in Tanzania by region and year"
        />

        {/* ===== 4. the map growing ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wh-grow"
          eyebrow={`${num()} · New places`}
          title={`${disc.length} regions in ${lastYear - Number(disc[0].date.slice(0, 4))} years.`}
          statement={<>
            New regions came when I travelled. {newBy.filter((y) => y.n).map((y) => `In ${y.year} I added ${andList(y.names)}`).join('. ')}.
            {' '}{cap(word(30 - disc.length))} of Tanzania&rsquo;s 30 regions are still empty on my map, so there is still a lot to see.
          </>}
          odds={{
            title: 'New regions',
            items: [
              { num: disc.length, unit: '', label: 'regions of 30 with an outing', tone: 'move' },
              { num: Math.max(...newBy.map((y) => y.n)), unit: '', label: `new in ${newBy.reduce((b, y) => (y.n > b.n ? y : b), newBy[0]).year}, the most`, tone: 'move' },
              { num: newLast.n, unit: '', label: `new in ${lastYear}${so}`, tone: 'move' },
              { num: 30 - disc.length, unit: '', label: 'regions still blank', tone: 'rest' },
            ],
          }}
          left={{
            title: 'Regions with an outing, adding up',
            node: (
              <CumLine
                series={discSeries} marks={discMarks} yTicks={[0, 5, 10, 15]} yFmt={(v) => String(v)} yCap="regions &uarr;"
                aria={`Regions of Tanzania reached over time: ${disc.map((d) => `${d.region} ${fmtMon(d.date)}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'New regions each year',
            node: (
              <ColBars
                items={newBy.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.n, display: String(y.n), tone: y.year === lastYear ? 'big' : y.n ? 'mid' : 'quiet' }))}
                ticks={[0, 2, 4, 6]} yCap="regions &uarr;"
                aria={`New regions each year: ${newBy.map((y) => `${y.year} ${y.n}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>The line steps up each time I go out in a new region.</>}
          source="Activity Log and Strava GPS start points · first outing in each region"
        />

        {/* ===== 5. abroad ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wh-abroad"
          eyebrow={`${num()} · Across the border`}
          title={`${n0(P.abroadN)} outings outside Tanzania.`}
          statement={<>
            My trips outside Tanzania were short.
            {kenya ? ` My first outing abroad was in Kenya, in ${fmtMonth(kenya.first)}, and I have been back a few times since.` : ''}
            {malawi ? ` In Malawi I logged ${malawi.n} outings over ${malawi.days} days, between ${fmtMon(malawi.first)} and ${fmtMon(malawi.last)}.` : ''}
            {sa ? ` In South Africa I had ${sa.n} outings in ${sa.days} days.` : ''}
            {P.othersN ? ` The other ${word(P.othersN)} I count as others.` : ''}
          </>}
          odds={{
            title: 'Outside Tanzania',
            items: [
              { num: P.abroadN, unit: '', label: 'outings outside Tanzania', tone: 'move' },
              { num: awayNamed.length, unit: '', label: 'other countries', tone: 'move' },
              { num: P.abroad.reduce((s, c) => s + c.km, 0), unit: ' km', label: 'on foot abroad', tone: 'move' },
              { num: P.abroad.reduce((s, c) => s + c.days, 0), unit: ' days', label: 'out abroad', tone: 'rest' },
            ],
          }}
          left={{
            title: 'Outings in each country',
            node: (
              <HBars
                aria={`Outings abroad by country: ${AB.map((c) => `${c.country} ${c.n}`).join(', ')}.`}
                rows={AB.map((c, i) => ({ key: i ? 'quiet' : 'road', label: c.country, sub: `${c.days} days · ${fmtMon(c.first)} to ${fmtMon(c.last)}`, value: c.n, display: String(c.n) }))}
              />
            ),
          }}
          right={{
            title: 'Kilometres on foot in each country',
            node: (
              <HBars
                aria={`Kilometres on foot abroad by country: ${AB.map((c) => `${c.country} ${k1(c.km)}`).join(', ')}.`}
                rows={AB.slice().sort((a, b) => b.km - a.km).map((c, i) => ({ key: i ? 'quiet' : 'trail', label: c.country, sub: `${n0(c.elev)} m up`, value: c.km, display: `${n0(c.km)} km` }))}
              />
            ),
          }}
          source="Activity Log and Strava GPS start points · outings outside Tanzania"
        />

        {/* ===== 6. indoors ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wh-indoor"
          eyebrow={`${num()} · Indoors`}
          title="Fewer outings without GPS."
          statement={<>
            {n0(P.indoor)} of my outings were indoors, most of them treadmill runs, so they have no start point. In{' '}
            {iFirst.year} they were {pc(iFirst.share)}% of the year. As I moved outside the share came down, and in{' '}
            {iLast.year}{so} it is {pc(iLast.share)}%.
          </>}
          odds={{
            title: 'Outings with no GPS start',
            items: [
              { num: P.indoor, unit: '', label: 'outings in all', tone: 'rest' },
              { num: P.indoorBy.tread, unit: '', label: 'treadmill runs', tone: 'move' },
              { value: iFirst.share, label: `of ${iFirst.year} outings`, tone: 'rest' },
              { value: iLast.share, label: `of ${iLast.year} outings${so}`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Share of each year with no GPS start',
            node: (
              <ColBars
                items={iy.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.share, display: `${pc(y.share)}%`, tone: y.year === lastYear ? 'big' : 'mid' }))}
                max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`} yCap="share of outings &uarr;"
                aria={`Share of outings with no GPS start: ${iy.map((y) => `${y.year} ${pc(y.share)}%`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'What the outings with no place were',
            node: (
              <HBars
                aria={`Outings with no GPS start: treadmill runs ${P.indoorBy.tread}, indoor walks ${P.indoorBy.walk}, other activities ${P.indoorBy.other}.`}
                rows={[
                  { key: 'tread', label: 'Treadmill runs', value: P.indoorBy.tread, display: n0(P.indoorBy.tread) },
                  { key: 'quiet', label: 'Other activities', value: P.indoorBy.other, display: n0(P.indoorBy.other) },
                  { key: 'walk', label: 'Indoor walks', value: P.indoorBy.walk, display: n0(P.indoorBy.walk) },
                ]}
              />
            ),
          }}
          rightNote={<>The maps above only show outings that went outside, so most of my treadmill years are missing from them.</>}
          source="Activity Log · outings without a GPS start point"
        />

        {/* ===== 7. the maths ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wh-maths"
          eyebrow={`${num()} · How spread out`}
          title="How widely they spread."
          statement={<>
            I wanted one number for how spread out my outings were across Tanzania. I used the effective number of regions.
            If a year counts as four, it is as if my outings were shared equally between four regions. My narrowest year was{' '}
            {effLow.year}, about {k1(effLow.effective)}, when {effLow.leader.region} had {pc(effLow.leader.n / effLow.tzN)}% of my
            outings. The widest was {effBest.year}, about {k1(effBest.effective)}.
          </>}
          odds={{
            title: 'How the outings spread',
            items: [
              { num: P.lifeEffective, dec: 1, unit: '', label: 'effective regions, all years', tone: 'move' },
              { num: effBest.effective, dec: 1, unit: '', label: `in ${effBest.year}, the widest`, tone: 'move' },
              { num: effLow.effective, dec: 1, unit: '', label: `in ${effLow.year}, the narrowest`, tone: 'rest' },
              { value: top3Share, label: 'of outings in the busiest three', tone: 'rest' },
            ],
          }}
          left={{
            title: 'Effective number of regions, year by year',
            node: (
              <ColBars
                items={eff.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.effective, display: k1(y.effective), tone: y === effBest ? 'big' : 'mid' }))}
                ticks={[0, 1, 2, 3, 4, 5]} yCap="regions &uarr;"
                aria={`Effective number of regions by year: ${eff.map((y) => `${y.year} ${k1(y.effective)}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'Share of the outings in the top three regions',
            node: (
              <ColBars
                items={eff.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.top3, display: `${pc(y.top3)}%`, tone: y === effLow ? 'big' : 'mid' }))}
                max={1} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`} yCap="share &uarr;"
                aria={`Share of outings in the three busiest regions by year: ${eff.map((y) => `${y.year} ${pc(y.top3)}%`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>How spread out each year was across regions. I left out years with fewer than 50 outings in Tanzania.</>}
          source="Activity Log and Strava GPS start points · inverse Simpson index of outings by region"
        />

        {/* ===== places ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="wh-places">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Each place on its own</p>
            <h2 id="wh-places" className="section-head__title">Open any&nbsp;place.</h2>
          </div>
          <ul className="sp-cards wh-cards">
            {placeCards.map((c) => (
              <li key={c.name} className="sp-card">
                <Link to={`/where/${slugify(c.name)}`}>
                  <p className="sp-card__k">{c.kind}</p>
                  <p className="sp-card__v wh-cards__name">{c.name}</p>
                  <p className="sp-card__l">{n0(c.n)} outings · {n0(c.km)} km · {n0(c.elev)} m up</p>
                  <p className="sp-card__go">Open {c.name} &rarr;</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DetailFrame>
  )
}

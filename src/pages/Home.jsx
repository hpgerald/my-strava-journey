import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import StatCard from '../components/StatCard.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Figure from '../charts/Figure.jsx'
import DotGrid from '../charts/DotGrid.jsx'
import BarChart from '../charts/BarChart.jsx'
import HeatStrip from '../charts/HeatStrip.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import IndoorOutdoor from '../charts/IndoorOutdoor.jsx'
import HeroRotator from '../charts/HeroRotator.jsx'
import ContourField from '../charts/ContourField.jsx'
import IgnitionStream from '../charts/IgnitionStream.jsx'
import SwitchStep from '../charts/SwitchStep.jsx'
import FootFlip from '../charts/FootFlip.jsx'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { fmtInt, toNum } from '../lib/format.js'

const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function yearsBetween(a, b) {
  if (!a || !b) return null
  const start = new Date(a)
  const end = new Date(b)
  if (isNaN(start) || isNaN(end)) return null
  return Math.round((end - start) / (365.25 * 24 * 3600 * 1000))
}

// distance and elevation are foot-only across the site
const FOOT_HOME = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Round a set of counts to integer percentages that sum to exactly 100
// (largest-remainder method), so a breakdown never reads 101%.
function pctsTo100(counts) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  const raw = counts.map((c) => (c / total) * 100)
  const out = raw.map(Math.floor)
  let left = 100 - out.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < left; k++) out[order[k % order.length].i] += 1
  return out
}

export default function Home() {
  useEffect(() => {
    document.title = 'My Strava Journey · Seven Years of Training, Read as Data'
  }, [])
  const lifetime = useTable('lifetime_totals')
  const meta = useKeyed('meta', 'key', 'value')
  const countries = useTable('countries')
  const fun = useTable('fun_journey')
  const activityLog = useTable('activities')
  const monthlyTotals = useTable('monthly_totals')
  const sportBreakdown = useTable('sport_breakdown')
  const nav = useTable('nav_index')

  const life = (needle) => lifetime.find((r) => (r.metric || '').toLowerCase().includes(needle)) || {}

  const activities = life('activities').value
  const km = life('total km').value
  const elevation = life('elevation').value
  const streak = life('longest streak').value

  const years = yearsBetween(meta.coverage_start, meta.coverage_end)
  const countryCount = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS').length
  const everests = (fun.find((f) => (f.comparison || '').includes('Everest')) || {}).value
  const kudos = life('kudos').value
  const hoursMoving = life('hours moving').value

  // ---- unique, personal reframes (computed, not clichéd comparisons) ----
  const halfCount = activityLog.filter((a) => FOOT_HOME.has(a.sport_type) && (toNum(a.distance_km) || 0) >= 21.0975).length
  const activeMonthsH = [...new Set(monthlyTotals.map((mm) => mm.month).filter(Boolean))].sort()
  let monthStreak = 0
  if (activeMonthsH.length) {
    const set = new Set(activeMonthsH)
    let cur = activeMonthsH[activeMonthsH.length - 1]
    while (set.has(cur)) { monthStreak += 1; let y = +cur.slice(0, 4), mo = +cur.slice(5, 7) - 1; if (mo < 1) { mo = 12; y -= 1 } cur = `${y}-${String(mo).padStart(2, '0')}` }
  }
  const spanDaysMeta = meta.coverage_start && meta.coverage_end
    ? Math.max(1, Math.round((Date.parse(meta.coverage_end) - Date.parse(meta.coverage_start)) / 86400000))
    : 1
  const cadence = activityLog.length ? activityLog.length / spanDaysMeta : 0

  // the rotating headline metrics: the numbers NOT already shown in the three
  // cards (distance, vertical, streak live there), so the headline never mid-counts
  // a figure the reader is also reading solid beside it.
  const heroMetrics = [
    { value: toNum(activities), word: 'activities' },
    { value: monthStreak, word: 'months unbroken' },
    { value: halfCount, word: 'half-marathons' },
    { value: countryCount, word: 'countries' },
    { value: toNum(kudos), word: 'kudos' },
    { value: toNum(hoursMoving), word: 'hours moving' },
  ].filter((m) => Number.isFinite(m.value) && m.value > 0)

  // personal reframes for the "put another way" row
  const funv = (needle) => toNum((fun.find((f) => (f.comparison || '').toLowerCase().includes(needle)) || {}).value)
  const funFacts = [
    { num: fmtInt(funv('marathon')), suffix: '', label: 'marathons of distance' },
    { num: String(monthStreak), suffix: '', label: 'months, every one since the spark' },
    { num: String(halfCount), suffix: '', label: 'times past the half-marathon' },
    { num: cadence ? cadence.toFixed(2) : '', suffix: '', label: 'activities a day, seven years running' },
  ].filter((f) => f.num && f.num !== 'NaN' && f.num !== '0')

  // ---- Derived series for the front-page charts ----
  const hours = Array.from({ length: 24 }, () => 0)
  const months = Array(12).fill(0)
  const daySet = new Set()
  for (const a of activityLog) {
    const h = parseInt(a.hour, 10)
    if (Number.isFinite(h) && h >= 0 && h < 24) hours[h] += 1
    const mo = parseInt((a.date || '').slice(5, 7), 10)
    if (mo >= 1 && mo <= 12) months[mo - 1] += 1
    const dstr = (a.date || '').slice(0, 10)
    if (dstr) daySet.add(dstr)
  }

  // distance vs climb by foot sport, for the flip
  const FOOT_ORDER = ['Run', 'Walk', 'TrailRun', 'Hike']
  const FOOT_NAME = { Run: 'Run', Walk: 'Walk', TrailRun: 'Trail', Hike: 'Hike' }
  const footAgg = Object.fromEntries(FOOT_ORDER.map((k) => [k, { dist: 0, elev: 0 }]))
  for (const a of activityLog) {
    if (footAgg[a.sport_type]) { footAgg[a.sport_type].dist += toNum(a.distance_km) || 0; footAgg[a.sport_type].elev += toNum(a.elevation_gain_m) || 0 }
  }
  const footFlipData = FOOT_ORDER.map((k) => ({ key: k, label: FOOT_NAME[k], dist: footAgg[k].dist, elev: footAgg[k].elev }))

  // the switch as a rate: activities per calendar month before vs from July 2021
  const switchRate = (() => {
    const SW = '2021-07'
    const ym = (s) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7))
    const months = monthlyTotals.map((mm) => mm.month).filter(Boolean).sort()
    if (!months.length) return null
    let before = 0
    let after = 0
    for (const mm of monthlyTotals) {
      const n = toNum(mm.activities) || 0
      if (mm.month < SW) before += n
      else after += n
    }
    const bSpan = ym('2021-06') - ym(months[0]) + 1
    const aSpan = ym(months[months.length - 1]) - ym(SW) + 1
    return { before: before / bSpan, after: after / aSpan }
  })()

  // seasonality: activities per calendar month
  const monthCells = MONTHS_FULL.map((m, i) => ({ short: MONTHS_SHORT[i], label: m, value: months[i] }))

  // consistency: how soon the next active day comes, and share of days active
  const sortedDays = [...daySet].sort()
  let gNext = 0, gTwo = 0, gMore = 0
  for (let i = 1; i < sortedDays.length; i++) {
    const diff = Math.round((Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1])) / 86400000)
    if (diff === 1) gNext += 1
    else if (diff === 2) gTwo += 1
    else gMore += 1
  }
  const gapPcts = pctsTo100([gNext, gTwo, gMore]) // integer percentages summing to exactly 100
  const gapData = [
    { label: 'The next day', value: gNext, display: `${gapPcts[0]}%` },
    { label: 'Two days later', value: gTwo, display: `${gapPcts[1]}%` },
    { label: 'Three or more', value: gMore, display: `${gapPcts[2]}%` },
  ]
  const activeDays = sortedDays.length
  const spanDays = sortedDays.length > 1
    ? Math.round((Date.parse(sortedDays[sortedDays.length - 1]) - Date.parse(sortedDays[0])) / 86400000) + 1
    : 1
  const pctActiveDays = Math.round((activeDays / spanDays) * 100)

  // one dot per activity, in chronological order, tagged with its year
  const items = activityLog
    .map((a) => ({
      t: Date.parse((a.date || '').replace(' ', 'T')),
      year: Number((a.date || '').slice(0, 4)),
      date: a.date,
      sport: a.sport_type,
    }))
    .filter((d) => Number.isFinite(d.t) && d.year)
    .sort((a, b) => a.t - b.t)
  const gridYears = [...new Set(items.map((d) => d.year))].sort((a, b) => a - b)
  const yearCounts = gridYears.map((y) => [String(y), fmtInt(items.filter((d) => d.year === y).length)])

  // indoor share by year, for the "off the treadmill" figure's table fallback
  const trainerTrue = (v) => { const s = String(v).trim().toLowerCase(); return s === '1' || s === 'true' || s === 'yes' }
  const ioAgg = {}
  for (const a of activityLog) {
    const y = (a.date || '').slice(0, 4)
    if (!/^\d{4}$/.test(y)) continue
    const e = (ioAgg[y] = ioAgg[y] || { indoor: 0, n: 0 })
    if (trainerTrue(a.trainer)) e.indoor += 1
    e.n += 1
  }
  const indoorYearRows = Object.keys(ioAgg).sort().map((y) => [y, `${Math.round((ioAgg[y].indoor / ioAgg[y].n) * 100)}%`])
  // geography and sport tables (from their source CSVs)
  const geoLocated = countries.filter((c) => c.country && c.country !== 'Indoor / no GPS')
  const geoRows = geoLocated.map((c) => [c.country, fmtInt(c.activities)])
  const sportRows = sportBreakdown
    .filter((s) => s.sport)
    .map((s) => [s.sport, fmtInt(s.activities)])

  const menuItems = nav
    .filter((r) => r.route !== '/')
    .map((r, i) => ({ ...r, number: String(i + 1).padStart(2, '0') }))

  return (
    <Layout>
      <Container>
        {/* ---- Type-led hero: headline left, key figures stacked right --- */}
        <section className="hero">
          <div className="hero__atlas" aria-hidden="true">
            <ContourField />
          </div>
          <div className="hero__plate" aria-hidden="true" />
          <div className="hero__main">
            <p className="atlas-cap">
              <span className="atlas-cap__mark">Plate 01</span>
              <span className="atlas-cap__rule" aria-hidden="true" />
              <span>
                {years ? `${years} years` : 'Seven years'} · {meta.coverage_start?.slice(0, 4) || '2019'}
                &ndash;{meta.coverage_end?.slice(0, 4) || '2026'} · Strava
              </span>
            </p>
            <h1
              className="display hero__head"
              aria-label={`${years || 7} years, ${fmtInt(activities)} activities, one habit.`}
            >
              <span aria-hidden="true">
                <span className="hero__anchor">{years || 7} years.</span>
                <HeroRotator className="hero__slot" metrics={heroMetrics} />
                <span className="hero__anchor">One habit.</span>
              </span>
            </h1>
            <p className="measure hero__lede" style={{ fontSize: 'var(--fs-md)' }}>
              It started at noon on 17 August 2019 with a 31 km bike ride, then went quiet for two
              years. In July 2021 the habit switched on and never switched off. Seven years of it,
              mostly on foot, mostly around Tanzania, reaching {countryCount || 'seven'} countries and
              logged on more than half of every day since.
            </p>
            <div className="hero__extra">
              <p className="eyebrow">Put another way, that is</p>
              <ul className="funfacts">
                {funFacts.map((f, i) => (
                  <li key={i}>
                    <span className="funfacts__num">
                      {f.num}
                      {f.suffix ? <span className="funfacts__suffix">{f.suffix}</span> : null}
                    </span>
                    <span className="funfacts__lbl">{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="hero__cards" aria-label="Headline figures">
            <StatCard value={fmtInt(km)} unit="km" label="Distance on foot" note="Running, walking and hiking only. Nearly a third of the way around the equator." />
            <StatCard value={fmtInt(elevation)} unit="m" label="Vertical climbed" note="Nine and a half times the height of Everest. Most of it walked, not run." />
            <StatCard value={fmtInt(streak)} unit="days" label="Longest active streak" note="The longest gap-free run yet, and still counting." />
          </div>
        </section>
      </Container>

      {/* ---- The signature image: every activity, one dot -------------- */}
      <Container>
        <hr className="rule" />
        <div className="dotfig" style={{ paddingBlock: 'var(--sp-6)' }}>
          <Figure
            title="Every activity, one dot"
            note={`One dot for every activity, ${fmtInt(activityLog.length)} in all, stacked into a band per year: 2019 at the top, this year at the foot. Inside each band the dots run left to right in date order and wrap onto as many rows as that year needed, so the height of a band is how much a year held. Colour deepens with the year as well. Hover any dot for its date.`}
            source="Activity Log"
            tableCaption="Activities by year"
            columns={['Year', 'Activities']}
            rows={yearCounts}
          >
            <DotGrid items={items} years={gridYears} />
          </Figure>
          <div className="dotfig__foot">
            <div>
              <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Reading the dots</p>
              <p style={{ margin: 0, color: 'var(--fg-muted)' }}>
                For two years this was a hobby: 27 activities in 2019, 35 in 2020, each a thin stub of
                a band. Then July 2021 flipped a switch. Two activities that June became fifty-eight in
                July, and every year since has cleared 270, filling three or four rows of its own.
              </p>
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>How to read it</p>
              <ul className="dotfig__key">
                <li>Each dot is a single activity.</li>
                <li>Bands are years, oldest at the top, this year at the foot.</li>
                <li>A short band was a quiet year; a deep one, a busy year.</li>
                <li>Colour deepens as the years pass.</li>
              </ul>
            </div>
          </div>
        </div>
      </Container>

      {/* ---- The Switch: the narrative climax, full-bleed -------------- */}
      <div className="bleed bleed--switch">
        <Container>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>The whole story in one month</p>
          <Figure
            title="The switch"
            note="Activities per month across seven years, gaps and all. For two years it barely registered. Then in July 2021 it turned on, and it has not turned off since. This single month is the whole story of the site."
            source="Monthly Trends"
            tableCaption="Activities per month"
            columns={['Month', 'Activities']}
            rows={monthlyTotals.map((mm) => [mm.month, mm.activities])}
          >
            <IgnitionStream rows={monthlyTotals} switchMonth="2021-07" />
          </Figure>
          {switchRate && (
            <div className="grid grid--2" style={{ alignItems: 'center', gap: 'var(--sp-6) var(--sp-8)', paddingTop: 'var(--sp-6)' }}>
              <Figure
                n="01"
                title="A hobby, then a habit"
                note="The same story as one number: activities per calendar month before the switch against every month since. The rate multiplied elevenfold and has held for five years."
                source="Monthly Trends"
                tableCaption="Activities per month, before July 2021 versus since"
                columns={['Era', 'Activities / month']}
                rows={[['Before Jul 2021', switchRate.before.toFixed(1)], ['Since', switchRate.after.toFixed(1)]]}
              >
                <SwitchStep before={switchRate.before} after={switchRate.after} />
              </Figure>
              <div>
                <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>The multiplier</p>
                <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
                  Two-point-eight a month became thirty-one.
                </p>
                <p className="text-muted" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}>
                  Nothing about the effort in any single week looks dramatic. Stacked into a rate, the change is categorical: an eleven-fold jump that never came back down.
                </p>
              </div>
            </div>
          )}
        </Container>
      </div>

      {/* ---- The flip: distance vs climb by sport ---------------------- */}
      <Container>
        <div className="grid grid--2" style={{ alignItems: 'center', gap: 'var(--sp-6) var(--sp-8)', paddingBlock: 'var(--sp-7)' }}>
          <Figure
            title="Walking climbs, running runs"
            note="Each sport's share of the total on the left as distance, on the right as climb. Follow a ribbon across and it flips."
            source="Activity Log"
            tableCaption="Share of distance and share of elevation by foot sport"
            columns={['Sport', 'Distance km', 'Climb m']}
            rows={footFlipData.map((d) => [d.label, fmtInt(d.dist), fmtInt(d.elev)])}
          >
            <FootFlip items={footFlipData} />
          </Figure>
          <div>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>The surprise</p>
            <h2 className="display" style={{ fontSize: 'var(--fs-xl)', margin: '0 0 var(--sp-3)', lineHeight: 1.08 }}>
              Running owns the distance. Walking owns the vertical.
            </h2>
            <p className="measure text-muted" style={{ margin: 0 }}>
              Running is 63% of the kilometres and only 13% of the climb. Flip to elevation and the balance
              inverts: walking and the trails carry three-quarters of it. A single trail run is a fraction of the
              distance and a third of all the vertical. Home is flat; the metres are earned uphill, on foot.
            </p>
          </div>
        </div>
      </Container>

      {/* ---- A closer look: six habit charts, three clean rows --------- */}
      <Container>
        <hr className="rule" />
        <div className="section-head">
          <p className="eyebrow">A closer look</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
            Six things the data shows.
          </h2>
        </div>
        <div className="grid grid--2 closer-grid" style={{ gap: 'var(--sp-8) var(--sp-7)', paddingBottom: 'var(--sp-7)' }}>
          {/* Row 1 — the range of it: where, then what */}
          <Figure
            title="Where in the world"
            note={`Every activity a GPS fix could place, sorted by country. More than nine in ten sit inside Tanzania, home; the rest are passport stamps in ${geoLocated.length - 1} other countries, a handful of activities each, from Kenya to a single run in the UK.`}
            source="Strava GPS + point-in-polygon"
            tableCaption="Located activities by country"
            columns={['Country', 'Activities']}
            rows={geoRows}
          >
            <GeoBubbles rows={countries} />
          </Figure>

          <Figure
            title="Every way to move"
            note="One tile per sport, sized by how many activities it holds. Walking and running swallow the frame; around them sits everything else tried at least once, down to a single afternoon of golf and one canoe trip. Fifteen sports, but four of every five outings are on foot."
            source="Strava Overview"
            tableCaption="Activities by sport type"
            columns={['Sport', 'Activities']}
            rows={sportRows}
            footer={(
              <>
                <p className="eyebrow">The shape of it</p>
                <p>Set walking and running aside and the other thirteen sports together make up barely a sixth of every outing. The range is real, from gravel rides to a single afternoon of sailing, yet the centre of gravity never drifts far from two feet on the ground.</p>
              </>
            )}
          >
            <SportTreemap rows={sportBreakdown} />
          </Figure>

          {/* Row 2 — the rhythm of it: hour of day, then time of year */}
          <Figure
            title="When the day gets moving"
            note="Every activity by the hour it started. Two rushes: a small dawn crowd near 6am and a much larger one after work. Evening, 5 to 8pm, is the busiest window by far, and 6pm the single busiest hour."
            source="Activity Log"
            tableCaption="Activities by hour of day"
            columns={['Hour', 'Activities']}
            rows={hours.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={hours} unit="activities" />
          </Figure>

          <Figure
            title="The year has a season"
            note="Activities by calendar month, all seven years stacked. July, deep in the cool dry season, is the busiest by a clear margin; February is the thinnest. The training has a season, and it tracks the weather."
            source="Activity Log"
            tableCaption="Activities by calendar month"
            columns={['Month', 'Activities']}
            rows={monthCells.map((m) => [m.label, fmtInt(m.value)])}
            footer={(
              <>
                <p className="eyebrow">A weather habit</p>
                <p>The calendar the body keeps is Tanzania&rsquo;s, not the gym&rsquo;s. The long dry season runs June to October, cool and rainless on the central plateau, and those are the months that swell here.</p>
                <p>The lean months line up with the short rains of November and the hot build-up around February. Seven years on, the pattern barely wavers: the training breathes with the seasons.</p>
              </>
            )}
          >
            <HeatStrip cells={monthCells} unit="activities" cellHeight={56} />
          </Figure>

          {/* Row 3 — the habit of it: the move outside, then the streak */}
          <Figure
            title="Off the treadmill"
            note="Each year's activities split into indoor, on a machine, against outdoor, stacked to a full hundred percent. The waterline climbs steadily: nearly two of every three sessions began indoors in the early years, barely one in six by the last. The habit moved outside."
            source="Activity Log"
            tableCaption="Indoor share of activities by year"
            columns={['Year', 'Indoor share']}
            rows={indoorYearRows}
          >
            <IndoorOutdoor activities={activityLog} />
          </Figure>

          <Figure
            title="Rarely a day off"
            note={`Once a day has an activity, the next usually comes fast: four times in five, it is the very next day. Across seven years, ${pctActiveDays}% of all calendar days carry at least one activity, and gaps of three days or more happen less than once in ten.`}
            source="Activity Log"
            tableCaption="Days until the next active day"
            columns={['Gap to next active day', 'Share']}
            rows={gapData.map((g) => [g.label, g.display])}
          >
            <BarChart data={gapData} accent />
          </Figure>
        </div>
      </Container>

      {/* ---- The far edges: greatest-hits teaser into the best pages --- */}
      <div className="bleed bleed--edges">
        <Container>
          <div className="section-head" style={{ paddingBottom: 'var(--sp-5)' }}>
            <p className="eyebrow">The far edges</p>
            <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
              The records hiding in the data.
            </h2>
            <p className="measure text-muted" style={{ margin: 'var(--sp-3) 0 0' }}>
              Quiet feats, never announced, that the seven years quietly produced. A few worth pulling out.
            </p>
          </div>
          <ul className="edges">
            <li><Link className="edgecard" to="/goals">
              <span className="edgecard__stat">2:56:44</span>
              <span className="edgecard__lbl">The one full marathon, run sub&#8209;three&#8209;hours</span>
              <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
            </Link></li>
            <li><Link className="edgecard" to="/goals">
              <span className="edgecard__stat">4 years</span>
              <span className="edgecard__lbl">The Kilimanjaro Half, quicker every single time</span>
              <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
            </Link></li>
            <li><Link className="edgecard" to="/goals">
              <span className="edgecard__stat">100 km</span>
              <span className="edgecard__lbl">A stage race, four evenings back to back</span>
              <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
            </Link></li>
            <li><Link className="edgecard" to="/goals">
              <span className="edgecard__stat">{monthStreak} months</span>
              <span className="edgecard__lbl">Every calendar month, unbroken since the spark</span>
              <span className="edgecard__arrow mono" aria-hidden="true">&rarr;</span>
            </Link></li>
          </ul>
        </Container>
      </div>

      {/* ---- The exit: the full index -------------------------------- */}
      <Container>
        <div style={{ paddingBlock: 'var(--sp-7)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-1)' }}>Explore</p>
          <h2 className="display" style={{ fontSize: 'var(--fs-2xl)', margin: '0 0 var(--sp-5)' }}>
            {cap(NUMWORD[menuItems.length] || String(menuItems.length))} ways in.
          </h2>
          <IndexHub items={menuItems} compact />
        </div>
      </Container>
    </Layout>
  )
}

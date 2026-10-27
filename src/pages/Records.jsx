import { useMemo } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import RecordStairs from '../charts/RecordStairs.jsx'
import CumLine from '../charts/CumLine.jsx'
import ChanceRows from '../charts/ChanceRows.jsx'
import HBars from '../charts/HBars.jsx'
import ColBars from '../charts/ColBars.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { buildRecordReport } from '../lib/recordReport.js'
import { MODE_NAME } from '../lib/footReport.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EVEREST = 8849
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtMonth = (iso) => (iso ? `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtMon = (iso) => (iso ? `${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen']
const word = (n) => WORD[n] || String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
const ordS = (k) => `${k}${k % 10 === 1 && k !== 11 ? 'st' : k % 10 === 2 && k !== 12 ? 'nd' : k % 10 === 3 && k !== 13 ? 'rd' : 'th'}`
const lower = (k) => MODE_NAME[k].toLowerCase()
const tOf = (iso) => Date.parse(iso + 'T12:00:00Z')
const an = (w) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`)

// one record card on the four-column grid
function RecordCard({ kicker, value = 0, unit, label, sub, decimals = 0, tone }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1100 })
  return (
    <li ref={ref} className={`yrec${inView ? ' is-in' : ''}${tone ? ` yrec--${tone}` : ''}`}>
      <p className="yrec__k">{kicker}</p>
      <p className="yrec__v">
        {v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yrec__u">{unit}</span> : null}
      </p>
      <p className="yrec__l">{label}</p>
      {sub ? <p className="yrec__s">{sub}</p> : null}
    </li>
  )
}

export default function Records() {
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const kili = useTable('kili_half')
  const { prev, next } = useSectionPaging('/records')
  const geo = useMemo(() => Object.fromEntries(activityGeo.map((g) => [g.activity_key, g])), [activityGeo])
  const R = useMemo(() => (activities.length ? buildRecordReport(activities, geo, kili) : null), [activities, geo, kili])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'Records' }], number: '04', title: 'Records', subtitle: 'My longest, highest and hardest days', prev, next }
  if (!R || !R.n) return <DetailFrame {...frame} />

  let secN = 0
  const num = () => ++secN
  const endT = tOf(R.lastISO)

  // ---- the distance record ----
  const dP = R.distProg, dNow = dP[dP.length - 1]
  const nearest = R.foot.filter((f) => f.t > dNow.t).reduce((b, f) => (!b || f.km > b.km ? f : b), null)
  const firstOver = (k) => dP.find((r) => r.km >= k)
  const distNotes = [
    firstOver(10) && { t: firstOver(10).t, v: firstOver(10).km, title: 'First 10 km', sub: fmtMon(firstOver(10).date) },
    firstOver(21.0975) && { t: firstOver(21.0975).t, v: firstOver(21.0975).km, title: 'First half', sub: fmtMon(firstOver(21.0975).date) },
    firstOver(30) && { t: firstOver(30).t, v: firstOver(30).km, title: 'First 30 km', sub: fmtMon(firstOver(30).date) },
    { t: dNow.t, v: dNow.km, title: dNow.km >= 42.195 ? 'The marathon' : 'The record', sub: `${k1(dNow.km)} km, ${fmtMon(dNow.date)}` },
  ].filter(Boolean)
  const footPts = R.foot.map((f) => ({ t: f.t, v: f.km, mode: f.mode }))

  // ---- the longest outings ----
  const treadOver30 = R.over30.filter((f) => f.mode === 'tread')
  const outOver30 = R.over30.filter((f) => f.mode !== 'tread').sort((a, b) => b.km - a.km)
  const longestWalk = R.foot.filter((f) => f.sport === 'Walk').reduce((b, f) => (!b || f.km > b.km ? f : b), null)

  // ---- the climb record ----
  const cP = R.climbProg, cNow = cP[cP.length - 1]
  const walkLed = (() => { let i = 0; while (i < cP.length && cP[i].sport === 'Walk') i++; return i })()
  const firstClimb = (k) => cP.find((r) => r.elev >= k)
  const climbNotes = [
    firstClimb(500) && { t: firstClimb(500).t, v: firstClimb(500).elev, title: `First ${n0(firstClimb(500).elev)} m`, sub: `a walk, ${fmtMon(firstClimb(500).date)}` },
    firstClimb(1000) && { t: firstClimb(1000).t, v: firstClimb(1000).elev, title: `First ${n0(firstClimb(1000).elev)} m`, sub: `a ${firstClimb(1000).sport === 'Hike' ? 'hike' : lower(firstClimb(1000).mode)}, ${fmtMon(firstClimb(1000).date)}` },
    { t: cNow.t, v: cNow.elev, title: 'The record', sub: `${n0(cNow.elev)} m, ${fmtMon(cNow.date)}` },
  ].filter(Boolean)
  const climbPts = R.foot.filter((f) => f.elev > 0).map((f) => ({ t: f.t, v: f.elev, mode: f.mode }))
  const bigDayClimb = R.topDaysClimb[0]

  // ---- weeks and months ----
  const wk = R.topWeeksKm[0], moKm = R.topMonthsKm[0], moEl = R.topMonthsClimb[0]
  const sameYearKm = R.topMonthsKm.filter((m) => m.month.slice(0, 4) === moKm.month.slice(0, 4)).length

  // ---- milestones ----
  const lastKm = R.kmMiles[R.kmMiles.length - 1], prevKm = R.kmMiles[R.kmMiles.length - 2]
  const totalKm = R.cum[R.cum.length - 1].km, totalEl = R.cum[R.cum.length - 1].elev
  const ev = R.everests, evLast = ev[ev.length - 1]
  const kmTicks = []
  for (let t = 0; t <= totalKm * 1.04; t += totalKm > 10000 ? 2500 : 1000) kmTicks.push(t)

  const dayOf = (iso) => Math.round((tOf(iso) - tOf(R.firstISO)) / 86400000) + 1

  // ---- personal records ----
  const prBest = R.prByYear.reduce((b, y) => (y.prs > b.prs ? y : b), R.prByYear[0])
  const prLast = R.prByYear[R.prByYear.length - 1]
  const lastYear = Number(R.lastISO.slice(0, 4))
  const so = R.lastISO.slice(5) < '12-31' ? ' so far' : ''
  const prMax = Math.max(...R.prByYear.map((y) => y.prs))
  const prTicks = []; for (let t = 0; t <= prMax * 1.1; t += prMax > 60 ? 25 : 10) prTicks.push(t)

  // ---- streaks ----
  const S = R.streaks
  const streakRows = [
    { key: 'road', label: 'Any outing', sub: 'days in a row', value: S.any.len, display: `${S.any.len} days` },
    { key: 'walk', label: 'On foot', sub: 'run, walk, trail or hike', value: S.foot.len, display: `${S.foot.len} days` },
    { key: 'tread', label: 'Running', sub: 'run or trail run', value: S.run.len, display: `${S.run.len} days` },
    { key: 'quiet', label: 'Walking', sub: 'a walk every day', value: S.walk.len, display: `${S.walk.len} days` },
  ]

  // ---- where ----
  const regs = R.regions.slice(0, 6)
  const regTop = Object.entries(R.top20Regions).sort((a, b) => b[1] - a[1])
  const top20N = Object.values(R.top20Regions).reduce((s, v) => s + v, 0)

  // ---- the maths ----
  const SR = R.sportRecords
  const chanceRows = [
    { key: 'road', label: 'Distance, all', sub: `${n0(R.n)} outings`, actual: dP.length, expected: R.expected },
    { key: 'trail', label: 'Climb, all', sub: `${n0(R.climbN)} outings`, actual: cP.length, expected: R.climbExpected },
    { key: 'tread', label: 'Runs', sub: `${n0(SR.Run.n)} outings`, actual: SR.Run.broken, expected: SR.Run.expected },
    { key: 'walk', label: 'Walks', sub: `${n0(SR.Walk.n)} outings`, actual: SR.Walk.broken, expected: SR.Walk.expected },
    { key: 'trail', label: 'Trail runs', sub: `${SR.TrailRun.n} outings`, actual: SR.TrailRun.broken, expected: SR.TrailRun.expected },
    { key: 'hike', label: 'Hikes', sub: `${SR.Hike.n} outings`, actual: SR.Hike.broken, expected: SR.Hike.expected },
  ]
  const pEarly = 1 - R.distStanding.outingsSince / R.n
  const stoodMax = Math.max(...R.distStood.map((s) => s.days))
  const stoodPrev = R.distStood.filter((s) => !s.standing).reduce((b, s) => (s.days > b.days ? s : b), { days: 0 })
  const stoodTicks = []; for (let t = 0; t <= stoodMax * 1.08; t += stoodMax > 1200 ? 500 : 200) stoodTicks.push(t)

  return (
    <DetailFrame
      {...frame}
      lede="The records I&rsquo;ve set on foot and how I got to them: my longest outings and biggest climbs, my biggest weeks and months, the milestones along the way, my personal records and streaks, and how often a record should break by chance."
    >
      <div className="yis-report">
        {/* ===== the distance record ===== */}
        <section className="sgrid yis-top" aria-labelledby="rc-title">
          <div className="sgrid__head">
            <p className="eyebrow">The distance record</p>
            <h2 id="rc-title" className="section-head__title">The record broke {dP.length}&nbsp;times.</h2>
            <p className="section-head__sub">The longest outing on foot has stood since {fmtMonth(dNow.date)}.</p>
          </div>
          <Reveal as="p" className="sgrid__statement">
            Every time I go out on foot, I&rsquo;m up against my longest outing so far. My first record was a {k1(dP[0].km)} km {lower(dP[0].mode)}, the first time I went out on foot.
            {firstOver(10) ? ` I reached 10 km ${dayOf(firstOver(10).date) === 2 ? 'the next day' : `${dayOf(firstOver(10).date) - 1} days later`},` : ''}
            {firstOver(21.0975) ? ` a half marathon in ${fmtMonth(firstOver(21.0975).date)},` : ''}
            {firstOver(30) ? ` 30 km in ${fmtMonth(firstOver(30).date)}` : ''} and {k1(dNow.km)} km on a {lower(dNow.mode).replace(' run', '')} on {fmtDay(dNow.date)}.
            {nearest ? ` In the ${n0(R.distStanding.outingsSince)} outings since then, the closest I’ve come is ${k1(nearest.km)} km, on ${an(lower(nearest.mode))}.` : ''}
          </Reveal>
          <OddsRow
            title="The longest outing on foot"
            items={[
              { num: dP.length, unit: '', label: 'times the record broke', tone: 'move' },
              { num: dNow.km, dec: 1, unit: ' km', label: 'the record now', tone: 'move' },
              { num: R.distStanding.days, unit: ' days', label: 'it has stood', tone: 'rest' },
              { num: R.distStanding.outingsSince, unit: '', label: 'outings since, none longer', tone: 'rest' },
            ]}
          />
          <div className="rst__head">
            <p className="rst__key">Every outing on foot I&rsquo;ve logged. The black line is my longest so far, and it steps up each time I beat it.</p>
            <ul className="fmap__legend" aria-label="Colour key">
              {['tread', 'road', 'trail', 'walk', 'hike'].map((k) => <li key={k}><i className={`msw msw--${k}`} aria-hidden="true" />{MODE_NAME[k]}</li>)}
            </ul>
          </div>
          <RecordStairs
            points={footPts} records={dP.map((r) => ({ t: r.t, v: r.km }))} endT={endT} notes={distNotes}
            yMax={45} yTicks={[0, 10, 20, 30, 40]} yFmt={(v) => `${v} km`} valFmt={(v) => `${k1(v)} km`} alive tall
            aria={`Every outing on foot by date and distance, with the distance record as a staircase. It broke ${dP.length} times: ${dP.map((r) => `${k1(r.km)} km on ${fmtDay(r.date)}`).join(', ')}.`}
          />
          <p className="source">Source: Activity Log · distance of every run, walk, trail run and hike</p>
        </section>

        {/* ===== 1. the longest outings ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-long"
          eyebrow={`${num()} · The longest outings`}
          title={`${cap(word(R.over30.length))} outings past 30 km.`}
          sub={`${cap(word(treadOver30.length))} of them were on a treadmill.`}
          statement={<>
            {n0(R.halfUp.length)} of my outings reached a half marathon (21.1 km) and {word(R.over30.length)} went past 30 km. The {word(treadOver30.length)} on the treadmill
            were all between {fmtMon(treadOver30[0]?.date)} and {fmtMon(treadOver30[treadOver30.length - 1]?.date)}. Since then my long days have been outside:{' '}
            {outOver30.map((f) => `${/^(8|11\.|18\.)/.test(k1(f.km)) ? 'an' : 'a'} ${k1(f.km)} km ${lower(f.mode)}${f.elev >= 300 ? ` with ${n0(f.elev)} m of climb` : ''}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            Apart from the marathon, my biggest day on foot was {fmtDay(R.topDaysKm[1].date)}, when {word(R.topDaysKm[1].n)} outings added up to {k1(R.topDaysKm[1].km)} km.
          </>}
          odds={{
            title: 'Long outings on foot',
            items: [
              { num: R.halfUp.length, unit: '', label: 'outings of 21.1 km or more', tone: 'move' },
              { num: R.over30.length, unit: '', label: 'outings past 30 km', tone: 'move' },
              { num: treadOver30.length, unit: '', label: 'of those on a treadmill', tone: 'rest' },
              { num: longestWalk ? longestWalk.km : 0, dec: 1, unit: ' km', label: 'the longest walk', tone: 'move' },
            ],
          }}
          left={{
            title: 'The ten longest outings',
            node: (
              <HBars
                aria={`The ten longest outings: ${R.longest.map((f) => `${k1(f.km)} km, ${lower(f.mode)}, ${fmtDay(f.date)}`).join('; ')}.`}
                rows={R.longest.map((f) => ({ key: f.mode, label: fmtDay(f.date), sub: `${lower(f.mode)}${f.elev > 0 ? ` · ${n0(f.elev)} m up` : ''}`, value: f.km, display: `${k1(f.km)} km` }))}
              />
            ),
          }}
          right={{
            title: 'The biggest days on foot',
            node: (
              <HBars
                aria={`The days with the most distance on foot: ${R.topDaysKm.map((d) => `${fmtDay(d.date)}, ${k1(d.km)} km over ${d.n} outings`).join('; ')}.`}
                rows={R.topDaysKm.map((d, i) => ({ key: i ? 'quiet' : 'road', label: fmtDay(d.date), sub: `${d.n} outing${d.n > 1 ? 's' : ''} · ${hm(d.min)}`, value: d.km, display: `${k1(d.km)} km` }))}
              />
            ),
          }}
          leftNote={<>My ten longest single outings. The light orange ones were on the treadmill.</>}
          rightNote={<>Here the outings on the same day are added together. Only the marathon got there in one go.</>}
          source="Activity Log · distance of single outings and of whole days on foot"
        />

        {/* ===== 2. the climb ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-climb"
          eyebrow={`${num()} · The climb`}
          title={`${cP.length} climb records.`}
          sub={`The biggest climb on foot went from ${n0(cP[0].elev)} m to ${n0(cNow.elev)} m.`}
          statement={<>
            My first {word(walkLed)} climbing records were all walks, up to {n0(cP[walkLed - 1].elev)} m in {fmtMonth(cP[walkLed - 1].date)}. After that the hikes took over:{' '}
            {cP.slice(walkLed).map((r) => `${n0(r.elev)} m in ${fmtMonth(r.date)}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            My biggest day of climbing was {fmtDay(bigDayClimb.date)}, when {word(bigDayClimb.n)} outings added up to {n0(bigDayClimb.elev)} m, more than any single outing.
          </>}
          odds={{
            title: 'The biggest climb on foot',
            items: [
              { num: cP.length, unit: '', label: 'times the record broke', tone: 'move' },
              { num: cNow.elev, unit: ' m', label: 'the record now', tone: 'move' },
              { num: R.climbStanding.days, unit: ' days', label: 'it has stood', tone: 'rest' },
              { num: bigDayClimb.elev, unit: ' m', label: `in one day, ${fmtDay(bigDayClimb.date)}`, tone: 'move' },
            ],
          }}
          left={{
            title: 'The climbing record over time, in metres up',
            node: (
              <RecordStairs
                points={climbPts} records={cP.map((r) => ({ t: r.t, v: r.elev }))} endT={endT} notes={climbNotes}
                yMax={2200} sqrt yTicks={[0, 100, 500, 1000, 2000]} yFmt={(v) => n0(v)} valFmt={(v) => `${n0(v)} m up`}
                aria={`Every outing with climb, by date and metres up, with the climbing record as a staircase. It broke ${cP.length} times, last ${n0(cNow.elev)} metres on ${fmtDay(cNow.date)}.`}
              />
            ),
          }}
          right={{
            title: 'The eight biggest climbs',
            node: (
              <HBars
                aria={`The biggest single climbs: ${R.climbs.slice(0, 8).map((f) => `${n0(f.elev)} metres, ${lower(f.mode)}, ${fmtDay(f.date)}`).join('; ')}.`}
                rows={R.climbs.slice(0, 8).map((f) => ({ key: f.mode, label: fmtDay(f.date), sub: `${f.sport === 'Hike' ? 'hike' : lower(f.mode)}${f.region ? ` · ${f.region}` : ''}`, value: f.elev, display: `${n0(f.elev)} m` }))}
              />
            ),
          }}
          leftNote={<>Every outing with some climbing in it. I stretched the bottom of the scale so the small climbs still show.</>}
          rightNote={<>My biggest single climbs and the region each one started in. The top three were hikes and the rest were trail runs.</>}
          source="Activity Log · elevation gain of single outings on foot; start region from Strava GPS"
        />

        {/* ===== 3. weeks and months ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-months"
          eyebrow={`${num()} · The biggest weeks and months`}
          title={`${fmtMonth(moEl.month)} climbed the most.`}
          sub={`${n0(moEl.elev)} m in one month, the most of any.`}
          statement={<>
            My biggest week for distance started on {fmtDay(wk.start)}, with {n0(wk.km)} km from {word(wk.n)} outings. My biggest month was {fmtMonth(moKm.month)}, with {n0(moKm.km)} km,
            and {sameYearKm === R.topMonthsKm.length ? `all ${word(sameYearKm)} of my biggest months for distance` : `${word(sameYearKm)} of my ${word(R.topMonthsKm.length)} biggest months for distance`} were in {moKm.month.slice(0, 4)}.
            My biggest month for climbing was a different one. In {fmtMonth(moEl.month)} I climbed {n0(moEl.elev)} m, {Math.round((moEl.elev / EVEREST) * 100)}% of an Everest in a single month, from only {n0(moEl.km)} km.
          </>}
          odds={{
            title: 'The biggest stretches',
            items: [
              { num: wk.km, unit: ' km', label: `in the week of ${fmtDay(wk.start)}`, tone: 'move' },
              { num: moKm.km, unit: ' km', label: `in ${fmtMonth(moKm.month)}`, tone: 'move' },
              { num: moEl.elev, unit: ' m', label: `climbed in ${fmtMonth(moEl.month)}`, tone: 'move' },
              { value: moEl.elev / EVEREST, label: 'of an Everest in that month', tone: 'rest' },
            ],
          }}
          left={{
            title: 'The biggest weeks by distance',
            node: (
              <HBars
                aria={`The biggest weeks by distance on foot: ${R.topWeeksKm.map((w) => `week of ${fmtDay(w.start)}, ${n0(w.km)} km`).join('; ')}.`}
                rows={R.topWeeksKm.map((w, i) => ({ key: i ? 'quiet' : 'road', label: `Week of ${fmtDay(w.start)}`, sub: `${w.n} outings`, value: w.km, display: `${n0(w.km)} km` }))}
              />
            ),
          }}
          right={{
            title: 'The biggest months by climb',
            node: (
              <HBars
                aria={`The biggest months by climb on foot: ${R.topMonthsClimb.map((m) => `${fmtMonth(m.month)}, ${n0(m.elev)} metres`).join('; ')}.`}
                rows={R.topMonthsClimb.map((m, i) => ({ key: i ? 'quiet' : 'trail', label: fmtMonth(m.month), sub: `${n0(m.km)} km · ${m.n} outings`, value: m.elev, display: `${n0(m.elev)} m` }))}
              />
            ),
          }}
          leftNote={<>Every week on foot, Monday to Sunday. My biggest is in orange.</>}
          rightNote={<>The months when I climbed the most were hardly ever the months when I went the furthest. The climbing came from trips to the mountains and the distance mostly from the treadmill.</>}
          source="Activity Log · distance and climb on foot by week and by month"
        />

        {/* ===== 4. milestones ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-miles"
          eyebrow={`${num()} · Milestones`}
          title="The kilometres came faster."
          sub={`The first 1,000 km took ${n0(R.kmMiles[0].days)} days. The last ${n0(lastKm.mark - prevKm.mark)} took ${n0(lastKm.days)}.`}
          statement={<>
            I passed 1,000 km on foot on {fmtDay(R.kmMiles[0].date)}, and {n0(R.kmMiles[1].mark)} km {n0(R.kmMiles[1].days)} days after that.
            {R.kmMiles.find((k) => k.mark === 10000) ? ` I reached 10,000 km on ${fmtDay(R.kmMiles.find((k) => k.mark === 10000).date)}.` : ''}
            {' '}I like to count my climbing in Everests, at 8,849 m each. The first one took me {n0(ev[0].days)} days and the {ORD[evLast.k] || ordS(evLast.k)} took {n0(evLast.days)}.
            So far I&rsquo;m at {n0(totalKm)} km and {k1(totalEl / EVEREST)} Everests.
          </>}
          odds={{
            title: 'The running totals',
            items: [
              { num: totalKm, unit: ' km', label: 'on foot in all', tone: 'move' },
              { num: totalEl / EVEREST, dec: 1, unit: '', label: 'Everests climbed', tone: 'move' },
              { num: ev[0].days, unit: ' days', label: 'for the first Everest', tone: 'rest' },
              { num: evLast.days, unit: ' days', label: `for the ${ORD[evLast.k] || ordS(evLast.k)}`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Kilometres on foot, adding up',
            node: (
              <CumLine
                series={R.cum.map((c) => ({ t: c.t, v: c.km }))}
                marks={R.kmMiles.map((k) => ({ t: tOf(k.date), v: k.mark, label: `${n0(k.mark)} km` }))}
                yTicks={kmTicks} yFmt={(v) => n0(v)} yCap="km ↑"
                aria={`Total kilometres on foot over time. Milestones: ${R.kmMiles.map((k) => `${n0(k.mark)} km on ${fmtDay(k.date)}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'Days to climb each Everest',
            node: (
              <ColBars
                items={ev.map((e, i) => ({ label: ordS(e.k), value: e.days, display: n0(e.days), tone: i === ev.length - 1 ? 'big' : i === 0 ? 'quiet' : 'mid' }))}
                ticks={[0, 250, 500, 750, 1000].filter((t) => t <= Math.max(...ev.map((e) => e.days)) * 1.1)} tickFmt={(v) => n0(v)} yCap="days &uarr;" xCap="each Everest of 8,849 m &rarr;"
                aria={`Days taken to climb each Everest's height on foot: ${ev.map((e) => `${ordS(e.k)} ${e.days} days`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>My kilometres on foot, added up as I went, with the date I passed each milestone.</>}
          rightNote={<>How long each Everest of climbing took me. The first one took years, and the latest took {n0(evLast.days)} days.</>}
          source="Activity Log · running totals of distance and climb on foot"
        />

        {/* ===== 7. personal records ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-prs"
          eyebrow={`${num()} · Personal records`}
          title={prBest.year === lastYear ? `${n0(prLast.prs)} personal records in ${lastYear}.` : `${n0(prBest.prs)} personal records in ${prBest.year}.`}
          sub={prBest.year === lastYear ? 'The most of any year, and the year isn’t over.' : 'The most of any year.'}
          statement={<>
            A personal record here is my best time on a Strava segment, a timed stretch of road or trail, beating every earlier time of mine on it.
            {' '}I&rsquo;ve set {n0(R.prTotal)} on foot, over {n0(R.prOutings)} outings. My treadmill runs set almost none, because segments need GPS.
            {' '}By year, that&rsquo;s {R.prByYear.filter((y) => y.prs > 0).map((y) => `${y.prs} in ${y.year}${y.year === lastYear ? so : ''}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            {' '}In {lastYear}{so} I&rsquo;m setting {prLast.rate.toFixed(2)} per outing, more than ever before.
          </>}
          odds={{
            title: 'Segment bests on foot',
            items: [
              { num: R.prTotal, unit: '', label: 'personal records in all', tone: 'move' },
              { num: R.prOutings, unit: '', label: 'outings that set at least one', tone: 'rest' },
              { num: prLast.prs, unit: '', label: `in ${lastYear}${so}`, tone: 'move' },
              { num: prLast.rate, dec: 2, unit: '', label: `per outing in ${lastYear}`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Personal records, year by year',
            node: (
              <ColBars
                items={R.prByYear.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.prs, display: String(y.prs), tone: y.year === prBest.year ? 'big' : y.prs ? 'mid' : 'quiet' }))}
                ticks={prTicks} yCap="records &uarr;"
                aria={`Personal records each year: ${R.prByYear.map((y) => `${y.year} ${y.prs}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'Personal records per outing',
            node: (
              <ColBars
                items={R.prByYear.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.rate, display: y.rate.toFixed(2), tone: y.year === lastYear ? 'big' : y.rate ? 'mid' : 'quiet' }))}
                ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5].filter((t) => t <= Math.max(...R.prByYear.map((y) => y.rate)) * 1.15)} tickFmt={(v) => v.toFixed(1)} yCap="per outing &uarr;"
                aria={`Personal records per outing each year: ${R.prByYear.map((y) => `${y.year} ${y.rate.toFixed(2)}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>My personal records on foot, year by year.</>}
          rightNote={<>The same records per outing. I&rsquo;m beating my old times more often now than ever.</>}
          source="Activity Log · personal records (Strava segment bests) on runs, walks, trail runs and hikes"
        />

        {/* ===== 8. streaks ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-streaks"
          eyebrow={`${num()} · Streaks`}
          title={`${n0(S.any.len)} days in a row.`}
          sub={S.any.current === S.any.len ? 'The longest streak on record, and still going.' : 'The longest streak on record.'}
          statement={<>
            My longest run of days with an outing began on {fmtDay(S.any.startISO)}{S.any.current === S.any.len ? ` and I haven’t missed a day since: ${n0(S.any.len)} days to ${fmtDay(S.any.endISO)}` : ` and lasted ${n0(S.any.len)} days`}.
            {' '}In weeks, I&rsquo;ve been out at least once for {n0(S.week.len)} weeks in a row{S.week.current === S.week.len ? `, every week since ${fmtDay(S.week.startISO)}` : ''}.
            {' '}Counting only days on foot, my best is {n0(S.foot.len)}. For running alone it&rsquo;s {S.run.len}, and for walking alone {S.walk.len}.
            {' '}The opposite record is from the early years: {n0(S.longGap.len)} days with no outing at all, from {fmtMonth(S.longGap.from)} to {fmtMonth(S.longGap.to)}.
          </>}
          odds={{
            title: 'In a row',
            items: [
              { num: S.any.len, unit: ' days', label: S.any.current === S.any.len ? 'with an outing, still going' : 'with an outing, the best', tone: 'move' },
              { num: S.week.len, unit: ' weeks', label: 'with at least one outing', tone: 'move' },
              { num: S.run.len, unit: ' days', label: 'running in a row', tone: 'move' },
              { num: S.longGap.len, unit: ' days', label: 'without one, the longest gap', tone: 'rest' },
            ],
          }}
          left={{
            title: 'The eight longest runs of days',
            node: (
              <HBars
                aria={`The longest runs of consecutive days with an outing: ${S.top.map((s) => `${s.len} days from ${fmtDay(s.startISO)}`).join('; ')}.`}
                rows={S.top.map((s) => ({ key: s.current ? 'road' : 'quiet', label: fmtMon(s.startISO), sub: `to ${fmtDay(s.endISO)}${s.current ? ', still going' : ''}`, value: s.len, display: `${s.len} days` }))}
              />
            ),
          }}
          right={{
            title: 'The best streak of each kind',
            node: (
              <HBars
                aria={`Longest streaks in days: ${streakRows.map((r) => `${r.label} ${r.value}`).join(', ')}.`}
                rows={streakRows}
              />
            ),
          }}
          leftNote={<>My longest runs of days in a row. The orange one is still going.</>}
          rightNote={<>No single sport keeps my streak going on its own. It lasts because some days are runs, some are walks and some are something else.</>}
          source="Activity Log · consecutive days and weeks with an outing (weeks run Monday to Sunday)"
        />

        {/* ===== 9. where ===== */}
        {regs.length >= 3 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="rc-where"
              eyebrow={`${num()} · Where the records were set`}
              title={`${regTop[0][0]} has my big climbs.`}
              sub={`${cap(word(regTop[0][1]))} of the ${top20N} biggest climbs started there.`}
              statement={<>
                Of my {top20N} biggest single climbs on foot, {regTop.map(([k, v]) => `${v} started in ${k}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
                {' '}My biggest climb in each region was {regs.map((f) => `${f.region} ${n0(f.elev)} m`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
              </>}
              odds={{
                title: 'Climbs by region of Tanzania',
                items: [
                  { num: regTop[0][1], unit: '', label: `of the top ${top20N} climbs in ${regTop[0][0]}`, tone: 'move' },
                  { num: regs[0].elev, unit: ' m', label: `the biggest, in ${regs[0].region}`, tone: 'move' },
                  { num: regs[1].elev, unit: ' m', label: `the biggest in ${regs[1].region}`, tone: 'rest' },
                  { num: regs[2].elev, unit: ' m', label: `the biggest in ${regs[2].region}`, tone: 'rest' },
                ],
              }}
              left={{
                title: 'The biggest climb in each region',
                node: (
                  <HBars
                    aria={`Biggest single climb by region: ${regs.map((f) => `${f.region} ${n0(f.elev)} metres`).join(', ')}.`}
                    rows={regs.map((f) => ({ key: f.mode, label: f.region, sub: `${f.sport === 'Hike' ? 'hike' : lower(f.mode)} · ${fmtMon(f.date)}`, value: f.elev, display: `${n0(f.elev)} m` }))}
                  />
                ),
              }}
              right={{
                title: `Where the ${top20N} biggest climbs started`,
                node: (
                  <ColBars
                    items={regTop.map(([k, v], i) => ({ label: k, value: v, display: String(v), tone: i ? 'mid' : 'big' }))}
                    ticks={[0, 5, 10, 15].filter((t) => t <= regTop[0][1] * 1.2)} yCap="climbs &uarr;"
                    aria={`Of the ${top20N} biggest climbs: ${regTop.map(([k, v]) => `${k} ${v}`).join(', ')}.`}
                  />
                ),
              }}
              leftNote={<>My biggest climb in each region of Tanzania.</>}
              rightNote={<>My big climbs are bunched into a few mountain regions. The rest of the places I go are fairly flat.</>}
              source="Activity Log and Strava GPS start points · Tanzania regions"
            />
          </>
        )}

        {/* ===== 10. the maths of records ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="rc-maths"
          eyebrow={`${num()} · The maths of records`}
          title={dP.length > R.expected ? 'More records than chance.' : 'Fewer records than chance.'}
          sub={`The distance record broke ${dP.length} times. A random order would give ${k1(R.expected)}.`}
          statement={<>
            If my outings had come in a random order, a record would break about ln(n) + 0.58 times, where n is the number of outings. Early on almost anything is a record,
            and later almost nothing is. For my {n0(R.n)} outings that comes to {k1(R.expected)}. My distance record actually broke {dP.length} times, {k1(dP.length / R.expected)} times as often.
            My runs on their own broke their record {SR.Run.broken} times, compared with {k1(SR.Run.expected)} by chance. My walks broke theirs {SR.Walk.broken} times, compared with {k1(SR.Walk.expected)}, which is about what chance would give.
            My current record has stood for {n0(R.distStanding.outingsSince)} outings. In a random order, the longest outing would come this early {Math.round(pEarly * 100)}% of the time.
          </>}
          odds={{
            title: 'Records against chance',
            items: [
              { num: dP.length, unit: '', label: 'times the distance record broke', tone: 'move' },
              { num: R.expected, dec: 1, unit: '', label: 'times chance would give', tone: 'rest' },
              { num: SR.Run.broken / SR.Run.expected, dec: 1, unit: '×', label: 'chance, for runs alone', tone: 'move' },
              { value: pEarly, label: 'chance the record would stand this long', tone: 'rest' },
            ],
          }}
          left={{
            title: 'Times each record broke, against chance',
            node: (
              <ChanceRows
                rows={chanceRows}
                aria={`Times each record broke against the number expected by chance: ${chanceRows.map((r) => `${r.label} ${r.actual} against ${r.expected.toFixed(1)}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'How long each distance record stood',
            node: (
              <ColBars
                items={R.distStood.map((s, i) => ({ label: String(i + 1), value: Math.max(s.days, 0.5), display: s.standing || s.days >= 400 ? n0(s.days) : '', tone: s.standing ? 'big' : s.days > 100 ? 'mid' : 'quiet' }))}
                ticks={stoodTicks} tickFmt={(v) => n0(v)} yCap="days stood &uarr;" xCap="each record, in order &rarr;"
                aria={`Days each distance record stood: ${R.distStood.map((s) => `${k1(s.km)} km ${s.days} days${s.standing ? ', still standing' : ''}`).join('; ')}.`}
              />
            ),
          }}
          leftNote={<>The bars are how often my records actually broke. The rings are what you&rsquo;d expect if the same outings came in a random order.</>}
          rightNote={<>Most of my records only lasted days. Before the current one, the longest-lasting record stood for {n0(stoodPrev.days)} days from {fmtMon(stoodPrev.date)}. The last one, in orange, is still standing.</>}
          source="Activity Log · record counts against the harmonic expectation for a random order"
        />

        {/* ===== 11. the hall of fame ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="rc-edges">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · All my records</p>
            <h2 id="rc-edges" className="section-head__title">My record&nbsp;book.</h2>
          </div>
          <ul className="yrecs">
            <RecordCard kicker="Longest outing" value={dNow.km} decimals={1} unit="km" label={an(lower(dNow.mode))} sub={fmtDay(dNow.date)} tone="hot" />
            <RecordCard kicker="Biggest climb" value={cNow.elev} unit="m" label={`${an(cNow.sport === 'Hike' ? 'hike' : lower(cNow.mode))} of ${k1(cNow.km)} km`} sub={fmtDay(cNow.date)} tone="hot" />
            <RecordCard kicker="Biggest day of climb" value={bigDayClimb.elev} unit="m" label={`from ${word(bigDayClimb.n)} outings, ${k1(bigDayClimb.km)} km`} sub={fmtDay(bigDayClimb.date)} tone="hot" />
            <RecordCard kicker="Biggest week" value={wk.km} unit="km" label={`from ${word(wk.n)} outings`} sub={`week of ${fmtDay(wk.start)}`} tone="hot" />
            <RecordCard kicker="Biggest month" value={moKm.km} unit="km" label={`from ${moKm.n} outings`} sub={fmtMonth(moKm.month)} />
            <RecordCard kicker="Longest streak" value={S.any.len} unit="days" label={S.any.current === S.any.len ? 'in a row, still going' : 'in a row'} sub={`from ${fmtDay(S.any.startISO)}`} />
            <RecordCard kicker="Most kudos" value={R.topKudos[0].kudos} label={`on ${an(lower(R.topKudos[0].mode))} of ${k1(R.topKudos[0].km)} km`} sub={fmtDay(R.topKudos[0].date)} />
            <RecordCard kicker="Most records in one outing" value={R.topPr[0].prs} label={`personal records${R.topPr.filter((f) => f.prs === R.topPr[0].prs).length > 1 ? `, ${word(R.topPr.filter((f) => f.prs === R.topPr[0].prs).length)} times over` : ''}`} sub={`latest ${fmtDay(R.topPr[0].date)}`} />
          </ul>
          <p className="source">Source: Activity Log · single outings, days, weeks and months on foot</p>
        </section>
      </div>
    </DetailFrame>
  )
}

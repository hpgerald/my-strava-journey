import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import FootMap from '../charts/FootMap.jsx'
import ShareRows from '../charts/ShareRows.jsx'
import StackCols from '../charts/StackCols.jsx'
import SpikeHist from '../charts/SpikeHist.jsx'
import Ridges from '../charts/Ridges.jsx'
import RangeCols from '../charts/RangeCols.jsx'
import Grades from '../charts/Grades.jsx'
import HBars from '../charts/HBars.jsx'
import FitScatter from '../charts/FitScatter.jsx'
import ColBars from '../charts/ColBars.jsx'
import TwoLines from '../charts/TwoLines.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { slugify } from '../lib/slug.js'
import { buildFootReport, SPORTS, SPORT_NAME, MODES, MODE_NAME, MODE_SHORT, TREAD_MIN } from '../lib/footReport.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pc = (v) => Math.round((v || 0) * 100)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const pace = (p) => { const m = Math.floor(p), s = Math.round((p - m) * 60); return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}` }
const fmtMonth = (iso) => (iso ? `${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtH = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const ofSport = (s) => ({ Run: 'runs', Walk: 'walks', TrailRun: 'trail runs', Hike: 'hikes' }[s])

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

export default function Sports() {
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/sports')
  const r = useMemo(() => (activities.length ? buildFootReport(activities) : null), [activities])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'Sports' }], number: '03', title: 'Sports', subtitle: 'My four sports on foot', prev, next }
  if (!r) return <DetailFrame {...frame} />

  const { total: T, sport: S, mode: M, byYear: BY } = r
  const latest = BY[BY.length - 1]
  const LY = latest.year
  const partial = r.lastISO.slice(5) < '12-31'
  const so = partial ? ' so far' : ''
  const yr = (y) => BY.find((b) => b.year === y)
  const habit = BY.filter((b) => b.year >= 2021)
  let secN = 0
  const num = () => ++secN

  // ---- 1. who does what ----
  const share = (k, s) => S[s][k] / Math.max(1e-9, SPORTS.reduce((t, x) => t + S[x][k], 0))
  const climbOff = 1 - share('elev', 'Run')
  const walkHoursMore = S.Walk.hours > S.Run.hours

  // ---- 2. the mix ----
  const walkLead = BY.find((b) => b.km.Walk > b.km.Run)
  const runPeak = BY.reduce((b, x) => (x.km.Run > b.km.Run ? x : b), BY[0])
  const trailPeak = BY.reduce((b, x) => (x.km.TrailRun > b.km.TrailRun ? x : b), BY[0])
  const walkBase = yr(2021) || BY[0]

  // ---- 3. the treadmill ----
  const treadShare = M.tread.km / Math.max(1, M.tread.km + M.road.km)
  const indoorShare = (b) => b.treadKm / Math.max(1e-9, b.treadKm + b.roadKm)
  const peakIndoor = habit.reduce((b, x) => (indoorShare(x) > indoorShare(b) ? x : b), habit[0])
  const firstUnderHalf = BY.find((b) => b.year >= 2021 && indoorShare(b) < 0.5)

  // ---- 4. pace ----
  const paceYears = BY.filter((b) => b.treadPace)
  const quickYear = paceYears.reduce((b, x) => (x.treadPace.med < b.treadPace.med ? x : b), paceYears[0])

  // ---- 5. walks ----
  const walkYears = BY.filter((b) => b.year >= 2021 && b.walkN >= 20)
  const w0 = walkYears[0], w1 = walkYears[walkYears.length - 1]
  const walkHalves = BY.reduce((t, b) => t + b.long.walk, 0)
  const shortEarly = walkYears.filter((b) => b.year <= 2024)
  const shortEarlyAvg = shortEarly.reduce((t, b) => t + b.walkShort, 0) / Math.max(1, shortEarly.length)

  // ---- 6. the long days ----
  const longAll = BY.reduce((t, b) => t + b.longN, 0)
  const longTread = BY.reduce((t, b) => t + b.long.tread, 0)
  const early = BY.filter((b) => b.year <= 2022)
  const earlyLong = early.reduce((t, b) => t + b.longN, 0), earlyTread = early.reduce((t, b) => t + b.long.tread, 0)
  const lastLongOut = latest.longN - latest.long.tread

  // ---- 7. climb ----
  const climbModes = MODES.slice().sort((a, b) => M[b].mPerKm - M[a].mPerKm)
  const topClimbsOffRoad = r.climbs.every((c) => c.mode === 'hike' || c.mode === 'trail')
  const big = r.climbs[0]

  // ---- 8. when ----
  const peakHour = (k) => M[k].hours24.indexOf(Math.max(...M[k].hours24))
  const treadEve = M.tread.hours24.slice(19, 24).reduce((t, v) => t + v, 0) / Math.max(1, M.tread.n)
  const walkEve = M.walk.hours24.slice(16, 19).reduce((t, v) => t + v, 0) / Math.max(1, M.walk.n)

  // ---- 9. doubles ----
  const D = r.doubles
  const dblPeak = Object.entries(D.perYear).reduce((b, [y, n]) => (n > b[1] ? [y, n] : b), ['', 0])
  const under30 = D.gapBins[0].n
  const far8 = D.gapBins[D.gapBins.length - 1].n

  // ---- 10. effort and reward ----
  const rated = MODES.filter((k) => M[k].effortN >= 20).sort((a, b) => M[b].effortPerHour - M[a].effortPerHour)
  const unrated = MODES.filter((k) => M[k].effortN < 20)
  const kudosTop = MODES.slice().sort((a, b) => M[b].kudosPer - M[a].kudosPer)[0]

  // ---- 11. the maths ----
  const F = r.treadFit, WF = r.weekFit
  const secPerKm = Math.round(-F.slope * 60)
  const at = (k) => r.treadAt.find((x) => x.km === k)
  const at5 = at(5), at21 = at(21)
  const gain = at5 && at21 ? Math.round((at5.pace - at21.pace) * 60) : 0
  const wkMaxX = Math.max(...WF.points.map((p) => p.x)), wkMaxY = Math.max(...WF.points.map((p) => p.y))
  const strength = (v) => { const a = Math.abs(v); return a < 0.1 ? 'close to none' : a < 0.3 ? 'weak' : a < 0.5 ? 'moderate' : 'strong' }

  // ticks
  const stepOf = (max) => (max > 2000 ? 1000 : max > 800 ? 500 : max > 200 ? 100 : max > 60 ? 20 : max > 20 ? 5 : 2)
  const ticksTo = (max) => { const st = stepOf(max); const out = []; for (let t = 0; t <= max * 1.04; t += st) out.push(t); return out }
  const kmYearMax = Math.max(...BY.map((b) => SPORTS.reduce((t, s) => t + b.km[s], 0)))
  const runYearMax = Math.max(...BY.map((b) => b.treadKm + b.roadKm))
  const longMax = Math.max(...BY.map((b) => b.longN))
  const dblMax = Math.max(...Object.values(D.perYear))
  const gapMax = Math.max(...D.gapBins.map((b) => b.n))

  return (
    <DetailFrame
      {...frame}
      lede="Every run, walk, trail run and hike I&rsquo;ve logged, side by side: how far, how fast, how much climbing, when I go and how long the long days get. I&rsquo;ve kept treadmill runs apart from outdoor runs, because in my log they look like two different sports."
    >
      <div className="yis-report">
        {/* ===== the four sports in one view ===== */}
        <section className="sgrid yis-top" aria-labelledby="sp-title">
          <div className="sgrid__head">
            <p className="eyebrow">Four sports on foot</p>
            <h2 id="sp-title" className="section-head__title">Runs cover the&nbsp;ground.</h2>
            <p className="section-head__sub">Runs covered {pc(share('km', 'Run'))}% of the distance, and walks, trail runs and hikes did {pc(climbOff)}% of the climbing.</p>
          </div>
          <Reveal as="p" className="sgrid__statement">
            Of my {n0(T.all)} outings, {n0(T.n)} were on foot: {n0(S.Run.n)} runs, {n0(S.Walk.n)} walks, {S.TrailRun.n} trail runs and {S.Hike.n} hikes.
            Together they add up to {n0(T.km)} km and {n0(T.elev)} m of climbing, over {n0(T.hours)} hours of moving on {n0(T.days)} different days.
            {' '}{n0(M.tread.n)} of my runs were on a treadmill and {M.road.n} were outside. They&rsquo;re so different that I count them separately on this page.
          </Reveal>
          <OddsRow
            title="The four sports on foot"
            items={[
              { num: T.n, unit: '', label: `outings on foot, of ${n0(T.all)} in all`, tone: 'move' },
              { num: T.km, unit: ' km', label: 'covered on foot', tone: 'move' },
              { num: T.elev, unit: ' m', label: 'climbed on foot', tone: 'move' },
              { num: T.hours, unit: ' h', label: 'moving on foot', tone: 'move' },
            ]}
          />
          <FootMap rows={r.rows} />
          <p className="source">Source: Activity Log · every run, walk, trail run and hike, placed by pace and by climb per kilometre</p>
        </section>

        {/* ===== 1. who does what ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-split"
          eyebrow={`${num()} · Who does what`}
          title={walkHoursMore ? 'Walks took more hours.' : 'Runs took the most hours.'}
          sub={walkHoursMore ? 'More hours than runs, for less distance.' : 'And the most distance.'}
          statement={<>
            I&rsquo;ve done about as many runs as walks ({n0(S.Run.n)} and {n0(S.Walk.n)}) and spent about the same hours on each ({n0(S.Run.hours)} and {n0(S.Walk.hours)}),
            but a typical run goes {k1(S.Run.medKm / S.Walk.medKm)} times as far as a typical walk, {k1(S.Run.medKm)} km compared with {k1(S.Walk.medKm)} km.
            Trail runs are {pc(share('n', 'TrailRun'))}% of my outings and {pc(share('elev', 'TrailRun'))}% of my climbing. My {word(S.Hike.n)} hikes add another {pc(share('elev', 'Hike'))}% of
            the climbing from {share('km', 'Hike') < 0.01 ? 'less than 1%' : `${pc(share('km', 'Hike'))}%`} of the distance.
          </>}
          odds={{
            title: 'Each sport’s biggest share',
            items: [
              { value: share('km', 'Run'), label: 'of the distance was run', tone: 'move' },
              { value: share('hours', 'Walk'), label: 'of the hours were walked', tone: 'rest' },
              { value: share('elev', 'TrailRun'), label: 'of the climb came on trail runs', tone: 'move' },
              { value: share('elev', 'Hike'), label: `of the climb came on ${word(S.Hike.n)} hikes`, tone: 'rest' },
            ],
          }}
          left={{
            title: 'Each sport’s share of the record',
            node: (
              <ShareRows
                keys={SPORTS.map((s) => ({ key: s, label: SPORT_NAME[s] }))}
                rows={[
                  { label: 'Outings', total: n0(T.n), parts: SPORTS.map((s) => ({ key: s, value: S[s].n })) },
                  { label: 'Distance', total: `${n0(T.km)} km`, parts: SPORTS.map((s) => ({ key: s, value: S[s].km })) },
                  { label: 'Hours moving', total: `${n0(T.hours)} h`, parts: SPORTS.map((s) => ({ key: s, value: S[s].hours })) },
                  { label: 'Climb', total: `${n0(T.elev)} m`, parts: SPORTS.map((s) => ({ key: s, value: S[s].elev })) },
                  { label: 'Kudos', total: n0(T.kudos), parts: SPORTS.map((s) => ({ key: s, value: S[s].kudos })) },
                  { label: 'Personal records', total: n0(T.prs), parts: SPORTS.map((s) => ({ key: s, value: S[s].prs })) },
                ]}
              />
            ),
          }}
          right={{
            title: 'The typical outing of each',
            node: (
              <HBars
                aria={`Median distance per outing: ${MODES.map((k) => `${MODE_NAME[k]} ${k1(M[k].medKm)} km`).join(', ')}.`}
                rows={MODES.slice().sort((a, b) => M[b].medKm - M[a].medKm).map((k) => ({ key: k, label: MODE_NAME[k], sub: `${hm(M[k].medMin)} moving`, value: M[k].medKm, display: `${k1(M[k].medKm)} km` }))}
              />
            ),
          }}
          leftNote={<>Each bar is one measure, split into the four sports&rsquo; shares of it. Follow one colour down the bars to see how that sport&rsquo;s share changes.</>}
          rightNote={<>This is the middle outing of each sport when they&rsquo;re lined up by distance. My typical walk is short, even though I&rsquo;ve done some long ones.</>}
          source="Activity Log · runs, walks, trail runs and hikes; distance and climb on foot only"
        />

        {/* ===== 2. the mix over the years ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-mix"
          eyebrow={`${num()} · The mix, year by year`}
          title={walkLead ? `In ${walkLead.year}, walks went further.` : 'Runs went further every year.'}
          sub={walkLead ? 'For the first time, walks covered more distance than runs.' : undefined}
          statement={<>
            For years most of my distance was running. In {runPeak.year} I ran {n0(runPeak.km.Run)} km and walked {n0(runPeak.km.Walk)} km.
            Since then my running has dropped to {n0(latest.km.Run)} km in {LY}{so}, and my walking has gone up to {n0(latest.km.Walk)} km,
            {latest.km.Walk > walkBase.km.Walk ? ` ${(latest.km.Walk / Math.max(1, walkBase.km.Walk)).toFixed(1)} times its ${walkBase.year} total` : ''}.
            My trail running, which I count separately, was at its highest in {trailPeak.year}, with {n0(trailPeak.km.TrailRun)} km.
          </>}
          odds={{
            title: `${LY}${so}, against the running peak`,
            items: [
              { num: latest.km.Walk, unit: ' km', label: `walked in ${LY}${so}`, tone: 'rest' },
              { num: latest.km.Run, unit: ' km', label: `run in ${LY}${so}`, tone: 'move' },
              { num: runPeak.km.Run, unit: ' km', label: `run in ${runPeak.year}, the peak`, tone: 'move' },
              { num: trailPeak.km.TrailRun, unit: ' km', label: `on trails in ${trailPeak.year}, the trail peak`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Kilometres on foot, year by year',
            node: (
              <StackCols
                keys={SPORTS.map((s) => ({ key: s, label: SPORT_NAME[s] }))}
                items={BY.map((b) => ({ label: String(b.year), short: `'${String(b.year).slice(2)}`, partial: partial && b.year === LY, display: n0(SPORTS.reduce((t, s) => t + b.km[s], 0)), parts: SPORTS.map((s) => ({ key: s, value: b.km[s] })) }))}
                ticks={ticksTo(kmYearMax)} tickFmt={(v) => v.toLocaleString('en-US')} yCap="km &uarr;"
                aria={`Kilometres on foot each year, split by sport. ${BY.map((b) => `${b.year}: ${SPORTS.map((s) => `${SPORT_NAME[s]} ${n0(b.km[s])}`).join(', ')}`).join('. ')}.`}
              />
            ),
          }}
          right={{
            title: 'Walking against running',
            node: (
              <TwoLines
                years={BY.map((b) => b.year)}
                a={{ label: 'Walks', values: BY.map((b) => Math.round(b.km.Walk)) }}
                b={{ label: 'Runs', values: BY.map((b) => Math.round(b.km.Run)) }}
                cross={walkLead ? BY.indexOf(walkLead) : -1}
                crossLabel={walkLead ? 'walks ahead' : undefined}
                yCap="km a year"
                aria={`Kilometres a year. Runs: ${BY.map((b) => `${b.year} ${n0(b.km.Run)}`).join(', ')}. Walks: ${BY.map((b) => `${b.year} ${n0(b.km.Walk)}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>One column a year, split by sport, with the total on top.{partial ? ` The star marks ${LY}, which isn’t over yet.` : ''}</>}
          rightNote={<>Runs here are outdoor and treadmill runs, and trail runs are counted separately. The dashed line is the year my walking passed my running.</>}
          source="Activity Log · distance on foot by sport and year"
        />

        {/* ===== 3. the treadmill ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-tread"
          eyebrow={`${num()} · The treadmill`}
          title={`${pc(treadShare)}% of running was indoors.`}
          sub="Most of my running kilometres were on a treadmill."
          statement={<>
            {n0(M.tread.n)} of my {n0(S.Run.n)} runs were on a treadmill, {n0(M.tread.km)} km in all. In {peakIndoor.year}, {pc(indoorShare(peakIndoor))}% of my running kilometres
            were indoors{firstUnderHalf ? `. ${firstUnderHalf.year} was the first year below half, at ${pc(indoorShare(firstUnderHalf))}%` : ''}{firstUnderHalf && firstUnderHalf.year !== LY ? `, and ${LY}${so} is at ${pc(indoorShare(latest))}%` : ''}.
            You can spot the treadmill in the numbers, too. {pc(r.roundFive)}% of my treadmill runs ended within 100 m of a round 5 km, and {pc(r.roundOne)}% within 100 m of a
            round kilometre. Only {pc(r.roadRoundOne)}% of my outdoor runs did.
          </>}
          odds={{
            title: 'Running indoors',
            items: [
              { num: M.tread.n, unit: '', label: 'treadmill runs', tone: 'move' },
              { value: indoorShare(peakIndoor), label: `of running km indoors in ${peakIndoor.year}`, tone: 'move' },
              { value: indoorShare(latest), label: `indoors in ${LY}${so}`, tone: 'rest' },
              { value: r.roundFive, label: 'of treadmill runs stopped on a whole 5 km', tone: 'move' },
            ],
          }}
          left={{
            title: 'Running kilometres, indoors and out',
            node: (
              <StackCols
                keys={[{ key: 'tread', label: 'Treadmill' }, { key: 'road', label: 'Outdoors' }]}
                items={BY.map((b) => ({ label: String(b.year), short: `'${String(b.year).slice(2)}`, partial: partial && b.year === LY, display: `${pc(indoorShare(b))}%`, parts: [{ key: 'tread', value: b.treadKm }, { key: 'road', value: b.roadKm }] }))}
                ticks={ticksTo(runYearMax)} tickFmt={(v) => v.toLocaleString('en-US')} yCap="km &uarr;"
                aria={`Running kilometres each year, treadmill and outdoors. ${BY.map((b) => `${b.year}: ${n0(b.treadKm)} indoors, ${n0(b.roadKm)} outdoors`).join('. ')}.`}
              />
            ),
          }}
          right={{
            title: 'Where the treadmill stopped',
            node: (
              <SpikeHist
                bins={r.treadBins.map((b) => ({ x: b.km, count: b.count }))}
                spikes={[5, 10, 15, 21]}
                xCap="distance of the run, to the nearest km &rarr;" yCap="runs &uarr;"
                aria={`Treadmill runs by distance. ${[5, 10, 15, 21].map((k) => `${k} km: ${r.treadBins.find((b) => b.km === k)?.count || 0} runs`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>My running kilometres each year, with the treadmill in light orange and outside in deep orange. The figure on top is the share done indoors.</>}
          rightNote={<>One bar per kilometre. My treadmill runs bunch up at 5, 10, 15 and 21 km, because on a treadmill I tend to stop when the display hits a round number.</>}
          source="Activity Log · runs marked as treadmill (trainer) against runs outdoors"
        />

        {/* ===== 4. pace ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-pace"
          eyebrow={`${num()} · Pace`}
          title="Each sport has its pace."
          sub={`A treadmill kilometre took ${pace(M.tread.pace.med)}. A walking one took ${pace(M.walk.pace.med)}.`}
          statement={<>
            Pace here means the minutes it takes me to cover a kilometre, using the middle outing of each sport: treadmill {pace(M.tread.pace.med)}, outdoor run {pace(M.road.pace.med)},
            trail run {pace(M.trail.pace.med)}, walk {pace(M.walk.pace.med)} and hike {pace(M.hike.pace.med)}. A typical outdoor run of mine takes {k1(M.road.pace.med / M.tread.pace.med)} times
            as long per kilometre as a treadmill run, which puts it closer to a walk. My quickest year on the treadmill was {quickYear.year}, at {pace(quickYear.treadPace.med)}, and
            {' '}{LY}{so} is at {pace(latest.treadPace ? latest.treadPace.med : 0)}.
          </>}
          odds={{
            title: 'Median minutes per kilometre',
            items: [
              { num: M.tread.pace.med, dec: 1, unit: ' min', label: 'a treadmill km', tone: 'move' },
              { num: M.road.pace.med, dec: 1, unit: ' min', label: 'an outdoor run km', tone: 'move' },
              { num: M.walk.pace.med, dec: 1, unit: ' min', label: 'a walking km', tone: 'rest' },
              { num: M.hike.pace.med, dec: 1, unit: ' min', label: 'a hiking km', tone: 'rest' },
            ],
          }}
          left={{
            title: 'Every outing by pace',
            node: (
              <Ridges
                rows={MODES.map((k) => ({ key: k, label: MODE_SHORT[k], note: `${n0(M[k].pace.values.length)}`, values: M[k].pace.values }))}
                domain={[3, 26]} step={0.5} smooth={2}
                ticks={[5, 10, 15, 20, 25]} tickFmt={(v) => `${v}:00`} medFmt={pace}
                xCap="minutes per km, slower &rarr;"
                aria={`Pace of every outing by way of moving. Medians: ${MODES.map((k) => `${MODE_NAME[k]} ${pace(M[k].pace.med)} a kilometre`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'Treadmill pace, year by year',
            node: (
              <RangeCols
                items={paceYears.map((b) => ({ label: b.year, ...b.treadPace }))}
                domain={[4, 10.5]} invert ticks={[4, 5, 6, 7, 8, 9, 10]} tickFmt={(v) => `${v}:00`} valFmt={pace}
                yCap="min per km, quicker &uarr;"
                aria={`Median treadmill pace by year: ${paceYears.map((b) => `${b.year} ${pace(b.treadPace.med)}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>Each ridge is one way of moving, and its height shows how many outings were at each pace. The tick under the ridge and the figure on the right are the middle value.</>}
          rightNote={<>The band covers the middle half of each year&rsquo;s treadmill runs, and the bar is the middle run. The higher the bar, the quicker the year, and the quickest is in orange.</>}
          source={`Activity Log · moving time over distance; ${r.oddTread} treadmill runs logged quicker than ${pace(TREAD_MIN)} a km left out of pace as likely misreadings`}
        />

        {/* ===== 5. walks ===== */}
        {w0 && w1 && w0 !== w1 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="sp-walks"
              eyebrow={`${num()} · The walks`}
              title="The typical walk grew."
              sub={`From ${k1(w0.walkMed)} km to ${k1(w1.walkMed)} km.`}
              statement={<>
                From {w0.year} to 2024, about {pc(shortEarlyAvg)}% of my walks were under 3 km.
                {' '}That dropped to {walkYears.filter((b) => b.year > 2024).map((b) => `${pc(b.walkShort)}% in ${b.year}${b.year === LY ? so : ''}`).join(' and ')}.
                {' '}My typical walk in {w1.year}{w1.year === LY ? so : ''} is {k1(w1.walkMed)} km, and {walkHalves ? `${word(walkHalves)} of my walks have gone a half marathon or further` : 'none has reached a half marathon yet'}.
              </>}
              odds={{
                title: `The walk, ${w0.year} against ${w1.year}`,
                items: [
                  { num: w0.walkMed, dec: 1, unit: ' km', label: `the median walk of ${w0.year}`, tone: 'rest' },
                  { num: w1.walkMed, dec: 1, unit: ' km', label: `the median walk of ${w1.year}${w1.year === LY ? so : ''}`, tone: 'move' },
                  { value: w0.walkShort, label: `of ${w0.year} walks under 3 km`, tone: 'rest' },
                  { value: w1.walkShort, label: `of ${w1.year} walks under 3 km`, tone: 'move' },
                ],
              }}
              left={{
                title: 'Every walk by distance, year by year',
                node: (
                  <Ridges
                    rows={walkYears.map((b) => ({ key: b.year === LY ? 'road' : 'walk', label: String(b.year), note: `${b.walkN} walks`, values: b.walkKms }))}
                    domain={[0, 20]} step={1} smooth={1}
                    ticks={[0, 5, 10, 15, 20]} tickFmt={(v) => `${v} km`} medFmt={(v) => `${k1(v)} km`}
                    xCap="distance of the walk &rarr;"
                    aria={`Walk distances by year. Medians: ${walkYears.map((b) => `${b.year} ${k1(b.walkMed)} km`).join(', ')}.`}
                  />
                ),
              }}
              right={{
                title: 'Share of walks under 3 km',
                node: (
                  <ColBars
                    items={walkYears.map((b) => ({ label: String(b.year), short: `'${String(b.year).slice(2)}`, value: b.walkShort, display: `${pc(b.walkShort)}%`, tone: b.year === LY ? 'big' : b.walkShort >= 0.4 ? 'mid' : 'quiet' }))}
                    max={0.7} ticks={[0, 0.2, 0.4, 0.6]} tickFmt={(v) => `${Math.round(v * 100)}%`} yCap="share of walks &uarr;"
                    aria={`Share of walks shorter than 3 km: ${walkYears.map((b) => `${b.year} ${pc(b.walkShort)}%`).join(', ')}.`}
                  />
                ),
              }}
              leftNote={<>One ridge a year, and its height shows how many walks were each length. As my walks got longer, the ridge moved to the right. {LY} is in orange.</>}
              rightNote={<>About half my walks used to be short ones. In {LY} nearly every walk is a proper outing.</>}
              source="Activity Log · walks, indoor and outdoor"
            />
          </>
        )}

        {/* ===== 6. the long days ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-long"
          eyebrow={`${num()} · The long days`}
          title={earlyLong && earlyLong === earlyTread && lastLongOut > latest.long.tread ? 'Long days moved outdoors.' : `${n0(longAll)} half marathons or more.`}
          sub={earlyLong && earlyLong === earlyTread && lastLongOut > latest.long.tread ? `They started on the treadmill. ${n0(longAll)} outings reached a half marathon.` : undefined}
          statement={<>
            A half marathon is 21.1 km. {earlyLong ? `Up to 2022 I did ${earlyLong} outings that long, and ${earlyLong === earlyTread ? 'every one of them was' : `${earlyTread} of them were`} on a treadmill. ` : ''}
            In {LY}{so} I&rsquo;ve done {latest.longN}, and {lastLongOut} of them were outside:{' '}
            {['road', 'trail', 'walk', 'hike'].filter((k) => latest.long[k]).map((k) => `${latest.long[k]} ${{ road: 'outdoor runs', trail: 'trail runs', walk: 'walks', hike: 'hikes' }[k]}`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            {' '}My longest ever was {k1(M.tread.longest.km)} km on a treadmill in {fmtMonth(M.tread.longest.date)}, a whole marathon indoors.
          </>}
          odds={{
            title: 'Half marathon or longer',
            items: [
              { num: longAll, unit: '', label: 'outings of 21.1 km or more', tone: 'move' },
              { value: longTread / Math.max(1, longAll), label: 'of them on a treadmill', tone: 'rest' },
              { num: latest.longN, unit: '', label: `in ${LY}${so}`, tone: 'move' },
              { num: lastLongOut, unit: '', label: `of those ${latest.longN} outside`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Outings of 21.1 km or more, year by year',
            node: (
              <StackCols
                keys={MODES.map((k) => ({ key: k, label: MODE_SHORT[k] }))}
                items={BY.map((b) => ({ label: String(b.year), short: `'${String(b.year).slice(2)}`, partial: partial && b.year === LY, display: String(b.longN), parts: MODES.map((k) => ({ key: k, value: b.long[k] })) }))}
                ticks={ticksTo(longMax)} yCap="outings &uarr;"
                aria={`Outings of a half marathon or more each year. ${BY.map((b) => `${b.year}: ${b.longN}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'The longest of each',
            node: (
              <HBars
                aria={`Longest outing of each way of moving: ${MODES.map((k) => `${MODE_NAME[k]} ${k1(M[k].longest.km)} km`).join(', ')}.`}
                rows={MODES.slice().sort((a, b) => M[b].longest.km - M[a].longest.km).map((k) => ({ key: k, label: MODE_NAME[k], sub: fmtMonth(M[k].longest.date), value: M[k].longest.km, display: `${k1(M[k].longest.km)} km` }))}
              />
            ),
          }}
          leftNote={<>Each column counts that year&rsquo;s outings of 21.1 km or more, coloured by sport.</>}
          rightNote={<>Every sport except hiking has gone past 30 km at least once. My longest hike was {k1(M.hike.longest.km)} km, but it climbed {n0(M.hike.longest.elev)} m on the way.</>}
          source="Activity Log · outings of 21.1 km or more by way of moving"
        />

        {/* ===== 7. climb ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-climb"
          eyebrow={`${num()} · The climb`}
          title="Hikes climb the most."
          sub={`Hikes climbed ${n0(M.hike.mPerKm)} m for every kilometre. Walks climbed ${n0(M.walk.mPerKm)}.`}
          statement={<>
            Here&rsquo;s how much I climb for each kilometre: {climbModes.map((k) => (M[k].mPerKm < 0.5 ? `the treadmill none at all` : `${ofModeName(k)} ${n0(M[k].mPerKm)} m`)).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            So my walks, with {pc(share('km', 'Walk'))}% of the distance, did {pc(share('elev', 'Walk'))}% of the climbing{topClimbsOffRoad ? `, and my ${word(r.climbs.length)} biggest climbs were all hikes and trail runs` : ''}.
            The biggest was {n0(big.elev)} m, on a {k1(big.km)} km {SPORT_NAME[big.sport].toLowerCase()} in {fmtMonth(big.date)}.
          </>}
          odds={{
            title: 'Metres climbed for each kilometre',
            items: [
              { num: M.hike.mPerKm, unit: ' m', label: 'per km on a hike', tone: 'move' },
              { num: M.trail.mPerKm, unit: ' m', label: 'per km on a trail run', tone: 'move' },
              { num: M.walk.mPerKm, unit: ' m', label: 'per km on a walk', tone: 'rest' },
              { num: big.elev, unit: ' m', label: 'climbed in one outing, the most', tone: 'move' },
            ],
          }}
          left={{
            title: 'If each sport were a road',
            node: (
              <Grades
                rows={MODES.map((k) => ({ key: k, label: MODE_NAME[k], mPerKm: M[k].mPerKm }))}
                aria={`Average climb per kilometre: ${MODES.map((k) => `${MODE_NAME[k]} ${n0(M[k].mPerKm)} metres`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: `The ${word(r.climbs.length)} biggest climbs`,
            node: (
              <HBars
                aria={`The biggest single climbs: ${r.climbs.map((c) => `${n0(c.elev)} metres, ${SPORT_NAME[c.sport].toLowerCase()}, ${fmtMonth(c.date)}`).join('; ')}.`}
                rows={r.climbs.map((c) => ({ key: c.mode, label: fmtMonth(c.date), sub: `${SPORT_NAME[c.sport].toLowerCase()} · ${k1(c.km)} km`, value: c.elev, display: `${n0(c.elev)} m` }))}
              />
            ),
          }}
          leftNote={<>Each line goes across one kilometre at that sport&rsquo;s average slope. I&rsquo;ve drawn the slopes steeper than they really are so the gentle ones don&rsquo;t all look flat, but the figures are the real ones.</>}
          rightNote={<>My biggest single climbs, coloured by sport. None of them was a walk or an outdoor run.</>}
          source="Activity Log · elevation gain on foot over distance on foot"
        />

        {/* ===== 8. when ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-when"
          eyebrow={`${num()} · When`}
          title="Treadmill runs at night."
          sub={`${pc(M.tread.night)}% of my treadmill runs started after 8pm or before 5am.`}
          statement={<>
            Each sport has its own time of day. My treadmill runs are busiest at {fmtH(peakHour('tread'))} and again from 7pm to midnight, and {pc(treadEve)}% of them start in that late stretch.
            My walks are busiest at {fmtH(peakHour('walk'))}, with {pc(walkEve)}% between 4 and 7pm. My outdoor runs start at {fmtH(peakHour('road'))} or in the late afternoon.
            Trail runs and hikes are mostly for the weekend. {pc(M.trail.weekend)}% of trail runs and {pc(M.hike.weekend)}% of hikes were on a Saturday or Sunday, compared with {pc(M.tread.weekend)}% of
            treadmill runs. If the days were even, it would be 29%.
          </>}
          odds={{
            title: 'Hours and days',
            items: [
              { value: M.tread.night, label: 'of treadmill runs after 8pm or before 5am', tone: 'move' },
              { value: walkEve, label: 'of walks between 4 and 7pm', tone: 'rest' },
              { value: M.trail.weekend, label: 'of trail runs at the weekend', tone: 'move' },
              { value: M.tread.weekend, label: 'of treadmill runs at the weekend', tone: 'rest' },
            ],
          }}
          left={{
            title: 'The hour each outing started',
            node: (
              <Ridges
                rows={MODES.map((k) => ({ key: k, label: MODE_SHORT[k], note: `${n0(M[k].n)}`, mark: peakHour(k) + 0.5, right: fmtH(peakHour(k)), values: r.rows.filter((f) => f.mode === k).map((f) => f.hour + 0.5) }))}
                medHead="peak"
                domain={[0, 24]} step={1} smooth={1} circular
                ticks={[0, 6, 12, 18, 24]} tickFmt={(v) => (v === 24 ? '12a' : v === 0 ? '12a' : v === 12 ? '12p' : v < 12 ? `${v}a` : `${v - 12}p`)}
                xCap="hour of the day &rarr;"
                aria={`Start hours by way of moving. Peak hours: ${MODES.map((k) => `${MODE_NAME[k]} ${fmtH(peakHour(k))}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'Share of each on a Saturday or Sunday',
            node: (
              <HBars
                refLine={{ value: 2 / 7, label: 'an even week · 29%' }}
                aria={`Share of outings at the weekend: ${MODES.map((k) => `${MODE_NAME[k]} ${pc(M[k].weekend)}%`).join(', ')}. An even week would give 29%.`}
                rows={MODES.slice().sort((a, b) => M[b].weekend - M[a].weekend).map((k) => ({ key: k, label: MODE_NAME[k], sub: `${n0(M[k].n)} outings`, value: M[k].weekend, display: `${pc(M[k].weekend)}%` }))}
                max={0.85}
              />
            ),
          }}
          leftNote={<>One ridge per sport, and its height shows how many outings started at each hour, from midnight to midnight. The tick and the figure on the right are the busiest hour.</>}
          rightNote={<>Bars past the dashed line lean towards the weekend. A trail run needs a free morning, and a treadmill run fits into whatever evening I have.</>}
          source="Activity Log · local start hour and weekday of every outing on foot"
        />

        {/* ===== 9. doubles ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-doubles"
          eyebrow={`${num()} · A run and a walk on the same day`}
          title={`${n0(D.total)} run-and-walk days.`}
          sub="Days when I both ran and walked, usually hours apart."
          statement={<>
            On {D.runFirst} of the {D.total} days ({pc(D.runFirst / Math.max(1, D.total))}%) I ran first. The typical gap between finishing one and starting the other
            was {hm(D.medGap)}. Only {word(under30)} pairs were less than half an hour apart, and {far8} were 8 hours or more apart, a run in the morning and a walk in the evening.
            Most of these days were in {dblPeak[0]}, {dblPeak[1]} of them, and {LY}{so} has {D.perYear[LY]}.
          </>}
          odds={{
            title: 'Days with both',
            items: [
              { num: D.total, unit: ' days', label: 'with a run and a walk', tone: 'move' },
              { value: D.runFirst / Math.max(1, D.total), label: 'of them with the run first', tone: 'move' },
              { num: D.medGap / 60, dec: 1, unit: ' h', label: 'between them, the median', tone: 'rest' },
              { num: dblPeak[1], unit: ' days', label: `in ${dblPeak[0]}, the most`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Days with a run and a walk, year by year',
            node: (
              <ColBars
                items={BY.filter((b) => b.year >= 2021).map((b) => ({ label: String(b.year), short: `'${String(b.year).slice(2)}`, value: D.perYear[b.year], display: String(D.perYear[b.year]), tone: String(b.year) === dblPeak[0] ? 'big' : 'mid' }))}
                ticks={ticksTo(dblMax)} yCap="days &uarr;"
                aria={`Days with both a run and a walk: ${Object.entries(D.perYear).map(([y, n]) => `${y} ${n}`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'Time between the two',
            node: (
              <ColBars
                items={D.gapBins.map((b, i) => ({ label: b.label, short: b.short, value: b.n, display: String(b.n), tone: i === D.gapBins.length - 1 ? 'big' : 'mid' }))}
                ticks={ticksTo(gapMax)} yCap="days &uarr;" xCap="time between them &rarr;"
                aria={`Time between the two outings: ${D.gapBins.map((b) => `${b.label} ${b.n}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>Each bar counts the days that year with at least one run (or trail run) and at least one walk.</>}
          rightNote={<>The walk was hardly ever a cool-down after the run. Most of the time they were two separate outings at different ends of the day.</>}
          source="Activity Log · start time and moving time of runs and walks on the same date"
        />

        {/* ===== 10. effort and reward ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-effort"
          eyebrow={`${num()} · Effort and reward`}
          title={`${cap(ofModeName(rated[0]))} work hardest.`}
          sub={`Per hour, ${ofModeName(rated[0])} scored ${n0(M[rated[0]].effortPerHour)} on effort and walks ${n0(M.walk.effortPerHour)}.`}
          statement={<>
            Relative effort is Strava&rsquo;s score for how hard my heart worked, based on heart rate. Per hour of moving, the order is{' '}
            {rated.map((k) => `${ofModeName(k)} (${n0(M[k].effortPerHour)})`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            {unrated.length ? ` I left out ${unrated.map((k) => ofModeName(k)).join(' and ')}, because too few of them have a score.` : ''}
            {' '}The people who follow me see it differently. My {ofModeName(kudosTop)} got {n0(M[kudosTop].kudosPer)} kudos each, more than any other sport. My outdoor runs set {M.road.prsPer.toFixed(1)} personal records
            per outing, and the treadmill sets almost none ({M.tread.prsPer.toFixed(2)}), because Strava&rsquo;s segment records need GPS.
          </>}
          odds={{
            title: 'Effort per hour, kudos and records per outing',
            items: [
              { num: M[rated[0]].effortPerHour, unit: '', label: `effort per hour, ${MODE_NAME[rated[0]].toLowerCase()}`, tone: 'move' },
              { num: M.walk.effortPerHour, unit: '', label: 'effort per hour, walk', tone: 'rest' },
              { num: M[kudosTop].kudosPer, unit: '', label: `kudos per ${MODE_NAME[kudosTop].toLowerCase()}`, tone: 'move' },
              { num: M.road.prsPer, dec: 1, unit: '', label: 'personal records per outdoor run', tone: 'move' },
            ],
          }}
          left={{
            title: 'Relative effort per hour moving',
            node: (
              <HBars
                aria={`Relative effort per hour: ${rated.map((k) => `${MODE_NAME[k]} ${n0(M[k].effortPerHour)}`).join(', ')}.`}
                rows={rated.map((k) => ({ key: k, label: MODE_NAME[k], sub: `${n0(M[k].effortN)} scored`, value: M[k].effortPerHour, display: n0(M[k].effortPerHour) }))}
              />
            ),
          }}
          right={{
            title: 'Kudos per outing',
            node: (
              <HBars
                aria={`Kudos per outing: ${MODES.map((k) => `${MODE_NAME[k]} ${n0(M[k].kudosPer)}`).join(', ')}.`}
                rows={MODES.slice().sort((a, b) => M[b].kudosPer - M[a].kudosPer).map((k) => ({ key: k, label: MODE_NAME[k], sub: `${M[k].prsPer.toFixed(2)} records each`, value: M[k].kudosPer, display: n0(M[k].kudosPer) }))}
              />
            ),
          }}
          leftNote={<>All the relative effort scores for each sport added up and divided by the hours they took. The higher the bar, the harder my heart worked for each hour out.</>}
          rightNote={<>Kudos are the likes other people give on Strava. The small figure under each sport is how many personal records it sets per outing.</>}
          source="Activity Log · Strava relative effort (heart rate), kudos and personal records"
        />

        {/* ===== 11. the maths ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-maths"
          eyebrow={`${num()} · The maths of the feet`}
          title="Longer runs, quicker km."
          sub="On the treadmill, the further I run, the quicker each kilometre goes."
          statement={<>
            A correlation shows how two things move together, on a scale from −1 to 1, where 0 means no link at all. Across my {n0(F.n)} treadmill runs, distance against pace comes out at {F.r.toFixed(2).replace('-', '−')},
            a {strength(F.r)} link, with my longer runs going quicker. The best-fit line takes {secPerKm} seconds off each kilometre for every extra kilometre I run.
            {at5 && at21 ? ` My typical 5 km went at ${pace(at5.pace)} a km and my typical 21 km at ${pace(at21.pace)}, ${gain} seconds quicker.` : ''}
            {' '}Running and walking didn&rsquo;t compete for my time. Week by week since 2021 they come out at {WF.r.toFixed(2).replace('-', '−')}, {strength(WF.r)}, so a big running week didn&rsquo;t mean less walking.
          </>}
          odds={{
            title: 'Four numbers from the fits',
            items: [
              { num: F.r, dec: 2, unit: '', label: 'treadmill distance against pace', tone: 'move' },
              { num: secPerKm, unit: ' s', label: 'quicker per km for each extra km', tone: 'move' },
              { num: gain, unit: ' s', label: 'per km quicker at 21 km than at 5 km', tone: 'move' },
              { num: WF.r, dec: 2, unit: '', label: 'weekly running km against walking km', tone: 'rest' },
            ],
          }}
          left={{
            title: 'Treadmill runs: distance against pace',
            node: (
              <FitScatter
                points={F.points} fit={F} tone="tread" invertY
                xDomain={[0, 44]} yDomain={[3.5, 10]} xTicks={[0, 5, 10, 15, 21, 30, 42]} yTicks={[4, 5, 6, 7, 8, 9, 10]}
                xFmt={(v) => `${v}`} yFmt={(v) => `${v}:00`}
                xCap="distance of the run, km &rarr;" yCap="min per km, quicker &uarr;"
                aria={`${F.n} treadmill runs by distance and pace. Correlation ${F.r.toFixed(2)}; each extra kilometre about ${secPerKm} seconds quicker per kilometre.`}
              />
            ),
          }}
          right={{
            title: 'Each week: kilometres run against walked',
            node: (
              <FitScatter
                points={WF.points} fit={WF} tone="walk"
                xDomain={[0, Math.ceil(wkMaxX / 20) * 20]} yDomain={[0, Math.ceil(wkMaxY / 20) * 20]}
                xTicks={ticksTo(Math.ceil(wkMaxX / 20) * 20)} yTicks={ticksTo(Math.ceil(wkMaxY / 20) * 20).slice(1)}
                xCap="km run that week &rarr;" yCap="km walked &uarr;"
                aria={`${WF.n} weeks since 2021, running kilometres against walking kilometres. Correlation ${WF.r.toFixed(2)}.`}
              />
            ),
          }}
          leftNote={<>One dot per treadmill run, with quicker runs higher up. The black line is the straight line that fits the dots best. It goes down to the right, which means longer runs were quicker.</>}
          rightNote={<>One dot per week since 2021. The line is nearly flat, so how much I ran in a week tells you almost nothing about how much I walked.</>}
          source={`Activity Log · least-squares fits; treadmill runs quicker than ${pace(TREAD_MIN)} a km left out`}
        />

        {/* ===== 12. the far edges ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="sp-edges">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Biggest days</p>
            <h2 id="sp-edges" className="section-head__title">Each sport&rsquo;s biggest&nbsp;day.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            My longest treadmill run was {k1(M.tread.longest.km)} km, a whole marathon in one room. Outside, my longest run was {k1(M.road.longest.km)} km and my longest
            trail run was {k1(M.trail.longest.km)} km, with {n0(M.trail.longest.elev)} m of climbing. My longest walk was {k1(M.walk.longest.km)} km, and my biggest hike climbed {n0(M.hike.steepest.elev)} m.
          </Reveal>
          <ul className="yrecs">
            <RecordCard kicker="Treadmill run" value={M.tread.longest.km} decimals={1} unit="km" label="the longest, a marathon indoors" sub={fmtDay(M.tread.longest.date)} tone="hot" />
            <RecordCard kicker="Outdoor run" value={M.road.longest.km} decimals={1} unit="km" label="the longest on the road" sub={fmtDay(M.road.longest.date)} tone="hot" />
            <RecordCard kicker="Trail run" value={M.trail.longest.km} decimals={1} unit="km" label={`the longest, with ${n0(M.trail.longest.elev)} m of climb`} sub={fmtDay(M.trail.longest.date)} tone="hot" />
            <RecordCard kicker="Walk" value={M.walk.longest.km} decimals={1} unit="km" label={`the longest, with ${n0(M.walk.longest.elev)} m of climb`} sub={fmtDay(M.walk.longest.date)} />
            <RecordCard kicker="Hike" value={M.hike.steepest.elev} unit="m" label={`climbed in ${k1(M.hike.steepest.km)} km, the most of any outing`} sub={fmtDay(M.hike.steepest.date)} />
            <RecordCard kicker="Running streak" value={r.streak.run.len} unit="days" label="in a row with a run or trail run" sub={`${fmtDay(r.streak.run.startISO)} to ${fmtDay(r.streak.run.endISO)}`} />
            <RecordCard kicker="Most kudos" value={r.mostKudos.kudos} label={`on one ${MODE_NAME[r.mostKudos.mode].toLowerCase()} of ${k1(r.mostKudos.km)} km`} sub={fmtDay(r.mostKudos.date)} />
            <RecordCard kicker="Most records" value={r.mostPrs.prs} label={`personal records on one ${MODE_NAME[r.mostPrs.mode].toLowerCase()}`} sub={fmtDay(r.mostPrs.date)} />
          </ul>
          <p className="source">Source: Activity Log · single outings on foot</p>
        </section>

        {/* ===== each sport on its own ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="sp-each">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Each sport on its own</p>
            <h2 id="sp-each" className="section-head__title">Open any&nbsp;sport.</h2>
          </div>
          <ul className="sp-cards">
            {SPORTS.map((s) => (
              <li key={s} className={`sp-card sp-card--${s}`}>
                <Link to={`/sports/${slugify(s)}`}>
                  <p className="sp-card__k">{SPORT_NAME[s]}</p>
                  <p className="sp-card__v">{n0(S[s].n)}<span className="sp-card__u"> {ofSport(s)}</span></p>
                  <p className="sp-card__l">{n0(S[s].km)} km and {n0(S[s].elev)} m of climb</p>
                  <p className="sp-card__go">Open {ofSport(s)} &rarr;</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="sp-other">
            I also logged {n0(T.all - T.n)} other activities. They count towards my outings, hours and kudos everywhere on the site, but not towards distance or climb.
          </p>
        </section>
      </div>
    </DetailFrame>
  )
}

// a way of moving as it reads inside a sentence
function ofModeName(k) {
  return { tread: 'treadmill runs', road: 'outdoor runs', trail: 'trail runs', walk: 'walks', hike: 'hikes' }[k]
}

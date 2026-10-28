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

  // ---- My Book: facts for the longer stories ----
  const isTread = (a) => ['yes', 'true', '1'].includes(String(a.trainer).trim().toLowerCase())
  const roadRunsIn = (y) => activities.filter((a) => a.sport_type === 'Run' && !isTread(a) && Number(a.year) === y).length
  const walkTen = (b) => (b.walkKms || []).filter((k) => k >= 10).length
  const walkTwenty = BY.filter((b) => (b.walkKms || []).some((k) => k >= 20)).map((b) => b.year)
  const pastWalkTenMax = Math.max(0, ...BY.filter((b) => b.year < 2025).map(walkTen))
  const yearKm = (b) => SPORTS.reduce((t, s) => t + b.km[s], 0)
  const lowYear = habit.filter((b) => b.year < LY).reduce((m, b) => (yearKm(b) < yearKm(m) ? b : m), habit[0])
  const trailRank = BY.slice().sort((a, b) => b.km.TrailRun - a.km.TrailRun).findIndex((b) => b.year === LY) + 1
  const binAt = (k) => (r.treadBins.find((b) => b.km === k) || {}).count || 0
  const kudosYear = (y) => { const xs = activities.filter((a) => Number(a.year) === y); return xs.length ? xs.reduce((t, a) => t + (Number(a.kudos) || 0), 0) / xs.length : 0 }
  const trail2023 = r.climbs.filter((c) => c.mode === 'trail' && c.date.startsWith('2023') && c.elev >= 1000).length
  const hikeTop = r.climbs.slice(0, 3).every((c) => c.mode === 'hike')
  const ORDW = ['', 'first', 'second', 'third', 'fourth', 'fifth']

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
    >
      <div className="yis-report">
        {/* ===== the four sports in one view ===== */}
        <section className="sgrid yis-top" aria-labelledby="sp-title">
          <div className="sgrid__head">
            <p className="eyebrow">The whole picture</p>
            <h2 id="sp-title" className="section-head__title">Runs cover the&nbsp;ground.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            The treadmill is almost its own sport for me. It is flat, quick and always the same. My very first outing on foot was
            a treadmill run of 5.1 km, and since then {n0(Math.max(0, r.exactFive - 1))} more of my treadmill runs have ended within
            100 m of 5 km. So on this page I keep it apart, and in the chart below it sits alone on the left.
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
        </section>

        {/* ===== 1. who does what ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-split"
          eyebrow={`${num()} · Who does what`}
          title={walkHoursMore ? 'Walks took more hours.' : 'Runs took the most hours.'}
          statement={<>
            Each sport does its own job. Runs and walks share my time almost equally, and a run takes me further, about{' '}
            {k1(S.Run.medKm)} km against {k1(S.Walk.medKm)} km. The hills belong to the few trail runs and hikes: one hike in
            Morogoro climbed as much as all my running climbs in a whole year.
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
          read={[
              'Each row is one thing I can count, and the bar is cut into the four sports so the parts add up to the total on the right. Run your eye down one colour and watch it change: runs own the distance, walks the hours and the climb, and the small trail and hike parts grow big on the climb row.',
              'The usual outing of each kind, by distance, longest at the top. The line under each name is the usual time moving for that kind of outing.',
            ]}
          story={[
              'Which sport matters most depends on what I count. By outings, walks lead. By distance, runs lead by far. By hours, walks and runs are almost level. By climb, walks lead again, and trail runs and hikes come close behind.',
              `Personal records lean heavily to running: ${pc(share('prs', 'Run'))}% of them came on runs and ${pc(share('prs', 'Walk'))}% on walks. Kudos follow the outings more evenly, with runs and walks taking almost the same share.`,
            ]}
          source="Activity Log · runs, walks, trail runs and hikes; distance and climb on foot only"
        />

        {/* ===== 2. the mix over the years ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-mix"
          eyebrow={`${num()} · The mix, year by year`}
          title={walkLead ? `In ${walkLead.year}, walks went further.` : 'Runs went further every year.'}
          statement={<>
            Walking took over slowly, little by little, year after year. In {runPeak.year} I walked only {n0(runPeak.km.Walk)} km
            against more than 2,000 km of running. This year my walking passed my running two days into January, and it never fell
            behind again. Trail running came in from the end of 2021, when I started going to the hills.
          </>}
          odds={{
            title: `${LY}${so}, against the running peak`,
            items: [
              { num: latest.km.Walk, unit: ' km', label: `walked in ${LY}${so}`, tone: 'rest' },
              { num: latest.km.Run, unit: ' km', label: `run in ${LY}${so}`, tone: 'move' },
              { num: runPeak.km.Run, unit: ' km', label: `run in ${runPeak.year}`, tone: 'move' },
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
          read={[
              'Each column is a year, stacked by sport, and the number on top is the total kilometres on foot. The column with a star is the year still running.',
              'Two lines: the kilometres I walked each year and the kilometres I ran. The mark shows the year the walking line first went above the running line.',
            ]}
          story={[
              `My two biggest years on foot were 2021 and 2022, both close to 2,900 km, and both were built on running, most of it on the treadmill. ${lowYear.year} was my smallest year since the comeback, at ${n0(yearKm(lowYear))} km. Since then each year has grown again, and ${LY} is already at ${n0(yearKm(latest))} km${so ? ' with the year not finished' : ''}.`,
              `The trail kilometres come and go with my trips to the hills. There was almost nothing before 2022, then a peak in 2023, and ${LY} is ${trailRank === 1 ? 'my biggest trail year' : `my ${ORDW[trailRank] || `${trailRank}th`} biggest trail year`} so far.`,
            ]}
          source="Activity Log · distance on foot by sport and year"
        />

        {/* ===== 3. the treadmill ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-tread"
          eyebrow={`${num()} · The treadmill`}
          title={`${pc(treadShare)}% of running was indoors.`}
          statement={<>
            More of my running is outside every year. My treadmill years peaked with a full marathon in one room, 42.7 km. Since
            then the share outside has grown, and in 2026, for the first time, more than half of my running was on the roads and
            trails. The treadmill still shows in my habits: I tend to stop when the screen shows a round number.
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
          read={[
              'Each column is a year of running, split into kilometres on the treadmill and kilometres outside. The number on top is the share that was on the treadmill.',
              'Every treadmill run counted by its distance, rounded to the nearest kilometre. The tall spikes stand on 5, 10, 15 and 21 km, the round numbers where I tend to stop.',
            ]}
          story={[
              `The spikes are my habits on the screen. Rounded to the nearest kilometre, ${n0(binAt(5))} treadmill runs come out at 5 km and ${n0(binAt(10))} at 10 km. Those two numbers alone hold ${pc((binAt(5) + binAt(10)) / Math.max(1, M.tread.n))}% of all my treadmill runs.`,
              `Outside, my running grew quickly once it started. In 2024 I ran outside only ${n0(roadRunsIn(2024))} times. In 2025 it was ${n0(roadRunsIn(2025))}, and in ${LY}${so} ${n0(roadRunsIn(LY))}. That is how the outdoor part of the columns finally passed the treadmill.`,
            ]}
          source="Activity Log · runs marked as treadmill (trainer) against runs outdoors"
        />

        {/* ===== 4. pace ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-pace"
          eyebrow={`${num()} · Pace`}
          title="Each sport has its pace."
          statement={<>
            The treadmill makes me look faster than I am. On it my usual kilometre takes under six minutes. When I ran the
            Kilimanjaro Half in 2026, each kilometre took me about ten minutes of moving time, closer to my walking pace than to my
            treadmill pace. Pace here is the minutes I take for one kilometre.
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
          read={[
              'One ridge for each way of moving, showing how many outings went at each pace. Left is quicker and right is slower, and the mark is the usual pace. The treadmill sits far to the left on its own.',
              'One column per year for my treadmill runs. The bold tick is the usual pace that year and the band covers the middle half of my runs. The axis is upside down, so a quicker year stands taller.',
            ]}
          story={[
              `My quickest treadmill year was ${quickYear.year}, at a usual ${pace(quickYear.treadPace.med)} a kilometre. After that the usual pace slowed year by year, to ${yr(2025) && yr(2025).treadPace ? pace(yr(2025).treadPace.med) : ''} in 2025, and in ${LY} it came back to ${latest.treadPace ? pace(latest.treadPace.med) : ''}.`,
              `The slower kilometres outside are real work too. Each outdoor running kilometre climbs about ${n0(M.road.mPerKm)} m on average, and a treadmill kilometre climbs nothing. The ridges show the result: outside, my running sits much closer to my walking than to the treadmill.`,
            ]}
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
              statement={<>
                My walks got longer. From {w0.year} to 2024, about half of them were short, under 3 km. In 2025 that started to change,
                and now almost every walk is a proper outing of many kilometres. In September 2026 I walked 22.8 km on a Sunday in Dar es
                Salaam, and it felt like an ordinary weekend walk.
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
              read={[
              'One ridge for each year, showing how many walks I did at each distance from 0 to 20 km. The mark is the usual walk of that year. Read down the years and the hump moves to the right.',
              'The share of each year\u2019s walks that were shorter than 3 km. The bars fall almost to nothing in the last year.',
            ]}
              story={[
              `In ${LY}${so}, ${n0(walkTen(latest))} of my ${n0(latest.walkN)} walks were 10 km or more. Before 2025, no year had more than ${n0(pastWalkTenMax)} walks that long.`,
              walkTwenty.length ? `The longest walks are new as well. Every walk of 20 km or more in my log came in ${walkTwenty.join(' or ')}.` : '',
              'A walk used to fill a gap in the day. Now it is the main outing of the day.',
            ]}
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
          statement={<>
            Long days used to mean the treadmill. Before my first half marathon outside, 22.7 km on the trails of Morogoro in 2023,
            every long day in my log had been indoors. Now most of them are outside, on roads, trails and long walks. Only the
            marathon, run indoors in 2022, is still longer than any of them.
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
          read={[
              'Each column counts the outings of a half marathon or more in one year, split by how I did them: treadmill, outdoor run, trail run, walk or hike.',
              'The longest single outing of each kind, with the month it happened.',
            ]}
          story={[
              `My long days came in two waves. The first was 2021 and 2022, with ${n0(yr(2021) ? yr(2021).longN : 0)} and ${n0(yr(2022) ? yr(2022).longN : 0)}, almost all on the treadmill. Then they became rare, only ${n0(yr(2024) ? yr(2024).longN : 0)} in 2024. The second wave is now, and this time most of them are outside.`,
              latest.long.walk ? `Walks now count among my long days too. ${cap(word(latest.long.walk))} of my walks in ${LY}${so} reached 21.1 km or more.` : '',
              'The longest of each kind tells the same story. Only the treadmill marathon is from the first wave. The longest trail run, outdoor run and walk all came later, once the long days had moved outside.',
            ]}
          source="Activity Log · outings of 21.1 km or more by way of moving"
        />

        {/* ===== 7. climb ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-climb"
          eyebrow={`${num()} · The climb`}
          title="Hikes climb the most."
          leftNote={<>I drew the slopes steeper than they really are.</>}
          statement={<>
            Climbing is slow work for me, and it happens on foot. My {n0(M.tread.n)} treadmill runs together climbed nothing at all,
            and one hike in Morogoro climbed almost 2,000 m in 16 km. Between those two are my walks, which with{' '}
            {pc(share('km', 'Walk'))}% of my distance did {pc(share('elev', 'Walk'))}% of my climbing.
          </>}
          odds={{
            title: 'Metres climbed for each kilometre',
            items: [
              { num: M.hike.mPerKm, unit: ' m', label: 'per km on a hike', tone: 'move' },
              { num: M.trail.mPerKm, unit: ' m', label: 'per km on a trail run', tone: 'move' },
              { num: M.walk.mPerKm, unit: ' m', label: 'per km on a walk', tone: 'rest' },
              { num: big.elev, unit: ' m', label: 'my biggest single climb', tone: 'move' },
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
          read={[
              'Each line is a road one kilometre long, climbing at that sport\u2019s real average slope. I drew the rise steeper than it really is so the gentle ones can be told apart, and the number at the end is the true metres climbed.',
              'My biggest single climbs, largest at the top, with the month, the sport and the distance.',
            ]}
          story={[
              `${hikeTop ? 'My three biggest climbs are all hikes.' : 'My biggest climbs are hikes and trail runs.'} After them come the trail runs of 2023, my year of the hills, with ${word(trail2023)} climbs of more than 1,000 m in that year alone.`,
              'Walks did the most climbing in total, and no single walk comes near the top of the list. A walk climbs a little at a time, and over hundreds of walks that adds up to more than any other sport.',
            ]}
          source="Activity Log · elevation gain on foot over distance on foot"
        />

        {/* ===== 8. when ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-when"
          eyebrow={`${num()} · When`}
          title="Treadmill runs at night."
          statement={<>
            Each sport has found its own place in my day. The treadmill is busiest at {fmtH(peakHour('tread'))} and again late in the
            evening. Walks come around {fmtH(peakHour('walk'))}, after the working day. Outdoor runs start early, around{' '}
            {fmtH(peakHour('road'))}, or in the late afternoon. Trail runs and hikes need a free day, so they wait for the weekend.
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
          read={[
              'One ridge for each way of moving, showing the hour its outings started, from midnight on the left to midnight on the right. The mark is the busiest hour.',
              'The share of each kind of outing that fell on a Saturday or Sunday. The dashed line is 29%, what an even week would give.',
            ]}
          story={[
              `Hikes lean on the weekend even more than trail runs, with ${pc(M.hike.weekend)}% of them on a Saturday or Sunday. A hike needs a whole day and a trip, and the weekend is when I have both.`,
              'The treadmill is the opposite. It is my weekday tool, and it works at hours when the road is dark, late in the evening or before dawn. The walks fill the evening, after the working day.',
            ]}
          source="Activity Log · local start hour and weekday of every outing on foot"
        />

        {/* ===== 9. doubles ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-doubles"
          eyebrow={`${num()} · A run and a walk on the same day`}
          title='A run and a walk, hours apart.'
          statement={<>
            As the habit settled, I stopped splitting my days. In the early years I often did two things in one day, a run in the
            morning and a walk in the evening, and only {word(under30)} pairs were less than half an hour apart. Now one longer
            outing usually takes their place.
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
          read={[
              'The number of days in each year with both a run and a walk.',
              'The same days, sorted by the time from the end of the first outing to the start of the second. The tallest bar, eight hours or more, is one outing in the morning and the other in the evening.',
            ]}
          story={[
              `Most pairs were far apart. ${n0(far8)} of the ${n0(D.total)} days had eight hours or more between the two, so these were two separate parts of the day. Only ${word(under30)} pairs came close together, one straight after the other.`,
              `The doubles belong to the years when I was building the habit. ${dblPeak[0]} had the most, and in ${LY}${so} there have been ${n0(D.perYear[LY] || 0)}.`,
            ]}
          source="Activity Log · start time and moving time of runs and walks on the same date"
        />

        {/* ===== 10. effort and reward ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-effort"
          eyebrow={`${num()} · Effort and reward`}
          title={`${cap(ofModeName(rated[0]))} work hardest.`}
          statement={<>
            What people cheer and what my heart feels are different things. The people who follow me cheer the trail runs most, and
            my most cheered outing is the Kilimanjaro Half of 2023, with 125 kudos. Per hour, my heart works hardest on the treadmill
            and least on a walk. Relative effort is Strava&rsquo;s score for how hard my heart worked.
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
          read={[
              'Strava\u2019s relative effort, a score from my heart rate, divided by the hours moving, for each way of moving with enough scored outings. A longer bar means my heart worked harder for each hour.',
              'The average kudos each kind of outing received. The line under each name is the personal records it set per outing.',
            ]}
          story={[
              `Kudos grew over the years. In 2021 an outing got about ${n0(kudosYear(2021))} kudos on average. Since 2022 it has stayed between ${n0(Math.min(...[2022, 2023, 2024, 2025, LY].map(kudosYear)))} and ${n0(Math.max(...[2022, 2023, 2024, 2025, LY].map(kudosYear)))}.`,
              unrated.length ? `${cap(unrated.map((k) => ofModeName(k)).join(' and '))} are left off the effort chart, because too few of them have a heart-rate score.` : '',
              'The two charts point in different directions. The treadmill is where my heart works hardest for each hour, and it gets fewer kudos than the trail runs. The trail runs score lower per hour, and they get the most cheers.',
            ]}
          source="Activity Log · Strava relative effort (heart rate), kudos and personal records"
        />

        {/* ===== 11. the maths ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="sp-maths"
          eyebrow={`${num()} · Two small findings`}
          title="Longer runs, quicker km."
          statement={<>
            Two small findings surprised me. On the treadmill, my longer runs were quicker per kilometre.
            {at5 && at21 ? ` My usual 5 km went at ${pace(at5.pace)} a km and my usual 21 km at ${pace(at21.pace)}.` : ''}
            {' '}And running and walking never fought for my time. A big running week did not mean less walking.
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
          read={[
              'Every treadmill run as a dot: across is the distance and up is the pace, with quicker kilometres higher. The line is the best straight fit through the dots, and the number on it shows how strong the link is, from 0 for none to 1 for a perfect line.',
              'Every week since 2021 as a dot: across is the kilometres I ran that week and up is the kilometres I walked. A flat line and a number near zero mean the two did not move together.',
            ]}
          story={[
              `The link on the treadmill is ${strength(F.r)}, so it is a tendency and not a rule. Plenty of short runs were quick and some long ones were slow. On average, each extra kilometre came with about ${secPerKm} seconds quicker per kilometre.`,
              'The weeks show a calm picture. A week with a lot of running could have almost any amount of walking. My walking did not wait for a quiet running week, and my running did not wait for a quiet walking week.',
            ]}
          source={`Activity Log · least-squares fits; treadmill runs quicker than ${pace(TREAD_MIN)} a km left out`}
        />

        {/* ===== 12. the far edges ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="sp-edges">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Biggest days</p>
            <h2 id="sp-edges" className="section-head__title">Each sport&rsquo;s biggest&nbsp;day.</h2>
          </div>
          <ul className="yrecs">
            <RecordCard kicker="Treadmill run" value={M.tread.longest.km} decimals={1} unit="km" label="the longest, a marathon indoors" sub={fmtDay(M.tread.longest.date)} tone="hot" />
            <RecordCard kicker="Outdoor run" value={M.road.longest.km} decimals={1} unit="km" label="the longest on the road" sub={fmtDay(M.road.longest.date)} tone="hot" />
            <RecordCard kicker="Trail run" value={M.trail.longest.km} decimals={1} unit="km" label={`the longest, with ${n0(M.trail.longest.elev)} m of climb`} sub={fmtDay(M.trail.longest.date)} tone="hot" />
            <RecordCard kicker="Walk" value={M.walk.longest.km} decimals={1} unit="km" label={`the longest, with ${n0(M.walk.longest.elev)} m of climb`} sub={fmtDay(M.walk.longest.date)} />
            <RecordCard kicker="Hike" value={M.hike.steepest.elev} unit="m" label={`climbed in ${k1(M.hike.steepest.km)} km, the most of any outing`} sub={fmtDay(M.hike.steepest.date)} />
            <RecordCard kicker="Running streak" value={r.streak.run.len} unit="days" label="in a row with a run or trail run" sub={`${fmtDay(r.streak.run.startISO)} to ${fmtDay(r.streak.run.endISO)}`} />
          </ul>
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
            I also logged {n0(T.all - T.n)} other activities. They count in my outings, hours and kudos, but not in distance or climb.
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

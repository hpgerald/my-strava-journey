import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import GoalRace from '../charts/GoalRace.jsx'
import GhostRace from '../charts/GhostRace.jsx'
import GoalRings from '../charts/GoalRings.jsx'
import ColBars from '../charts/ColBars.jsx'
import { CloseDots, SimHist, StopBars, Tally, MonthBeads } from '../charts/GoalCharts.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { buildGoalsReport, TARGETS } from '../lib/goalsReport.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtShort = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]}` : '')
const fmtMon = (iso) => (iso ? `${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtMonth = (iso) => (iso ? `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const doy = (y, i) => new Date(Date.UTC(y, 0, 1) + i * 86400000).toISOString().slice(0, 10)
const clock = (min) => { const t = Math.round(min * 60); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
const hmin = (min) => { const t = Math.round(min); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const TIMES = ['never', 'once', 'twice']
const times = (n) => TIMES[n] || `${word(n)} times`
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
const RING = { walk: 'var(--g-walk)', run: 'var(--g-run)', elev: 'var(--g-elev)' }
const unitOf = (t, v) => `${n0(v)} ${t.unit}`

// one card of the goal book; `text` replaces the counted number (a race time)
function GoalCard({ id, kicker, value = 0, text, unit, label, sub, decimals = 0, tone }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1100 })
  return (
    <li ref={ref} id={id} className={`yrec${inView ? ' is-in' : ''}${tone ? ` yrec--${tone}` : ''}`}>
      <p className="yrec__k">{kicker}</p>
      <p className="yrec__v">
        {text || Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yrec__u">{unit}</span> : null}
      </p>
      <p className="yrec__l">{label}</p>
      {sub ? <p className="yrec__s">{sub}</p> : null}
    </li>
  )
}

// every year's three rings side by side
function RingYears({ years, cur }) {
  return (
    <div className="gyears">
      <ul className="gyears__grid">
        {years.map((y) => (
          <li key={y.year} className={`gyears__y${y === cur && y.partial ? ' is-now' : ''}`}>
            <GoalRings
              size={170} track={12} gap={4} centre={false}
              pace={y.partial ? y.upTo / y.ndays : null}
              metrics={TARGETS.map((t) => ({ key: t.key, label: `${y.year} ${t.label.toLowerCase()}`, value: y[t.key].total, target: t.target, color: RING[t.key] }))}
            />
            <p className="gyears__l"><b>{y.year}</b> {TARGETS.filter((t) => y[t.key].closed != null).length} of 3 closed{y.partial ? ' so far' : ''}</p>
          </li>
        ))}
      </ul>
      <ul className="chron__key gyears__key" aria-hidden="true">
        {TARGETS.map((t, i) => <li key={t.key}><i className={`msw msw--${t.ring}`} />{['outer', 'middle', 'inner'][i]} ring, {t.label.toLowerCase()} {unitOf(t, t.target)}</li>)}
      </ul>
    </div>
  )
}

export default function Goals() {
  const activities = useTable('activities')
  const kili = useTable('kili_half')
  const profile = useTable('kili_half_profile')
  const rasKilomoni = useTable('ras_kilomoni')
  const { prev, next } = useSectionPaging('/goals')
  const G = useMemo(() => (activities.length ? buildGoalsReport(activities, kili, profile, rasKilomoni) : null), [activities, kili, profile, rasKilomoni])

  // deep links from the home page (/goals#kili-half and the rest) land once the
  // data has drawn the section
  const location = useLocation()
  useEffect(() => {
    const id = location.hash ? location.hash.slice(1) : ''
    if (!id || !G) return
    let tries = 0
    let timer
    const go = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else if (tries++ < 25) timer = setTimeout(go, 100)
    }
    timer = setTimeout(go, 120)
    return () => clearTimeout(timer)
  }, [location.hash, G])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'Goals' }], number: '07', title: 'Goals', subtitle: 'What I aim for each year', prev, next }
  if (!G) return <DetailFrame {...frame} />

  let secN = 0
  const num = () => ++secN
  const cur = G.cur
  const so = cur.partial ? ' so far' : ''
  const habit = G.byYear.filter((y) => y.year >= 2021)
  const [W, R, E] = TARGETS
  const closedYears = (k) => habit.filter((y) => y[k].closed != null)
  const bestOf = (k) => G.byYear.reduce((b, y) => (y[k].total > b[k].total ? y : b), G.byYear[0])
  const bothBefore = habit.filter((y) => y !== cur && y.walk.closed != null && y.run.closed != null).length
  const curClosed = TARGETS.filter((t) => cur[t.key].closed != null)
  const curOpen = TARGETS.filter((t) => cur[t.key].closed == null)

  // ---- the hero headline ----
  const firstBoth = cur.walk.closed != null && cur.run.closed != null && !bothBefore
  const heroTitle = firstBoth ? 'Both 1,000 km rings closed.' : `${cap(word(curClosed.length))} of three rings closed.`
  const heroSub = `${firstBoth ? `${cur.year} is the first year I’ve closed both of them.` : `That’s where ${cur.year} stands${so}.`} My climbing ring is at ${Math.round(cur.elev.share * 100)}%.`

  // ---- the maths ----
  const S = G.sims.elev
  const toGo = E.target - cur.elev.total
  const m0 = Math.max(0, Number(G.lastISO.slice(5, 7)) - 3)
  const d0 = Math.round((Date.UTC(cur.year, m0, 1) - Date.UTC(cur.year, 0, 1)) / 86400000)
  const recent = cur.elev.daily.slice(d0)
  const recentRate = recent.reduce((s, v) => s + v, 0) / Math.max(1, recent.length)
  const recentFinish = cur.elev.total + recentRate * G.daysLeft
  const curMonths = MON.map((mm, i) => {
    const a = Math.round((Date.UTC(cur.year, i, 1) - Date.UTC(cur.year, 0, 1)) / 86400000)
    const b = Math.round((Date.UTC(cur.year, i + 1, 1) - Date.UTC(cur.year, 0, 1)) / 86400000)
    return { i, label: MONTH[i], short: mm, v: cur.elev.daily.slice(a, b).reduce((s, x) => s + x, 0), partial: b > cur.upTo, started: a < cur.upTo }
  }).filter((m) => m.started)
  const needMonth = S ? S.needPerDay * 30.44 : 0

  // ---- the Kilimanjaro Half ----
  const race = G.race
  const first = race[0], last = race[race.length - 1], quick = G.quickest
  const faster = race.length > 1 && race.every((r, i) => !i || r.moving < race[i - 1].moving)
  const samePrs = race.length > 1 && race.every((r) => r.prs != null && r.prs === first.prs)
  const topKudos = race.reduce((b, r) => (!b || r.kudos > b.kudos ? r : b), null)
  const slowest = race.reduce((b, r) => (!b || r.moving > b.moving ? r : b), null)

  // ---- Ras Kilomoni ----
  const rk = G.rk
  const rkWalks = rk.filter((r) => r.sport === 'Walk').length
  const rkKm = rk.reduce((s, r) => s + r.km, 0)
  const rkDays = rk.length ? Math.round((Date.parse(rk[rk.length - 1].date) - Date.parse(rk[0].date)) / 86400000) + 1 : 0
  const rkMonths = []
  for (const r of rk) { const k = r.date.slice(0, 7); let g = rkMonths.find((x) => x.k === k); if (!g) { g = { k, n: 0, km: 0 }; rkMonths.push(g) } g.n++; g.km += r.km }
  const rkTop = rkMonths.reduce((b, x) => (x.n > b.n ? x : b), rkMonths[0] || { n: 0 })
  const rkLast = rk[rk.length - 1]
  const rkOuting = rkLast ? G.outingNo(rkLast.date) : 0

  // ---- the months ----
  const empty = G.months.filter((m) => m.n === 0)
  const lastEmpty = empty[empty.length - 1]
  const centByYear = G.years.map((y) => ({ year: y, n: G.century.filter((m) => m.year === y).length, of: G.months.filter((m) => m.year === y).length }))
  const centCur = centByYear[centByYear.length - 1]
  const centTop = Math.max(...centByYear.map((c) => c.n))
  const centPrev = Math.max(...centByYear.filter((c) => c !== centCur).map((c) => c.n))

  return (
    <DetailFrame
      {...frame}
      lede="The goals I&rsquo;ve met and the ones I haven&rsquo;t yet. Three targets I set myself every year, the chances that the last one closes this year, one race I&rsquo;ve run four times, fifty trips to the same headland, and every month since the habit started with at least one outing."
    >
      <div className="yis-report">
        {/* ===== the race against the calendar ===== */}
        <section className="sgrid yis-top" aria-labelledby="gl-title">
          <div className="sgrid__head">
            <p className="eyebrow">Three targets, every year since {habit[0].year}</p>
            <h2 id="gl-title" className="section-head__title">{heroTitle}</h2>
            <p className="section-head__sub">{heroSub}</p>
          </div>
          <Reveal as="p" className="sgrid__statement">
            Every year I aim for the same three things: {unitOf(W, W.target)} walked, {unitOf(R, R.target)} run (treadmill, outdoor and trail) and {unitOf(E, E.target)} climbed on foot.
            I&rsquo;ve hit the running target {times(closedYears('run').length)}, in {list(closedYears('run').map((y) => y.year))}, and the walking target {times(closedYears('walk').length)}{closedYears('walk').length ? `, on ${fmtDay(doy(closedYears('walk')[0].year, closedYears('walk')[0].walk.closed))}` : ''}.
            {' '}{closedYears('elev').length ? `I’ve hit the climbing target ${times(closedYears('elev').length)}.` : `I’ve never hit the climbing target. My best year was ${bestOf('elev').year}, with ${unitOf(E, bestOf('elev').elev.total)}.`}
            {cur.partial && curOpen.length ? ` With ${n0(G.daysLeft)} days of ${cur.year} left, I need another ${unitOf(E, toGo)} of climbing.` : ''}
          </Reveal>
          <OddsRow
            title={`${cur.year}${so}`}
            items={[
              { num: cur.walk.total, unit: ' km', label: `walked, ${Math.round(cur.walk.share * 100)}% of the target`, tone: cur.walk.closed != null ? 'move' : 'rest' },
              { num: cur.run.total, unit: ' km', label: `run, ${Math.round(cur.run.share * 100)}% of the target`, tone: cur.run.closed != null ? 'move' : 'rest' },
              { num: cur.elev.total, unit: ' m', label: `climbed on foot, ${Math.round(cur.elev.share * 100)}% of the target`, tone: cur.elev.closed != null ? 'move' : 'rest' },
              { num: G.daysLeft, unit: ' days', label: `left in ${cur.year}`, tone: 'rest' },
            ]}
          />
          <GoalRace
            byYear={G.byYear} targets={TARGETS} fromYear={habit[0].year}
            aria={`Running totals through each year against the three targets. ${TARGETS.map((t) => `${t.label}: ${habit.map((y) => `${y.year} ${unitOf(t, y[t.key].total)}`).join(', ')}`).join('. ')}.`}
          />
          <ul className="chron__key" aria-hidden="true">
            <li><i className="grace__ksw is-now" />{cur.year}{so}, the dot is today</li>
            <li><i className="grace__ksw" />earlier years</li>
            <li><i className="grace__kgoal" />the target</li>
            <li><i className="grace__khit" />the day it was crossed</li>
          </ul>
          <p className="source">Source: Activity Log · daily totals on foot, running total through each calendar year</p>
        </section>

        {/* ===== 1. the rings, year by year ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="gl-rings"
          eyebrow={`${num()} · Every year against the targets`}
          title={`Running closed ${times(closedYears('run').length)}.`}
          sub={`My walking ring closed ${times(closedYears('walk').length)}, and my climbing ring ${closedYears('elev').length ? `closed ${times(closedYears('elev').length)}` : 'never has'}.`}
          statement={<>
            My running ring closed on {list(closedYears('run').filter((y) => y !== cur).map((y) => `${fmtShort(doy(y.year, y.run.closed))} in ${y.year}`))}. In {bestOf('run').year} I ran {unitOf(R, bestOf('run').run.total)}, {(bestOf('run').run.total / R.target).toFixed(1)} times the target.
            In {list(habit.filter((y) => y.run.closed == null).map((y) => y.year))} I didn&rsquo;t make it, with {list(habit.filter((y) => y.run.closed == null).map((y) => unitOf(R, y.run.total)))}.
            I walked less than {n0(Math.ceil(Math.max(...habit.filter((y) => y !== cur).map((y) => y.walk.total)) / 100) * 100)} km a year until {cur.year}, when I passed {unitOf(W, W.target)} on {fmtDay(doy(cur.year, cur.walk.closed ?? 0))}.
            The closest I&rsquo;ve come on climbing was {bestOf('elev').year}, at {Math.round(bestOf('elev').elev.share * 100)}%.
          </>}
          odds={{
            title: `Rings closed, ${habit[0].year} to ${cur.year}`,
            items: [
              { num: closedYears('run').length, unit: '', label: `running, best ${unitOf(R, bestOf('run').run.total)} in ${bestOf('run').year}`, tone: 'move' },
              { num: closedYears('walk').length, unit: '', label: `walking, best ${unitOf(W, bestOf('walk').walk.total)} in ${bestOf('walk').year}`, tone: 'move' },
              { num: closedYears('elev').length, unit: '', label: `climbing, best ${unitOf(E, bestOf('elev').elev.total)} in ${bestOf('elev').year}`, tone: 'rest' },
              { num: habit.filter((y) => y.walk.closed != null && y.run.closed != null).length, unit: '', label: 'years with both 1,000 km rings closed', tone: 'move' },
            ],
          }}
          left={{
            title: 'Each year as three rings',
            node: <RingYears years={habit} cur={cur} />,
          }}
          right={{
            title: 'The day each ring closed',
            node: (
              <CloseDots
                rows={habit.map((y) => ({ year: y.year, ndays: y.ndays, upTo: y.upTo, marks: TARGETS.map((t) => ({ key: t.key, label: t.label, ring: t.ring, day: y[t.key].closed, share: y[t.key].share })) }))}
                aria={`The day each target was crossed: ${habit.map((y) => `${y.year}: ${TARGETS.map((t) => (y[t.key].closed != null ? `${t.label.toLowerCase()} on ${fmtShort(doy(y.year, y[t.key].closed))}` : `${t.label.toLowerCase()} ${Math.round(y[t.key].share * 100)}%`)).join(', ')}`).join('; ')}.`}
              />
            ),
          }}
          leftNote={<>Each ring fills up to its share of the target, and a dot marks a ring that closed. On {cur.year}, the white notch shows where the year is today.</>}
          rightNote={<>A ring on the line is the day I reached a target. The earlier in the year, the bigger the year was. Targets I didn&rsquo;t reach are listed at the end of the row with how far I got.</>}
          source="Activity Log · yearly totals on foot against the three fixed targets"
        />

        {/* ===== 2. the maths of the open ring ===== */}
        {S && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="gl-odds"
              eyebrow={`${num()} · Will it close?`}
              title={`Climbing: a ${Math.round(S.hit * 100)}% chance.`}
              sub={`The chance that I reach my climbing target in ${cur.year}.`}
              statement={<>
                To get there I need {unitOf(E, toGo)} in the last {n0(G.daysLeft)} days, which is {n0(S.needPerDay)} m a day. So far this year I&rsquo;ve averaged {n0(S.perDay)} m a day, counting rest days, so if I keep to my average I&rsquo;ll finish {S.perDay >= S.needPerDay ? 'just over' : 'just short'}.
                To get a better idea, I played out the rest of the year {n0(S.finals.length)} times. Each time I picked {n0(G.daysLeft)} days at random from my {n0(cur.upTo)} days of {cur.year} so far and added up their climbing. {Math.round(S.hit * 100)}% of those runs got past {unitOf(E, E.target)}, and the one in the middle finished at {unitOf(E, S.p50)}.
                What worries me is my recent pace. Since 1 {MONTH[m0]} I&rsquo;ve been climbing {n0(recentRate)} m a day, and at that rate the year ends near {unitOf(E, Math.round(recentFinish / 100) * 100)}.
              </>}
              odds={{
                title: `The climb, ${cur.year}`,
                items: [
                  { num: toGo, unit: ' m', label: `still to climb in ${n0(G.daysLeft)} days`, tone: 'rest' },
                  { num: S.needPerDay, unit: ' m', label: 'a day needed from here', tone: 'rest' },
                  { num: S.perDay, unit: ' m', label: `a day so far in ${cur.year}`, tone: 'move' },
                  { value: S.hit, label: `of ${n0(S.finals.length)} replays close the ring`, tone: 'move' },
                ],
              }}
              left={{
                title: `Where ${n0(S.finals.length)} replays of the year finish`,
                node: (
                  <SimHist
                    finals={S.finals} target={E.target} unit="m"
                    aria={`Simulated finishes for the ${cur.year} climb: 10% end below ${n0(S.p10)} m, half below ${n0(S.p50)} m and 90% below ${n0(S.p90)} m. ${Math.round(S.hit * 100)}% clear ${n0(E.target)} m.`}
                  />
                ),
              }}
              right={{
                title: `Metres climbed each month of ${cur.year}`,
                node: (
                  <ColBars
                    items={curMonths.map((m) => ({ label: m.short, short: m.short.slice(0, 1), value: m.v, display: m.v >= 1000 ? `${(m.v / 1000).toFixed(1)}k` : n0(m.v), tone: m.partial ? 'quiet' : m.v >= needMonth ? 'big' : 'mid' }))}
                    max={Math.max(needMonth, ...curMonths.map((m) => m.v)) * 1.15}
                    ticks={[0, 1000, 2000, 3000, 4000]} tickFmt={(v) => (v ? `${v / 1000}k` : '0')}
                    refLine={{ value: needMonth, label: `needed a month from here, ${n0(Math.round(needMonth / 10) * 10)} m`, short: `needed, ${n0(Math.round(needMonth / 10) * 10)} m` }}
                    yCap="metres climbed &uarr;"
                    aria={`Metres climbed on foot each month of ${cur.year}: ${curMonths.map((m) => `${m.label} ${n0(m.v)} m`).join(', ')}. About ${n0(needMonth)} m a month is needed from here.`}
                  />
                ),
              }}
              leftNote={<>Each bar counts how many of the played-out years finished in that 250 m band. The orange bars get past the target, which is the dashed line.</>}
              rightNote={<>The orange months were above the pace I now need. {curMonths.filter((m) => !m.partial && m.v >= needMonth).length} of the {curMonths.filter((m) => !m.partial).length} full months were. {MONTH[curMonths[curMonths.length - 1].i]}, in grey, isn&rsquo;t over yet.</>}
              source={`Activity Log · climb on foot each day of ${cur.year}, resampled ${n0(S.finals.length)} times with a fixed seed`}
            />
          </>
        )}

        {/* ===== 3. the Kilimanjaro Half ===== */}
        {race.length > 1 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="kili-half"
              eyebrow={`${num()} · The Kilimanjaro Half, ${word(race.length)} times`}
              title={faster ? 'Faster every time.' : 'The Kilimanjaro Half.'}
              sub={faster ? `I’ve run the Kilimanjaro Half ${word(race.length)} times.` : `I’ve run it ${word(race.length)} times.`}
              statement={<>
                It&rsquo;s the same half marathon each time. My moving time went {list(race.map((r) => `${hmin(r.moving)} in ${r.year}`))}, {n0(first.moving - last.moving)} minutes faster from the first to the last.
                I cut my stops even more than my running time: {n0(first.stopped)} minutes standing still in {first.year} and {k1(last.stopped)} in {last.year}.
                If I put all of them in the same race, my {slowest.year} self would still be {k1(G.courseKm - slowest.atQuickest)} km from the finish when my {quick.year} self crossed the line.
                {samePrs ? ` Each time I set ${first.prs} personal records on the course’s timed segments.` : ''} The {topKudos.year} race got {n0(topKudos.kudos)} kudos, {topKudos.kudos >= G.topKudos ? 'more than any other outing I’ve logged' : `the most of the ${word(race.length)}`}.
              </>}
              odds={{
                title: `${cap(word(race.length))} editions of one race`,
                items: [
                  { num: first.moving - last.moving, unit: ' min', dec: 1, label: `quicker in ${last.year} than in ${first.year}`, tone: 'move' },
                  { num: first.stopped - last.stopped, unit: ' min', label: `less time stopped than in ${first.year}`, tone: 'move' },
                  { num: G.courseKm - slowest.atQuickest, unit: ' km', dec: 1, label: `${slowest.year} behind when ${quick.year} finished`, tone: 'rest' },
                  { num: topKudos.kudos, unit: '', label: `kudos in ${topKudos.year}${topKudos.kudos >= G.topKudos ? ', the most of any outing' : `, the most of the ${word(race.length)}`}`, tone: 'move' },
                ],
              }}
              left={{
                title: `All ${word(race.length)} editions, raced at once`,
                node: (
                  <GhostRace
                    race={race} courseKm={G.courseKm}
                    aria={`The ${race.length} editions of the Kilimanjaro Half replayed together along the course profile. Moving times: ${race.map((r) => `${r.year} ${hmin(r.moving)}`).join(', ')}. When ${quick.year} finished, ${race.filter((r) => r !== quick).map((r) => `${r.year} was ${k1(G.courseKm - r.atQuickest)} km behind`).join(', ')}.`}
                  />
                ),
              }}
              right={{
                title: 'Moving and stopped, each edition',
                node: (
                  <StopBars
                    rows={race.map((r) => ({ label: String(r.year), moving: r.moving, stopped: r.stopped, now: r === last }))}
                    aria={`Time on the course at each edition: ${race.map((r) => `${r.year} ${hmin(r.moving)} moving and ${Math.round(r.stopped)} minutes stopped`).join(', ')}.`}
                  />
                ),
              }}
              leftNote={<>The line is the course from start to finish, drawn by its height. Each dot runs it at my pace from that year, half a kilometre at a time, and the ticks show where the others were when the fastest one finished.</>}
              rightNote={<>The solid bar is time moving and the hatched end is time stopped. Of the {n0(first.moving + first.stopped - last.moving - last.stopped)} minutes I saved on the course, {Math.round(((first.stopped - last.stopped) / (first.moving + first.stopped - last.moving - last.stopped)) * 100)}% came from shorter stops.</>}
              source="Kilimanjaro Half table and course profile · moving pace per half kilometre, elapsed and moving time per edition"
            />
          </>
        )}

        {/* ===== 4. Ras Kilomoni ===== */}
        {rk.length > 0 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="ras-kilomoni"
              eyebrow={`${num()} · One place, ${n0(rk.length)} times`}
              title={`${rk.length === 50 ? 'Fifty' : n0(rk.length)} trips to Ras Kilomoni.`}
              sub={`In ${n0(rkDays)} days. The last one took my record to ${n0(rkOuting)} outings.`}
              statement={<>
                In {rk[0].date.slice(0, 4)} I set myself a different kind of target: get to the headland at Ras Kilomoni {rk.length === 50 ? 'fifty' : n0(rk.length)} times. I numbered the trips {rk[0].roman} to {rkLast.roman} as I went, in Roman numerals.
                It took me from {fmtDay(rk[0].date)} to {fmtDay(rkLast.date)}, {rkWalks} trips walking and {rk.length - rkWalks} running, {n0(rkKm)} km in all.{' '}
                {MONTH[parseInt(rkTop.k.slice(5, 7), 10) - 1]} was my busiest month, with {rkTop.n}. The last trip, {rkLast.roman}, was also my {n0(rkOuting)}th outing.
              </>}
              odds={{
                title: 'Ras Kilomoni',
                items: [
                  { num: rk.length, unit: '', label: 'trips, the target met exactly', tone: 'move' },
                  { num: rkDays, unit: ' days', label: `${fmtShort(rk[0].date)} to ${fmtShort(rkLast.date)}`, tone: 'move' },
                  { num: rkKm, unit: ' km', label: `there and back, ${k1(rkKm / rk.length)} km a trip`, tone: 'move' },
                  { num: rkOuting, unit: '', label: `outings in the record after trip ${rkLast.roman}`, tone: 'rest' },
                ],
              }}
              left={{
                title: 'Every trip, kept as a tally',
                node: (
                  <>
                    <Tally visits={rk} aria={`Tally of the ${rk.length} trips to Ras Kilomoni by month: ${rkMonths.map((m) => `${fmtMon(`${m.k}-01`)} ${m.n}`).join(', ')}.`} />
                    <p className="chr__key tally__key" aria-hidden="true"><i className="tally__ksw is-walk" />walked <i className="tally__ksw is-run" />run</p>
                  </>
                ),
              }}
              right={{
                title: 'Trips each month',
                node: (
                  <ColBars
                    items={rkMonths.map((m) => ({ label: fmtMon(`${m.k}-01`), short: MON[parseInt(m.k.slice(5, 7), 10) - 1], value: m.n, display: String(m.n), tone: m === rkTop ? 'big' : 'mid' }))}
                    ticks={[0, 5, 10, 15]} max={rkTop.n * 1.15} yCap="trips &uarr;"
                    aria={`Trips to Ras Kilomoni each month: ${rkMonths.map((m) => `${fmtMon(`${m.k}-01`)} ${m.n}`).join(', ')}.`}
                  />
                ),
              }}
              leftNote={<>One stroke per trip, counted in fives the way you&rsquo;d keep a tally by hand, four upright and the fifth across. I ran the orange ones and walked the grey ones.</>}
              rightNote={<>I kept a steady count for the first three months. Then I did {rkTop.n} trips in {MONTH[parseInt(rkTop.k.slice(5, 7), 10) - 1]} and the target was suddenly within reach.</>}
              source="Ras Kilomoni table · every trip with its date, sport and distance"
            />
          </>
        )}

        {/* ===== 5. the months ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="month-streak"
          eyebrow={`${num()} · A goal I never set`}
          title={`${n0(G.streak)} months in a row.`}
          sub={`I went out in every one of them. ${n0(G.century.length)} months passed 100 km on foot.`}
          statement={<>
            I never set this one as a target. The last month I didn&rsquo;t go out at all was {fmtMonth(`${lastEmpty.key}-01`)}, and every month since, {n0(G.streak)} in a row, has had at least one outing.
            {' '}{n0(G.century.length)} of my months have passed 100 km on foot, the first in {fmtMonth(`${G.century[0].key}-01`)}.
            {centCur.n === centCur.of ? ` In ${cur.year} every month${so} has, ${word(centCur.n)} of ${word(centCur.of)}.` : ` In ${cur.year}, ${word(centCur.n)} of ${word(centCur.of)} months${so} have.`}
          </>}
          odds={{
            title: 'Every calendar month',
            items: [
              { num: G.streak, unit: ' months', label: `in a row with an outing, since ${fmtMon(`${G.streakFrom.key}-01`)}`, tone: 'move' },
              { num: G.century.length, unit: ' months', label: 'with 100 km or more on foot', tone: 'move' },
              { num: centCur.n, unit: ` of ${centCur.of}`, label: `months of ${cur.year} past 100 km`, tone: 'move' },
              { num: empty.length, unit: ' months', label: `with no outing, all before ${fmtMon(`${G.streakFrom.key}-01`)}`, tone: 'rest' },
            ],
          }}
          left={{
            title: 'Every month as a bead',
            node: (
              <MonthBeads
                months={G.months}
                aria={`Distance on foot each month, ${G.months[0].key} to ${G.months[G.months.length - 1].key}. Months with no outing: ${empty.map((m) => m.key).join(', ')}. ${G.century.length} months passed 100 km.`}
              />
            ),
          }}
          right={{
            title: 'Months past 100 km, each year',
            node: (
              <ColBars
                items={centByYear.map((c) => ({ label: String(c.year), short: `'${String(c.year).slice(2)}`, value: c.n, display: String(c.n), tone: c.n === centTop ? 'big' : c.n ? 'mid' : 'quiet' }))}
                ticks={[0, 3, 6, 9, 12]} max={13} yCap="months &uarr;"
                aria={`Months with 100 km or more on foot each year: ${centByYear.map((c) => `${c.year} ${c.n} of ${c.of}`).join(', ')}.`}
              />
            ),
          }}
          leftNote={<>One string per year and one bead per month, sized by distance on foot. The orange beads are months over 100 km, and an empty ring is a month with no outing.</>}
          rightNote={<>{cur.year} has {centCur.n} so far, {centCur.n > centPrev ? 'more than any other year' : centCur.n === centPrev ? `the same as ${list(centByYear.filter((c) => c !== centCur && c.n === centPrev).map((c) => c.year))}` : `compared with ${centPrev} at best before`}. All the empty rings are from before the habit started.</>}
          source="Activity Log · outings and distance on foot in every calendar month"
        />

        {/* ===== the goal book ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="gl-book">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · All my goals</p>
            <h2 id="gl-book" className="section-head__title">Met, and still&nbsp;open.</h2>
          </div>
          <ul className="yrecs">
            <GoalCard kicker="Running ring" value={closedYears('run').length} unit="times" label={`closed, best ${unitOf(R, bestOf('run').run.total)}`} sub={list(closedYears('run').map((y) => y.year))} tone="hot" />
            <GoalCard kicker="Walking ring" value={closedYears('walk').length} unit={closedYears('walk').length === 1 ? 'time' : 'times'} label={`closed, ${unitOf(W, bestOf('walk').walk.total)} in ${bestOf('walk').year}`} sub={closedYears('walk').length ? `on ${fmtDay(doy(closedYears('walk')[0].year, closedYears('walk')[0].walk.closed))}` : ''} tone="hot" />
            <GoalCard kicker="Climbing ring" value={Math.round(cur.elev.share * 100)} unit="%" label={`of ${unitOf(E, E.target)} in ${cur.year}${so}`} sub={S ? `${Math.round(S.hit * 100)}% chance it closes` : ''} />
            {G.marathon && <GoalCard id="marathon" kicker="The marathon" text={clock(G.marathon.min)} label={`${k1(G.marathon.dist)} km${G.marathon.min < 180 ? ' in under three hours' : ''}${G.marathon.trainer ? ', on the treadmill' : ''}`} sub={fmtMonth(G.marathon.date)} tone="hot" />}
            {G.stage && <GoalCard id="stage-race" kicker="The stage race" value={G.stage.km} decimals={1} unit="km" label={`in ${word(G.stage.days.length)} days back to back, ${k1(G.stage.km / G.stage.days.length)} km a day`} sub={`${fmtShort(G.stage.days[0].date)} to ${fmtDay(G.stage.days[G.stage.days.length - 1].date)}`} />}
            {race.length > 0 && <GoalCard kicker="Kilimanjaro Half" text={hmin(quick.moving)} label={`the quickest of ${word(race.length)}, ${n0(first.moving - last.moving)} min under ${first.year}`} sub={`${quick.year} edition`} />}
            {rk.length > 0 && <GoalCard kicker="Ras Kilomoni" value={rk.length} unit="trips" label={`${n0(rkKm)} km, target met exactly`} sub={`${fmtShort(rk[0].date)} to ${fmtDay(rkLast.date)}`} />}
            <GoalCard kicker="Months in a row" value={G.streak} unit="months" label="with at least one outing, still going" sub={`since ${fmtMon(`${G.streakFrom.key}-01`)}`} />
          </ul>
          <p className="source">Source: Activity Log, Kilimanjaro Half and Ras Kilomoni tables</p>
        </section>
      </div>
    </DetailFrame>
  )
}

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

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'Goals' }], number: '07', title: 'Goals', subtitle: 'The targets, year by year.', prev, next }
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
  const heroSub = `${firstBoth ? `${cur.year} is the first year to close both.` : `That is ${cur.year}${so}.`} The climbing ring is at ${Math.round(cur.elev.share * 100)}%.`

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
      lede="The goals, the ones met and the ones still open. Three targets held against every year, the odds that the last open ring closes this year, one race run four times, fifty trips to one headland, and a run of months that never went empty."
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
            The same three targets are held against every year: {unitOf(W, W.target)} walked, {unitOf(R, R.target)} run (treadmill, road and trail) and {unitOf(E, E.target)} climbed on foot.
            Running has closed {times(closedYears('run').length)}, in {list(closedYears('run').map((y) => y.year))}. Walking has closed {times(closedYears('walk').length)}{closedYears('walk').length ? `, on ${fmtDay(doy(closedYears('walk')[0].year, closedYears('walk')[0].walk.closed))}` : ''}.
            Climbing has {closedYears('elev').length ? `closed ${times(closedYears('elev').length)}` : `never closed; the best year was ${bestOf('elev').year} with ${unitOf(E, bestOf('elev').elev.total)}`}.
            {cur.partial && curOpen.length ? ` With ${n0(G.daysLeft)} days of ${cur.year} left, climbing needs ${unitOf(E, toGo)} more.` : ''}
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
          sub={`Walking closed ${times(closedYears('walk').length)}. Climbing ${closedYears('elev').length ? `closed ${times(closedYears('elev').length)}` : 'never has'}.`}
          statement={<>
            The running ring closed on {list(closedYears('run').filter((y) => y !== cur).map((y) => `${fmtShort(doy(y.year, y.run.closed))} in ${y.year}`))}. {bestOf('run').year} ran {unitOf(R, bestOf('run').run.total)}, {(bestOf('run').run.total / R.target).toFixed(1)} times the target.
            Then {list(habit.filter((y) => y.run.closed == null).map((y) => y.year))} fell short, at {list(habit.filter((y) => y.run.closed == null).map((y) => unitOf(R, y.run.total)))}.
            Walking stayed under {n0(Math.ceil(Math.max(...habit.filter((y) => y !== cur).map((y) => y.walk.total)) / 100) * 100)} km a year until {cur.year}, which crossed {unitOf(W, W.target)} on {fmtDay(doy(cur.year, cur.walk.closed ?? 0))}.
            The climbing ring has come closest in {bestOf('elev').year}, at {Math.round(bestOf('elev').elev.share * 100)}%.
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
          leftNote={<><b>How to read it.</b> Each ring fills to its share of the target and a dot seals a closed ring. On {cur.year}, the white notch is where the year stands today.</>}
          rightNote={<><b>Why it matters.</b> A ring on the line is the day a target fell; the earlier, the bigger the year. Targets never met are listed with their share at the row's end.</>}
          source="Activity Log · yearly totals on foot against the three fixed targets"
        />

        {/* ===== 2. the maths of the open ring ===== */}
        {S && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="gl-odds"
              eyebrow={`${num()} · The maths of the open ring`}
              title={`Climbing: a ${Math.round(S.hit * 100)}% chance.`}
              sub={`The odds that the climbing ring closes in ${cur.year}.`}
              statement={<>
                To close it, the last {n0(G.daysLeft)} days need {unitOf(E, toGo)}: {n0(S.needPerDay)} m a day. The year so far has averaged {n0(S.perDay)} m a day, rest days included, so the average alone says it closes {S.perDay >= S.needPerDay ? 'by a whisker' : 'just short'}.
                To put odds on it, the rest of the year is replayed {n0(S.finals.length)} times, each time by picking {n0(G.daysLeft)} days at random from the {n0(cur.upTo)} days of {cur.year} so far and adding up their climb. {Math.round(S.hit * 100)}% of those replays pass {unitOf(E, E.target)}; the middle one finishes at {unitOf(E, S.p50)}.
                The warning sign is the recent pace: since 1 {MONTH[m0]} it has been {n0(recentRate)} m a day, and at that rate the year ends near {unitOf(E, Math.round(recentFinish / 100) * 100)}.
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
              leftNote={<><b>How to read it.</b> Each bar counts the replays that finish in that 250 m band. Orange bars clear the target, the dashed line.</>}
              rightNote={<><b>Why it matters.</b> Orange months beat the pace the ring now needs. {curMonths.filter((m) => !m.partial && m.v >= needMonth).length} of {curMonths.filter((m) => !m.partial).length} full months did; {MONTH[curMonths[curMonths.length - 1].i]}, in grey, is still going.</>}
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
              title={faster ? 'Quicker every year.' : 'The Kilimanjaro Half.'}
              sub={faster ? `The Kilimanjaro Half, ${word(race.length)} editions on record.` : `Run ${word(race.length)} times.`}
              statement={<>
                The same half marathon, {word(race.length)} editions on record. Moving time went {list(race.map((r) => `${hmin(r.moving)} in ${r.year}`))}, {n0(first.moving - last.moving)} minutes quicker from first to last.
                The stops shrank faster than the running: {n0(first.stopped)} minutes standing still in {first.year}, {k1(last.stopped)} in {last.year}.
                Raced side by side, when {quick.year} crossed the line {slowest.year} was still {k1(G.courseKm - slowest.atQuickest)} km out.
                {samePrs ? ` Each edition set ${first.prs} personal records on the course's timed segments.` : ''} The {topKudos.year} edition drew {n0(topKudos.kudos)} kudos, {topKudos.kudos >= G.topKudos ? 'the most of any outing on record' : `the most of the ${word(race.length)}`}.
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
              leftNote={<><b>How to read it.</b> The line is the course from start to finish, drawn by its height; each dot runs it at the pace of that year, half a kilometre at a time. Ticks mark where the others were when the quickest finished.</>}
              rightNote={<><b>Why it matters.</b> The solid bar is time moving and the hatched end is time stopped. Of the {n0(first.moving + first.stopped - last.moving - last.stopped)} minutes saved on the course, {Math.round(((first.stopped - last.stopped) / (first.moving + first.stopped - last.moving - last.stopped)) * 100)}% came off the stops.</>}
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
              sub={`In ${n0(rkDays)} days. The last one made it ${n0(rkOuting)} outings in the record.`}
              statement={<>
                In {rk[0].date.slice(0, 4)} the target was a place: reach the headland at Ras Kilomoni {rk.length === 50 ? 'fifty' : n0(rk.length)} times, numbering the trips {rk[0].roman} to {rkLast.roman} as they went (Roman numerals, 1 to {rk.length}).
                It took from {fmtDay(rk[0].date)} to {fmtDay(rkLast.date)}: {rkWalks} trips at a walk and {rk.length - rkWalks} on the run, {n0(rkKm)} km in all.{' '}
                {MONTH[parseInt(rkTop.k.slice(5, 7), 10) - 1]} was the busiest month with {rkTop.n}. The last trip, {rkLast.roman}, brought the whole record to {n0(rkOuting)} outings.
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
              leftNote={<><b>How to read it.</b> One stroke per trip, counted in fives the way a tally is kept by hand: four upright, the fifth across. Orange strokes were run, grey walked.</>}
              rightNote={<><b>Why it matters.</b> The count was steady through the first three months, then {MONTH[parseInt(rkTop.k.slice(5, 7), 10) - 1]} took {rkTop.n} trips and the target came within reach.</>}
              source="Ras Kilomoni table · every trip with its date, sport and distance"
            />
          </>
        )}

        {/* ===== 5. the months ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="month-streak"
          eyebrow={`${num()} · The goal nobody set`}
          title={`${n0(G.streak)} months in a row.`}
          sub={`Every one with an outing. ${n0(G.century.length)} months passed 100 km on foot.`}
          statement={<>
            Nobody set this one. The last calendar month without a single outing was {fmtMonth(`${lastEmpty.key}-01`)}; every month since, {n0(G.streak)} in a row, has had at least one.
            {' '}{n0(G.century.length)} months have passed 100 km on foot, the first in {fmtMonth(`${G.century[0].key}-01`)}.
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
          leftNote={<><b>How to read it.</b> One string per year, one bead per month, sized by the distance on foot. Orange beads passed 100 km; an empty ring is a month with no outing.</>}
          rightNote={<><b>Why it matters.</b> {cur.year} has {centCur.n} so far, {centCur.n > centPrev ? 'the most of any year' : centCur.n === centPrev ? `level with ${list(centByYear.filter((c) => c !== centCur && c.n === centPrev).map((c) => c.year))}` : `against ${centPrev} at best before`}. The empty rings all sit before the habit began.</>}
          source="Activity Log · outings and distance on foot in every calendar month"
        />

        {/* ===== the goal book ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="gl-book">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · The goal book</p>
            <h2 id="gl-book" className="section-head__title">Every goal, met or&nbsp;open.</h2>
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

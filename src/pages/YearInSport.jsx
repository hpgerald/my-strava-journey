import { useMemo, useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import { useBook } from '../components/BookContext.js'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import OutingSky from '../charts/OutingSky.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import YearMonths from '../charts/YearMonths.jsx'
import YearProgress from '../charts/YearProgress.jsx'
import YearCalendar from '../charts/YearCalendar.jsx'
import YearRank from '../charts/YearRank.jsx'
import YearMoment from '../charts/YearMoment.jsx'
import YearDistances from '../charts/YearDistances.jsx'
import YearVsPrev from '../charts/YearVsPrev.jsx'
import SportTreemap from '../charts/SportTreemap.jsx'
import FootFlip from '../charts/FootFlip.jsx'
import ColBars from '../charts/ColBars.jsx'
import DecileBars from '../charts/DecileBars.jsx'
import TransitionMatrix from '../charts/TransitionMatrix.jsx'
import TailOutlier from '../charts/TailOutlier.jsx'
import GeoBubbles from '../charts/GeoBubbles.jsx'
import PairBars from '../charts/PairBars.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { computeYearStats, YEAR_THEME, YEAR_REPORT } from '../lib/yearStats.js'
import { buildYearReport } from '../lib/yearReport.js'
import { fmtInt } from '../lib/format.js'
import { isNamedCountry } from '../lib/geo.js'

const MONTH_L = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const EVEREST = 8849
const DAR_DODOMA_KM = 450 // Dar es Salaam to Dodoma by road, one way
const pc = (v) => Math.round((v || 0) * 100)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const fmtMonth = (iso) => (iso ? `${MONTH_L[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MONTH_L[parseInt(iso.slice(5, 7), 10) - 1]}` : '')
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const chg = (cur, prv) => (prv > 0 ? (cur - prv) / prv : null)
const chgTxt = (c) => (c == null ? '' : c >= 0 ? `up ${pc(c)}%` : `down ${pc(-c)}%`)
const more = (c, up, down) => (c == null ? 'no comparable' : c >= 0 ? `${pc(c)}% ${up}` : `${pc(-c)}% ${down}`)

// one record card on the four-column grid
function RecordCard({ kicker, value = 0, unit, label, sub, decimals = 0, text = null, tone }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1100 })
  return (
    <li ref={ref} className={`yrec${inView ? ' is-in' : ''}${tone ? ` yrec--${tone}` : ''}`}>
      <p className="yrec__k">{kicker}</p>
      <p className="yrec__v">
        {text != null ? text : v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yrec__u">{unit}</span> : null}
      </p>
      <p className="yrec__l">{label}</p>
      {sub ? <p className="yrec__s">{sub}</p> : null}
    </li>
  )
}

export default function YearInSport({ year: bookYear } = {}) {
  const book = useBook()
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const { prev, next } = useSectionPaging('/numbers')

  const years = useMemo(
    () => [...new Set(activities.map((a) => Number(a.year)).filter(Boolean))].sort((a, b) => a - b),
    [activities]
  )
  const latest = years.length ? years[years.length - 1] : 2026
  const { year: yearParam } = useParams()
  const [picked, setPicked] = useState(null)
  useEffect(() => {
    const y = Number(yearParam)
    setPicked(years.includes(y) ? y : null)
  }, [yearParam, years])
  const activeYear = bookYear ?? picked ?? latest
  const idp = (k) => (book ? `${k}-${activeYear}` : k)

  const geoByKey = useMemo(() => {
    const m = {}
    for (const g of activityGeo) m[g.activity_key] = g
    return m
  }, [activityGeo])
  const recordFirst = useMemo(() => activities.reduce((m, a) => (!m || a.date < m ? a.date : m), ''), [activities])
  const recordLast = useMemo(() => activities.reduce((m, a) => (a.date > m ? a.date : m), ''), [activities])

  const allStats = useMemo(
    () => (activities.length ? years.map((y) => computeYearStats(y, activities, geoByKey)) : []),
    [years, activities, geoByKey]
  )
  const s = allStats.find((x) => x.year === activeYear) || null
  const prevYear = years.includes(activeYear - 1) ? activeYear - 1 : null
  const ps = prevYear ? allStats.find((x) => x.year === prevYear) : null
  const r = useMemo(
    () => (s ? buildYearReport(activeYear, activities, geoByKey, recordFirst.slice(0, 10), recordLast.slice(0, 10)) : null),
    [s, activeYear, activities, geoByKey, recordFirst, recordLast]
  )
  const yearActs = useMemo(() => activities.filter((a) => Number(a.year) === activeYear), [activities, activeYear])

  const pickerRef = useRef(null)
  const scrollToTop = () => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const onPickerKey = (e) => {
    const i = years.indexOf(activeYear)
    if (e.key === 'ArrowRight' && i < years.length - 1) { setPicked(years[i + 1]); e.preventDefault() }
    if (e.key === 'ArrowLeft' && i > 0) { setPicked(years[i - 1]); e.preventDefault() }
  }

  if (!s || !r) {
    return <DetailFrame crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]} number="02" title="Year in Sport" subtitle="Pick a year. See the whole story." />
  }

  const Y = activeYear
  const isPartial = Y === latest && s.endISO.slice(5) < '12-31'
  const so = isPartial ? ' so far' : ''
  const theme = YEAR_THEME[Y] || `${Y} in sport`

  // ---- the months ----
  const firstMo = r.startISO.slice(0, 4) === String(Y) ? parseInt(r.startISO.slice(5, 7), 10) - 1 : 0
  const lastMo = parseInt(r.endISO.slice(5, 7), 10) - 1
  const moIdx = []
  for (let i = firstMo; i <= lastMo; i++) moIdx.push(i)
  const moActs = moIdx.map((i) => s.monthsActivities[i])
  const busy = moIdx[moActs.indexOf(Math.max(...moActs))]
  const quiet = moIdx[moActs.indexOf(Math.min(...moActs))]
  const activeMonths = moActs.filter((v) => v > 0).length
  const perMonth = s.n / Math.max(1, moIdx.length)
  const monthsData = MONTH_L.map((label, i) => ({ m: i + 1, label, activities: s.monthsActivities[i], km: s.monthsKm[i] }))

  // ---- the mix ----
  const mix = { walk: 0, run: 0, trail: 0, other: 0 }
  for (const a of yearActs) mix[a.sport_type === 'Walk' ? 'walk' : a.sport_type === 'Run' ? 'run' : a.sport_type === 'TrailRun' || a.sport_type === 'Hike' ? 'trail' : 'other'] += 1
  const lead = mix.walk >= mix.run ? ['Walks', mix.walk, 'runs', mix.run] : ['Runs', mix.run, 'walks', mix.walk]
  const footKmAll = r.flip.reduce((t, d) => t + d.dist, 0) || 1
  const footElAll = r.flip.reduce((t, d) => t + d.elev, 0) || 1
  const flipOf = (k) => r.flip.find((d) => d.key === k) || { dist: 0, elev: 0 }
  const climber = r.flip.length ? r.flip.reduce((b, d) => (d.elev / footElAll > b.elev / footElAll ? d : b), r.flip[0]) : null

  // ---- the hours ----
  const hs = (lo, hi) => s.hours24.slice(lo, hi).reduce((t, v) => t + v, 0) / Math.max(1, s.n)
  const morning = hs(0, 10), midday = hs(10, 16), evening = hs(16, 21), late = hs(21, 24)
  const peakHour = s.hours24.indexOf(Math.max(...s.hours24))
  const fmtH = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
  const wkMax = Math.max(...s.weekday7), wkMin = Math.min(...s.weekday7)

  // ---- the days ----
  const pctDays = r.activeShare
  const gapsTot = Math.max(1, r.gaps.total)
  const dTot = Math.max(1, r.multi.one + r.multi.two + r.multi.more)
  const multiDays = r.multi.two + r.multi.more

  // ---- the distances ----
  const longestFoot = s.biggestFoot ? s.biggestFoot.val : 0
  const meanFoot = r.tail ? r.tail.mean : 0

  // ---- against the other years ----
  const rankSeries = allStats.map((x) => ({ year: x.year, value: x.n }))
  const rankOf = (f) => 1 + allStats.filter((x) => f(x) > f(s)).length
  const rankN = rankOf((x) => x.n), rankKm = rankOf((x) => x.footKm), rankEl = rankOf((x) => x.elev)

  // ---- records ----
  const everests = s.elev / EVEREST
  // sections are numbered in the order they render, so a small year with fewer
  // sections still counts 1, 2, 3 without gaps
  let secN = 0
  const num = () => ++secN
  const wkStep = wkMax > 100 ? 50 : wkMax > 40 ? 20 : wkMax > 15 ? 5 : 2
  const wkTicks = []
  const wkKmMax = Math.max(1, ...r.weekly.series.map((w) => w.km))
  const wkKmStep = wkKmMax > 150 ? 50 : wkKmMax > 60 ? 25 : 10
  const wkKmTicks = []
  for (let t = 0; t <= wkKmMax * 1.1; t += wkKmStep) wkKmTicks.push(t)
  for (let t = 0; t <= wkMax * 1.15; t += wkStep) wkTicks.push(t)

  // only African countries are named or counted; anything else is "others"
  const nCountries = r.countries.filter((c) => isNamedCountry(c.country)).length
  const othersN = r.countries.filter((c) => !isNamedCountry(c.country)).reduce((t, c) => t + c.activities, 0)

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]}
      number="02"
      title="Year in Sport"
      subtitle="Pick a year and read it."
      lede="My record one year at a time. When you pick a year, everything below changes to show that year: the months, the sports, the time of day, the days out, the distances, my biggest days and where I went."
      prev={prev}
      next={next}
    >
      {!book && <div ref={pickerRef} className="yis-picker" role="group" aria-label="Choose a year" onKeyDown={onPickerKey}>
        {years.map((y) => (
          <button key={y} type="button" className={`yis-picker__yr${y === Y ? ' is-on' : ''}`} aria-pressed={y === Y} onClick={() => setPicked(y)}>
            {y}
          </button>
        ))}
      </div>}

      <div key={Y} className="yis-report">
        {/* ===== the year in one view ===== */}
        <section className="sgrid yis-top" aria-labelledby={idp('yis-title')}>
          <div className="sgrid__head">
            <p className="eyebrow">{Y}{isPartial ? ' · still running' : ''}</p>
            <h2 id={idp('yis-title')} className="section-head__title">{theme}.</h2>
          </div>
          {YEAR_REPORT[Y] && <Reveal as="p" className="sgrid__statement">{YEAR_REPORT[Y](s)}</Reveal>}
          <OddsRow
            title={`${Y} in four numbers${ps ? `, against ${prevYear}` : ''}`}
            items={[
              { num: s.n, unit: '', label: `outings${ps ? `, ${chgTxt(chg(s.n, ps.n))}` : ''}`, tone: 'move' },
              { num: s.footKm, unit: ' km', label: `on foot${ps ? `, ${chgTxt(chg(s.footKm, ps.footKm))}` : ''}`, tone: 'move' },
              { num: s.elev, unit: ' m', label: `climbed${ps ? `, ${chgTxt(chg(s.elev, ps.elev))}` : ''}`, tone: 'move' },
              { num: s.hours, unit: ' h', label: `moving${ps ? `, ${chgTxt(chg(s.hours, ps.hours))}` : ''}`, tone: 'move' },
            ]}
          />
          <OutingSky activities={yearActs} year={Y} recordFirstISO={recordFirst.slice(0, 10)} recordLastISO={recordLast.slice(0, 10)} />
          <p className="source">Source: Activity Log · every outing of {Y}, placed by date and start time</p>
        </section>

        {/* ===== 1. month by month ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-months')}
          eyebrow={`${num()} · Month by month`}
          title={`${MONTH_F[busy]} was the busiest.`}
          statement={<>
            {activeMonths === moIdx.length ? `I went out in every month${so}.` : `I went out in ${word(activeMonths)} of the ${word(moIdx.length)} months${so}.`}{' '}
            {MONTH_F[busy]} was my busiest, with {s.monthsActivities[busy]} outings and {n0(s.monthsKm[busy])} km on foot.{' '}
            {MONTH_F[quiet]} was the quietest, with {s.monthsActivities[quiet]}. My kilometres added up to {n0(s.footKm)}{so},
            about {n0(s.footKm / Math.max(1, moIdx.length))} a month.
          </>}
          odds={{
            title: `${Y} by the month`,
            items: [
              { num: s.monthsActivities[busy], unit: '', label: `outings in ${MONTH_F[busy]}, the busiest`, tone: 'move' },
              { num: s.monthsActivities[quiet], unit: '', label: `in ${MONTH_F[quiet]}, the quietest`, tone: 'rest' },
              { num: perMonth, unit: '', label: 'outings in an average month', tone: 'move' },
              { num: s.footKm / Math.max(1, moIdx.length), unit: ' km', label: 'on foot in an average month', tone: 'move' },
            ],
          }}
          left={{ title: 'Outings, month by month', node: <YearMonths months={monthsData} /> }}
          right={{ title: 'The kilometres adding up', node: <YearProgress cum={s.cumByMonth} lastMonth={s.lastActiveMonth} total={s.footKm} /> }}
          leftNote={<>One bar per month. The more outings, the taller and darker the bar, and the busiest month has its number on top.</>}
          rightNote={<>This line adds up my kilometres on foot through the year. Where it climbs steeply I was busy, and where it flattens out I was quiet or away.</>}
          source="Activity Log · outings and distance on foot, by month"
        />

        {/* ===== 2. how it moved ===== */}
        {s.n >= 10 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-mix')}
              eyebrow={`${num()} · How it moved`}
              title={`${lead[0]} led ${Y}.`}
              sub={`I logged ${lead[1]} of them, and ${lead[3]} ${lead[2]}.`}
              statement={<>
                Of my {fmtInt(s.n)} outings{so}, {mix.walk} were walks, {mix.run} were runs and {mix.trail} were trail runs or
                hikes. The other {mix.other} were other activities. Running gave me {pc(flipOf('Run').dist / footKmAll)}% of my distance
                on foot{climber ? `, and most of the climbing came from ${climber.label === 'Trail' ? 'trail running' : climber.label.toLowerCase() + 'ing'}, ${pc(climber.elev / footElAll)}% of it.` : '.'}
              </>}
              odds={{
                title: 'Share of all outings',
                items: [
                  { value: mix.walk / s.n, label: 'walks', tone: 'move' },
                  { value: mix.run / s.n, label: 'runs', tone: 'move' },
                  { value: mix.trail / s.n, label: 'trail runs and hikes', tone: 'move' },
                  { value: mix.other / s.n, label: 'other activities', tone: 'rest' },
                ],
              }}
              left={{ title: 'Every outing, by sport', node: <SportTreemap rows={r.sportRows} /> }}
              right={{ title: 'Distance against climb, on foot', node: r.flip.length >= 2 ? <FootFlip items={r.flip} /> : <p className="yis-empty">Only one sport on foot this year.</p> }}
              leftNote={<>Each tile is a sport, sized by how many outings it had. Everything that isn&rsquo;t on foot shares one tile.</>}
              rightNote={<>The left column splits my distance on foot by sport and the right column splits the climb. A sport that&rsquo;s thin on the left and thick on the right did a lot of climbing for its distance.</>}
              source="Activity Log · outings by sport, distance and climb on foot"
            />
          </>
        )}

        {/* ===== 3. when it happened ===== */}
        {s.n >= 10 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-hours')}
              eyebrow={`${num()} · When it happened`}
              title={evening >= morning ? 'The evenings led.' : 'The mornings led.'}
              sub={evening >= morning ? `${pc(evening)}% of my outings started between 4 and 9pm.` : `${pc(morning)}% of my outings started before 10am.`}
              statement={<>
                My busiest hour in {Y} was {fmtH(peakHour)}. {pc(morning)}% of my outings started before 10 in the morning,{' '}
                {pc(midday)}% between 10 and 4, and {pc(evening)}% between 4 and 9 in the evening. My busiest day of the week
                was {WEEK[s.weekday7.indexOf(wkMax)]}, with {wkMax}, and my quietest was {WEEK[s.weekday7.indexOf(wkMin)]}, with {wkMin}.
              </>}
              odds={{
                title: 'When outings started',
                items: [
                  { value: morning, label: 'before 10am', tone: 'move' },
                  { value: midday, label: 'between 10am and 4pm', tone: 'rest' },
                  { value: evening, label: 'between 4 and 9pm', tone: 'move' },
                  { value: late, label: 'after 9pm', tone: 'rest' },
                ],
              }}
              left={{ title: 'Every outing, by the hour it began', node: <RadialHours counts={s.hours24} unit="activities" max={400} /> }}
              right={{
                title: 'Every outing, by day of the week',
                node: (
                  <ColBars
                    items={WEEK.map((d, i) => ({ label: d.slice(0, 3), short: d.slice(0, 1), value: s.weekday7[i], display: String(s.weekday7[i]), tone: s.weekday7[i] === wkMax ? 'big' : s.weekday7[i] === wkMin ? 'quiet' : 'mid' }))}
                    max={wkMax * 1.15} ticks={wkTicks} xCap="day of the week &rarr;" yCap="outings &uarr;" H={400}
                    aria={`Outings by weekday in ${Y}: ${WEEK.map((d, i) => `${d} ${s.weekday7[i]}`).join(', ')}.`}
                  />
                ),
              }}
              leftNote={<>Midnight is at the top and the hours go round clockwise. The longer and darker a spoke, the more outings started in that hour.</>}
              rightNote={<>The orange bar is my busiest day and the grey one my quietest. If the bars are close to level, the weekend didn&rsquo;t make much difference to me that year.</>}
              source="Activity Log · start hour and weekday of every outing"
            />
          </>
        )}

        {/* ===== 4. every day of the year ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-days')}
          eyebrow={`${num()} · Every day of the year`}
          title={`Out on ${pc(pctDays)}% of days${so}.`}
          statement={<>
            I went out on {fmtInt(s.activeDays)} of {fmtInt(r.span)} days{so}, in {s.weeksActive} different weeks. The most days
            I managed in a row was {s.streakLen}{s.streakStartISO ? `, from ${fmtDay(s.streakStartISO)} to ${fmtDay(s.streakEndISO)}` : ''}.
            {r.restDays === 0 ? ' I didn’t take a single day off.' : r.longGap.len >= 2 ? ` My longest break was ${r.longGap.len} days, and it ended on ${fmtDay(r.longGap.to)}.` : ' I never took more than one day off in a row.'}
            {r.restDays === 0
              ? ` On ${pc(multiDays / Math.max(1, s.activeDays))}% of those days I went out twice or more.`
              : r.gaps.total ? ` When I went out, I went out again the very next day ${pc(r.gaps.next / gapsTot)}% of the time.` : ''}
          </>}
          odds={{
            title: `The days of ${Y}`,
            items: [
              { num: s.activeDays, unit: ' days', label: `with an outing, of ${fmtInt(r.span)}`, tone: 'move' },
              { num: s.streakLen, unit: ' days', label: 'the longest run in a row', tone: 'move' },
              { num: r.longGap.len, unit: ' days', label: 'the longest break', tone: 'rest' },
              r.restDays === 0
                ? { value: multiDays / Math.max(1, s.activeDays), label: 'of days held two outings or more', tone: 'move' }
                : { value: r.gaps.total ? r.gaps.next / gapsTot : 0, label: 'of outings followed the very next day', tone: 'move' },
            ],
          }}
          left={{ title: `Every day of ${Y}`, node: <YearCalendar activeSet={s.activeSet} year={Y} endISO={r.endISO} firstISO={r.startISO} streak={{ startISO: s.streakStartISO, endISO: s.streakEndISO }} /> }}
          right={r.restDays === 0 ? {
            title: 'How many outings each day held',
            node: (
              <ColBars
                items={[
                  { label: 'One', value: r.multi.one / dTot, display: `${pc(r.multi.one / dTot)}%`, tone: 'big' },
                  { label: 'Two', value: r.multi.two / dTot, display: `${pc(r.multi.two / dTot)}%`, tone: 'mid' },
                  { label: 'Three or more', short: '3+', value: r.multi.more / dTot, display: `${pc(r.multi.more / dTot)}%`, tone: 'quiet' },
                ]}
                max={1.12} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                xCap="outings in the day &rarr;" yCap="share of days &uarr;"
                aria={`Of the days in ${Y}, ${pc(r.multi.one / dTot)}% held one outing, ${pc(r.multi.two / dTot)}% two and ${pc(r.multi.more / dTot)}% three or more.`}
              />
            ),
          } : {
            title: 'How soon the next outing came',
            node: (
              <ColBars
                items={[
                  { label: 'Next day', value: r.gaps.next / gapsTot, display: `${pc(r.gaps.next / gapsTot)}%`, tone: 'big' },
                  { label: 'Two days', value: r.gaps.two / gapsTot, display: `${pc(r.gaps.two / gapsTot)}%`, tone: 'mid' },
                  { label: 'Three or more', short: '3+', value: r.gaps.more / gapsTot, display: `${pc(r.gaps.more / gapsTot)}%`, tone: 'quiet' },
                ]}
                max={1.12} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFmt={(v) => `${Math.round(v * 100)}%`}
                xCap="days until the next outing &rarr;" yCap="share of gaps &uarr;"
                aria={`After an outing day, the next came the next day ${pc(r.gaps.next / gapsTot)}% of the time, two days later ${pc(r.gaps.two / gapsTot)}%, three or more ${pc(r.gaps.more / gapsTot)}%.`}
              />
            ),
          }}
          leftNote={<>Twelve months, one square per day, with Monday first. Orange days had an outing, the darkest orange is my longest run of days in a row, and the number beside each month is its days out.</>}
          rightNote={r.restDays === 0
            ? <>With no days off, there were no gaps to count, so this shows how many outings each day had. Each bar is a share of the {fmtInt(s.activeDays)} days.</>
            : <>Each bar is a share of the gaps between days out. The taller the first bar, the less often one rest day turned into two.</>}
          source="Activity Log · days with at least one outing"
        />

        {/* ===== 5. the typical outing ===== */}
        {s.footN >= 20 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-dist')}
              eyebrow={`${num()} · The typical outing`}
              title={`The usual outing: ${s.medianFoot.toFixed(1)} km.`}
              statement={<>
                Half of my {fmtInt(s.footN)} outings on foot were shorter than {s.medianFoot.toFixed(1)} km and half were longer.
                The average was {meanFoot.toFixed(1)} km, because the long days pull it up, and my longest was{' '}
                {longestFoot.toFixed(1)} km{s.biggestFoot ? ` in ${fmtMonth(s.biggestFoot.date)}` : ''}.
                {r.top10 != null ? ` My busiest tenth of days carried ${pc(r.top10)}% of the distance.` : ''}
              </>}
              odds={{
                title: 'Distance on foot',
                items: [
                  { num: s.medianFoot, dec: 1, unit: ' km', label: 'the median outing', tone: 'move' },
                  { num: meanFoot, dec: 1, unit: ' km', label: 'the average outing', tone: 'rest' },
                  { num: longestFoot, dec: 1, unit: ' km', label: 'the longest', tone: 'move' },
                  { value: r.top10 || 0, label: 'of the distance on the busiest tenth of days', tone: 'move' },
                ],
              }}
              left={{ title: 'Every outing on foot, by distance', node: <YearDistances bins={s.footBins} peaks={s.peakBins} /> }}
              right={{ title: 'Each tenth of days, by its share', node: r.deciles ? <DecileBars shares={r.deciles} /> : <p className="yis-empty">Too few days on foot to split into tenths.</p> }}
              leftNote={<>Each bar covers one kilometre, and the taller it is, the more outings were that long. Anything over 25 km goes in the last bar.</>}
              rightNote={<>Here my days on foot are lined up from shortest to longest and cut into ten equal groups. If every day were the same, each group would carry 10% of the distance.</>}
              source="Activity Log · distance on foot (run, walk, trail run, hike)"
            />
          </>
        )}

        {/* ===== 6. the maths of the year ===== */}
        {r.tail && s.activeDays >= 40 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-maths')}
              eyebrow={`${num()} · The maths of ${Y}`}
              title={r.restDays === 0 ? `No rest day in ${Y}${so}.` : 'One day led to the next.'}
              sub={r.restDays === 0 ? undefined : `When I went out, I went out again the next day ${pc(r.p11)}% of the time.`}
              statement={<>
                {r.restDays === 0
                  ? `If I mark every day of ${Y} as a day out or a rest day, there are no rest days to mark${so}.`
                  : `If I mark every day of ${Y} as a day out or a rest day, a day out was followed by another ${pc(r.p11)}% of the time, and a rest day only ${pc(r.p01)}% of the time.`} From week to week my distance moved about {pc(r.weekly.cv)}% either side of the average,
                {r.weekly.cv < 0.6 ? ' so it was a fairly steady year' : r.weekly.cv < 1 ? ' so it was an up and down year' : ' so it was a year of big swings'}. My longest outing,{' '}
                {r.tail.mark.toFixed(1)} km, was {r.tail.z.toFixed(1)} standard deviations above my average.
              </>}
              odds={{
                title: 'Four numbers that describe the year',
                items: [
                  { value: r.p11, label: 'chance of going out the day after a day out', tone: 'move' },
                  r.restDays === 0
                    ? { num: 0, unit: ' days', label: `of rest${so}`, tone: 'rest' }
                    : { value: r.p01, label: 'chance of going out the day after a rest', tone: 'rest' },
                  { num: r.gini || 0, dec: 2, unit: '', label: 'how uneven my days were (0 is even, 1 is one day did it all)', tone: 'rest' },
                  { num: r.tail.z, dec: 1, unit: ' sd', label: 'how far my longest outing was above the average', tone: 'move' },
                ],
              }}
              left={r.restDays === 0 ? {
                title: 'Distance on foot, week by week',
                node: (
                  <ColBars
                    items={r.weekly.series.map((w, i) => ({ label: "", short: "", value: w.km, display: '', tone: w.km >= r.weekly.mean ? 'big' : 'quiet' }))}
                    max={wkKmMax * 1.1} ticks={wkKmTicks}
                    tickFmt={(v) => v} refLine={{ value: r.weekly.mean, label: `average week · ${Math.round(r.weekly.mean)} km`, short: `avg ${Math.round(r.weekly.mean)} km` }}
                    xCap="week of the year &rarr;" yCap="km on foot &uarr;"
                    aria={`Distance on foot per week in ${Y}; the average week was ${Math.round(r.weekly.mean)} km.`}
                  />
                ),
              } : { title: 'Given today, the chance of tomorrow', node: <TransitionMatrix p11={r.p11} p01={r.p01} /> }}
              right={{ title: 'The longest outing against all the others', node: <TailOutlier values={r.tail.values} mark={r.tail.mark} mean={r.tail.mean} sd={r.tail.sd} z={r.tail.z} pct={r.tail.pct} unit="km" markLabel="the longest" /> }}
              leftNote={r.restDays === 0
                ? <>One bar per week. Orange weeks were above my average week and grey ones were below it. With no rest days, this is where the ups and downs of the year show.</>
                : <>Each row adds up to 100%. The top left cell is how often a day out led to another. The bigger it is compared with the cell below it, the stronger the habit was that year.</>}
              rightNote={<>The bars are all my outings on foot, by distance. The grey band is one standard deviation either side of the average, which is roughly how far a normal outing sits from it. The orange mark is my longest outing.</>}
              source="Activity Log · daily active series, weekly and per-outing distance on foot"
            />
          </>
        )}

        {/* ===== 7. the far edges ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby={idp('yis-edges')}>
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Biggest days</p>
            <h2 id={idp('yis-edges')} className="section-head__title">The biggest days of {Y}.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            {s.biggestFoot ? `My furthest outing on foot was ${s.biggestFoot.val.toFixed(1)} km in ${fmtMonth(s.biggestFoot.date)}. ` : ''}
            {s.highestClimb && s.highestClimb.val > 0 ? `The most I climbed in one outing was ${n0(s.highestClimb.val)} m. ` : ''}
            {s.prs > 0 ? `I set ${fmtInt(s.prs)} personal records, and ` : ''}{everests >= 0.2 ? `all my climbing that year came to ${everests.toFixed(1)} times the height of Everest.` : `all my climbing that year came to ${n0(s.elev)} m.`}
          </Reveal>
          <ul className="yrecs">
            {s.biggestFoot && s.biggestFoot.val > 0 && <RecordCard kicker="Furthest on foot" value={s.biggestFoot.val} decimals={1} unit="km" label="in a single outing" sub={fmtMonth(s.biggestFoot.date)} tone="hot" />}
            {s.longestTime && s.longestTime.val > 0 && <RecordCard kicker="Longest on foot" text={hm(s.longestTime.val)} label="of moving time in one outing" sub={fmtMonth(s.longestTime.date)} />}
            {s.highestClimb && s.highestClimb.val > 0 && <RecordCard kicker="Most climbed" value={Math.round(s.highestClimb.val)} unit="m" label="of climb in one outing" sub={fmtMonth(s.highestClimb.date)} />}
            {s.hardest && s.hardest.val > 0 && <RecordCard kicker="Hardest effort" value={Math.round(s.hardest.val)} label="relative effort, Strava's score for how hard it was" sub={fmtMonth(s.hardest.date)} />}
            <RecordCard kicker="Personal records" value={Math.round(s.prs)} label="best times on Strava segments" sub={`${Y}`} tone="hot" />
            <RecordCard kicker="Most cheered" value={s.mostKudos ? s.mostKudos.kudos : 0} label={s.mostKudos ? `kudos on one ${/^other/i.test(s.mostKudos.sport) ? 'other activity' : s.mostKudos.sport.toLowerCase()}` : 'kudos on one outing'} sub={s.mostKudos ? fmtMonth(s.mostKudos.date) : ''} />
            <RecordCard kicker="Everests" value={everests} decimals={1} unit="×" label={`the height of Everest, from ${n0(s.elev)} m climbed`} sub={`${Y}`} />
            <RecordCard kicker="Dar to Dodoma" value={s.footKm / DAR_DODOMA_KM} decimals={1} unit="×" label="the road from Dar es Salaam to Dodoma, on foot" sub={`${n0(s.footKm)} km on foot`} />
          </ul>
          <p className="source">Source: Activity Log · per-outing distance, time, climb, effort, kudos and records</p>
        </section>

        {/* ===== 8. where it happened ===== */}
        {r.located >= 15 && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id={idp('yis-where')}
              eyebrow={`${num()} · Where it happened`}
              title={nCountries > 1 ? `${word(nCountries)[0].toUpperCase() + word(nCountries).slice(1)} countries in ${Y}.` : `${Y} was mostly Tanzania.`}
              statement={<>
                {fmtInt(r.located)} of my outings had a GPS start point. {nCountries > 1 ? `They were in ${nCountries} countries${othersN ? `, and ${othersN} more ${othersN === 1 ? 'is' : 'are'} grouped under others` : ''}. ` : othersN ? `All but ${othersN} were in Tanzania. ` : ''}
                {r.regRows ? `In Tanzania I went out most in ${r.regRows[0].label}, ${pc(r.regRows[0].a)}% of the time.` : ''}
                {r.regRows ? (() => { const c = r.regRows.filter((x) => !/other/.test(x.label)).reduce((b, x) => (x.b > b.b ? x : b), r.regRows[0]); return ` I did the most climbing in ${c.label}, ${pc(c.b)}% of the year’s metres.` })() : ''}
              </>}
              odds={{
                title: 'Where the outings were',
                items: [
                  { num: r.located, unit: '', label: 'outings with a GPS start point', tone: 'move' },
                  { num: nCountries, unit: '', label: nCountries === 1 ? 'country' : 'countries', tone: 'move' },
                  { num: r.regionCount, unit: '', label: r.regionCount === 1 ? 'region of Tanzania' : 'regions of Tanzania', tone: 'rest' },
                  { value: r.regRows ? r.regRows[0].a : 1, label: `of outings in ${r.regRows ? r.regRows[0].label : 'one place'}`, tone: 'move' },
                ],
              }}
              left={{ title: 'Home against away', node: <GeoBubbles rows={r.countries} /> }}
              right={{
                title: 'Inside Tanzania: share of outings and of climb',
                node: r.regRows ? <PairBars rows={r.regRows} aLabel="share of outings" bLabel="share of climb" aShort="outings" bShort="climb"
                  aria={`Tanzania regions in ${Y}: ${r.regRows.map((x) => `${x.label} ${pc(x.a)}% of outings, ${pc(x.b)}% of climb`).join('; ')}.`} /> : <p className="yis-empty">Only one region this year.</p>,
              }}
              leftNote={<>Only outings with a GPS start can go on a map, so treadmill sessions aren&rsquo;t here. The disc is Tanzania and the list shows where else I went.</>}
              rightNote={<>Each row is a region. The grey ring is its share of my outings and the orange dot its share of the climb. The regions where I climbed more than my share are at the top.</>}
              source="Strava GPS start points · countries and Tanzania regions"
            />
          </>
        )}

        {/* ===== 9. against the other years ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-rank')}
          eyebrow={`${num()} · Against the other years`}
          title={`${ORD[rankN - 1][0].toUpperCase() + ORD[rankN - 1].slice(1)} of ${years.length} years.`}
          sub={`${Y} ranks ${ORD[rankN - 1]} of ${years.length} years for outings.`}
          statement={<>
            Out of {word(years.length)} years, {Y} comes {ORD[rankN - 1]} for outings, {ORD[rankKm - 1]} for distance on foot and {ORD[rankEl - 1]} for climbing.
            {ps ? ` Compared with ${prevYear}, I had ${more(chg(s.n, ps.n), 'more', 'fewer')} outings, ${more(chg(s.footKm, ps.footKm), 'more', 'less')} distance and ${more(chg(s.elev, ps.elev), 'more', 'less')} climb.` : ' It’s my first year, so there’s nothing before it to compare with.'}
            {isPartial ? ` ${Y} isn’t over yet, and it’s still being compared with full years.` : ''}
          </>}
          odds={{
            title: ps ? `${Y} against ${prevYear}` : `${Y} among the years`,
            items: ps ? [
              { value: chg(s.n, ps.n) || 0, sign: true, label: 'outings', tone: (chg(s.n, ps.n) || 0) >= 0 ? 'move' : 'rest' },
              { value: chg(s.footKm, ps.footKm) || 0, sign: true, label: 'distance on foot', tone: (chg(s.footKm, ps.footKm) || 0) >= 0 ? 'move' : 'rest' },
              { value: chg(s.elev, ps.elev) || 0, sign: true, label: 'metres climbed', tone: (chg(s.elev, ps.elev) || 0) >= 0 ? 'move' : 'rest' },
              { value: chg(s.prs, ps.prs) || 0, sign: true, label: 'personal records', tone: (chg(s.prs, ps.prs) || 0) >= 0 ? 'move' : 'rest' },
            ] : [
              { num: rankN, unit: '', label: 'rank by outings', tone: 'move' },
              { num: rankKm, unit: '', label: 'rank by distance', tone: 'move' },
              { num: rankEl, unit: '', label: 'rank by climb', tone: 'move' },
              { num: years.length, unit: '', label: 'years on record', tone: 'rest' },
            ],
          }}
          left={{ title: 'Outings, year by year', node: <YearRank series={rankSeries} selected={Y} fmt={(v) => fmtInt(v)} /> }}
          right={{
            title: ps ? `${Y} beside ${prevYear}` : 'The first year',
            node: ps ? (
              <YearVsPrev prevYear={prevYear} rows={[
                { label: 'Activities', cur: s.n, prev: ps.n },
                { label: 'Km on foot', cur: Math.round(s.footKm), prev: Math.round(ps.footKm), unit: 'km' },
                { label: 'Hours moving', cur: Math.round(s.hours), prev: Math.round(ps.hours), unit: 'h' },
                { label: 'Metres climbed', cur: Math.round(s.elev), prev: Math.round(ps.elev), unit: 'm' },
                { label: 'Kudos', cur: Math.round(s.kudos), prev: Math.round(ps.kudos) },
                { label: 'Personal records', cur: Math.round(s.prs), prev: Math.round(ps.prs) },
              ]} />
            ) : <p className="yis-empty">{Y} is where my record starts.</p>,
          }}
          leftNote={<>One bar per year, for the number of outings. The orange bar is {Y}.</>}
          rightNote={<>{ps ? `Each pair puts ${Y} next to ${prevYear}, one measure at a time, so you can see the changes above at their real size.` : 'There was no year before this one, so it’s the starting point for everything after it.'}</>}
          source="Activity Log · yearly totals"
        />

        {/* ===== the signature moment ===== */}
        <hr className="rule rule--faint" />
        <section className="yis-sec yis-sec--moment">
          <YearMoment year={Y} stats={s} />
        </section>

        {!book && <Reveal as="section" className="yis-cta">
          <p>That was {Y}.</p>
          <div className="yis-cta__row">
            {years.includes(Y - 1) && <button type="button" className="yis-cta__btn" onClick={() => { setPicked(Y - 1); scrollToTop() }}>&larr; {Y - 1}</button>}
            <button type="button" className="yis-cta__btn" onClick={scrollToTop}>Pick another year &uarr;</button>
            {years.includes(Y + 1) && <button type="button" className="yis-cta__btn" onClick={() => { setPicked(Y + 1); scrollToTop() }}>{Y + 1} &rarr;</button>}
          </div>
        </Reveal>}
      </div>
    </DetailFrame>
  )
}

import { useMemo } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import BookStory from '../components/BookStory.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import ColBars from '../charts/ColBars.jsx'
import { DayClocks, TwoPaths, DayPile, WeekStrips, NextGrid, IsoKm } from '../charts/MeaningCharts.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { buildMeaningReport, SMALL_KM, LONG_KM, LONG_RUN_KM } from '../lib/meaningReport.js'

const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const pc = (v) => Math.round((v || 0) * 100)
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = (n) => WORD[n] || String(n)
const short = (y) => `'${String(y).slice(2)}`

// one card of the closing advice
function Card({ kicker, value = 0, unit, label, sub, decimals = 0, tone }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1100 })
  return (
    <li ref={ref} className={`yrec${inView ? ' is-in' : ''}${tone ? ` yrec--${tone}` : ''}`}>
      <p className="yrec__k">{kicker}</p>
      <p className="yrec__v">
        {Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yrec__u">{unit}</span> : null}
      </p>
      <p className="yrec__l">{label}</p>
      {sub ? <p className="yrec__s">{sub}</p> : null}
    </li>
  )
}

export default function WhatItMeans() {
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/what-it-means')
  const M = useMemo(() => (activities.length ? buildMeaningReport(activities) : null), [activities])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'What It Means' }], number: '08', title: 'What It Means', subtitle: 'What I have learned from it', prev, next }
  if (!M) return <DetailFrame {...frame} />

  let secN = 0
  const num = () => ++secN
  const Y = (y) => M.perYear.find((r) => r.year === y)
  const habitYear = Number(M.habitISO.slice(0, 4))
  const habitYears = M.perYear.filter((r) => r.year >= habitYear)
  const cur = M.perYear[M.perYear.length - 1]
  const daysLeft = (cur.year % 4 === 0 ? 366 : 365) - cur.ndays
  const hours = M.totalMin / 60
  const habitPerDay = M.habitMin / M.habitDays

  // ---- 1. count the days: the best distance year against the lowest since ----
  const full = habitYears.filter((r) => !r.partial && r.year > habitYear)
  const peak = full.reduce((b, r) => (r.kmPerDay > b.kmPerDay ? r : b), full[0])
  const low = full.filter((r) => r.year > peak.year).reduce((b, r) => (!b || r.kmPerDay < b.kmPerDay ? r : b), null) || full[full.length - 1]
  const kmDrop = 1 - low.kmPerDay / peak.kmPerDay
  const dayDrop = 1 - low.days / peak.days
  const pathYears = habitYears.filter((r) => r.year >= peak.year)
  const longTop = habitYears.reduce((b, r) => (r.long > b.long ? r : b), habitYears[0])

  // ---- 2. the small days ----
  const smallShare = M.smallDays / M.habitActive
  const smallTop = habitYears.reduce((b, r) => (r.small > b.small ? r : b), habitYears[0])
  const K = M.smallKinds

  // ---- 3. the floor ----
  const W = M.weekYears.filter((w) => w.year >= habitYear)
  const wNow = W.find((w) => w.year === cur.year)
  const wPeak = W.find((w) => w.year === peak.year)
  const between = W.filter((w) => w.year > habitYear && w.year < cur.year)
  const under10Between = between.reduce((s, w) => s + w.under10, 0)
  const wFirst = W.find((w) => w.year === habitYear)
  const bestPerDay = M.perYear.reduce((b, r) => (r.kmPerDay > b.kmPerDay ? r : b), M.perYear[0])

  // ---- 4. long days ----
  const after = M.echo.find((e) => e.o === 1)
  const LR = M.longRuns
  const lrShare = (k) => LR.filter((r) => r.next === k).length / Math.max(1, LR.length)

  // ---- 5. the maths ----
  const twoThirds = 1000 / (365 * (2 / 3))
  const longYear = habitYears.reduce((b, r) => (r.kmPerActive > b.kmPerActive ? r : b), habitYears[0])
  const lowYear = habitYears.filter((r) => !r.partial).reduce((b, r) => (r.km < b.km ? r : b), habitYears[0])

  // ---- My Book: facts for the longer stories ----
  const early = M.perYear.filter((r) => r.year < habitYear)
  const steady = habitYears.filter((r) => !r.partial && r.year > habitYear - 1)
  const steadyLo = Math.min(...steady.map((r) => r.minPerDay)), steadyHi = Math.max(...steady.map((r) => r.minPerDay))
  const rel = (r, f) => (peak[f] ? r[f] / peak[f] : 0)
  const widestGap = pathYears.filter((r) => r.year > peak.year).reduce((b, r) => (!b || rel(r, 'share') - rel(r, 'kmPerDay') > rel(b, 'share') - rel(b, 'kmPerDay') ? r : b), null)
  const bothAbove = cur !== peak && rel(cur, 'share') >= 1 && rel(cur, 'kmPerDay') >= 1
  const weekAbove = M.echo.filter((x) => x.o > 0).every((x) => x.km > M.avgDayKm)
  const lrOut = 1 - lrShare('rest')
  const projKm = cur.km + (cur.partial ? cur.kmPerActive * cur.share * daysLeft : 0)
  const wLowYear = W.filter((w) => w.year < cur.year).reduce((b, w) => (w.under10 > b.under10 ? w : b), W[0])

  return (
    <DetailFrame
      {...frame}
      lede="I am not an expert. These are only my own lessons."
    >
      <div className="yis-report">
        {/* ===== the cost ===== */}
        <section className="sgrid yis-top" aria-labelledby="wm-title">
          <div className="sgrid__head">
            <p className="eyebrow">Seven years, read back</p>
            <h2 id="wm-title" className="section-head__title">It costs&nbsp;time.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            It is not much in one day, about the time of a long lunch, but it adds up. Most of it is walking and easy running,
            nothing heavy. These are the lessons I took from it.
          </Reveal>
          <OddsRow
            title="What it cost"
            items={[
              { num: hours, unit: ' hours', label: 'on the move since the first upload', tone: 'move' },
              { num: hours / 24, unit: ' days', label: 'if those hours ran end to end', tone: 'rest' },
              { num: habitPerDay, unit: ' min', label: `a day since ${habitYear}, rest days included`, tone: 'move' },
              { num: cur.minPerDay, unit: ' min', label: `a day in ${cur.year}`, tone: 'move' },
            ]}
          />
          <DayClocks
            years={M.perYear.map((r) => ({ year: r.year, minPerDay: r.minPerDay, partial: r.partial, quiet: r.year < habitYear }))}
            aria={`Minutes on the move per calendar day, each year: ${M.perYear.map((r) => `${r.year} ${n0(r.minPerDay)} minutes`).join(', ')}.`}
          />
          <ul className="chron__key" aria-hidden="true">
            <li>A full circle is one day.</li>
          </ul>
          <BookStory>{[
            `Each clock is one year, and the filled wedge is the time I spent moving on an average day, rest days included. ${early.length ? `In ${early.map((r) => r.year).join(' and ')} the wedges are thin slivers of ${early.map((r) => `${n0(r.minPerDay)}`).join(' and ')} minutes a day.` : ''}`,
            `From ${steady[0] ? steady[0].year : habitYear} to ${steady.length ? steady[steady.length - 1].year : habitYear} the clocks are almost the same size, between ${n0(steadyLo)} and ${n0(steadyHi)} minutes a day. The habit was steady long before it became every day. ${cur.partial ? `In ${cur.year} the wedge is the biggest of all, more than an hour and a half of every day.` : ''}`,
            'Spread over a day, it is not a lot of time. That is the first lesson, and the rest of this chapter follows from it.',
          ]}</BookStory>
        </section>

        {/* ===== 1. count the days ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-days"
          eyebrow={`${num()} · Count the days`}
          title="Keep the days."
          statement={<>
            If I could keep only one thing, I would keep the days. In {low.year} I covered less than half the distance of{' '}
            {peak.year}, and the long days almost disappeared, but I still went out on {n0(low.days)} days. When the distance came
            back in {cur.year}, the days were already there to build on.
          </>}
          odds={{
            title: `${peak.year} against ${low.year}`,
            items: [
              { num: pc(kmDrop), unit: '%', label: 'less distance per day', tone: 'rest' },
              { num: pc(dayDrop), unit: '%', label: 'fewer days out', tone: 'move' },
              { num: low.long, unit: ' days', label: `of ${LONG_KM} km or more in ${low.year}, from ${peak.long}`, tone: 'rest' },
              { num: cur.days, unit: ` of ${cur.ndays}`, label: `days out in ${cur.year}${cur.partial ? ' so far' : ''}`, tone: 'move' },
            ],
          }}
          left={{
            title: `Days out and distance, against ${peak.year}`,
            node: (
              <TwoPaths
                rows={pathYears.map((r) => ({ year: r.year, a: r.share, b: r.kmPerDay, aText: `${pc(r.share)}% of days`, bText: `${k1(r.kmPerDay)} km a day` }))}
                aLabel="days out" bLabel="distance"
                aria={`Share of days with an outing and distance on foot per day, ${pathYears.map((r) => `${r.year}: ${pc(r.share)}% of days, ${k1(r.kmPerDay)} km a day`).join('; ')}.`}
              />
            ),
          }}
          right={{
            title: `Days of ${LONG_KM} km or more on foot`,
            node: (
              <ColBars
                items={habitYears.map((r) => ({ label: String(r.year), short: short(r.year), value: r.long, display: String(r.long), tone: r.partial ? 'big' : r === longTop ? 'mid' : 'quiet' }))}
                ticks={[0, 10, 20, 30, 40]} max={Math.max(...habitYears.map((r) => r.long)) * 1.15} yCap="days &uarr;"
                aria={`Days with ${LONG_KM} km or more on foot each year: ${habitYears.map((r) => `${r.year} ${r.long}`).join(', ')}.`}
              />
            ),
          }}
          read={[
              `Two lines against ${peak.year}, my best year for distance per day. The black line is the share of days I went out and the orange line is the distance per calendar day, both as a percentage of ${peak.year}. The shaded gap shows how far the distance fell while the days held.`,
              `The number of days each year with ${LONG_KM} km or more on foot. The orange bar is the year in progress.`,
            ]}
          story={[
              widestGap ? `The gap was widest in ${widestGap.year}. That year I went out on ${pc(rel(widestGap, 'share'))}% as many days as in ${peak.year}, and covered only ${pc(rel(widestGap, 'kmPerDay'))}% of the distance per day.` : '',
              bothAbove ? `In ${cur.year} both lines have climbed back above where they started. I go out on more days than in ${peak.year} and I cover a little more each day. The days came back first, and the distance followed them.` : 'The days came back first, and the distance followed them.',
            ]}
          source="Activity Log · days with any activity, and distance on foot, per calendar year"
        />

        {/* ===== 2. the small days ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-small"
          eyebrow={`${num()} · Do the small version`}
          title="The small days count."
          statement={<>
            <span lang="sw">Haba na haba hujaza kibaba</span>, little by little fills the measure. Many of my days were small ones,
            less than {SMALL_KM} km on foot. They add almost nothing to my distance, but I logged them all the same. Later the
            numbers showed me why they matter: after a small day, I was much more likely to go out again than after a full rest.
            On a bad day, I try to do a small version.
          </>}
          odds={{
            title: `Small days since ${habitYear}`,
            items: [
              { num: M.smallDays, unit: ' days', label: `under ${SMALL_KM} km on foot`, tone: 'move' },
              { value: smallShare, label: 'of all my days out', tone: 'move' },
              { value: M.smallNextActive, label: 'out again the next day', tone: 'move' },
              { value: M.restNextActive, label: 'out again after a full rest day', tone: 'rest' },
            ],
          }}
          left={{
            title: `Every day out since ${habitYear}, by its distance`,
            node: (
              <DayPile
                kms={M.dayKms} cut={SMALL_KM} per={5}
                aria={`Days out since ${habitYear} by distance on foot: ${M.smallDays} of ${M.habitActive} were under ${SMALL_KM} km.`}
              />
            ),
          }}
          right={{
            title: `Days under ${SMALL_KM} km each year`,
            node: (
              <ColBars
                items={habitYears.map((r) => ({ label: String(r.year), short: short(r.year), value: r.small, display: String(r.small), tone: r === smallTop ? 'big' : 'mid' }))}
                ticks={[0, 20, 40, 60]} max={smallTop.small * 1.15} yCap="days &uarr;"
                aria={`Days out with under ${SMALL_KM} km on foot each year: ${habitYears.map((r) => `${r.year} ${r.small}`).join(', ')}.`}
              />
            ),
          }}
          read={[
              `Every day out since ${habitYear} is a dot, stacked in the 1 km band its distance on foot fell in. The orange dots on the left are the small days under ${SMALL_KM} km, and the tall stacks show my usual days.`,
              `The number of small days under ${SMALL_KM} km in each year.`,
            ]}
          story={[
              `The small days were most common in ${smallTop.year}, with ${n0(smallTop.small)} of them${smallTop === low || smallTop === lowYear ? ', in my lowest year' : ''}. In ${cur.year}${cur.partial ? ' so far' : ''} there have been ${n0(cur.small)}, in a year with no rest day at all.`,
              'On those days the outing was short, or it was one of the other activities. Either way, it counted as a day out, and it kept the chain going for the next day.',
            ]}
          source="Activity Log · every day with an activity since the habit began, distance on foot only"
        />

        {/* ===== 3. the floor ===== */}
        {wNow && wPeak && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="wm-floor"
              eyebrow={`${num()} · The quiet weeks`}
              title='Keep a floor.'
              statement={<>
                My big weeks have not changed much over the years. What changed is the quiet weeks. From 2022 to 2025 some weeks
                slipped very low. In {cur.year} none has, and the middle half of my weeks are between{' '}
                {n0(wNow.q25)} and {n0(wNow.q75)} km. If the bad weeks are not too bad, the year takes care of itself.
              </>}
              odds={{
                title: 'Weeks on foot',
                items: [
                  { num: Math.floor(wNow.min), unit: ' km', label: `my lowest week of ${cur.year}`, tone: 'move' },
                  { num: wNow.under10, unit: ' weeks', label: `under 10 km in ${cur.year}`, tone: 'move' },
                  { num: under10Between, unit: ' weeks', label: `under 10 km, ${between[0].year} to ${between[between.length - 1].year}`, tone: 'rest' },
                  { num: bestPerDay.kmPerDay, dec: 1, unit: ' km', label: `a day in ${bestPerDay.year}`, tone: 'move' },
                ],
              }}
              left={{
                title: 'Every full week, by its distance',
                node: (
                  <WeekStrips
                    years={W} now={cur.year}
                    aria={`Weekly distance on foot by year: ${W.map((w) => `${w.year}: lowest ${n0(w.min)} km, middle half ${n0(w.q25)} to ${n0(w.q75)} km, highest ${n0(w.max)} km`).join('; ')}.`}
                  />
                ),
              }}
              right={{
                title: 'Weeks under 10 km each year',
                node: (
                  <ColBars
                    items={W.map((w) => ({ label: String(w.year), short: short(w.year), value: w.under10, display: String(w.under10), tone: w.under10 === 0 ? 'big' : 'mid' }))}
                    ticks={[0, 5, 10, 15]} max={Math.max(4, ...W.map((w) => w.under10)) * 1.2} yCap="weeks &uarr;"
                    aria={`Weeks with under 10 km on foot each year: ${W.map((w) => `${w.year} ${w.under10}`).join(', ')}.`}
                  />
                ),
              }}
              read={[
              'Every full week as a dot, one row per year, placed by its distance on foot. The shaded band holds the middle half of the weeks and the tick is the usual week. The year in progress is orange.',
              'The number of weeks in each year with less than 10 km on foot.',
            ]}
              story={[
              `The left edge of each row is where a year was won or lost. In ${wLowYear.year}, ${n0(wLowYear.under10)} weeks fell under 10 km, more than in any other year. In ${cur.year} the whole row has moved to the right, and the quiet weeks are gone.`,
              'A floor is easier to keep than a peak. A week of 20 km is three ordinary walks, and I can almost always find time for that.',
            ]}
              source="Activity Log · distance on foot per full week since the habit began"
            />
          </>
        )}

        {/* ===== 4. long days ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-long"
          eyebrow={`${num()} · Long days together`}
          title="Long days come in bunches."
          statement={<>
            My long days do not come alone. The day after one, I usually go out again, and further than normal. The three days
            before are bigger than usual too. So for me the long days come in the middle of a busy time. After a long run, a full rest the next day is rare.
          </>}
          odds={{
            title: `Days of ${LONG_KM} km or more since ${habitYear}`,
            items: [
              { num: M.longDays, unit: ' days', label: `of ${LONG_KM} km or more on foot`, tone: 'move' },
              { value: M.longNextActive / M.longDays, label: 'followed by another day out', tone: 'move' },
              { num: after.km, dec: 1, unit: ' km', label: `the next day, against ${k1(M.avgDayKm)} km on a typical day`, tone: 'move' },
              { value: lrShare('rest'), label: `full rest after a ${LONG_RUN_KM} km run`, tone: 'rest' },
            ],
          }}
          left={{
            title: 'The days around a long day',
            node: (
              <ColBars
                items={M.echo.map((e) => ({ label: e.o === 0 ? 'long day' : e.o > 0 ? `+${e.o}` : `−${-e.o}`, short: e.o === 0 ? 'L' : e.o > 0 ? `+${e.o}` : `−${-e.o}`, value: e.km, display: n0(e.km), tone: e.o === 0 ? 'big' : 'mid' }))}
                ticks={[0, 10, 20]} max={Math.max(...M.echo.map((e) => e.km)) * 1.15}
                refLine={{ value: M.avgDayKm, label: `a typical day, ${k1(M.avgDayKm)} km`, short: `typical, ${k1(M.avgDayKm)} km` }}
                yCap="km on foot &uarr;" xCap="days before and after &rarr;"
                aria={`Average distance on foot on the days around a long day: ${M.echo.map((e) => `${e.o === 0 ? 'the long day' : `${e.o > 0 ? '+' : ''}${e.o}`} ${k1(e.km)} km`).join(', ')}. A typical day is ${k1(M.avgDayKm)} km.`}
              />
            ),
          }}
          right={{
            title: `What came the day after a ${LONG_RUN_KM} km run`,
            node: (
              <NextGrid
                items={LR}
                order={[{ key: 'run', label: 'ran again' }, { key: 'walk', label: 'walked' }, { key: 'other', label: 'something else' }, { key: 'rest', label: 'full rest' }]}
                aria={`The day after each of ${LR.length} runs of ${LONG_RUN_KM} km or more: ran again ${pc(lrShare('run'))}%, walked ${pc(lrShare('walk'))}%, full rest ${pc(lrShare('rest'))}%.`}
              />
            ),
          }}
          read={[
              `The average distance on foot on the days around a long day of ${LONG_KM} km or more, from three days before to seven days after. The tall bar is the long day itself, and the dashed line is a typical day.`,
              `One square for each run of ${LONG_RUN_KM} km or more, grouped by what I did the next day: ran again, walked, did something else, or rested.`,
            ]}
          story={[
              weekAbove ? 'Even a full week after a long day, my daily distance stays above a typical day. The long days come in my strongest weeks, and those weeks stay strong after them.' : 'In the days after a long day, my distance stays above a typical day for most of the week.',
              `After a long run I went out again the next day ${pc(lrOut)}% of the time. Rest after a long run is the exception for me.`,
            ]}
          source={`Activity Log · days of ${LONG_KM} km or more on foot and runs of ${LONG_RUN_KM} km or more since the habit began`}
        />

        {/* ===== 5. the maths ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-maths"
          eyebrow={`${num()} · Days and distance`}
          title="How a year adds up."
          statement={<>
            A year&rsquo;s total is just two things: how often I go out, and how far I go each time. 1,000 km a year is a short
            outing every day, or about {k1(twoThirds)} km on two days in three. I have done it both ways. {longYear.year} was a year
            of long days on about half the days. {cur.year} is a year of going every day, shorter each time. {lowYear.year} was low
            on both, and it became my lowest year since the habit started.
          </>}
          odds={{
            title: 'The two levers',
            items: [
              { num: 1000 / 365, dec: 1, unit: ' km', label: 'a day makes 1,000 km a year', tone: 'rest' },
              { num: longYear.kmPerActive, dec: 1, unit: ' km', label: `per day out in ${longYear.year}, the longest`, tone: 'move' },
              { value: cur.share, label: `of days out in ${cur.year}${cur.partial ? ' so far' : ''}`, tone: 'move' },
              { num: lowYear.km, unit: ' km', label: `in ${lowYear.year}, low on both`, tone: 'rest' },
            ],
          }}
          left={{
            title: 'Each year by its two levers',
            node: (
              <IsoKm
                years={habitYears}
                aria={`Each year by share of days out and distance per day out: ${habitYears.map((r) => `${r.year}: ${pc(r.share)}% of days, ${k1(r.kmPerActive)} km per day out, ${n0(r.km)} km`).join('; ')}.`}
              />
            ),
          }}
          right={{
            title: 'Distance per day out',
            node: (
              <ColBars
                items={habitYears.map((r) => ({ label: String(r.year), short: short(r.year), value: r.kmPerActive, display: k1(r.kmPerActive), tone: r.partial ? 'big' : 'mid' }))}
                ticks={[0, 5, 10, 15]} max={Math.max(...habitYears.map((r) => r.kmPerActive)) * 1.15} yCap="km on foot &uarr;"
                aria={`Distance on foot per day out each year: ${habitYears.map((r) => `${r.year} ${k1(r.kmPerActive)} km`).join(', ')}.`}
              />
            ),
          }}
          read={[
              'Across is the share of days I went out, and up is the distance per day out. Each curve is one yearly total, and each year sits where its two levers put it. A year can reach the same total by going further or by going more often.',
              'The distance I covered on an average day out, each year.',
            ]}
          story={[
              `The distance per day out fell year after year from 2021 to 2024, and it has climbed again since. ${cur.partial ? `At this year\u2019s pace, ${cur.year} would finish near ${n0(Math.round(projKm / 10) * 10)} km.` : ''}`,
              'For me the easier lever is the days. I cannot always go far, but I can almost always go.',
            ]}
          source="Activity Log · days with any activity and distance on foot per calendar year"
        />

        {/* ===== what I'd tell you ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="wm-close">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · What I would tell you</p>
            <h2 id="wm-close" className="section-head__title">If you are starting&nbsp;out.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            That is what seven years of logging say to me. Nothing here is special. It is about an hour a day, a small version
            on the bad days, not letting a week get too thin, and long days in the middle of busy weeks.
            {daysLeft > 0 ? ` There are ${n0(daysLeft)} days of ${cur.year} left.` : ''}{' '}<span lang="sw">Kesho tena</span>, tomorrow again.
          </Reveal>
        </section>
      </div>
    </DetailFrame>
  )
}

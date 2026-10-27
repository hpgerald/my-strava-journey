import { useMemo } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
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

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'What It Means' }], number: '08', title: 'What It Means', subtitle: 'What I’ve learned from it', prev, next }
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

  return (
    <DetailFrame
      {...frame}
      lede="What seven years of logging have taught me, in my own words, with the numbers behind each point: how much time it takes, why I count days more than kilometres, the small days, keeping a floor under my weeks, how the long days come, and what makes a year add up."
    >
      <div className="yis-report">
        {/* ===== the cost ===== */}
        <section className="sgrid yis-top" aria-labelledby="wm-title">
          <div className="sgrid__head">
            <p className="eyebrow">Seven years, read back</p>
            <h2 id="wm-title" className="section-head__title">{n0(habitPerDay)} minutes a&nbsp;day.</h2>
            <p className="section-head__sub">That&rsquo;s what this has taken since {habitYear}. This year it&rsquo;s {n0(cur.minPerDay)}.</p>
          </div>
          <Reveal as="p" className="sgrid__statement">
            If you asked me what all this costs, I&rsquo;d say time. Since the habit started in {habitYear} I&rsquo;ve spent {n0(habitPerDay)} minutes a day on the move, and that&rsquo;s counting the rest days too.
            If I add up every outing since my first upload, it comes to {n0(hours)} hours, which is {n0(hours / 24)} days and nights without stopping.
            This year it went up to {n0(cur.minPerDay)} minutes a day, and I&rsquo;ve been out on {cur.days === cur.ndays ? `every one of the ${n0(cur.ndays)} days so far` : `${n0(cur.days)} of the ${n0(cur.ndays)} days so far`}.
            The rest of this page is what I think all that time has taught me.
          </Reveal>
          <OddsRow
            title="What it cost"
            items={[
              { num: hours, unit: ' hours', label: 'on the move since the first upload', tone: 'move' },
              { num: hours / 24, unit: ' days', label: 'if those hours ran end to end', tone: 'rest' },
              { num: habitPerDay, unit: ' min', label: `a day since ${habitYear}, rest days included`, tone: 'move' },
              { num: cur.minPerDay, unit: ' min', label: `a day in ${cur.year}, the most yet`, tone: 'move' },
            ]}
          />
          <DayClocks
            years={M.perYear.map((r) => ({ year: r.year, minPerDay: r.minPerDay, partial: r.partial, quiet: r.year < habitYear }))}
            aria={`Minutes on the move per calendar day, each year: ${M.perYear.map((r) => `${r.year} ${n0(r.minPerDay)} minutes`).join(', ')}.`}
          />
          <ul className="chron__key" aria-hidden="true">
            <li>The circle is one day of 24 hours. The wedge is the minutes on the move per day, rest days included.</li>
          </ul>
          <p className="source">Source: Activity Log · moving time of every activity, spread over every calendar day</p>
        </section>

        {/* ===== 1. count the days ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-days"
          eyebrow={`${num()} · Count the days`}
          title="Keep the days."
          sub={`In my slowest year my distance fell by ${pc(kmDrop)}%, but my days out only fell by ${pc(dayDrop)}%.`}
          statement={<>
            {peak.year} was my biggest year for distance, {n0(peak.km)} km on foot over {n0(peak.days)} days. By {low.year} I was down to {n0(low.km)} km.
            The long days went first. I had {n0(peak.long)} days of {LONG_KM} km or more in {peak.year} and {word(low.long)} in {low.year}. My days out hardly changed, from {n0(peak.days)} to {n0(low.days)}.
            If I could only keep one thing, I&rsquo;d keep the days. When the distance came back in {cur.year}, it had something to build on: {n0(cur.km)} km so far, with an outing on {cur.days === cur.ndays ? `all ${n0(cur.ndays)} days` : `${n0(cur.days)} of ${n0(cur.ndays)} days`}.
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
          leftNote={<>Both lines start at 100% in {peak.year}. The black line is the share of days I went out, and the orange line is my distance on foot per day. The shaded gap shows how far the distance fell behind the days.</>}
          rightNote={<>Most of my distance comes from the long days. They fell from {longTop.long} in {longTop.year} to {low.long} in {low.year}, and {cur.year} is back up to {cur.long}.</>}
          source="Activity Log · days with any activity, and distance on foot, per calendar year"
        />

        {/* ===== 2. the small days ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-small"
          eyebrow={`${num()} · Do the small version`}
          title="The small days count."
          sub={`About one day out in ${word(Math.round(1 / smallShare))} was hardly anything, and those days kept me going.`}
          statement={<>
            Since {habitYear} I&rsquo;ve had {n0(M.habitActive)} days out, and on {n0(M.smallDays)} of them I covered less than {SMALL_KM} km on foot. {K.foot || 0} of those were short walks or runs, and the other {(K.other || 0)} were other activities.
            Together they add up to {n0(M.smallKm)} km, less than 1% of my distance, and I&rsquo;m fine with that. They&rsquo;re for the days I&rsquo;d otherwise skip, and they help the next day too.
            After one of those small days I went out again {pc(M.smallNextActive)}% of the time. After a full rest day it was {pc(M.restNextActive)}%. I had the most of them in {smallTop.year}, {smallTop.small}, which was also my lowest year for distance. On a bad day I just do a small version.
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
          leftNote={<>Each dot is five days out, stacked by how far I went on foot that day. The orange dots on the left are the days under {SMALL_KM} km, and a day with only other activities counts as zero.</>}
          rightNote={<>The small days went up as the distance came down. {smallTop.year} had the most of them and the least distance, and I still kept going.</>}
          source="Activity Log · every day with an activity since the habit began, distance on foot only"
        />

        {/* ===== 3. the floor ===== */}
        {wNow && wPeak && (
          <>
            <hr className="rule rule--faint" />
            <StorySection
              id="wm-floor"
              eyebrow={`${num()} · Keep a floor`}
              title={`No week under ${n0(Math.floor(wNow.min))} km.`}
              sub={`That’s ${cur.year} so far. From ${between[0].year} to ${between[between.length - 1].year}, ${n0(under10Between)} weeks were under 10 km.`}
              statement={<>
                When I look at my weeks, the big ones haven&rsquo;t changed much. My biggest week of {peak.year} was {n0(wPeak.max)} km and this year&rsquo;s is {n0(wNow.max)} km.
                The change is in the quiet weeks. From {between[0].year} to {between[between.length - 1].year} I had {n0(under10Between)} weeks with less than 10 km on foot. In {cur.year} my lowest week is {n0(Math.floor(wNow.min))} km, and the middle half of my weeks are between {n0(wNow.q25)} and {n0(wNow.q75)} km.
                {wFirst ? ` The first half-year of the habit had a floor too, with no week in ${habitYear} under ${n0(Math.floor(wFirst.min))} km.` : ''}
                {' '}{bestPerDay === cur ? `With the same top and a higher floor, ${cur.year} is my best year for distance per day, ${k1(cur.kmPerDay)} km. ` : ''}If the bad weeks aren&rsquo;t too bad, the year mostly takes care of itself.
              </>}
              odds={{
                title: 'Weeks on foot',
                items: [
                  { num: Math.floor(wNow.min), unit: ' km', label: `my lowest week of ${cur.year}`, tone: 'move' },
                  { num: wNow.under10, unit: ' weeks', label: `under 10 km in ${cur.year}`, tone: 'move' },
                  { num: under10Between, unit: ' weeks', label: `under 10 km, ${between[0].year} to ${between[between.length - 1].year}`, tone: 'rest' },
                  { num: bestPerDay.kmPerDay, dec: 1, unit: ' km', label: `a day in ${bestPerDay.year}, the most of any year`, tone: 'move' },
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
              leftNote={<>One dot per full week, Monday to Sunday. The shaded band is the middle half of my weeks, the tick is the middle week, and the grey strip on the left is under 10 km.</>}
              rightNote={<>The years at zero are the ones where I kept a floor, the first half-year of the habit and {cur.year}. In every year in between, some weeks slipped.</>}
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
          sub={`The day after one averages ${k1(after.km)} km, about double a normal day.`}
          statement={<>
            Since {habitYear} I&rsquo;ve had {n0(M.longDays)} days of {LONG_KM} km or more on foot, which is half-marathon distance or more. {n0(M.longNextActive)} of them, {pc(M.longNextActive / M.longDays)}%, were followed by another day out,
            and that next day averaged {k1(after.km)} km, compared with {k1(M.avgDayKm)} km on a typical day. The three days before a long day were bigger than usual too.
            So my long days tend to come in the middle of a busy patch, with big days either side. Long runs are the same. After a run of {LONG_RUN_KM} km or more, I ran again the next day {pc(lrShare('run'))}% of the time and took a full rest {pc(lrShare('rest'))}% of the time.
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
          leftNote={<>The orange bar is my average long day. The bars either side are the days around it, three before and seven after, and the dashed line is an ordinary day.</>}
          rightNote={<>One square per run of {LONG_RUN_KM} km or more, coloured by what I did the next day. Most of the time I went straight back out, partly because long days tend to happen in busy months.</>}
          source={`Activity Log · days of ${LONG_KM} km or more on foot and runs of ${LONG_RUN_KM} km or more since the habit began`}
        />

        {/* ===== 5. the maths ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="wm-maths"
          eyebrow={`${num()} · Days and distance`}
          title="How a year adds up."
          sub="A year&rsquo;s total depends on how often I go and how far I go each time."
          statement={<>
            Every year&rsquo;s total is the number of days out times the distance per day out. 1,000 km is {k1(1000 / 365)} km a day if you go every day, or {k1(twoThirds)} km a day if you go two days in three. I&rsquo;ve done it both ways.
            {' '}{longYear.year} was the year of long days, {k1(longYear.kmPerActive)} km per day out on {pc(longYear.share)}% of days. {cur.year} is the year of going every day, {k1(cur.kmPerActive)} km on {pc(cur.share)}% of days.
            {' '}{lowYear.year} was low on both, {pc(lowYear.share)}% of days at {k1(lowYear.kmPerActive)} km, and ended at {n0(lowYear.km)} km. The curves on the chart are yearly totals, so you can see what lifted each year.
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
          leftNote={<>Across is the share of days I went out, and up is the distance per day out. Each dashed curve is one yearly total, and a year above a curve beat that total.</>}
          rightNote={<>From {habitYear} to {lowYear.year} my distance per day out kept falling while my days out stayed level or went up. {cur.year} sits in between, with more distance per day than {lowYear.year} and far more days.</>}
          source="Activity Log · days with any activity and distance on foot per calendar year"
        />

        {/* ===== what I'd tell you ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="wm-close">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · What I&rsquo;d tell you</p>
            <h2 id="wm-close" className="section-head__title">If you&rsquo;re starting&nbsp;out.</h2>
            <p className="section-head__sub">Four things I&rsquo;d pass on.</p>
          </div>
          <ul className="yrecs">
            <Card kicker="Count the days" value={low.days} unit="days" label={`out in ${low.year}, my lowest year for distance`} sub={`${pc(dayDrop)}% fewer than ${peak.year}`} tone="hot" />
            <Card kicker="Do the small version" value={M.smallDays} unit="days" label={`under ${SMALL_KM} km that kept the habit going`} sub={`${pc(M.smallNextActive)}% out again the next day`} tone="hot" />
 <Card kicker="Keep a floor" value={wNow ? Math.floor(wNow.min) : 0} unit="km" label={`my lowest week of ${cur.year}`} sub="no week under it" tone="hot" />
            <Card kicker="Long days together" value={after.km} decimals={1} unit="km" label="the day after a long day, on average" sub={`a typical day is ${k1(M.avgDayKm)} km`} tone="hot" />
          </ul>
          <Reveal as="p" className="sgrid__statement">
            That&rsquo;s what seven years of logging say to me. All the big numbers on the other pages came from fairly small things: about an hour a day, a short version on the bad days, not letting a week get too thin, and long days in the middle of busy weeks.
            {daysLeft > 0 ? ` There are ${n0(daysLeft)} days of ${cur.year} left. I’ll be out tomorrow.` : ' I’ll be out tomorrow.'}
          </Reveal>
          <p className="source">Source: Activity Log · every activity since the first upload</p>
        </section>
      </div>
    </DetailFrame>
  )
}

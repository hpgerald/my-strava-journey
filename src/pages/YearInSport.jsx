import { useMemo, useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import YearMonths from '../charts/YearMonths.jsx'
import YearMix from '../charts/YearMix.jsx'
import YearStreak from '../charts/YearStreak.jsx'
import YearRank from '../charts/YearRank.jsx'
import YearMoment from '../charts/YearMoment.jsx'
import YearProgress from '../charts/YearProgress.jsx'
import YearWeekdays from '../charts/YearWeekdays.jsx'
import YearDistances from '../charts/YearDistances.jsx'
import YearVsPrev from '../charts/YearVsPrev.jsx'
import EverestLedger from '../charts/EverestLedger.jsx'
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { computeYearStats, YEAR_THEME, YEAR_REPORT } from '../lib/yearStats.js'
import { fmtInt } from '../lib/format.js'

const MONTH_L = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmtMonth(iso) {
  if (!iso) return ''
  const m = parseInt(iso.slice(5, 7), 10)
  return `${MONTH_L[m - 1]} ${iso.slice(0, 4)}`
}

function HeroStat({ value, unit, label, decimals = 0 }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1100 })
  return (
    <div ref={ref} className="yis-hero__stat">
      <span className="yis-hero__num">
        {v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yis-hero__unit">{unit}</span> : null}
      </span>
      <span className="yis-hero__lbl">{label}</span>
    </div>
  )
}

function RecordCard({ kicker, value = 0, unit, label, sub, decimals = 0, text = null }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1000 })
  return (
    <div ref={ref} className="yis-rec">
      <p className="eyebrow">{kicker}</p>
      <p className="yis-rec__val">
        {text != null ? text : v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yis-rec__unit">{unit}</span> : null}
      </p>
      <p className="yis-rec__lbl">{label}</p>
      {sub ? <p className="yis-rec__sub">{sub}</p> : null}
    </div>
  )
}

const WEEK_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAR_DODOMA_KM = 450 // Dar es Salaam to Dodoma by road (A7), approx one way

function hoursMin(min) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export default function YearInSport() {
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
  // deep-link support: /numbers/2023 opens on 2023; a manual pick overrides until
  // the URL changes again.
  useEffect(() => {
    const y = Number(yearParam)
    setPicked(years.includes(y) ? y : null)
  }, [yearParam, years])
  const activeYear = picked ?? latest

  const geoByKey = useMemo(() => {
    const m = {}
    for (const g of activityGeo) m[g.activity_key] = g
    return m
  }, [activityGeo])

  const stats = useMemo(
    () => (activities.length ? computeYearStats(activeYear, activities, geoByKey) : null),
    [activeYear, activities, geoByKey]
  )

  // per-year activity totals for the cross-year rank
  const rankSeries = useMemo(
    () => years.map((y) => ({ year: y, value: activities.filter((a) => Number(a.year) === y).length })),
    [years, activities]
  )

  // the year immediately before, for the head-to-head comparison
  const prevYear = years.includes(activeYear - 1) ? activeYear - 1 : null
  const prevStats = useMemo(
    () => (prevYear && activities.length ? computeYearStats(prevYear, activities, geoByKey) : null),
    [prevYear, activities, geoByKey]
  )

  const pickerRef = useRef(null)
  const scrollToTop = () => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // arrow-key navigation across the year picker
  const onPickerKey = (e) => {
    const i = years.indexOf(activeYear)
    if (e.key === 'ArrowRight' && i < years.length - 1) { setPicked(years[i + 1]); e.preventDefault() }
    if (e.key === 'ArrowLeft' && i > 0) { setPicked(years[i - 1]); e.preventDefault() }
  }

  if (!stats) {
    return <DetailFrame crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]} number="02" title="Year in Sport" subtitle="Pick a year. See the whole story." />
  }

  const s = stats
  const isPartial = activeYear === latest && s.endISO.slice(5) < '12-31'
  const theme = YEAR_THEME[activeYear] || `${activeYear} in sport`
  const monthsData = MONTH_L.map((label, i) => ({ m: i + 1, label, activities: s.monthsActivities[i], km: s.monthsKm[i] }))

  // per-year insights the chart notes lead with, computed fresh for whichever
  // year is picked, so each note says something true and specific about it.
  const busyMo = s.monthsActivities.indexOf(Math.max(1, ...s.monthsActivities))
  const busyMoN = s.monthsActivities[busyMo] || 0
  const peakHour = s.hours24.indexOf(Math.max(1, ...s.hours24))
  const daysElapsed = Math.max(1, Math.round((Date.parse(s.endISO) - Date.parse(`${activeYear}-01-01`)) / 86400000) + 1)
  const pctDays = Math.round((100 * s.activeDays) / daysElapsed)
  const [moreSport, lessSport, moreN, lessN] = s.walkN >= s.runN
    ? ['Walking', 'running', s.walkN, s.runN]
    : ['Running', 'walking', s.runN, s.walkN]
  const otherN = s.n - s.footN
  // biggest mover against the previous year, for that comparison's note
  const moverPct = (cur, prv) => (prv > 0 ? Math.round((100 * (cur - prv)) / prv) : null)
  let biggestMover = null
  if (prevStats) {
    const cands = [
      { label: 'activity count', pct: moverPct(s.n, prevStats.n) },
      { label: 'foot distance', pct: moverPct(s.footKm, prevStats.footKm) },
      { label: 'climbing', pct: moverPct(s.elev, prevStats.elev) },
      { label: 'personal records', pct: moverPct(s.prs, prevStats.prs) },
    ].filter((c) => c.pct != null && Number.isFinite(c.pct))
    if (cands.length) biggestMover = cands.reduce((a, b) => (Math.abs(b.pct) > Math.abs(a.pct) ? b : a))
  }

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]}
      number="02"
      title="Year in Sport"
      subtitle="Pick a year. See the whole story."
      lede="Seven years, taken one at a time. Pick a year and the whole page rebuilds around it: the totals, the shape of its months, how it moved, how many days went unbroken, its biggest efforts, and the one thing that set it apart from the rest."
      prev={prev}
      next={next}
    >
      {/* ---- Year picker (sticky) ---- */}
      <div ref={pickerRef} className="yis-picker" role="group" aria-label="Choose a year" onKeyDown={onPickerKey}>
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={`yis-picker__yr${y === activeYear ? ' is-on' : ''}`}
            aria-pressed={y === activeYear}
            onClick={() => setPicked(y)}
          >
            {y}
          </button>
        ))}
      </div>

      {/* ---- everything below re-animates when the year changes ---- */}
      <div key={activeYear} className="yis-report">
        {/* Hero */}
        <section className="yis-hero">
          <p className="eyebrow yis-hero__kicker">Year in Sport{isPartial ? ' · still unfolding' : ''}</p>
          <h2 className="yis-hero__year display">{activeYear}</h2>
          <p className="yis-hero__theme">{theme}</p>
          {YEAR_REPORT[activeYear] && (
            <p className="yis-hero__lede measure">{YEAR_REPORT[activeYear](s)}</p>
          )}
          <div className="yis-hero__stats">
            <HeroStat value={s.n} label="activities" />
            <HeroStat value={Math.round(s.footKm)} unit="km" label="on foot" />
            <HeroStat value={Math.round(s.hours)} unit="h" label="moving" />
            <HeroStat value={Math.round(s.elev)} unit="m" label="climbed" />
            <HeroStat value={Math.round(s.kudos)} label="kudos" />
            <HeroStat value={Math.round(s.prs)} label="personal records" />
          </div>
        </section>

        {/* The year, month by month */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="The year, month by month"
            note={`${busyMoN > 0 ? `${MONTH_F[busyMo]} was the busiest month of ${activeYear}, ${busyMoN} times out the door. ` : ''}Each bar is a month, taller where more got logged. The flat stretches are the quiet weeks, or the gaps.`}
            source="Activity Log"
            tableCaption={`Activities by month in ${activeYear}`}
            columns={['Month', 'Activities']}
            rows={monthsData.map((d) => [MONTH_F[d.m - 1], fmtInt(d.activities)])}
          >
            <YearMonths months={monthsData} />
          </Figure>
        </Reveal>

        {/* How the kilometres added up */}
        {s.footKm > 0 && s.lastActiveMonth >= 1 && (
          <Reveal as="section" className="yis-sec">
            <Figure
              title="How the kilometres added up"
              note={`Every foot kilometre of ${activeYear}, stacked end to end as the months pass. The line climbs steeply where a stretch of long outings landed close together and levels off through the quieter weeks, finishing the year at ${Math.round(s.footKm).toLocaleString()} km.`}
              source="Activity Log"
              tableCaption={`Cumulative foot kilometres by month end in ${activeYear}`}
              columns={['Through', 'Cumulative km']}
              rows={s.cumByMonth.filter((d) => d.inRange).map((d) => [MONTH_F[d.m - 1], fmtInt(d.cum)])}
            >
              <YearProgress cum={s.cumByMonth} lastMonth={s.lastActiveMonth} total={s.footKm} />
            </Figure>
          </Reveal>
        )}

        {/* How it moved */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="How the year moved"
            note={`${moreN > 0 ? `${moreSport} led ${activeYear}, ${moreN} outings against ${lessSport}'s ${lessN}${otherN > 0 ? `, with ${otherN} of everything else` : ''}. ` : ''}Each kind of activity, counted by how often it happened. Whatever is not on foot folds in beneath the rest.`}
            source="Activity Log"
            tableCaption={`Activities by type in ${activeYear}`}
            columns={['Type', 'Activities']}
            rows={s.mix.map((d) => [d.label, fmtInt(d.n)])}
          >
            <YearMix mix={s.mix} />
          </Figure>
        </Reveal>

        {/* The shape of the week */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="The shape of the week"
            note={`Every ${activeYear} activity sorted into the weekday it fell on. ${
              Math.max(...s.weekday7) - Math.min(...s.weekday7) <= Math.max(2, Math.round(s.n * 0.03))
                ? 'The seven columns stand almost level, the mark of a habit that ran every day of the week alike.'
                : `${WEEK_FULL[s.peakWeekdayIdx]} carried the most, with ${s.weekday7[s.peakWeekdayIdx]} of them.`
            }`}
            source="Activity Log"
            tableCaption={`Activities by weekday in ${activeYear}`}
            columns={['Weekday', 'Activities']}
            rows={WEEK_FULL.map((d, i) => [d, fmtInt(s.weekday7[i])])}
          >
            <YearWeekdays counts={s.weekday7} />
          </Figure>
        </Reveal>

        {/* When the days happened */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="When the day got moving"
            note={`${peakHour >= 0 ? `In ${activeYear} the single busiest hour was ${peakHour}:00${peakHour <= 9 ? ', out the door before the day had properly begun' : peakHour >= 16 ? ', most of the movement waiting until the working day was done' : ''}. ` : ''}Every activity set on a 24-hour clock by the hour it began. The longer a spoke reaches, the more started then.`}
            source="Activity Log"
            tableCaption={`Activities by hour of day in ${activeYear}`}
            columns={['Hour', 'Activities']}
            rows={s.hours24.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={s.hours24} unit="activities" />
          </Figure>
        </Reveal>

        {/* The typical outing */}
        {s.footN >= 20 && (
          <Reveal as="section" className="yis-sec">
            <Figure
              title="The typical outing"
              note={`Every walk, run and hike of ${activeYear} sorted by distance into one-kilometre bins. The median outing came to ${s.medianFoot.toFixed(1)} km${
                s.peakBins.length ? `, and the lengths it kept returning to were around ${s.peakBins.slice().sort((a, b) => a - b).join(' and ')} km` : ''
              }. Anything past 25 km is folded into the last bar.`}
              source="Activity Log"
              tableCaption={`Foot outings by distance in ${activeYear}`}
              columns={['Distance', 'Outings']}
              rows={s.footBins.filter((b) => b.count > 0).map((b) => [`${b.km}${b.cap ? '+' : ''} km`, fmtInt(b.count)])}
            >
              <YearDistances bins={s.footBins} peaks={s.peakBins} />
            </Figure>
          </Reveal>
        )}

        {/* Consistency / streak */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title={`Every day of ${activeYear}`}
            note={`Something carried ${pctDays}% of ${activeYear}, ${fmtInt(s.activeDays)} days in all, spread across ${s.weeksActive} ${
              isPartial ? `of the ${s.weeksElapsed} weeks so far` : 'different weeks'
            }. The longest unbroken run reached ${s.streakLen} days${s.streakStartISO ? `, starting back in ${fmtMonth(s.streakStartISO)}` : ''}.`}
            source="Activity Log"
            tableCaption={`Consistency in ${activeYear}`}
            columns={['Measure', 'Value']}
            rows={[['Active days', fmtInt(s.activeDays)], ['Weeks with activity', isPartial ? `${s.weeksActive} of ${s.weeksElapsed}` : String(s.weeksActive)], ['Longest streak', `${s.streakLen} days`]]}
          >
            <YearStreak activeSet={s.activeSet} year={activeYear} endISO={s.endISO} streak={{ len: s.streakLen, startISO: s.streakStartISO, endISO: s.streakEndISO }} />
          </Figure>
        </Reveal>

        {/* Biggest efforts */}
        {(s.biggestFoot || s.highestClimb || s.hardest) && (
          <Reveal as="section" className="yis-sec">
            <div className="section-head"><p className="eyebrow">The far edges of {activeYear}</p>
              <h3 className="section-head__title" style={{ fontSize: 'var(--fs-lg)' }}>The biggest efforts.</h3></div>
            <div className="yis-recs">
              {s.biggestFoot && s.biggestFoot.val > 0 && (
                <RecordCard kicker="Furthest on foot" value={s.biggestFoot.val} unit="km" decimals={1} label="in a single outing" sub={fmtMonth(s.biggestFoot.date)} />
              )}
              {s.longestTime && s.longestTime.val > 0 && (
                <RecordCard kicker="Longest outing" text={hoursMin(s.longestTime.val)} label="moving, start to finish" sub={fmtMonth(s.longestTime.date)} />
              )}
              {s.highestClimb && s.highestClimb.val > 0 && (
                <RecordCard kicker="Most climbed" value={Math.round(s.highestClimb.val)} unit="m" label="of vertical in a day" sub={fmtMonth(s.highestClimb.date)} />
              )}
              {s.hardest && s.hardest.val > 0 && (
                <RecordCard kicker="Hardest effort" value={Math.round(s.hardest.val)} label="relative-effort score" sub={fmtMonth(s.hardest.date)} />
              )}
            </div>
          </Reveal>
        )}

        {/* Breakthroughs: PRs, achievements, the most-cheered day */}
        {(s.prs > 0 || s.achievements >= 10) && (
          <Reveal as="section" className="yis-sec">
            <div className="section-head"><p className="eyebrow">Breakthroughs</p>
              <h3 className="section-head__title" style={{ fontSize: 'var(--fs-lg)' }}>Records set, crowns earned.</h3></div>
            <div className="yis-recs">
              {s.prs > 0 && (
                <RecordCard kicker="Personal records" value={Math.round(s.prs)} label="segment bests beaten" sub={`${activeYear}`} />
              )}
              {s.achievements > 0 && (
                <RecordCard kicker="Achievements" value={Math.round(s.achievements)} label="crowns and cups collected" sub={`${activeYear}`} />
              )}
              {s.mostKudos && s.mostKudos.kudos > 0 && (
                <RecordCard kicker="Most cheered" value={Math.round(s.mostKudos.kudos)} label={`kudos on one ${s.mostKudos.sport.toLowerCase()}`} sub={fmtMonth(s.mostKudos.date)} />
              )}
            </div>
          </Reveal>
        )}

        {/* In real terms: what the year's totals add up to */}
        {s.footKm >= 100 && (
          <Reveal as="section" className="yis-sec">
            <div className="section-head"><p className="eyebrow">In real terms</p>
              <h3 className="section-head__title" style={{ fontSize: 'var(--fs-lg)' }}>What {activeYear} adds up to.</h3></div>
            {s.elev >= 800 && (
              <div style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }}>
                <EverestLedger meters={s.elev} />
              </div>
            )}
            <div className="yis-recs">
              <RecordCard kicker="On foot" text={`${(s.footKm / DAR_DODOMA_KM).toFixed(1)}×`} label="the road from Dar es Salaam to Dodoma" sub={`${Math.round(s.footKm).toLocaleString()} km walked and run`} />
              <RecordCard kicker="Energy" value={Math.round(s.calories)} label="calories burned across the year" />
              <RecordCard kicker="Time" value={Math.round(s.hours)} unit="h" label="spent moving, all told" sub={`about ${Math.round(s.hours / Math.max(1, s.weeksElapsed || 52))} h a week`} />
            </div>
          </Reveal>
        )}

        {/* Where (only when the year reached beyond home) */}
        {s.countries.length > 1 && (
          <Reveal as="section" className="yis-sec">
            <Figure
              title={`Where ${activeYear} happened`}
              note={`Where the year's activities landed, by country. ${activeYear} touched ${s.countries.length} countries, home and away.`}
              source="Strava GPS + point-in-polygon"
              tableCaption={`Located activities by country in ${activeYear}`}
              columns={['Country', 'Activities']}
              rows={s.countries.map((c) => [c.country, fmtInt(c.n)])}
            >
              <YearMix mix={s.countries.map((c) => ({ label: c.country, n: c.n, foot: true }))} />
            </Figure>
          </Reveal>
        )}

        {/* Against last year */}
        {prevStats && s.n >= 50 && (
          <Reveal as="section" className="yis-sec">
            <Figure
              title={`${activeYear} against ${prevYear}`}
              note={`${biggestMover ? `The biggest swing from ${prevYear} is ${biggestMover.label}, ${biggestMover.pct >= 0 ? 'up' : 'down'} ${Math.abs(biggestMover.pct)}%. ` : ''}Here is ${activeYear} set beside the year before it, measure by measure.${
                isPartial ? ` ${activeYear} is still unfolding, so these totals run against a full ${prevYear}, and the gaps will narrow as the year fills out.` : ''
              }`}
              source="Activity Log"
              tableCaption={`${activeYear} compared with ${prevYear}`}
              columns={['Measure', `${activeYear}`, `${prevYear}`]}
              rows={[
                ['Activities', fmtInt(s.n), fmtInt(prevStats.n)],
                ['Kilometres on foot', fmtInt(s.footKm), fmtInt(prevStats.footKm)],
                ['Hours moving', fmtInt(s.hours), fmtInt(prevStats.hours)],
                ['Metres climbed', fmtInt(s.elev), fmtInt(prevStats.elev)],
                ['Kudos', fmtInt(s.kudos), fmtInt(prevStats.kudos)],
                ['Personal records', fmtInt(s.prs), fmtInt(prevStats.prs)],
              ]}
            >
              <YearVsPrev
                prevYear={prevYear}
                rows={[
                  { label: 'Activities', cur: s.n, prev: prevStats.n },
                  { label: 'Km on foot', cur: Math.round(s.footKm), prev: Math.round(prevStats.footKm), unit: 'km' },
                  { label: 'Hours moving', cur: Math.round(s.hours), prev: Math.round(prevStats.hours), unit: 'h' },
                  { label: 'Metres climbed', cur: Math.round(s.elev), prev: Math.round(prevStats.elev), unit: 'm' },
                  { label: 'Kudos', cur: Math.round(s.kudos), prev: Math.round(prevStats.kudos) },
                  { label: 'Personal records', cur: Math.round(s.prs), prev: Math.round(prevStats.prs) },
                ]}
              />
            </Figure>
          </Reveal>
        )}

        {/* The signature moment */}
        <section className="yis-sec yis-sec--moment">
          <YearMoment year={activeYear} stats={s} />
        </section>

        {/* Against the other years */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="Against the other years"
            note={`Where ${activeYear} sits against every other year for sheer activity count. It is the orange bar; the others are there for scale.`}
            source="Activity Log"
            tableCaption="Activities per year"
            columns={['Year', 'Activities']}
            rows={rankSeries.map((d) => [String(d.year), fmtInt(d.value)])}
          >
            <YearRank series={rankSeries} selected={activeYear} fmt={(v) => fmtInt(v)} />
          </Figure>
        </Reveal>

        {/* CTA */}
        <Reveal as="section" className="yis-cta">
          <p>That was {activeYear}.</p>
          <button type="button" className="yis-cta__btn" onClick={scrollToTop}>Pick another year ↑</button>
        </Reveal>
      </div>
    </DetailFrame>
  )
}

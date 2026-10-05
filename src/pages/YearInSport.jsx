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
import { Reveal, useInView, useCountUp } from '../components/Reveal.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { computeYearStats, YEAR_THEME } from '../lib/yearStats.js'
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

function RecordCard({ kicker, value, unit, label, sub, decimals = 0 }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, inView, { decimals, dur: 1000 })
  return (
    <div ref={ref} className="yis-rec">
      <p className="eyebrow">{kicker}</p>
      <p className="yis-rec__val">
        {v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {unit ? <span className="yis-rec__unit">{unit}</span> : null}
      </p>
      <p className="yis-rec__lbl">{label}</p>
      {sub ? <p className="yis-rec__sub">{sub}</p> : null}
    </div>
  )
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

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]}
      number="02"
      title="Year in Sport"
      subtitle="Pick a year. See the whole story."
      lede="Seven years, one at a time. Choose a year and the page rebuilds itself around it: the headline totals, the shape of the months, how it moved, the days that never broke, the biggest efforts, and the one thing that made that year its own."
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
          <div className="yis-hero__stats">
            <HeroStat value={s.n} label="activities" />
            <HeroStat value={Math.round(s.footKm)} unit="km" label="on foot" />
            <HeroStat value={Math.round(s.hours)} unit="h" label="moving" />
            <HeroStat value={Math.round(s.elev)} unit="m" label="climbed" />
            <HeroStat value={Math.round(s.kudos)} label="kudos" />
          </div>
        </section>

        {/* The year, month by month */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="The year, month by month"
            note={`Every activity placed in the month it happened. The busiest stretch of ${activeYear} stands tallest; empty months sit on the line.`}
            source="Activity Log"
            tableCaption={`Activities by month in ${activeYear}`}
            columns={['Month', 'Activities']}
            rows={monthsData.map((d) => [MONTH_F[d.m - 1], fmtInt(d.activities)])}
          >
            <YearMonths months={monthsData} />
          </Figure>
        </Reveal>

        {/* How it moved */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="How the year moved"
            note="Each kind of activity by how many times it happened. Walking and running carry most years; everything else is counted and folded in."
            source="Activity Log"
            tableCaption={`Activities by type in ${activeYear}`}
            columns={['Type', 'Activities']}
            rows={s.mix.map((d) => [d.label, fmtInt(d.n)])}
          >
            <YearMix mix={s.mix} />
          </Figure>
        </Reveal>

        {/* When the days happened */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title="When the day got moving"
            note={`Every ${activeYear} activity by the hour it started, around a 24-hour clock. The longer the spoke, the more sessions began then.`}
            source="Activity Log"
            tableCaption={`Activities by hour of day in ${activeYear}`}
            columns={['Hour', 'Activities']}
            rows={s.hours24.map((c, i) => [`${String(i).padStart(2, '0')}:00`, String(c)])}
          >
            <RadialHours counts={s.hours24} unit="activities" />
          </Figure>
        </Reveal>

        {/* Consistency / streak */}
        <Reveal as="section" className="yis-sec">
          <Figure
            title={`Every day of ${activeYear}`}
            note={`${fmtInt(s.activeDays)} days carried an activity. The longest unbroken run of the year reached ${s.streakLen} days${s.streakStartISO ? `, from ${fmtMonth(s.streakStartISO)} on` : ''}.`}
            source="Activity Log"
            tableCaption={`Consistency in ${activeYear}`}
            columns={['Measure', 'Value']}
            rows={[['Active days', fmtInt(s.activeDays)], ['Longest streak', `${s.streakLen} days`]]}
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
              {s.highestClimb && s.highestClimb.val > 0 && (
                <RecordCard kicker="Most climbed" value={Math.round(s.highestClimb.val)} unit="m" label="of vertical in a day" sub={fmtMonth(s.highestClimb.date)} />
              )}
              {s.hardest && s.hardest.val > 0 && (
                <RecordCard kicker="Hardest effort" value={Math.round(s.hardest.val)} label="relative-effort score" sub={fmtMonth(s.hardest.date)} />
              )}
            </div>
          </Reveal>
        )}

        {/* Where (only when the year reached beyond home) */}
        {s.countries.length > 1 && (
          <Reveal as="section" className="yis-sec">
            <Figure
              title={`Where ${activeYear} happened`}
              note={`Located activities by country. ${s.countries.length} countries carried ${activeYear}, home and away.`}
              source="Strava GPS + point-in-polygon"
              tableCaption={`Located activities by country in ${activeYear}`}
              columns={['Country', 'Activities']}
              rows={s.countries.map((c) => [c.country, fmtInt(c.n)])}
            >
              <YearMix mix={s.countries.map((c) => ({ label: c.country, n: c.n, foot: true }))} />
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
            note={`How ${activeYear} compares on activity count. The chosen year is in accent; the rest sit behind it.`}
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

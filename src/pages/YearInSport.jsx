import { useMemo, useState, useRef, useEffect } from 'react'
import { numOf } from '../lib/chapters.js'
import Eyebrow from '../components/Eyebrow.jsx'
import ShareLink from '../components/ShareLink.jsx'
import { useParams, Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import { useBook } from '../components/BookContext.js'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import BookStory from '../components/BookStory.jsx'
import YearRank from '../charts/YearRank.jsx'
import { YEAR_NOTES, YEAR_PHOTOS } from '../lib/yearNotes.js'
import { YearRing, RankBoard } from '../charts/YearSet.jsx'
import { YearMoments } from '../charts/YearKit.jsx'
import RadialHours from '../charts/RadialHours.jsx'
import TzShare from '../charts/TzShare.jsx'
import YearVsPrev, { vsPrevTitle } from '../charts/YearVsPrev.jsx'
import { Reveal } from '../components/Reveal.jsx'
import YearDeck, { ArtMonths, ArtLine, ArtRidge, ArtClock } from '../components/YearDeck.jsx'
import { motionOK } from '../motion/env.js'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { computeYearStats, YEAR_THEME, YEAR_REPORT } from '../lib/yearStats.js'
import { buildYearReport } from '../lib/yearReport.js'
import { yearChapters } from '../lib/yearChapters.jsx'
import { soFar } from '../lib/streakTarget.js'
import { buildUluguru } from '../lib/mountains.js'
import { fmtInt, toNum } from '../lib/format.js'
import { isNamedCountry } from '../lib/geo.js'

const MONTH_L = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pc = (v) => Math.round((v || 0) * 100)
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MONTH_L[parseInt(iso.slice(5, 7), 10) - 1]}` : '')
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)
const chg = (cur, prv) => (prv > 0 ? (cur - prv) / prv : null)
const chgTxt = (c) => (c == null ? '' : c >= 2 ? `${Math.round(1 + c)} times as much` : c >= 0 ? `up ${pc(c)}%` : `down ${pc(-c)}%`)

export default function YearInSport({ year: bookYear } = {}) {
  const book = useBook()
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const kiliRows = useTable('kili_half')
  const courseRows = useTable('kili_half_course')
  const rkRows = useTable('ras_kilomoni')
  const tripRows = useTable('mountain_trips')
  const profileRows = useTable('bondwa_profiles')
  const weatherRows = useTable('weather_days')
  const gearRows = useTable('gear')
  const { prev, next } = useSectionPaging('/year-in-sport')

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
  const rk = useMemo(() => rkRows.map((r) => ({ n: Number(r.day), roman: r.roman, date: r.date, sport: r.sport, km: toNum(r.distance_km) || 0 })).sort((a, b) => a.n - b.n), [rkRows])
  const ulu = useMemo(() => buildUluguru(tripRows, profileRows, activities, geoByKey), [tripRows, profileRows, activities, geoByKey])
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
    return <DetailFrame crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]} number={numOf('/year-in-sport')} title="Year in Sport" subtitle="Pick a year. See the whole story." />
  }

  const Y = activeYear
  const isPartial = Y === latest && s.endISO.slice(5) < '12-31'
  const so = isPartial ? ' so far' : ''
  // while the year runs, last year up to the same day, so a part year can be
  // read against a part year too
  const psSame = (() => {
    if (!isPartial || !ps) return null
    const md = s.endISO.slice(5, 10)
    const FT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
    const t = { n: 0, footKm: 0, hours: 0, elev: 0, kudos: 0, prs: 0 }
    for (const a of activities) {
      if (Number(a.year) !== prevYear || (a.date || '').slice(5, 10) > md) continue
      const v = (k) => toNum(a[k]) || 0
      t.n += 1
      t.hours += v('moving_time_min') / 60
      t.kudos += v('kudos')
      t.prs += v('prs')
      if (FT.has(a.sport_type)) { t.footKm += v('distance_km'); t.elev += v('elevation_gain_m') }
    }
    return t
  })()
  const vsRows = ps ? [
    { label: 'Outings', cur: s.n, prev: ps.n, same: psSame?.n },
    { label: 'Km on foot', cur: Math.round(s.footKm), prev: Math.round(ps.footKm), same: psSame && Math.round(psSame.footKm), unit: 'km' },
    { label: 'Hours moving', cur: Math.round(s.hours), prev: Math.round(ps.hours), same: psSame && Math.round(psSame.hours), unit: 'h' },
    { label: 'Metres climbed', cur: Math.round(s.elev), prev: Math.round(ps.elev), same: psSame && Math.round(psSame.elev), unit: 'm' },
    { label: 'Kudos', cur: Math.round(s.kudos), prev: Math.round(ps.kudos), same: psSame && Math.round(psSame.kudos) },
    { label: 'PRs', cur: Math.round(s.prs), prev: Math.round(ps.prs), same: psSame?.prs },
  ] : null
  const theme = soFar(YEAR_THEME[Y] || `${Y} in sport`, isPartial)
  const span = Math.round((Date.parse(r.endISO) - Date.parse(r.startISO)) / 864e5) + 1
  const pctDays = r.activeShare
  const rankOf = (f) => 1 + allStats.filter((x) => f(x) > f(s)).length
  const rankN = rankOf((x) => x.n), rankKm = rankOf((x) => x.footKm), rankEl = rankOf((x) => x.elev)
  const rankH = rankOf((x) => x.hours), rankP = rankOf((x) => x.prs), rankK = rankOf((x) => x.kudos)
  const kmPerOut = (x) => (x.footN ? x.footKm / x.footN : 0)
  const rankKpo = rankOf((x) => kmPerOut(x))
  const bestKmYear = allStats.reduce((b, x) => (x.footKm > b.footKm ? x : b), allStats[0])
  const rankSeries = allStats.map((x) => ({ year: x.year, value: x.n }))
  const MEASURES = [
    { label: 'Outings', f: (x) => x.n, fmt: (v) => n0(v), noun: 'outings' },
    { label: 'Km on foot', f: (x) => x.footKm, fmt: (v) => `${n0(v)} km`, noun: 'distance on foot' },
    { label: 'Metres climbed', f: (x) => x.elev, fmt: (v) => `${n0(v)} m`, noun: 'climbing' },
    { label: 'Hours moving', f: (x) => x.hours, fmt: (v) => `${n0(v)} h`, noun: 'hours on the move' },
    { label: 'Days out', f: (x) => x.activeDays, fmt: (v) => n0(v), noun: 'days out' },
    { label: 'Longest outing', f: (x) => (x.biggestFoot ? x.biggestFoot.val : 0), fmt: (v) => `${v.toFixed(1)} km`, noun: 'the longest outing' },
  ]
  const rankRows = MEASURES.map((mz) => ({ label: mz.label, fmt: mz.fmt, values: allStats.map((x) => ({ y: x.year, v: mz.f(x) })) }))
  const firsts = MEASURES.filter((mz) => 1 + allStats.filter((x) => mz.f(x) > mz.f(s)).length === 1)
  const FOOTS = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
  const allFootKm = allStats.reduce((t, x) => t + x.footKm, 0) || 1
  const kudosPer = s.n ? s.kudos / s.n : 0
  const noGps = s.n - r.located
  const nCountries = r.countries.filter((c) => isNamedCountry(c.country)).length
  const othersN = r.countries.filter((c) => !isNamedCountry(c.country)).reduce((t, c) => t + c.activities, 0)
  const abroadN = r.countries.filter((c) => c.country !== 'Tanzania').reduce((t, c) => t + c.activities, 0)
  const firstSeen = (() => { const m = {}; for (const a of activities) { const g = geoByKey[a.activity_key]; if (g && g.country === 'Tanzania' && g.region && (!m[g.region] || a.date < m[g.region])) m[g.region] = a.date } return m })()
  const newRegs = Object.entries(firstSeen).filter(([, d]) => Number(d.slice(0, 4)) === Y).map(([k]) => k)
  // the year's regions of Tanzania, for the two maps: outings, and climbing on foot
  const tzRows = (() => {
    const m = {}
    for (const a of yearActs) {
      const g = geoByKey[a.activity_key]
      if (!g || g.country !== 'Tanzania' || !g.region) continue
      const o = (m[g.region] = m[g.region] || { region: g.region, n: 0, elev: 0 })
      o.n += 1
      if (FOOTS.has(a.sport_type)) o.elev += toNum(a.elevation_gain_m) || 0
    }
    return Object.values(m)
  })()
  const climbTop = tzRows.slice().sort((a, b) => b.elev - a.elev)[0]
  const busyTop = tzRows.slice().sort((a, b) => b.n - a.n)[0]
  const tzN = tzRows.reduce((t, x) => t + x.n, 0) || 1

  // sections are numbered in the order they render
  let secN = 0
  const num = () => ++secN
  const NOTE = YEAR_NOTES[Y] || {}
  const CH = yearChapters({ Y, acts: yearActs, all: activities, geo: geoByKey, s, allStats, kili: kiliRows, course: courseRows, rk, ulu, weather: weatherRows, gear: gearRows })
  const Sec = ({ n, id, k, title: title0, text: text0, facts, cap, wide, more, children }) => {
    const o = NOTE[id.replace(/^ys-/, '')] || {}
    const title = o.t || title0, text = (Array.isArray(o.p) ? o.p : null) || text0 || []
    return (
    <>
      <hr className="rule rule--faint" />
      <section className="sgrid yset" aria-labelledby={idp(id)}>
        <div className={`yset__grid${wide ? ' yset__grid--wide' : ''}`}>
          <div className="yset__words">
            <p className="yset__k">{n} · {k}</p>
            <h2 id={idp(id)} className="yset__t">{title}</h2>
            {text.filter(Boolean).map((t, i) => <p key={i} className="yset__p">{t}</p>)}
            {facts && facts.filter(Boolean).length ? (
              <dl className="yset__facts">
                {facts.filter(Boolean).map((f) => <div key={f.l} className={f.hot ? 'is-hot' : ''}><dt>{f.l}</dt><dd>{f.v}</dd></div>)}
              </dl>
            ) : null}
          </div>
          <figure className="yset__fig">
            {children}
            {cap ? <figcaption className="yset__cap">{cap}</figcaption> : null}
            {more && !book ? <p className="yset__more"><Link to={more.to}>{more.label}</Link></p> : null}
          </figure>
        </div>
      </section>
    </>
    )
  }

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Year in Sport' }]}
      number={numOf('/year-in-sport')}
      title="Year in Sport"
      subtitle="Pick a year and read it."
      prev={prev}
      next={next}
    >
      {!book && <div ref={pickerRef} className="yis-picker" role="group" aria-label="Choose a year" onKeyDown={onPickerKey}>
        {years.map((y) => (
          <button key={y} type="button" className={`yis-picker__yr${y === Y ? ' is-on' : ''}`} aria-pressed={y === Y} onClick={() => setPicked(y)}>
            {y}
          </button>
        ))}
        <Link className="yis-picker__book" to={`/book/${Y}`}>{Y} as a book, to download</Link>
      </div>}

      <div key={Y} className="yis-report">
        {/* ===== the opener ===== */}
        <section className="sgrid yis-top" aria-labelledby={idp('yis-title')}>
          <div className="sgrid__head">
            <Eyebrow>{Y}{isPartial ? ' · still running' : ''}<ShareLink slug={`year-${Y}`} title={`${Y} · Year in Sport · Showing Up`} className="share--k" /></Eyebrow>
            <h2 id={idp('yis-title')} className="section-head__title">{theme}.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">{CH.open || (YEAR_REPORT[Y] ? YEAR_REPORT[Y](s) : '')}</Reveal>
          {!book && motionOK() ? (() => {
            const vs = (a, b) => { const c = chg(a, b); return c == null ? '' : c >= 2 ? `${Math.round(1 + c)} times ${prevYear}` : c >= 0 ? `up ${pc(c)}% on ${prevYear}` : `down ${pc(-c)}% on ${prevYear}` }
            return <YearDeck label={`${Y} in four numbers${ps ? `, against ${prevYear}` : ''}`} cards={[
              { tone: 'accent', k: `${Y}${isPartial ? ' so far' : ''}`, value: n0(s.n), label: 'outings', note: ps ? vs(s.n, ps.n) : 'the first year of my log', art: <ArtMonths values={s.monthsActivities} /> },
              { tone: 'ink', k: `${Y}${isPartial ? ' so far' : ''}`, value: n0(s.footKm), unit: ' km', label: 'on foot', note: ps ? vs(s.footKm, ps.footKm) : '', art: <ArtLine values={s.monthsKm.reduce((a, v) => [...a, (a[a.length - 1] || 0) + v], [0])} /> },
              { tone: 'paper', k: `${Y}${isPartial ? ' so far' : ''}`, value: n0(s.elev), unit: ' m', label: 'climbed', note: ps ? vs(s.elev, ps.elev) : '', art: <ArtRidge values={s.monthsElev} /> },
              { tone: 'accent', k: `${Y}${isPartial ? ' so far' : ''}`, value: n0(s.hours), unit: ' h', label: 'moving', note: ps ? vs(s.hours, ps.hours) : '', art: <ArtClock hours={s.hours24} /> },
            ]} />
          })() : (
            <OddsRow
              title={`${Y} in four numbers${ps ? `, against ${prevYear}` : ''}`}
              items={[
                { num: s.n, unit: '', label: `outings${ps ? `, ${chgTxt(chg(s.n, ps.n))}` : ''}`, tone: 'move' },
                { num: s.footKm, unit: ' km', label: `on foot${ps ? `, ${chgTxt(chg(s.footKm, ps.footKm))}` : ''}`, tone: 'move' },
                { num: s.elev, unit: ' m', label: `climbed${ps ? `, ${chgTxt(chg(s.elev, ps.elev))}` : ''}`, tone: 'move' },
                { num: s.hours, unit: ' h', label: `moving${ps ? `, ${chgTxt(chg(s.hours, ps.hours))}` : ''}`, tone: 'move' },
              ]}
            />
          )}
          <BookStory>{[
            `${s.hours >= 48 ? `The ${n0(s.hours)} hours I spent moving in ${Y} come to about ${n0(s.hours / 24)} full days and nights. ` : ''}${Y} holds ${pc(s.footKm / allFootKm) || '<1'}% of all the kilometres I have covered on foot. ${kudosPer < 2 ? `Almost nobody followed me yet, and the whole year brought ${n0(s.kudos)} kudos.` : `The people who follow me gave ${n0(s.kudos)} kudos over the year, about ${n0(kudosPer)} for each outing${s.prs ? `, and I set ${n0(s.prs)} PRs on Strava segments` : ''}.`}`,
          ]}</BookStory>
        </section>

        {/* ===== one photo of the year, when there is one (public/photos/years) ===== */}
        {YEAR_PHOTOS[Y] ? (
          <figure className="yis-photo">
            <img src={`${import.meta.env.BASE_URL}${YEAR_PHOTOS[Y].src}`} alt={YEAR_PHOTOS[Y].alt} loading="lazy" />
            {YEAR_PHOTOS[Y].cap ? <figcaption className="yset__cap">{YEAR_PHOTOS[Y].cap}</figcaption> : null}
          </figure>
        ) : null}

        {/* ===== the year in moments ===== */}
        <hr className="rule rule--faint" />
        <section className="yis-moments" aria-label={`The moments of ${Y}`}>
          <p className="yset__k">The year in moments</p>
          <YearMoments acts={yearActs} fromISO={r.startISO} toISO={r.endISO} events={CH.events}
            aria={`Every day of ${Y} as a bar, taller for more kilometres on foot, with ${CH.events.length} moments numbered on it.`} />
        </section>

        {/* ===== the year's own chapters ===== */}
        {CH.chapters.map((ch) => (
          <Sec key={ch.id} n={num()} id={`ys-c-${ch.id}`} k={ch.k} title={ch.t} text={ch.p} facts={ch.facts} cap={ch.cap} wide={ch.wide} more={ch.more}>
            {ch.node}
          </Sec>
        ))}

        {/* ===== the closing: every day, where, and against the other years ===== */}
        {(() => {
          // every day and every hour: the ring of days beside the 24-hour clock
          const o0 = NOTE.ring || {}, oh = NOTE.hours || {}
          const o = { t: o0.t && soFar(o0.t, isPartial), p: o0.p && o0.p.map((t) => soFar(t, isPartial)) }
          const am = s.hours24.slice(0, 10).reduce((t, v) => t + v, 0) / Math.max(1, s.n)
          const pm = s.hours24.slice(16, 21).reduce((t, v) => t + v, 0) / Math.max(1, s.n)
          const peak = s.hours24.indexOf(Math.max(...s.hours24))
          const fmtH = (h) => (h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`)
          const title = o.t || (r.restDays === 0 ? 'No zero day.' : pctDays >= 0.8 ? 'Almost every day.' : pctDays >= 0.4 ? 'Most days, not all.' : 'A quiet year.')
          const dayText = [
            ...(o.p || [r.restDays === 0 ? 'Every day of the year has an outing. Some are short, and they still count.' : pctDays >= 0.4 ? 'The year came in stretches of days out, with gaps between.' : 'The outings came in small bunches with long quiet spells between them.']),
            r.restDays > 0 && r.longGap.len >= 2 ? (() => {
              const g = r.longGap, MF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
              const mo = (iso) => `${MF[parseInt(iso.slice(5, 7), 10) - 1]}${iso.slice(0, 4) !== String(Y) ? ` ${iso.slice(0, 4)}` : ''}`
              const span = g.from && g.to && g.len >= 14 ? `, from ${mo(String(g.from).slice(0, 10))} to ${mo(String(g.to).slice(0, 10))}` : ''
              return `My longest gap was ${n0(g.len)} days${span}.`
            })() : '',
          ].filter(Boolean)
          const hourText = [
            ...(oh.p || []),
            `${pc(pm >= am ? pm : am)}% of my outings began ${pm >= am ? 'between 4 and 9 in the evening' : 'before 10 in the morning'}, and ${pc(pm >= am ? am : pm)}% ${pm >= am ? 'before 10 in the morning' : 'between 4 and 9 in the evening'}.`,
          ]
          return (
            <>
              <hr className="rule rule--faint" />
              <section className="sgrid yset ydh" aria-labelledby={idp('ys-dayhour')}>
                <p className="yset__k">{num()} · Every day and every hour</p>
                <h2 id={idp('ys-dayhour')} className="yset__t">{title}</h2>
                <div className="ydh__cols">
                  <div>
                    <p className="ydh__h">The days</p>
                    {dayText.map((t, i) => <p key={i} className="yset__p">{t}</p>)}
                  </div>
                  <div>
                    <p className="ydh__h">The hours</p>
                    {hourText.map((t, i) => <p key={i} className="yset__p">{t}</p>)}
                  </div>
                </div>
                <dl className="yset__facts ydh__facts">
                  <div className="is-hot"><dt>{s.streakGoing ? 'days in a row, still going' : 'days in a row, the longest run'}</dt><dd>{n0(s.streakLen)}</dd></div>
                  <div><dt>zero days</dt><dd>{n0(r.restDays)}</dd></div>
                  <div><dt>the busiest hour</dt><dd>{fmtH(peak)}</dd></div>
                </dl>
                <div className="yis-pair ydh__figs">
                  <figure>
                    <figcaption>Every day of the year</figcaption>
                    <YearRing year={Y} acts={yearActs} startISO={r.startISO} endISO={r.endISO} streak={{ len: s.streakLen, startISO: s.streakStartISO, endISO: s.streakEndISO }}
                      aria={`Every day of ${Y} as a ring: ${n0(s.activeDays)} days with an outing out of ${n0(span)}, the longest run ${n0(s.streakLen)} days.`} />
                    <p className="yset__cap">A longer spoke is a bigger day. The dark arc is my longest run of days in a row.</p>
                  </figure>
                  <figure>
                    <figcaption>The hour each outing began</figcaption>
                    <RadialHours counts={s.hours24} unit="activities" max={520} />
                    <p className="yset__cap">Midnight is at the top and noon at the bottom. A longer spoke is a busier hour.</p>
                  </figure>
                </div>
              </section>
            </>
          )
        })()}

        {r.located >= 15 && tzRows.length >= 2 ? (
          <Sec n={num()} id="ys-where" k="Where it happened" wide
            title={(NOTE.where && NOTE.where.t) || ((r.countries.find((c) => c.country === 'Tanzania')?.activities || 0) / Math.max(1, r.located) > 0.8 ? 'Mostly at home.' : 'Across the border.')}
            text={[
              `${NOTE.where && NOTE.where.p ? NOTE.where.p : (() => { const away = r.countries.filter((c) => c.country !== 'Tanzania' && isNamedCountry(c.country)).map((c) => c.country); return away.length ? `Besides Tanzania, I went out in ${away.length > 1 ? `${away.slice(0, -1).join(', ')} and ${away[away.length - 1]}` : away[0]}${othersN ? `, plus ${word(othersN)} ${othersN === 1 ? 'outing' : 'outings'} I count as others` : ''}.` : othersN ? `All but ${word(othersN)} were in Tanzania.` : 'All of them were in Tanzania.' })()}${climbTop && busyTop && climbTop.region !== busyTop.region ? ` I went out most in ${busyTop.region}, and climbed most in ${climbTop.region}.` : climbTop ? ` ${climbTop.region} had the most outings and the most climbing.` : ''}`,
              book && !(NOTE.where && NOTE.where.p) ? (newRegs.length ? `${newRegs.length === 1 ? 'One region was' : `${cap(word(newRegs.length))} regions were`} new to my log this year: ${newRegs.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : 'No region of Tanzania was new to my log this year.') : '',
            ]}
            facts={[
              { l: nCountries === 1 ? 'country' : 'countries', v: n0(nCountries) },
              { l: r.regionCount === 1 ? 'region of Tanzania' : 'regions of Tanzania', v: n0(r.regionCount), hot: true },
              busyTop ? { l: `of the outings in Tanzania were in ${busyTop.region}`, v: `${pc(busyTop.n / tzN)}%` } : null,
              abroadN ? { l: 'outings outside Tanzania', v: n0(abroadN) } : null,
            ]}
            cap={`The darker a region, the bigger its share.${noGps ? ` ${n0(noGps)} outings had no place on the map, mostly indoors.` : ''}`}>
            <div className="yis-pair">
              <figure><figcaption>Where I went out</figcaption><TzShare rows={tzRows} measure="n" aria={`Map of Tanzania's regions in ${Y}, shaded by each region's share of my outings there.`} /></figure>
              <figure><figcaption>Where I climbed</figcaption><TzShare rows={tzRows} measure="elev" aria={`Map of Tanzania's regions in ${Y}, shaded by each region's share of my climbing there.`} /></figure>
            </div>
          </Sec>
        ) : null}

        {allStats.length > 1 && !book ? (
          <Sec n={num()} id="ys-rank" k="Against the other years" wide
            title={firsts.length ? `My best year for ${firsts[0].noun}.` : `${cap(ORD[rankKm - 1])} of ${years.length} for distance.`}
            text={[
              bestKmYear && bestKmYear.year !== Y ? `My best year for distance is still ${bestKmYear.year}, and this one reached ${pc(s.footKm / bestKmYear.footKm)}% of it.` : 'No other year has covered more distance on foot.',
            ]}
            cap="The orange dot is this year.">
            <RankBoard rows={rankRows} year={Y} partial={false} aria={`${Y} against the other years: ${rankRows.map((rw) => `${rw.label} ${rw.fmt(rw.values.find((v) => v.y === Y).v)}`).join(', ')}.`} />
          </Sec>
        ) : null}

        {book && (<>
        <hr className="rule rule--faint" />
        <StorySection
          id={idp('yis-rank')}
          eyebrow={`${num()} · Against the other years`}
          title={`${ORD[rankN - 1][0].toUpperCase() + ORD[rankN - 1].slice(1)} of ${years.length} years.`}
          statement={<>
            For distance on foot it comes {ORD[rankKm - 1]}, and for climbing {ORD[rankEl - 1]}{isPartial ? `, and it is not finished yet` : ''}.
          </>}
          odds={{
            title: ps ? `${Y} against ${prevYear}` : `${Y} among the years`,
            items: ps ? [
              { book: true, value: chg(s.n, ps.n) || 0, sign: true, label: 'outings', tone: (chg(s.n, ps.n) || 0) >= 0 ? 'move' : 'rest' },
              { book: true, value: chg(s.footKm, ps.footKm) || 0, sign: true, label: 'distance on foot', tone: (chg(s.footKm, ps.footKm) || 0) >= 0 ? 'move' : 'rest' },
              { book: true, value: chg(s.elev, ps.elev) || 0, sign: true, label: 'metres climbed', tone: (chg(s.elev, ps.elev) || 0) >= 0 ? 'move' : 'rest' },
              { book: true, value: chg(s.prs, ps.prs) || 0, sign: true, label: 'PRs', tone: (chg(s.prs, ps.prs) || 0) >= 0 ? 'move' : 'rest' },
            ] : [
              { num: rankN, unit: '', label: 'rank by outings', tone: 'move' },
              { num: rankKm, unit: '', label: 'rank by distance', tone: 'move' },
              { num: rankEl, unit: '', label: 'rank by climb', tone: 'move' },
              { book: true, num: years.length, unit: '', label: 'calendar years on record', tone: 'rest' },
            ],
          }}
          left={{ title: 'Outings, year by year', node: <YearRank series={rankSeries} selected={Y} fmt={(v) => fmtInt(v)} /> }}
          right={{
            title: ps ? vsPrevTitle(vsRows, prevYear) : 'The first year',
            node: ps ? (
              <YearVsPrev prevYear={prevYear} sameDay={psSame ? fmtDay(s.endISO) : null} rows={vsRows} />
            ) : <p className="yis-empty">{Y} is where my record starts.</p>,
          }}
          read={[
              `Every year of my record by its number of outings, with ${Y} in orange.`,
              ps ? `Every bar starts at the ${prevYear} total and points to ${Y}, with the ${Y} total at its tip. Orange went up, grey went down, and the longest bar changed the most. When one measure grew many times over, the scale counts in times as many.${psSame ? ` ${Y} is not finished, so the black mark shows where ${prevYear} stood on ${fmtDay(s.endISO)}.` : ''}` : 'The first year has no year before it to compare with.',
            ]}
          story={[
              `By hours moving it comes ${ORD[rankH - 1]}, by PRs ${ORD[rankP - 1]} and by kudos ${ORD[rankK - 1]}.`,
              bestKmYear && bestKmYear.year !== Y ? `Against my best year for distance, ${bestKmYear.year}, it covered ${pc(s.footKm / bestKmYear.footKm)}% as many kilometres on foot.` : `It is my best year for distance on foot.`,
              `For distance per outing on foot, it comes ${ORD[rankKpo - 1]} of the ${word(years.length)} years, at ${kmPerOut(s).toFixed(1)} km each.`,
            ]}
          source="Activity Log · yearly totals"
        />
        </>)}

        {!book && <Reveal as="section" className="yis-cta">
          <div className="yis-cta__row">
            {years.includes(Y - 1) && <button type="button" className="yis-cta__btn" onClick={() => { setPicked(Y - 1); scrollToTop() }}>&larr; {Y - 1}</button>}
            <button type="button" className="yis-cta__btn" onClick={scrollToTop}>Pick another year &uarr;</button>
            <Link className="yis-cta__btn" to={`/book/${Y}`}>Download {Y} as a book</Link>
            {years.includes(Y + 1) && <button type="button" className="yis-cta__btn" onClick={() => { setPicked(Y + 1); scrollToTop() }}>{Y + 1} &rarr;</button>}
          </div>
        </Reveal>}
      </div>
    </DetailFrame>
  )
}

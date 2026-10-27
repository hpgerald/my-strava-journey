import { useMemo } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import StorySection from '../components/StorySection.jsx'
import OddsRow from '../components/OddsRow.jsx'
import { Reveal, useInView } from '../components/Reveal.jsx'
import Chronicle from '../charts/Chronicle.jsx'
import HBars from '../charts/HBars.jsx'
import ColBars from '../charts/ColBars.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { buildChronicle } from '../lib/chronicle.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtShort = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]}` : '')
const fmtMon = (iso) => (iso ? `${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtMonth = (iso) => (iso ? `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const ORD = (n) => `${n.toLocaleString('en-US')}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const LANE = { mile: 'Milestone', first: 'First on foot', place: 'First trip to', region: 'New region', shoe: 'New shoes', streak: 'Streak' }

// the event rail: one block per year, every moment in date order
function YearBlock({ year, items }) {
  const [ref, inView] = useInView()
  return (
    <li ref={ref} className={`trail__year${inView ? ' is-in' : ''}`}>
      <p className="trail__y">{year}</p>
      <ol className="trail__list">
        {items.map((e, i) => (
          <li key={`${e.date}-${e.title}`} className={`trail__ev${e.now ? ' is-now' : ''}${e.silence ? ' is-gap' : ''}`} style={{ '--d': `${i * 50}ms` }}>
            <span className="trail__date mono">{fmtShort(e.date)}</span>
            <span className="trail__body">
              <span className="trail__kind"><i className={`msw msw--${e.silence ? 'quiet' : e.key}`} aria-hidden="true" />{e.silence ? 'Silence' : LANE[e.lane]}</span>
              <b className="trail__t">{e.title}</b>
              <span className="trail__s">{e.sub && /^\d{4}-\d\d-\d\d$/.test(e.sub.split(' ').pop()) ? e.sub.replace(/\d{4}-\d\d-\d\d$/, (d) => fmtDay(d)) : e.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </li>
  )
}

export default function Timeline() {
  const activities = useTable('activities')
  const geoRows = useTable('activity_geo')
  const gearRows = useTable('gear')
  const { prev, next } = useSectionPaging('/timeline')
  const C = useMemo(() => (activities.length ? buildChronicle(activities, geoRows, gearRows) : null), [activities, geoRows, gearRows])

  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'Timeline' }], number: '06', title: 'Timeline', subtitle: 'From my first upload to now', prev, next }
  if (!C) return <DetailFrame {...frame} />

  let secN = 0
  const num = () => ++secN
  const span = C.dayIdx(C.lastISO) - C.dayIdx(C.firstISO) + 1
  const S = C.silence
  const cur = C.streaks.find((s) => s.current)
  const lastYear = Number(C.lastISO.slice(0, 4))
  const so = C.lastISO.slice(5) < '12-31' ? ' so far' : ''
  const abroadN = new Set(C.stays.map((s) => s.raw)).size

  // ---- pace ----
  const steps = C.milestones.filter((m) => m.n > 1)
  const firstStep = steps[0]
  const later = steps.slice(1)
  const fastest = later.reduce((b, s) => (s.days < b.days ? s : b), later[0])
  const slowest = later.reduce((b, s) => (s.days > b.days ? s : b), later[0])
  const gapYears = Object.entries(C.yearGaps).map(([y, g]) => ({ year: Number(y), g }))
  const gapCap = 40

  // ---- firsts ----
  const F = C.firsts
  const dayOf = (iso) => C.dayIdx(iso) - C.dayIdx(C.firstISO) + 1
  const firstYears = [...new Set(C.events.map((e) => Number(e.date.slice(0, 4))))].sort((a, b) => a - b)
  const firstsBy = firstYears.map((y) => ({ year: y, n: F.filter((f) => f.date.slice(0, 4) === String(y)).length }))
  const lastFirst = F[F.length - 1]

  // ---- the rail ----
  const byYear = firstYears.map((y) => ({ year: y, items: C.events.filter((e) => e.date.slice(0, 4) === String(y)) }))

  return (
    <DetailFrame
      {...frame}
    >
      <div className="yis-report">
        {/* ===== the chronicle ===== */}
        <section className="sgrid yis-top" aria-labelledby="tl-title">
          <div className="sgrid__head">
            <p className="eyebrow">{fmtMon(C.firstISO)} to {fmtMon(C.lastISO)}</p>
            <h2 id="tl-title" className="section-head__title">No long gap since&nbsp;then.</h2>
          </div>
          <Reveal as="p" className="sgrid__statement">
            My log starts on {fmtDay(C.firstISO)}. After a few months I stopped, from {fmtMonth(S.start)} to {fmtMonth(S.end)}.
            {cur ? ` Now I have gone out ${n0(cur.len)} days in a row.` : ''}
            {' '}Along the way there were {word(F.length)} firsts on foot, {word(abroadN)} countries besides Tanzania, {C.regions.length} regions of
            Tanzania and {word(C.shoes.length)} pairs of shoes. The chart puts all of it on one line.
          </Reveal>
          <OddsRow
            title="The record in time"
            items={[
              { num: span, unit: ' days', label: 'from the first outing to the latest', tone: 'move' },
              { num: C.n, unit: '', label: 'outings in that time', tone: 'move' },
              { num: S.len, unit: ' days', label: `the silence, ${fmtMon(S.start)} to ${fmtMon(S.end)}`, tone: 'rest' },
              { num: C.maxAfter, unit: ' days', label: 'the longest break since', tone: 'move' },
            ]}
          />
          <Chronicle
            data={C}
            aria={`Chronicle of the record from ${fmtDay(C.firstISO)} to ${fmtDay(C.lastISO)}: ${C.events.map((e) => `${fmtDay(e.date)}, ${e.title}`).join('; ')}.`}
          />
          <ul className="chron__key" aria-hidden="true">
            <li><i className="chron__kdia" />every 500th outing, ticks every 250th</li>
            <li><i className="msw msw--tread" />treadmill run</li>
            <li><i className="msw msw--road" />outdoor run</li>
            <li><i className="msw msw--trail" />trail run</li>
            <li><i className="msw msw--walk" />walk</li>
            <li><i className="msw msw--hike" />hike</li>
            <li><i className="chron__ktrip" />a trip across the border</li>
            <li><i className="chron__kshoe" />a pair of shoes, black while still in use</li>
            <li><i className="chron__kstreak" />20 days or more in a row</li>
            <li><i className="chron__kgap" />30 days or more without an outing</li>
          </ul>
        </section>

        {/* ===== 1. pace ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="tl-pace"
          eyebrow={`${num()} · The pace`}
          title='Shorter breaks.'
          leftNote={<>The first bar includes the long gap, so it is cut off.</>}
          statement={<>
            The first 250 took much longer, because the long gap falls inside it. My breaks got shorter too. In {lastYear}{so}{' '}
            {C.yearGaps[String(lastYear)] ? `the longest has been ${n0(C.yearGaps[String(lastYear)])} days` : 'there has been no break at all'}.
          </>}
          odds={{
            title: 'Every 250 outings',
            items: [
              { num: firstStep.days, unit: ' days', label: `to the ${ORD(firstStep.n)}`, tone: 'rest' },
              { num: fastest.days, unit: ' days', label: `the quickest 250, to the ${ORD(fastest.n)}`, tone: 'move' },
              { num: slowest.days, unit: ' days', label: `the slowest since, to the ${ORD(slowest.n)}`, tone: 'rest' },
              { num: steps[steps.length - 1].days, unit: ' days', label: `to the ${ORD(steps[steps.length - 1].n)}, the latest`, tone: 'move' },
            ],
          }}
          left={{
            title: 'Days to each 250 outings',
            node: (
              <ColBars
                items={steps.map((s, i) => ({ label: ORD(s.n), short: s.n >= 1000 ? `${s.n / 1000}k` : String(s.n), value: Math.min(s.days, 400), display: n0(s.days), tone: i === 0 ? 'quiet' : s === fastest ? 'big' : 'mid' }))}
                max={440} ticks={[0, 100, 200, 300, 400]} yCap="days &uarr;" xCap="the outing reached &rarr;"
                aria={`Days taken to reach each 250 outings: ${steps.map((s) => `${ORD(s.n)} ${s.days} days`).join(', ')}.`}
              />
            ),
          }}
          right={{
            title: 'The longest break each year',
            node: (
              <ColBars
                items={gapYears.map((g) => ({ label: String(g.year), short: `'${String(g.year).slice(2)}`, value: Math.min(g.g, gapCap), display: `${n0(g.g)} d`, tone: g.g > gapCap || g.year <= 2020 ? 'quiet' : g.year === lastYear ? 'big' : 'mid' }))}
                max={gapCap * 1.12} ticks={[0, 10, 20, 30, 40]} yCap="days without an outing &uarr;"
                aria={`Longest break between outings each year: ${gapYears.map((g) => `${g.year} ${g.g} days`).join(', ')}.`}
              />
            ),
          }}
          source="Activity Log · dates of every 250th outing and of every gap between outings"
        />

        {/* ===== 2. firsts ===== */}
        <hr className="rule rule--faint" />
        <StorySection
          id="tl-firsts"
          eyebrow={`${num()} · Firsts`}
          title='From the treadmill to the hills.'
          statement={<>
            The early distance firsts all came on the treadmill: 10 km, the half marathon, 30 km and the marathon. The later ones
            came on trails, in the mountains and on long walks. Each new
            first needs a longer day or a steeper hill, so they come slowly now.
          </>}
          odds={{
            title: 'Firsts on foot',
            items: [
              { num: F.length, unit: '', label: 'firsts on foot', tone: 'move' },
              { num: F.filter((f) => f.mode === 'tread').length, unit: '', label: 'of them on the treadmill', tone: 'rest' },
              { num: Math.max(...firstsBy.map((y) => y.n)), unit: '', label: `in ${firstsBy.reduce((b, y) => (y.n > b.n ? y : b), firstsBy[0]).year}, the most in a year`, tone: 'move' },
              { num: (Date.parse(lastFirst.date) - Date.parse(F[0].date)) / (365.25 * 86400000), dec: 1, unit: ' years', label: 'from the first to the latest', tone: 'move' },
            ],
          }}
          left={{
            title: 'How long each first took',
            node: (
              <><ul className="fmap__legend tl-legend" aria-label="Colour key">
                {['tread', 'road', 'trail', 'walk', 'hike'].map((k) => <li key={k}><i className={`msw msw--${k}`} aria-hidden="true" />{({ tread: 'Treadmill run', road: 'Outdoor run', trail: 'Trail run', walk: 'Walk', hike: 'Hike' })[k]}</li>)}
              </ul>
              <HBars
                aria={`Firsts on foot: ${F.map((f) => `${f.title}, ${fmtDay(f.date)}`).join('; ')}.`}
                rows={F.map((f) => ({ key: f.mode, label: f.title, sub: `${f.detail} · day ${n0(dayOf(f.date))}`, value: dayOf(f.date), display: fmtMon(f.date) }))}
              /></>
            ),
          }}
          right={{
            title: 'Firsts each year',
            node: (
              <ColBars
                items={firstsBy.map((y) => ({ label: String(y.year), short: `'${String(y.year).slice(2)}`, value: y.n, display: String(y.n), tone: y.n === Math.max(...firstsBy.map((z) => z.n)) ? 'big' : y.n ? 'mid' : 'quiet' }))}
                ticks={[0, 1, 2, 3, 4]} yCap="firsts &uarr;"
                aria={`Firsts on foot each year: ${firstsBy.map((y) => `${y.year} ${y.n}`).join(', ')}.`}
              />
            ),
          }}
          source="Activity Log · the first outing on foot to pass each mark"
        />

        {/* ===== 3. every moment ===== */}
        <hr className="rule rule--faint" />
        <section className="sgrid" aria-labelledby="tl-rail">
          <div className="sgrid__head">
            <p className="eyebrow">{num()} · Year by year</p>
            <h2 id="tl-rail" className="section-head__title">{C.events.length} moments in {word(lastYear - Number(C.firstISO.slice(0, 4)) + 1)} years.</h2>
          </div>
          <ol className="trail">
            {byYear.map((y) => <YearBlock key={y.year} year={y.year} items={y.items} />)}
          </ol>
        </section>
      </div>
    </DetailFrame>
  )
}

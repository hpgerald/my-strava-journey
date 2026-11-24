import { useEffect, useMemo, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import { BookContext } from '../components/BookContext.js'
import YearInSport from './YearInSport.jsx'
import { CoverSide, BOOK_TITLE } from './Book.jsx'
import { YearRing } from '../charts/YearSet.jsx'
import { useTable } from '../context/DataContext.jsx'
import { computeYearStats, YEAR_THEME } from '../lib/yearStats.js'
import { buildYearReport } from '../lib/yearReport.js'
import { soFar } from '../lib/streakTarget.js'
import { numOf } from '../lib/chapters.js'

// A small book for one year: the Year in Sport chapter of My Book, printed on
// its own with a cover, a short note and a back cover. The same page prints to
// A4 pages; scripts/book_pdf.mjs --years renders one PDF a year into
// public/book/, and each year's page offers it for download.
export const yearPdfPath = (y) => `book/showing-up-${y}.pdf`

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')

export default function YearBook() {
  const { year } = useParams()
  const Y = Number(year)
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const years = useMemo(() => [...new Set(activities.map((a) => Number(a.year)).filter(Boolean))].sort((a, b) => a - b), [activities])
  const geoByKey = useMemo(() => { const m = {}; for (const g of activityGeo) m[g.activity_key] = g; return m }, [activityGeo])
  const first = useMemo(() => activities.reduce((m, a) => (!m || a.date < m ? a.date : m), ''), [activities])
  const last = useMemo(() => activities.reduce((m, a) => (a.date > m ? a.date : m), ''), [activities])
  const s = useMemo(() => (activities.length && years.includes(Y) ? computeYearStats(Y, activities, geoByKey) : null), [activities, years, Y, geoByKey])
  const r = useMemo(() => (s ? buildYearReport(Y, activities, geoByKey, first.slice(0, 10), last.slice(0, 10)) : null), [s, Y, activities, geoByKey, first, last])
  const [pdf, setPdf] = useState(null)
  const pdfUrl = `${import.meta.env.BASE_URL}${yearPdfPath(Y)}`

  useEffect(() => {
    document.title = `${Y} · Year in Sport · ${BOOK_TITLE} · My Strava Journey`
    let live = true
    fetch(pdfUrl, { method: 'HEAD' }).then((x) => { if (live) setPdf(x.ok && !/text\/html/.test(x.headers.get('content-type') || '')) }).catch(() => live && setPdf(false))
    return () => { live = false }
  }, [pdfUrl, Y])

  if (activities.length && !years.includes(Y)) return <Navigate to="/book" replace />
  const frame = { crumbs: [{ label: 'Home', to: '/' }, { label: 'My Book', to: '/book' }, { label: String(Y) }], number: numOf('/book'), title: `${Y} as a book`, subtitle: 'One year of the story, to keep' }
  if (!s || !r) return <DetailFrame {...frame} />

  const partial = Y === years[years.length - 1] && s.endISO.slice(5) < '12-31'
  const theme = soFar(YEAR_THEME[Y] || `${Y} in sport`, partial)
  const acts = activities.filter((a) => Number(a.year) === Y)
  return (
    <DetailFrame {...frame}>
      <div className="bk-bar">
        {pdf ? <a className="bk-btn bk-btn--main" href={pdfUrl} download>Download the PDF</a> : null}
        <button type="button" className={`bk-btn${pdf ? '' : ' bk-btn--main'}`} onClick={() => window.print()}>{pdf ? 'Print this book' : 'Print or save as PDF'}</button>
        <p className="bk-bar__note">A4 book{pdf ? '' : ': choose Save as PDF in the print dialog'}. Figures to {fmtDay(s.endISO)}. <Link to={`/numbers/${Y}`}>{Y} on the site</Link></p>
      </div>
      <BookContext.Provider value={{ bare: false }}>
        <article className="book book--year" aria-label={`${Y}, a book`}>
          <section className="bk-cover" aria-label="Cover">
            <div className="bk-cover__top">
              <p className="bk-cover__a">Gerald Tesha</p>
              <p className="bk-cover__k">Year in Sport</p>
            </div>
            <figure className="bk-cover__fig bk-cover__fig--ring">
              <YearRing year={Y} acts={acts} startISO={r.startISO} endISO={r.endISO} streak={{ len: s.streakLen, startISO: s.streakStartISO, endISO: s.streakEndISO }}
                aria={`Every day of ${Y} as a ring: ${n0(s.activeDays)} days with an outing, the longest run ${n0(s.streakLen)} days.`} />
              <figcaption className="bk-cover__cap">Every day of the year as a ring, a longer spoke for a bigger day.<span> The dark arc is my longest run of days in a row.</span></figcaption>
            </figure>
            <div className="bk-cover__base">
              <div className="bk-cover__tw"><h2 className="bk-cover__t">{Y}<span>.</span></h2><p className="bk-cover__theme">{theme}.</p></div>
              <CoverSide rows={[[n0(s.n), 'outings'], [n0(s.footKm), 'km on foot'], [n0(s.elev), 'metres climbed'], [n0(s.activeDays), 'days out']]} />
            </div>
          </section>

          <section className="bk-page bk-title" aria-label="About this book">
            <div className="bk-title__main">
              <p className="bk-title__t">{Y}<b>.</b></p>
              <p className="bk-title__s">{theme}</p>
              <p className="bk-title__a">Gerald Tesha</p>
            </div>
            <div className="bk-imprint">
              <p>This small book is the {Y} chapter of my book {BOOK_TITLE}, printed on its own. It covers every activity I logged in {Y}{partial ? `, up to ${fmtDay(s.endISO)}` : ''}: {n0(s.n)} of them.</p>
              <p>Every number comes from my Strava log, and every chart is drawn from it. Distance and climb only count my four sports on foot: runs, walks, trail runs and hikes. I took out activity names and exact locations before publishing.</p>
              <p>The whole story, all the years together, is on my website, My Strava Journey, and in the full book.</p>
            </div>
          </section>

          <div className="bk-yr">
            <BookContext.Provider value={{ bare: true }}>
              <YearInSport year={Y} />
            </BookContext.Provider>
          </div>

          <section className="bk-back" aria-label="Back cover">
            <p className="bk-back__q"><span>{n0(s.n)} outings.</span> <span>{n0(s.footKm)} km on foot.</span> <span>{Y}.</span></p>
            <p className="bk-back__a">{BOOK_TITLE} · Gerald Tesha</p>
          </section>
        </article>
      </BookContext.Provider>
    </DetailFrame>
  )
}

import { useEffect, useMemo, useState } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import { BookContext } from '../components/BookContext.js'
import Home from './Home.jsx'
import YearInSport from './YearInSport.jsx'
import Sports from './Sports.jsx'
import Records from './Records.jsx'
import Where from './Where.jsx'
import Timeline from './Timeline.jsx'
import Goals from './Goals.jsx'
import WhatItMeans from './WhatItMeans.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { buildBookFacts } from '../lib/bookFacts.js'

// My Book: the whole site set as one sports memoir. Every chapter is the real
// page rendered in book mode (no site chrome, every chart at its final state),
// framed by a cover, a title page, contents, a prologue, five part openers, an
// epilogue and a note on the data. The same page prints to an A4 book; a PDF of
// it is rendered at deploy time and offered for download.
export const BOOK_TITLE = 'Showing Up'
export const BOOK_SUB = 'Seven years on foot, told by my own data'
export const PDF_PATH = 'book/showing-up-gerald-tesha.pdf'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const fmtDay = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtShort = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const fmtMonth = (iso) => (iso ? `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => WORD[n] || String(n)
const SPORT = { Ride: 'ride', GravelRide: 'ride', Run: 'run', Walk: 'walk', TrailRun: 'trail run', Hike: 'hike' }

// the parts of the book and the chapters inside each
const PARTS = [
  { n: 'I', name: 'Part one', title: 'The habit', line: 'The whole record at once: how often I go out, when, where and in what.', chapters: [['01', 'The Journey']] },
  { n: 'II', name: 'Part two', title: 'Year by year', line: 'Each year read on its own, from the first quiet months to the year with no day off.', chapters: [['02', 'Year in Sport']] },
  { n: 'III', name: 'Part three', title: 'The work', line: 'The sports on foot, the records they set and the places they happened.', chapters: [['03', 'Sports'], ['04', 'Records'], ['05', 'Where']] },
  { n: 'IV', name: 'Part four', title: 'The long view', line: 'Everything in the order it happened, and the targets I hold every year against.', chapters: [['06', 'Timeline'], ['07', 'Goals']] },
  { n: 'V', name: 'Part five', title: 'The lessons', line: 'What I think seven years of logs taught me.', chapters: [['08', 'What It Means']] },
]

// glossary terms for measures this book never uses
const SKIP_TERMS = new Set(['Cadence', 'Heart-rate zones', 'Pace zones', 'Relative Effort score', 'Power zones'])

const jump = (id) => (e) => {
  e.preventDefault()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// every day from the first upload to the latest, as one thin mark: tall and dark
// for a day out (taller for more distance on foot), absent for a day without
function HabitBand({ days, streak }) {
  const n = days.length
  const maxKm = Math.max(1, ...days.map((d) => d.km))
  let ink = '', hot = ''
  days.forEach((d, i) => {
    if (!d.on) return
    const h = 18 + 82 * Math.sqrt(Math.min(d.km, maxKm) / maxKm)
    const seg = `M${i + 0.5} 100V${(100 - h).toFixed(1)}`
    if (i >= n - streak) hot += seg
    else ink += seg
  })
  return (
    <svg className="bk-band" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" aria-hidden="true">
      <path d={ink} className="bk-band__ink" />
      <path d={hot} className="bk-band__hot" />
    </svg>
  )
}

function Cover({ F }) {
  return (
    <section className="bk-cover" aria-label="Cover">
      <div className="bk-cover__top">
        <p className="bk-cover__k">A data-driven memoir</p>
        <p className="bk-cover__k">My Strava Journey</p>
      </div>
      <h2 className="bk-cover__t">Showing<br />Up.</h2>
      <p className="bk-cover__s">{BOOK_SUB}.</p>
      <HabitBand days={F.days} streak={F.streak} />
      <dl className="bk-cover__nums">
        <div><dt>outings</dt><dd>{n0(F.n)}</dd></div>
        <div><dt>km on foot</dt><dd>{n0(F.footKm)}</dd></div>
        <div><dt>metres climbed</dt><dd>{n0(F.footElev)}</dd></div>
        <div><dt>days in a row, still going</dt><dd>{n0(F.streak)}</dd></div>
      </dl>
      <div className="bk-cover__foot">
        <p className="bk-cover__a">Gerald Tesha</p>
        <p className="bk-cover__d">{fmtShort(F.firstISO)} to {fmtShort(F.lastISO)}</p>
      </div>
    </section>
  )
}

function TitlePage({ F }) {
  return (
    <section className="bk-page bk-title" aria-label="Title page">
      <div>
        <p className="bk-title__t">{BOOK_TITLE}</p>
        <p className="bk-title__s">{BOOK_SUB}</p>
        <p className="bk-title__a">Gerald Tesha</p>
      </div>
      <div className="bk-imprint">
        <p>This edition covers every activity I logged on Strava from {fmtDay(F.firstISO)} to {fmtDay(F.lastISO)}: {n0(F.n)} of them.</p>
        <p>Every number in this book is computed from that log, and every chart is drawn from the same rows. Distance and climb count my four sports on foot: runs, walks, trail runs and hikes. Activity names and exact locations were removed before publishing.</p>
        <p>This book is the website My Strava Journey set as one volume. On the site it is rebuilt from the data every time the page opens; the PDF is printed again whenever the data is refreshed, so each edition matches the site on the day it was made.</p>
      </div>
    </section>
  )
}

function Contents() {
  return (
    <section className="bk-page bk-toc" aria-labelledby="bk-toc-t">
      <h2 id="bk-toc-t" className="bk-head">Contents</h2>
      <ol className="bk-toc__list">
        <li className="bk-toc__front"><a href="#/book" onClick={jump('bk-prologue')}>Prologue</a></li>
        {PARTS.map((p) => (
          <li key={p.n} className="bk-toc__part">
            <a href="#/book" onClick={jump(`bk-part-${p.n}`)} className="bk-toc__pl"><span className="bk-toc__pn">{p.n}</span>{p.title}</a>
            <ol>
              {p.chapters.map(([num, t]) => (
                <li key={num}><a href="#/book" onClick={jump(`bk-ch-${num}`)}><span className="bk-toc__cn">{num}</span>{t}</a></li>
              ))}
            </ol>
          </li>
        ))}
        <li className="bk-toc__front"><a href="#/book" onClick={jump('bk-epilogue')}>Epilogue</a></li>
        <li className="bk-toc__front"><a href="#/book" onClick={jump('bk-notes')}>About the data</a></li>
      </ol>
    </section>
  )
}

function Prologue({ F }) {
  const firstWhat = SPORT[F.firstSport] || 'outing'
  return (
    <section className="bk-page bk-prose" id="bk-prologue" aria-labelledby="bk-pro-t">
      <h2 id="bk-pro-t" className="bk-head">Prologue</h2>
      <p className="bk-lead">
        I uploaded my first activity on {fmtDay(F.firstISO)}: {F.firstKm >= 1 ? `a ${n0(F.firstKm)} km ${firstWhat}` : `a ${firstWhat}`}. Over the next months I logged {n0(F.beforeSilence)} outings, most of them runs on a treadmill.
        Then my log went quiet for {n0(F.silence.len)} days, from {fmtMonth(F.silence.from)} to {fmtMonth(F.silence.to)}.
      </p>
      <p>
        When it came back, it didn&rsquo;t stop again. Since {fmtMonth(F.habitISO)} I&rsquo;ve gone out on {n0(F.habitActive)} of {n0(F.habitDays)} days, and the longest break has been {word(F.maxAfter)} days.
        As this edition closes, my streak stands at {n0(F.streak)} days in a row.
      </p>
      <p>
        This book is that record, read back. It&rsquo;s built from {n0(F.n)} activities and nothing else: {n0(F.footKm)} km on foot, {n0(F.footElev)} metres of climb and {n0(F.hours)} hours on the move, across {F.countries} countries and {F.regions} regions of Tanzania.
        Every number is computed from my Strava log, and every chart is drawn from the same rows. Where the log can&rsquo;t tell me why something happened, I say so.
      </p>
      <p>
        It runs in five parts. The first is the habit as a whole. The second goes through it year by year. The third takes the work apart: my sports, my records and the places I went.
        The fourth is the long view, the timeline and my goals. The last part is what I think it all means.
      </p>
    </section>
  )
}

function PartOpener({ p }) {
  return (
    <section className="bk-part" id={`bk-part-${p.n}`} aria-labelledby={`bk-part-${p.n}-t`}>
      <p className="bk-part__k">{p.name}</p>
      <p className="bk-part__n" aria-hidden="true">{p.n}</p>
      <h2 id={`bk-part-${p.n}-t`} className="bk-part__t">{p.title}</h2>
      <p className="bk-part__l">{p.line}</p>
      <ul className="bk-part__ch">
        {p.chapters.map(([num, t]) => <li key={num}><span>{num}</span>{t}</li>)}
      </ul>
    </section>
  )
}

// a chapter opener for the pages that do not carry their own frame
function Opener({ number, title, subtitle, lede }) {
  return (
    <header className="bk-open">
      <p className="bk-open__k">Chapter <b>{Number(number)}</b></p>
      <span className="bk-open__n" aria-hidden="true">{number}</span>
      <h2 id={`bk-ch-${number}-t`} className="bk-open__t">{title}</h2>
      {subtitle ? <p className="bk-open__s">{subtitle}</p> : null}
      {lede ? <p className="bk-open__lede">{lede}</p> : null}
    </header>
  )
}

function Epilogue({ F }) {
  return (
    <section className="bk-page bk-prose" id="bk-epilogue" aria-labelledby="bk-epi-t">
      <h2 id="bk-epi-t" className="bk-head">Epilogue</h2>
      <p className="bk-lead">
        The last activity in this edition is from {fmtDay(F.lastISO)}. My streak stands at {n0(F.streak)} days, and the habit that started in {F.habitISO.slice(0, 4)} has now run for {n0(F.habitDays)} days.
      </p>
      <p>
        None of the totals in this book came from one big effort. They came from {n0(F.n)} ordinary outings, most of them short, fitted in early in the morning or in the evening, on days that looked like any other.
        The record will keep growing after this edition, one day at a time, and the next edition will carry the new numbers.
      </p>
      <p>I&rsquo;ll be out tomorrow.</p>
      <p className="bk-sign">Gerald Tesha</p>
    </section>
  )
}

function Notes({ glossary }) {
  return (
    <section className="bk-page bk-notes" id="bk-notes" aria-labelledby="bk-notes-t">
      <h2 id="bk-notes-t" className="bk-head">About the data</h2>
      <div className="bk-notes__cols">
        <div>
          <h3>Where the numbers come from</h3>
          <p>Every activity comes from my Strava export: date and time, sport, distance, moving and elapsed time, climb, heart-rate effort, kudos and personal records. Places come from each activity&rsquo;s GPS start point, kept only to country and region.</p>
          <p>Distance and climb count the four sports on foot: runs, walks, trail runs and hikes. Rides, the gym and everything else count as outings and days out, but add no distance or climb.</p>
          <p>A treadmill session is one Strava marks as a trainer session. Those have no GPS, so they never appear on a map and set almost no segment records.</p>
          <h3>Colophon</h3>
          <p>Set in Archivo and Inter on a Swiss grid, with one accent colour, Strava orange, kept for the data. Charts are drawn by hand in SVG and canvas, without a chart library.</p>
        </div>
        <dl className="bk-gloss">
          {glossary.filter((g) => !SKIP_TERMS.has(g.term)).map((g) => (
            <div key={g.term}><dt>{g.term}</dt><dd>{g.definition}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function YearOpener({ y, partial }) {
  return (
    <div className="bk-year" id={`bk-year-${y}`}>
      <p className="bk-year__n">{y}</p>
      {partial ? <p className="bk-year__t">still running</p> : null}
    </div>
  )
}

export default function Book() {
  const activities = useTable('activities')
  const geo = useTable('activity_geo')
  const glossary = useTable('glossary')
  const { prev, next } = useSectionPaging('/book')
  const F = useMemo(() => (activities.length ? buildBookFacts(activities, geo) : null), [activities, geo])
  const years = useMemo(() => [...new Set(activities.map((a) => Number(a.year)).filter(Boolean))].sort((a, b) => a - b), [activities])
  const [pdf, setPdf] = useState(null)
  const pdfUrl = `${import.meta.env.BASE_URL}${PDF_PATH}`

  useEffect(() => {
    document.title = `My Book · ${BOOK_TITLE} · My Strava Journey`
    let live = true
    fetch(pdfUrl, { method: 'HEAD' }).then((r) => { if (live) setPdf(r.ok && !/text\/html/.test(r.headers.get('content-type') || '')) }).catch(() => live && setPdf(false))
    return () => { live = false }
  }, [pdfUrl])

  const frame = {
    crumbs: [{ label: 'Home', to: '/' }, { label: 'My Book' }],
    number: '09',
    title: 'My Book',
    subtitle: 'The whole story, as a book.',
    lede: 'Everything on this site, set as one book: a data-driven memoir of seven years on foot, in five parts, from the first upload to today. Read it here, or download it as a PDF.',
    prev,
    next,
  }
  if (!F) return <DetailFrame {...frame} />

  return (
    <DetailFrame {...frame}>
      <div className="bk-bar">
        {pdf ? (
          <a className="bk-btn bk-btn--main" href={pdfUrl} download>Download the PDF</a>
        ) : null}
        <button type="button" className={`bk-btn${pdf ? '' : ' bk-btn--main'}`} onClick={() => window.print()}>{pdf ? 'Print this book' : 'Print or save as PDF'}</button>
        <p className="bk-bar__note">A4 book{pdf ? '' : ': choose Save as PDF in the print dialog'}. Figures to {fmtDay(F.lastISO)}.</p>
      </div>

      <BookContext.Provider value={{ bare: false }}>
        <article className="book" aria-label={`${BOOK_TITLE}, a book`}>
          <Cover F={F} />
          <TitlePage F={F} />
          <Contents />
          <Prologue F={F} />

          <PartOpener p={PARTS[0]} />
          <section className="bk-ch" id="bk-ch-01" aria-labelledby="bk-ch-01-t">
            <div className="container">
              <Opener number="01" title="The Journey" subtitle="Seven years. One habit. The totals." lede="The whole habit at once: how the streak holds, how the distance spreads across my days, how each year was made, and six smaller things the data shows." />
            </div>
            <Home />
          </section>

          <PartOpener p={PARTS[1]} />
          <section className="bk-ch" id="bk-ch-02" aria-labelledby="bk-ch-02-t">
            <div className="container">
              <Opener number="02" title="Year in Sport" subtitle="One year at a time." lede={`Each year from ${years[0]} to ${years[years.length - 1]} as its own report: the months, how I moved, when, every day of the year, the typical outing, the maths, the biggest days and where it happened.`} />
            </div>
            {years.map((y) => (
              <div key={y} className="bk-yr">
                <YearOpener y={y} partial={y === years[years.length - 1] && F.lastISO.slice(5) < '12-31'} />
                <BookContext.Provider value={{ bare: true }}>
                  <YearInSport year={y} />
                </BookContext.Provider>
              </div>
            ))}
          </section>

          <PartOpener p={PARTS[2]} />
          <Sports />
          <Records />
          <Where />

          <PartOpener p={PARTS[3]} />
          <Timeline />
          <Goals />

          <PartOpener p={PARTS[4]} />
          <WhatItMeans />

          <Epilogue F={F} />
          <Notes glossary={glossary} />
          <section className="bk-back" aria-label="Back cover">
            <p className="bk-back__q">{n0(F.n)} outings. {n0(F.footKm)} km on foot. One habit.</p>
            <p className="bk-back__a">{BOOK_TITLE} · Gerald Tesha</p>
          </section>
        </article>
      </BookContext.Provider>
    </DetailFrame>
  )
}

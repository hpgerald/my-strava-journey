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

// The cover: every day from the first upload to the latest, wound into a spiral
// of one turn per year with 1 January at the top. A day out is a mark pointing
// outward, longer for more distance on foot; a day without leaves the thin
// calendar track bare, so the long silence reads as an empty stretch of track.
// The run of days still going is the only colour on the page.
const SP = { c: 540, r0: 66, ring: 48, min: 5, max: 29 }
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const turnOf = (iso, y0) => {
  const y = +iso.slice(0, 4)
  const doy = (Date.parse(iso + 'T00:00:00Z') - Date.UTC(y, 0, 1)) / 86400000
  return (y - y0) + doy / (isLeap(y) ? 366 : 365)
}
const DAYMS = 86400000
const isoDay = (i) => new Date(i * DAYMS).toISOString().slice(0, 10)
const polar = (t, r) => {
  const a = 2 * Math.PI * t
  return [SP.c + r * Math.sin(a), SP.c - r * Math.cos(a)]
}
const radius = (t) => SP.r0 + SP.ring * t
const f1 = (v) => v.toFixed(1)

function track(t0, t1) {
  let d = ''
  const steps = Math.max(2, Math.ceil((t1 - t0) * 360))
  for (let k = 0; k <= steps; k++) {
    const t = t0 + ((t1 - t0) * k) / steps
    const [x, y] = polar(t, radius(t))
    d += `${k ? 'L' : 'M'}${f1(x)} ${f1(y)}`
  }
  return d
}

function SpiralYears({ F }) {
  const y0 = +F.firstISO.slice(0, 4)
  const y1 = +F.lastISO.slice(0, 4)
  const maxKm = Math.max(1, ...F.days.map((d) => d.km))
  const n = F.days.length
  const rings = {}
  let hot = ''
  F.days.forEach((d, k) => {
    if (!d.on) return
    const iso = isoDay(d.i)
    const t = turnOf(iso, y0)
    const r = radius(t)
    const len = SP.min + (SP.max - SP.min) * Math.sqrt(d.km / maxKm)
    const [xa, ya] = polar(t, r)
    const [xb, yb] = polar(t, r + len)
    const seg = `M${f1(xa)} ${f1(ya)}L${f1(xb)} ${f1(yb)}`
    if (k >= n - F.streak) hot += seg
    else {
      const ring = Math.floor(t)
      rings[ring] = (rings[ring] || '') + seg
    }
  })
  const tA = turnOf(F.firstISO, y0)
  const tB = turnOf(F.lastISO, y0)
  const tS0 = turnOf(F.silence.from, y0)
  const tS1 = turnOf(F.silence.to, y0)
  const [sx, sy] = polar(tA, radius(tA))
  const [ex, ey] = polar(tB, radius(tB))
  // mark width follows the length of one day of track on each turn
  const w = (ring) => Math.min(3.2, Math.max(0.7, (0.62 * 2 * Math.PI * radius(ring + 0.5)) / 365.25))
  const years = []
  for (let y = y0 + 1; y <= y1; y++) years.push(y)
  const months = [['Jan', 0], ['Apr', 0.25], ['Jul', 0.5], ['Oct', 0.75]]
  const rOut = radius(y1 - y0 + 1) + 12
  return (
    <svg className="bk-spiral" viewBox="0 0 1080 1080" role="img"
      aria-label={`A spiral of every day from ${fmtShort(F.firstISO)} to ${fmtShort(F.lastISO)}, one turn per year. ${n0(F.n)} outings, a ${n0(F.silence.len)} day gap with none, and the last ${n0(F.streak)} days all out.`}>
      <path d={track(tA, tB)} className="bk-spiral__track" />
      <path d={track(tS0 + 0.004, tS1 - 0.004)} id="bk-silence" className="bk-spiral__gap" />
      {Object.entries(rings).map(([ring, d]) => (
        <path key={ring} d={d} className="bk-spiral__ink" style={{ strokeWidth: w(+ring) }} />
      ))}
      <path d={hot} className="bk-spiral__hot" style={{ strokeWidth: w(y1 - y0) }} />
      {years.map((y) => {
        const r = radius(y - y0)
        return <text key={y} x={SP.c + 6} y={SP.c - r + 13} className="bk-spiral__yr">{y}</text>
      })}
      {months.map(([m, t]) => {
        const [x, y] = polar(t, rOut + 26)
        return <text key={m} x={f1(x)} y={f1(y + 6)} textAnchor="middle" className="bk-spiral__mo">{m}</text>
      })}
      <text className="bk-spiral__note" dy="-9">
        <textPath href="#bk-silence" startOffset="50%" textAnchor="middle">{n0(F.silence.len)} days without one</textPath>
      </text>
      <circle cx={f1(sx)} cy={f1(sy)} r="5" className="bk-spiral__dot" />
      <text x={f1(sx + 12)} y={f1(sy + 5)} className="bk-spiral__lab">{fmtShort(F.firstISO)}</text>
      <circle cx={f1(ex)} cy={f1(ey)} r="6" className="bk-spiral__end" />
    </svg>
  )
}

function Cover({ F }) {
  return (
    <section className="bk-cover" aria-label="Cover">
      <div className="bk-cover__top">
        <p className="bk-cover__a">Gerald Tesha</p>
        <p className="bk-cover__k">A data-driven memoir</p>
      </div>
      <figure className="bk-cover__fig">
        <SpiralYears F={F} />
        <figcaption className="bk-cover__cap">
          Every day since my first upload, one turn per year. A mark is a day out, longer for more km on foot.
          <span> Orange: the {n0(F.streak)} days in a row still going.</span>
        </figcaption>
      </figure>
      <div className="bk-cover__base">
        <h2 className="bk-cover__t">Showing<br />Up<span>.</span></h2>
        <dl className="bk-cover__nums">
          <div><dt>outings</dt><dd>{n0(F.n)}</dd></div>
          <div><dt>km on foot</dt><dd>{n0(F.footKm)}</dd></div>
          <div><dt>metres climbed</dt><dd>{n0(F.footElev)}</dd></div>
          <div><dt>days in a row</dt><dd>{n0(F.streak)}</dd></div>
        </dl>
      </div>
      <div className="bk-cover__foot">
        <p className="bk-cover__d">{fmtShort(F.firstISO)} to {fmtShort(F.lastISO)}</p>
        <p className="bk-cover__d">My Strava Journey</p>
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
        <p>How the book was built is told in Annex A, and how to reach me is on the last page before the back cover.</p>
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
        <li className="bk-toc__front"><a href="#/book" onClick={jump('bk-made')}><span className="bk-toc__an">Annex A</span>How this book was made</a></li>
        <li className="bk-toc__front"><a href="#/book" onClick={jump('bk-notes')}><span className="bk-toc__an">Annex B</span>About the data</a></li>
        <li className="bk-toc__front"><a href="#/book" onClick={jump('bk-contact')}>Get in touch</a></li>
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

// the weekly pipeline, step by step, as drawn in Annex A
const PIPE = [
  ['Strava', 'Every outing I record lands in my Strava account.'],
  ['MCP pull', 'Each week the latest activities come out through an MCP server, as one raw CSV.'],
  ['Build', 'Python scripts rebuild the activity log and every table derived from it.'],
  ['Privacy', 'Names, Strava IDs and exact GPS points are removed. Places stay at country and region.'],
  ['Checks', 'Encoding, data rules, tests, accessibility and phone layouts are checked.'],
  ['Site', 'The React site reads the tables in the browser and draws every chart live.'],
  ['Book', 'The same pages print as this book, and a fresh PDF is made with each refresh.'],
]
const STACK = [
  ['Data source', 'My Strava activity history, pulled weekly through an MCP server'],
  ['Pipeline', 'Python, standard library only: rebuild, foot-only totals, derived tables, privacy pass'],
  ['Data store', `${32} CSV tables, the single source of truth for every number`],
  ['Site', 'React 18 and Vite 5, React Router with hash links, PapaParse to read the CSVs'],
  ['Charts', 'Drawn by hand in SVG and canvas, without a chart library'],
  ['Type and colour', 'Archivo and Inter on a Swiss grid, one accent colour, Strava orange, kept for data'],
  ['Quality', 'Data validation, tests, an axe accessibility audit and layout checks at phone widths'],
  ['Hosting', 'GitHub Pages, from the repository github.com/hpgerald/my-strava-journey'],
  ['Book', 'The site printed through headless Chromium to an A4 PDF'],
]

function HowMade({ F }) {
  return (
    <section className="bk-page bk-made" id="bk-made" aria-labelledby="bk-made-t">
      <p className="bk-annex">Annex A</p>
      <h2 id="bk-made-t" className="bk-head">How this book was made</h2>
      <p className="bk-lead">
        This book started as a website, My Strava Journey: my Strava history laid out so anyone can read it. Nothing in it is typed in by hand. Every figure is computed from my activity log, and the log is refreshed every week.
      </p>
      <div className="bk-made__cols">
        <div className="bk-prose">
          <p>
            Each week I pull my latest activities from Strava through an MCP server. MCP, the Model Context Protocol, is an open standard that lets an AI assistant connect to outside tools and data; here it connects to my Strava account and returns every activity as one raw CSV file.
          </p>
          <p>
            From that file a set of Python scripts rebuilds everything: the activity log, the totals on foot, the places, the streaks, the records and the tables behind each chart. A privacy pass removes activity names, Strava IDs and exact GPS points before anything is published. Then the checks run, and the site goes live with the new numbers. This edition holds {n0(F.n)} activities, up to {fmtDay(F.lastISO)}.
          </p>
          <p>
            I built it with Claude, Anthropic&rsquo;s AI model, as a coding and analysis partner. I set the questions, the design and the voice; Claude wrote the code, mined the data and checked each number against the log before it went into the text.
          </p>
        </div>
        <dl className="bk-stack">
          {STACK.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>
      <h3 className="bk-made__h">The weekly pipeline</h3>
      <ol className="bk-pipe">
        {PIPE.map(([k, v], i) => (
          <li key={k}><span className="bk-pipe__n">{String(i + 1).padStart(2, '0')}</span><b>{k}</b><span>{v}</span></li>
        ))}
      </ol>
    </section>
  )
}

const CONTACTS = [
  ['Email', 'hpgerald@gmail.com', 'mailto:hpgerald@gmail.com'],
  ['Phone', '+255 763 453 400', 'tel:+255763453400'],
  ['LinkedIn', 'linkedin.com/in/gtesha', 'https://www.linkedin.com/in/gtesha/'],
  ['Strava', 'strava.com/athletes/gtesha', 'https://www.strava.com/athletes/gtesha'],
  ['GitHub', 'github.com/hpgerald', 'https://github.com/hpgerald'],
  ['Website', 'hpgerald.github.io/my-strava-journey', 'https://hpgerald.github.io/my-strava-journey/'],
]

function Contact() {
  return (
    <section className="bk-page bk-contact" id="bk-contact" aria-labelledby="bk-contact-t">
      <p className="bk-annex">The author</p>
      <h2 id="bk-contact-t" className="bk-contact__t">Get in touch.</h2>
      <p className="bk-lead">
        I&rsquo;m Gerald Tesha. I work in monitoring, evaluation and data, and this book is what I do with my own numbers.
        If you&rsquo;d like a project like this built from your own data, want to work together, or would like to feature this story, I&rsquo;d be glad to hear from you.
      </p>
      <dl className="bk-contact__list">
        {CONTACTS.map(([k, v, href]) => (
          <div key={k}><dt>{k}</dt><dd><a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>{v}</a></dd></div>
        ))}
      </dl>
      <p className="bk-contact__note">Strava is a trademark of Strava, Inc. This is a personal project, not affiliated with or endorsed by Strava.</p>
    </section>
  )
}

function Notes({ glossary }) {
  return (
    <section className="bk-page bk-notes" id="bk-notes" aria-labelledby="bk-notes-t">
      <p className="bk-annex">Annex B</p>
      <h2 id="bk-notes-t" className="bk-head">About the data</h2>
      <div className="bk-notes__cols">
        <div>
          <h3>Where the numbers come from</h3>
          <p>Every activity comes from my Strava export: date and time, sport, distance, moving and elapsed time, climb, heart-rate effort, kudos and personal records. Places come from each activity&rsquo;s GPS start point, kept only to country and region.</p>
          <p>Distance and climb count the four sports on foot: runs, walks, trail runs and hikes. Rides, the gym and everything else count as outings and days out, but add no distance or climb.</p>
          <p>A treadmill session is one Strava marks as a trainer session. Those have no GPS, so they never appear on a map and set almost no segment records.</p>
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
          <HowMade F={F} />
          <Notes glossary={glossary} />
          <Contact />
          <section className="bk-back" aria-label="Back cover">
            <p className="bk-back__q">{n0(F.n)} outings. {n0(F.footKm)} km on foot. One habit.</p>
            <p className="bk-back__a">{BOOK_TITLE} · Gerald Tesha</p>
          </section>
        </article>
      </BookContext.Provider>
    </DetailFrame>
  )
}

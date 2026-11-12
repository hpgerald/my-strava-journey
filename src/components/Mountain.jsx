import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBook } from './BookContext.js'
import { BookLesson } from './BookStory.jsx'
import { MOUNTAINS } from '../lib/mountainList.js'
import { Link } from 'react-router-dom'
import Layout from './Layout.jsx'
import Container from './Container.jsx'
import Plate from './Plate.jsx'
import Gauge from './Gauge.jsx'
import { PHOTOS } from '../lib/photos.js'
import { numOf } from '../lib/chapters.js'
import { SITE_TITLE } from '../lib/siteTitle.js'
import { SceneH } from './SceneContext.js'
import ShareLink from './ShareLink.jsx'

// The three mountain chapters share one frame and each has its own ground,
// type and pace (styles/mountains.css). A chapter opens on a full screen in its
// own colour, then runs as bands: scenes on the golden grid, photographs, a
// night band where the story goes dark, and a door to the next mountain.
export { MOUNTAINS }

export default function Mountain({ id, standfirst, facts = [], hero, heroCaption, relief, gauge, children }) {
  const book = useBook()
  const i = MOUNTAINS.findIndex((m) => m.id === id)
  const me = MOUNTAINS[i]
  const others = MOUNTAINS.filter((m) => m.id !== id)
  useEffect(() => {
    if (book) return undefined
    document.title = `${me.name}: ${me.line} · My Strava Journey`
    // the bar over a dark threshold reads light (a light ground keeps the ink)
    if (me.dark) document.documentElement.setAttribute('data-mtn-dark', '')
    return () => { document.title = SITE_TITLE; document.documentElement.removeAttribute('data-mtn-dark') }
  }, [me, id, book])
  // in My Book a mountain is a chapter of its own: the opener, the standfirst,
  // four figures, then the same scenes as on the site, on paper
  if (book) {
    if (!standfirst) return null
    const num = numOf(me.to)
    return (
      <section className="bk-ch bk-mtn" id={`bk-ch-${num}`} aria-labelledby={`bk-ch-${num}-t`}>
        <Container>
          <header className="bk-open">
            <p className="bk-open__k">Chapter <b>{Number(num)}</b></p>
            <span className="bk-open__n" aria-hidden="true">{num}</span>
            <h2 id={`bk-ch-${num}-t`} className="bk-open__t">{me.name}</h2>
            <p className="bk-open__lede">{me.line}</p>
          </header>
          <p className="bk-mtn__s">{standfirst}</p>
          {facts.length ? (
            <dl className="bk-plate__facts">
              {facts.map((f) => (
                <div key={f.label}><dt>{f.label}</dt><dd>{f.value}{f.unit ? <span> {f.unit}</span> : null}</dd></div>
              ))}
            </dl>
          ) : null}
        </Container>
        {children}
      </section>
    )
  }
  return (
    <Layout>
      <article className={`mtn mtn--${id}`}>
        <header className="mtn-open" aria-labelledby="mtn-title">
          {relief ? <div className="mtn-open__relief">{relief}</div> : null}
          <Container className="mtn-open__in">
            <p className="mtn-open__k">Chapter {Number(numOf(me.to))} · The mountains<ShareLink slug={id} title={`${me.name} · Showing Up`} className="share--k" /></p>
            <h1 id="mtn-title" className="mtn-open__t">{me.name}</h1>
            <p className="mtn-open__l">{me.line}</p>
            <p className="mtn-open__s">{standfirst}</p>
            {facts.length ? (
              <dl className="mtn-facts">
                {facts.map((f) => (
                  <div key={f.label}><dt>{f.label}</dt><dd>{f.value}{f.unit ? <span> {f.unit}</span> : null}</dd></div>
                ))}
              </dl>
            ) : null}
          </Container>
        </header>
        {gauge ? <Gauge {...gauge} /> : null}
        {hero ? <Band><Plate slot={hero} ratio="16 / 9" caption={heroCaption} /></Band> : null}
        {children}
        <nav className="mtn-next" aria-label="More of the mountains">
          <Container>
            <p className="mtn-next__k">The other mountains</p>
            <ul className="mtn-next__list">
              {others.map((m) => (
                <li key={m.id}><Link to={m.to} className={`mtn-next__link mtn-next__link--${m.id}`}><b>{m.name}</b><span>{m.line}</span></Link></li>
              ))}
              <li><Link to="/records" className="mtn-next__link mtn-next__link--back"><b>Records</b><span>My longest, highest and hardest days</span></Link></li>
            </ul>
          </Container>
        </nav>
      </article>
    </Layout>
  )
}

// one band of the chapter, full width; `night` turns the ground dark
export function Band({ night, at, children }) {
  const book = useBook()
  // on paper there is no dark ground, and a band that holds only photographs
  // still to come is left out
  if (book) {
    const kids = Children.toArray(children).filter((c) => !isEmptyPhoto(c))
    if (!kids.length) return null
    return <div className="mtn-band bk-mtn__band"><Container>{kids}</Container></div>
  }
  return <section className={`mtn-band${night ? ' mtn-band--night' : ''}`} data-at={at == null ? undefined : JSON.stringify(at)}><Container>{children}</Container></section>
}

// a photograph slot with no file yet, or a pair of them
function isEmptyPhoto(c) {
  if (!isValidElement(c)) return false
  if (c.type === Plate) return !(PHOTOS[c.props.slot] || {}).file
  if (c.type === Plates) return Children.toArray(c.props.children).every(isEmptyPhoto)
  return false
}

// a scene on the golden grid: the words in the 38.2 %, the figure in the 61.8 %
// `read` is the longer how-to-read note My Book prints in place of `note`, and
// `lesson` asks the book for the design lesson of the figure
export function Scene({ label, title, children, foot, figTitle, fig, note, read, lesson }) {
  const book = useBook()
  // in the book a figure that is only a photograph still to come is left out
  const hasFig = !!fig && !(book && isEmptyPhoto(fig))
  const text = useRef(null)
  const figure = useRef(null)
  const [want, setWant] = useState(0)
  // when the words run longer than the figure, the figure grows to end with them
  useLayoutEffect(() => {
    const t = text.current, f = figure.current
    if (!t || !f || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const head = t.querySelector('.mtn-scene__head') || t
      const beside = f.getBoundingClientRect().left > head.getBoundingClientRect().left + 10
      if (!beside) { setWant(0); return }
      // on a wide screen the ledger runs under both columns, so only the words
      // above it set the height the figure should reach
      const kids = [...t.children].filter((k) => !k.classList.contains('mtn-scene__foot') || k.getBoundingClientRect().width < f.getBoundingClientRect().width)
      const gap = parseFloat(getComputedStyle(t).rowGap) || 0
      const words = kids.reduce((s, k) => s + k.getBoundingClientRect().height, 0) + gap * Math.max(0, kids.length - 1)
      const around = [...f.children].filter((k) => !k.hasAttribute('data-scene-chart')).reduce((s, k) => { const c = getComputedStyle(k); return s + k.getBoundingClientRect().height + parseFloat(c.marginTop) + parseFloat(c.marginBottom) }, 0)
      const next = Math.max(0, Math.round(words - around))
      setWant((prev) => (Math.abs(prev - next) > 2 ? next : prev))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ;[...t.children].forEach((k) => ro.observe(k))
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  return (
    <div className={`mtn-scene${hasFig ? '' : ' mtn-scene--text'}`}>
      <div className="mtn-scene__text" ref={text}>
        <div className="mtn-scene__head">
          {label ? <p className="mtn-scene__k">{label}</p> : null}
          <h2 className="mtn-scene__t">{title}</h2>
          {children}
        </div>
        {foot ? <div className="mtn-scene__foot">{foot}</div> : null}
      </div>
      {hasFig ? (
        <figure className="mtn-scene__fig" ref={figure}>
          {figTitle ? <p className="mtn-scene__ft">{figTitle}</p> : null}
          <div className="mtn-scene__chart" data-scene-chart><SceneH.Provider value={want}>{fig}</SceneH.Provider></div>
          {(book && read) || note ? <figcaption className="mtn-scene__note">{book && read ? read : note}</figcaption> : null}
          {book && lesson ? <BookLesson of={fig} /> : null}
        </figure>
      ) : null}
    </div>
  )
}

// a short ledger under the words of a scene: one row per stage, hour or trip
export function Ledger({ rows }) {
  return (
    <dl className="mtn-ledger">
      {rows.map((r) => (
        <div key={r.k}><dt>{r.k}</dt><dd><b>{r.v}</b>{r.sub ? <span>{r.sub}</span> : null}</dd></div>
      ))}
    </dl>
  )
}

// one fact at stage size and the line that goes with it
export function BigNumber({ value, unit, children }) {
  return (
    <div className="mtn-big">
      <p className="mtn-big__n">{value}{unit ? <span> {unit}</span> : null}</p>
      <p className="mtn-big__l">{children}</p>
    </div>
  )
}

// a Swahili saying with its meaning, set upright
export function Saying({ sw, children }) {
  return <p className="mtn-say"><span lang="sw">{sw}</span>{children}</p>
}

// two photographs side by side
export function Plates({ children }) {
  return <div className="mtn-plates">{children}</div>
}

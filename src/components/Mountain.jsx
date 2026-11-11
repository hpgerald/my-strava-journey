import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useBook } from './BookContext.js'
import { MOUNTAINS } from '../lib/mountainList.js'
import { Link } from 'react-router-dom'
import Layout from './Layout.jsx'
import Container from './Container.jsx'
import Plate from './Plate.jsx'
import { SITE_TITLE } from '../lib/siteTitle.js'
import { SceneH } from './SceneContext.js'

// The three mountain chapters share one frame and each has its own ground,
// type and pace (styles/mountains.css). A chapter opens on a full screen in its
// own colour, then runs as bands: scenes on the golden grid, photographs, a
// night band where the story goes dark, and a door to the next mountain.
export { MOUNTAINS }

export default function Mountain({ id, standfirst, facts = [], hero, heroCaption, plate, plateNote, children }) {
  const book = useBook()
  const i = MOUNTAINS.findIndex((m) => m.id === id)
  const me = MOUNTAINS[i]
  const others = [MOUNTAINS[(i + 1) % 3], MOUNTAINS[(i + 2) % 3]]
  useEffect(() => {
    if (book) return undefined
    document.title = `${me.name}: ${me.line} · My Strava Journey`
    // the bar over a dark threshold reads light (Hanang's ochre keeps the ink)
    if (id !== 'hanang') document.documentElement.setAttribute('data-mtn-dark', '')
    return () => { document.title = SITE_TITLE; document.documentElement.removeAttribute('data-mtn-dark') }
  }, [me, id, book])
  // in My Book a mountain is one plate: its name, what it was, the route as the
  // watch drew it and four figures
  if (book) {
    if (!standfirst) return null
    return (
      <section className="bk-page bk-plate" id={`bk-mtn-${id}`} aria-labelledby={`bk-mtn-${id}-t`}>
        <p className="bk-plate__k">The mountains · Plate {i + 1} of 3</p>
        <h2 id={`bk-mtn-${id}-t`} className="bk-plate__t">{me.name}</h2>
        <p className="bk-plate__l">{me.line}</p>
        <p className="bk-plate__s">{standfirst}</p>
        {plate ? (
          <figure className="bk-plate__fig">
            {plate}
            {plateNote ? <figcaption>{plateNote}</figcaption> : null}
          </figure>
        ) : null}
        {facts.length ? (
          <dl className="bk-plate__facts">
            {facts.map((f) => (
              <div key={f.label}><dt>{f.label}</dt><dd>{f.value}{f.unit ? <span> {f.unit}</span> : null}</dd></div>
            ))}
          </dl>
        ) : null}
      </section>
    )
  }
  return (
    <Layout>
      <article className={`mtn mtn--${id}`}>
        <header className="mtn-open" aria-labelledby="mtn-title">
          <Container className="mtn-open__in">
            <p className="mtn-open__k">The mountains · {i + 1} of 3</p>
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
export function Band({ night, children }) {
  return <section className={`mtn-band${night ? ' mtn-band--night' : ''}`}><Container>{children}</Container></section>
}

// a scene on the golden grid: the words in the 38.2 %, the figure in the 61.8 %
export function Scene({ label, title, children, foot, figTitle, fig, note }) {
  const text = useRef(null)
  const figure = useRef(null)
  const [want, setWant] = useState(0)
  // when the words run longer than the figure, the figure grows to end with them
  useLayoutEffect(() => {
    const t = text.current, f = figure.current
    if (!t || !f || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const beside = f.getBoundingClientRect().left > t.getBoundingClientRect().left + 10
      if (!beside) { setWant(0); return }
      const kids = [...t.children]
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
    <div className={`mtn-scene${fig ? '' : ' mtn-scene--text'}`}>
      <div className="mtn-scene__text" ref={text}>
        <div className="mtn-scene__head">
          {label ? <p className="mtn-scene__k">{label}</p> : null}
          <h2 className="mtn-scene__t">{title}</h2>
          {children}
        </div>
        {foot ? <div className="mtn-scene__foot">{foot}</div> : null}
      </div>
      {fig ? (
        <figure className="mtn-scene__fig" ref={figure}>
          {figTitle ? <p className="mtn-scene__ft">{figTitle}</p> : null}
          <div className="mtn-scene__chart" data-scene-chart><SceneH.Provider value={want}>{fig}</SceneH.Provider></div>
          {note ? <figcaption className="mtn-scene__note">{note}</figcaption> : null}
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

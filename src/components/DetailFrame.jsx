import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from './Layout.jsx'
import Container from './Container.jsx'
import FieldNote from './FieldNote.jsx'
import { useBook } from './BookContext.js'

// Which chapters carry a distinct atmosphere (a faint page wash + tinted
// watermark). The rest keep the base warm-paper / orange identity.
const CHAPTER_ATMO = { '/where': 'where' }

// One frame for every detail page: breadcrumb, big header, content, prev/next paging.
// `number` shows the 01..09 index for top-level sections; omit it for sub-item pages.
export default function DetailFrame({ crumbs = [], number, title, subtitle, lede, children, prev, next }) {
  const location = useLocation()
  const book = useBook()
  useEffect(() => {
    if (book) return undefined
    document.title = title ? `${title} · My Strava Journey` : 'My Strava Journey'
    return () => {
      document.title = 'My Strava Journey · Seven Years of Training, Read as Data'
    }
  }, [title])
  useEffect(() => {
    if (book) return undefined
    const base = '/' + (location.pathname.split('/')[1] || '')
    const atmo = CHAPTER_ATMO[base]
    if (atmo) document.body.setAttribute('data-chapter', atmo)
    else document.body.removeAttribute('data-chapter')
    return () => document.body.removeAttribute('data-chapter')
  }, [location.pathname])

  // inside My Book: the chapter opener, the content and the logbook note as an
  // epigraph; no breadcrumb and no paging. `bare` prints the content alone.
  if (book) {
    const seed = BOOK_SEED[number] || location.pathname
    if (book.bare) return <Container>{children}</Container>
    return (
      <section className="bk-ch" id={`bk-ch-${number}`} aria-labelledby={`bk-ch-${number}-t`}>
        <Container>
          <header className="bk-open">
            <p className="bk-open__k">Chapter <b>{Number(number)}</b></p>
            <span className="bk-open__n" aria-hidden="true">{number}</span>
            <h2 id={`bk-ch-${number}-t`} className="bk-open__t">{title}</h2>
            {subtitle ? <p className="bk-open__s">{subtitle}</p> : null}
            {lede ? <p className="bk-open__lede">{lede}</p> : null}
          </header>
          {children}
          <FieldNote seed={seed} align="wide" />
        </Container>
      </section>
    )
  }

  return (
    <Layout>
      <section className={`sopen${number ? '' : ' sopen--sub'}`} aria-labelledby="sopen-title">
        <div className="sopen__in">
          <div className="sopen__top">
            <nav aria-label="Breadcrumb" className="crumbs sopen__crumbs">
              <ol>
                {crumbs.map((c, i) => (
                  <li key={i}>
                    {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
            {number ? <p className="sopen__k">/ Chapter {number}</p> : null}
          </div>
          {number ? <span className="sopen__num" aria-hidden="true" data-speed="0.18">{number}</span> : null}
          <h1 id="sopen-title" className="sopen__t">
            <span className="visually-hidden">{title}</span>
            <span aria-hidden="true">
              {String(title || '').split(' ').map((w, wi, ws) => (
                <span key={wi} className="sopen__w">
                  {[...w].map((ch, ci) => <span key={ci} className="sopen__ch" style={{ '--i': wi * 4 + ci }}>{ch}</span>)}
                  {wi < ws.length - 1 ? '\u00a0' : ''}
                </span>
              ))}
            </span>
          </h1>
          <div className="sopen__foot">
            {subtitle ? <p className="sopen__sub">{subtitle}</p> : <span />}
            {lede ? <p className="sopen__lede">{lede}</p> : null}
            <span className="sopen__cue" aria-hidden="true">Scroll <i>↓</i></span>
          </div>
        </div>
      </section>

      <Container>
        {children}

        <FieldNote seed={location.pathname} align="wide" />

        {(prev || next) && (
          <nav aria-label="Pagination" className="prevnext sturn">
            <PagingLink item={prev} dir="prev" />
            <PagingLink item={next} dir="next" />
          </nav>
        )}
      </Container>
    </Layout>
  )
}

// the logbook note each chapter carries on the site, kept for its book chapter
const BOOK_SEED = { '02': '/numbers', '03': '/sports', '04': '/records', '05': '/where', '06': '/timeline', '07': '/goals', '08': '/what-it-means' }

export function PagingLink({ item, dir }) {
  if (!item) return <span className="sturn__gap" />
  const isNext = dir === 'next'
  return (
    <Link to={item.to} className={`sturn__link sturn__link--${dir}`} data-cursor={isNext ? 'Next' : 'Back'}>
      <span className="sturn__k">{isNext ? '/ Next chapter' : '/ Previous chapter'}</span>
      <span className="sturn__row">
        {item.number ? <span className="sturn__num">{item.number}</span> : null}
        <span className="sturn__title">{item.label}</span>
        <span className="sturn__arrow" aria-hidden="true">{isNext ? '→' : '←'}</span>
      </span>
      {item.subtitle ? <span className="sturn__sub">{item.subtitle}</span> : null}
    </Link>
  )
}

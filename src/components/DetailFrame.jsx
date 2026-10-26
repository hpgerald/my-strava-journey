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
      <Container>
        <nav aria-label="Breadcrumb" className="crumbs" style={{ paddingTop: 'var(--sp-6)' }}>
          <ol
            className="mono"
            style={{
              listStyle: 'none',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5ch',
              margin: 0,
              padding: 0,
              fontSize: 'var(--fs-2xs)',
              letterSpacing: 'var(--tr-wide)',
              textTransform: 'uppercase',
              color: 'var(--fg-faint)',
            }}
          >
            {crumbs.map((c, i) => (
              <li key={i}>
                {c.to ? (
                  <Link to={c.to} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
                {i < crumbs.length - 1 ? <span aria-hidden="true"> / </span> : null}
              </li>
            ))}
          </ol>
        </nav>

        <header className="section-head detail-head" style={{ paddingTop: 'var(--sp-4)' }}>
          <div className="detail-head__main">
            {number ? (
              <div className="chapter">
                <span className="chapter__ghost" aria-hidden="true" data-num={number} />
                <p className="chapter__kicker">
                  Chapter&nbsp;<b>{number}</b>
                </p>
                <h1 className="section-head__title">{title}</h1>
                {subtitle ? (
                  <p className="text-muted" style={{ fontSize: 'var(--fs-md)', marginTop: 'var(--sp-2)' }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <h1 className="section-head__title">{title}</h1>
                {subtitle ? (
                  <p className="text-muted" style={{ fontSize: 'var(--fs-md)', marginTop: 'var(--sp-2)' }}>
                    {subtitle}
                  </p>
                ) : null}
              </>
            )}
          </div>
          {lede ? (
            <p className="detail-head__lede" style={{ fontSize: 'var(--fs-md)' }}>
              {lede}
            </p>
          ) : null}
        </header>

        {children}

        <FieldNote seed={location.pathname} align="wide" />

        {(prev || next) && (
          <>
            <hr className="rule" style={{ marginTop: 0 }} />
            <nav aria-label="Pagination" className="prevnext">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <PagingLink item={prev} dir="prev" />
                <PagingLink item={next} dir="next" />
              </div>
            </nav>
          </>
        )}
      </Container>
    </Layout>
  )
}

// the logbook note each chapter carries on the site, kept for its book chapter
const BOOK_SEED = { '02': '/numbers', '03': '/sports', '04': '/records', '05': '/where', '06': '/timeline', '07': '/goals', '08': '/what-it-means' }

export function PagingLink({ item, dir }) {
  if (!item) return <span />
  const isNext = dir === 'next'
  return (
    <Link
      to={item.to}
      className={`u-invert chapterturn chapterturn--${dir}`}
      style={{
        textAlign: isNext ? 'right' : 'left',
        borderRight: isNext ? 'none' : '1px solid var(--rule)',
      }}
    >
      <span className="chapterturn__eyebrow">
        {isNext ? 'Next chapter →' : '← Previous chapter'}
      </span>
      <span className="chapterturn__row">
        {item.number ? <span className="chapterturn__num">{item.number}</span> : null}
        <span className="chapterturn__title">{item.label}</span>
      </span>
      {item.subtitle ? <span className="chapterturn__sub">{item.subtitle}</span> : null}
    </Link>
  )
}

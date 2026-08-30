import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from './Layout.jsx'
import Container from './Container.jsx'

// One frame for every detail page: breadcrumb, big header, content, prev/next paging.
// `number` shows the 01..09 index for top-level sections; omit it for sub-item pages.
export default function DetailFrame({ crumbs = [], number, title, subtitle, lede, children, prev, next }) {
  useEffect(() => {
    document.title = title ? `${title} · My Strava Journey` : 'My Strava Journey'
    return () => {
      document.title = 'My Strava Journey · Seven Years of Training, Read as Data'
    }
  }, [title])
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
              <div className="mono" style={{ fontSize: 'var(--fs-lg)', color: 'var(--fg-muted)' }}>
                {number}
              </div>
            ) : null}
            <h1 className="section-head__title">{title}</h1>
            {subtitle ? (
              <p className="text-muted" style={{ fontSize: 'var(--fs-md)', marginTop: 'var(--sp-2)' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {lede ? (
            <p className="detail-head__lede" style={{ fontSize: 'var(--fs-md)' }}>
              {lede}
            </p>
          ) : null}
        </header>

        {children}

        {(prev || next) && (
          <>
            <hr className="rule" style={{ marginTop: 'var(--sp-8)' }} />
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

function PagingLink({ item, dir }) {
  const align = dir === 'next' ? 'right' : 'left'
  if (!item) return <span />
  return (
    <Link
      to={item.to}
      className="u-invert"
      style={{
        display: 'block',
        padding: 'var(--sp-5) var(--sp-4)',
        textAlign: align,
        borderRight: dir === 'prev' ? '1px solid var(--rule)' : 'none',
      }}
    >
      <span className="eyebrow" style={{ display: 'block', color: 'inherit', opacity: 0.7 }}>
        {dir === 'prev' ? '← Previous' : 'Next →'}
      </span>
      <span
        className="display"
        style={{ display: 'block', fontSize: 'var(--fs-lg)', marginTop: 4 }}
      >
        {item.label}
      </span>
    </Link>
  )
}

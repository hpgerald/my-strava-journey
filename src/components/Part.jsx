import Container from './Container.jsx'
import ShareLink from './ShareLink.jsx'

// A part of the story on the home page. The story runs in time order, and each
// part opens with its number, its years, its name and one line, then holds the
// years and the findings that belong to it. `spine` is the short year the page
// map shows for the part. `story` is a few plain sentences of what happened.
export default function Part({ n, name, years, spine, from, to, line, story, night, children }) {
  return (
    <section className={`spart${night ? ' spart--night' : ''}`} id={`part-${n}`} aria-labelledby={`part-${n}-t`} data-spine={spine} data-from={from} data-to={to}>
      <Container>
        <header className="spart__head" data-fx="">
          <p className="spart__k">Part {n} · {years}<ShareLink slug={`part-${n}`} title={`${name} · Showing Up`} className="share--k" /></p>
          <span className="spart__n" aria-hidden="true">{n}</span>
          <h2 id={`part-${n}-t`} className="spart__t">{name}</h2>
          {line ? <p className="spart__l">{line}</p> : null}
          {story && story.length ? <div className="spart__s">{story.map((t, i) => <p key={i}>{t}</p>)}</div> : null}
        </header>
      </Container>
      {children}
    </section>
  )
}

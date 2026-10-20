import { Reveal } from './Reveal.jsx'
import OddsRow from './OddsRow.jsx'

// The home page section recipe, in one place: eyebrow and insight headline, a
// full-width statement with the numbers, a four-cell number row, two figures side
// by side at equal size with a note under each, anything extra (children), then
// the source line. Everything sits on the shared four-column grid.
// keep the last two words together so a wrapped headline never ends on one word
const tie = (t) => (typeof t === 'string' ? t.replace(/ (\S+)$/, '\u00A0$1') : t)

export default function StorySection({ id, eyebrow, title, statement, odds, left, right, leftNote, rightNote, source, children }) {
  return (
    <section className="sgrid" aria-labelledby={id}>
      <div className="sgrid__head">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="section-head__title">{tie(title)}</h2>
      </div>

      <Reveal as="p" className="sgrid__statement">{statement}</Reveal>

      {odds && <OddsRow title={odds.title} items={odds.items} />}

      <div className="sgrid__pair">
        <figure className="sgrid__fig sgrid__fig--chart">
          <figcaption className="sgrid__figtitle">{left.title}</figcaption>
          <div className="sgrid__chart">{left.node}</div>
        </figure>
        <figure className="sgrid__fig sgrid__fig--mx">
          <figcaption className="sgrid__figtitle">{right.title}</figcaption>
          <div className="sgrid__chart">{right.node}</div>
        </figure>
        <p className="sgrid__note sgrid__note--chart">{leftNote}</p>
        <p className="sgrid__note sgrid__note--mx">{rightNote}</p>
      </div>

      {children}

      <p className="source">Source: {source}</p>
    </section>
  )
}

import { Reveal } from './Reveal.jsx'
import OddsRow from './OddsRow.jsx'
import BookStory, { BookRead } from './BookStory.jsx'

// The home page section recipe, in one place: eyebrow and insight headline, a
// full-width statement with the numbers, a four-cell number row, two figures side
// by side at equal size with a note under each, anything extra (children), then
// the source line. Everything sits on the shared four-column grid.
// keep the last two words together so a wrapped headline never ends on one word
const tie = (t) => (typeof t === 'string' ? t.replace(/ (\S+)$/, '\u00A0$1') : t)

export default function StorySection({ id, eyebrow, title, sub, statement, odds, left, right, leftNote, rightNote, source, read, story, children }) {
  return (
    <section className="sgrid" aria-labelledby={id}>
      <div className="sgrid__head">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="section-head__title">{tie(title)}</h2>
        {sub && <p className="section-head__sub">{sub}</p>}
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
        {leftNote ? <p className="sgrid__note sgrid__note--chart">{leftNote}</p> : null}
        {rightNote ? <p className="sgrid__note sgrid__note--mx">{rightNote}</p> : null}
      </div>

      {children}

      {read ? <BookRead items={[[left.title, read[0]], [right.title, read[1]]]} /> : null}
      <BookStory>{story}</BookStory>
    </section>
  )
}

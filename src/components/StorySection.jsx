import { Reveal } from './Reveal.jsx'
import Eyebrow from './Eyebrow.jsx'
import Words from './Words.jsx'
import OddsRow from './OddsRow.jsx'
import BookStory, { BookRead } from './BookStory.jsx'
import { useRef } from 'react'
import { useSectionVariant } from './SectionCount.js'

// The home page section recipe, in one place: eyebrow and insight headline, a
// full-width statement with the numbers, a four-cell number row, two figures side
// by side at equal size with a note under each, anything extra (children), then
// the source line. Everything sits on the shared twelve-column grid, and the
// section's place on the page picks its layout (see SectionCount.js).
// keep the last two words together so a wrapped headline never ends on one word
const tie = (t) => (typeof t === 'string' ? t.replace(/ (\S+)$/, '\u00A0$1') : t)

export default function StorySection({ id, eyebrow, title, sub, statement, odds, left, right, leftNote, rightNote, source, read, story, children, variant: want }) {
  const ref = useRef(null)
  const variant = useSectionVariant(ref, want, !!odds)
  return (
    <section ref={ref} className={`sgrid sgrid--${variant}`} aria-labelledby={id} data-turn={want ? undefined : ''}>
      <div className="sgrid__head">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className="section-head__title"><Words>{tie(title)}</Words></h2>
        {sub && <p className="section-head__sub">{sub}</p>}
      </div>

      <div className="sgrid__lead">
        <Reveal as="p" className="sgrid__statement">{statement}</Reveal>
        {odds && <OddsRow title={odds.title} items={odds.items} />}
      </div>

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

      <BookRead items={[[left.title, read && read[0], left.lesson || left.node], [right.title, read && read[1], right.lesson || right.node]]} />
      <BookStory>{story}</BookStory>
    </section>
  )
}

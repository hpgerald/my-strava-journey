import { pickFieldNote } from '../lib/fieldNotes.js'
import { useInView } from './Reveal.jsx'

// A quiet margin note drawn from Gerald's own activity descriptions. One is
// picked per page from a stable seed, so each page carries a different line.
// `seed` is usually the route path; `offset` lets a long page place a second.
// align: 'wide' (the default, a full-width row on the section grid like the
// section headlines), 'center' or 'left'.
export default function FieldNote({ seed, offset = 0, align = 'wide' }) {
  const [root, inView] = useInView()
  const note = pickFieldNote(seed, offset)
  if (!note) return null
  return (
    <figure ref={root} className={`fieldnote fieldnote--${align}${inView ? ' is-in' : ''}`}>
      <p className="fieldnote__eyebrow">From the logbook</p>
      <blockquote className="fieldnote__quote">{String(note.text).replace(/ (\S+)$/, '\u00A0$1')}</blockquote>
      {note.author ? <figcaption className="fieldnote__by">{note.author}</figcaption> : null}
    </figure>
  )
}

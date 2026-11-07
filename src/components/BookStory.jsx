import { useBook } from './BookContext.js'
import { lessonKeysFor, LessonSlot } from '../lib/vizLessons.jsx'
import { BOOK_INTROS } from '../lib/bookIntros.js'

// The longer story behind a section, printed only in My Book, where the page
// has room for it. Takes one paragraph or a list of them.
export default function BookStory({ children, title = 'The story' }) {
  const book = useBook()
  if (!book || !children) return null
  const paras = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (!paras.length) return null
  return (
    <div className="bk-story">
      <p className="bk-story__k">{title}</p>
      <div className="bk-story__body">
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </div>
  )
}

// How to read each chart of a section, printed only in My Book, one note under
// each chart, with the design lesson the chart teaches under its note (see
// lib/vizLessons.jsx). items: [[chart title, text, chart node?], ...]
export function BookRead({ items }) {
  const book = useBook()
  if (!book || !items) return null
  const rows = items.map((x) => (x ? { t: x[0], text: x[1], keys: x[2] ? lessonKeysFor(x[2]) : [] } : null))
  if (!rows.some((r) => r && (r.text || r.keys.length))) return null
  return (
    <div className="bk-read">
      {rows.map((r, i) => (r && (r.text || r.keys.length) ? (
        <div key={i} className="bk-read__item">
          {r.text ? <p className="bk-read__k">How to read · {r.t}</p> : <span />}
          {r.text ? <p className="bk-read__t">{r.text}</p> : <span />}
          {r.keys.length ? <LessonSlot keys={r.keys} /> : <span />}
        </div>
      ) : <div key={i} />))}
    </div>
  )
}

// a lone lesson for a chart outside a pair, printed only in My Book
export function BookLesson({ of }) {
  const book = useBook()
  if (!book || !of) return null
  return <LessonSlot keys={lessonKeysFor(of)} />
}

// the opening essay of a chapter, printed only in My Book
export function BookIntro({ number }) {
  const book = useBook()
  const x = BOOK_INTROS[number]
  if (!book || !x) return null
  return (
    <div className="bk-intro">
      <div className="bk-intro__body">
        {x.paras.map((p, i) => <p key={i} className={i ? '' : 'bk-intro__first'}>{p}</p>)}
      </div>
      {x.design ? (
        <aside className="bk-intro__design">
          <p className="bk-lesson__k">The design of this chapter</p>
          <p>{x.design}</p>
        </aside>
      ) : null}
    </div>
  )
}

import { useBook } from './BookContext.js'

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
// each chart. items: [[chart title, text], ...]
export function BookRead({ items }) {
  const book = useBook()
  if (!book || !items || !items.some((x) => x && x[1])) return null
  return (
    <div className="bk-read">
      {items.map((x, i) => (x && x[1] ? (
        <div key={i} className="bk-read__item">
          <p className="bk-read__k">How to read · {x[0]}</p>
          <p className="bk-read__t">{x[1]}</p>
        </div>
      ) : <div key={i} />))}
    </div>
  )
}

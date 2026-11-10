import { useLayoutEffect, useRef } from 'react'
import { useBook } from './BookContext.js'
import { getLessons } from '../lib/lessonsRegistry.js'
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
  const L = getLessons()
  if (!book || !items || !L) return null
  const { lessonKeysFor, LessonSlot } = L
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
  const L = getLessons()
  if (!book || !of || !L) return null
  return <L.LessonSlot keys={L.lessonKeysFor(of)} />
}

// The design note beside the opening essay ends on the essay's last line: its
// text is set as large as it can be, up to one step of phi above the essay's
// own size, without running past the essay. When the two stack (a narrow
// screen) the note keeps the essay's size.
function useEndTogether(bodyRef, boxRef) {
  useLayoutEffect(() => {
    const body = bodyRef.current, box = boxRef.current
    if (!body || !box) return undefined
    const t = box.lastElementChild
    // measured as it is set: no transition may hold the old size (the reduced
    // motion rule leaves a 0.01 ms one on everything)
    t.style.transition = 'none'
    let busy = false
    const fit = () => {
      if (busy) return
      busy = true
      t.style.fontSize = ''
      const b = body.getBoundingClientRect(), x = box.getBoundingClientRect()
      if (x.top > b.top + 4 || x.left < b.right) { busy = false; return }
      const pad = parseFloat(getComputedStyle(box).paddingBottom) || 0
      const room = b.bottom - pad
      const base = parseFloat(getComputedStyle(t).fontSize)
      let lo = base, hi = base * 1.618
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2
        t.style.fontSize = `${mid}px`
        if (t.getBoundingClientRect().bottom <= room + 0.5) lo = mid
        else hi = mid
      }
      t.style.fontSize = `${lo.toFixed(2)}px`
      requestAnimationFrame(() => { busy = false })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(body)
    window.addEventListener('resize', fit)
    document.fonts?.ready.then(fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [bodyRef, boxRef])
}

// the opening essay of a chapter, printed only in My Book
export function BookIntro({ number }) {
  const book = useBook()
  const x = BOOK_INTROS[number]
  const bodyRef = useRef(null)
  const boxRef = useRef(null)
  useEndTogether(bodyRef, boxRef)
  if (!book || !x) return null
  return (
    <div className="bk-intro">
      <div className="bk-intro__body" ref={bodyRef}>
        {x.paras.map((p, i) => <p key={i} className={i ? '' : 'bk-intro__first'}>{p}</p>)}
      </div>
      {x.design ? (
        <aside className="bk-intro__design" ref={boxRef}>
          <p className="bk-lesson__k">The design of this chapter</p>
          <p>{x.design}</p>
        </aside>
      ) : null}
    </div>
  )
}

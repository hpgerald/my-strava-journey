import { Reveal } from './Reveal.jsx'
import Eyebrow from './Eyebrow.jsx'
import Words from './Words.jsx'
import OddsRow from './OddsRow.jsx'
import BookStory, { BookRead } from './BookStory.jsx'
import { useEffect, useRef, useState } from 'react'
import { PairH } from '../charts/pairHeight.js'
import { plotOf, queuePairMeasure, addsElement } from '../lib/alignPairs.js'
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
  // one height for the pair: measure what each chart needs on its own (with the
  // figures free to be their natural height), and let the shorter one grow to
  // the taller; side by side only, and measured again when the width changes
  const pairRef = useRef(null)
  const [pairH, setPairH] = useState(0)
  useEffect(() => {
    const pair = pairRef.current
    if (!pair || typeof ResizeObserver === 'undefined') return undefined
    let lastW = 0, live = true
    // every pair on the page is measured in one shared pass (see queuePairMeasure),
    // so the page is laid out once for all of them, never once per pair
    const job = {
      // first, with nothing changed: is the pair side by side?
      check() {
        const figs = [...pair.querySelectorAll(':scope > figure')]
        if (figs.length !== 2) return false
        const fr = figs.map((f) => f.getBoundingClientRect())
        if (Math.abs(fr[0].top - fr[1].top) > 8 || fr[0].width < 120 || fr[1].width < 120) { setPairH(0); return false }
        job.figs = figs
        return true
      },
      // then the figures are let go to their natural height, all pairs at once
      free() { job.old = pair.style.alignItems; pair.style.alignItems = 'start' },
      // only drawn charts set the shared height: a long list beside a chart must
      // not stretch the chart out of shape
      read() { job.hs = job.figs.map((f) => { const p = plotOf(f); return p && p.tagName.toLowerCase() === 'svg' ? p.getBoundingClientRect().height : 0 }) },
      done() {
        pair.style.alignItems = job.old
        if (!live) return
        const hs = job.hs
        const t = hs[0] && hs[1] ? Math.round(Math.max(...hs)) : 0
        setPairH((prev) => (Math.abs(prev - t) > 2 ? (t > 60 && t < 900 ? t : 0) : prev))
      },
    }
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[entries.length - 1].contentRect.width)
      // a new width: every chart goes back to its own height before measuring again
      if (w !== lastW) { lastW = w; setPairH(0) }
      queuePairMeasure(job)
    })
    ro.observe(pair)
    // a chart that appears or is replaced; a number counting up is not one
    const mo = new MutationObserver((list) => { if (list.some(addsElement)) queuePairMeasure(job) })
    mo.observe(pair, { childList: true, subtree: true })
    return () => { live = false; ro.disconnect(); mo.disconnect() }
  }, [])
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

      <div className="sgrid__pair" ref={pairRef}>
        <figure className="sgrid__fig sgrid__fig--chart">
          <figcaption className="sgrid__figtitle">{left.title}</figcaption>
          <div className="sgrid__chart"><PairH.Provider value={pairH}>{left.node}</PairH.Provider></div>
        </figure>
        <figure className="sgrid__fig sgrid__fig--mx">
          <figcaption className="sgrid__figtitle">{right.title}</figcaption>
          <div className="sgrid__chart"><PairH.Provider value={pairH}>{right.node}</PairH.Provider></div>
        </figure>
        {leftNote ? <p className="sgrid__note sgrid__note--chart">{leftNote}</p> : null}
        {rightNote ? <p className="sgrid__note sgrid__note--mx">{rightNote}</p> : null}
      </div>

      <BookRead items={[[left.title, read && read[0], left.lesson || left.node], [right.title, read && read[1], right.lesson || right.node]]} />

      {children}
      <BookStory>{story}</BookStory>
    </section>
  )
}

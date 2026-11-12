import { useLayoutEffect, useState } from 'react'
import { useBook } from './BookContext.js'

// Story sections take turns between three layouts: a split row, a sticky
// reading column beside stacked figures, and a big lead number. The turn comes
// from the section's place among the story sections on the page, read from the
// page itself, so the order is the same on every visit and neighbours never
// share a layout. In My Book every section keeps the plain layout.
const CYCLE = ['split', 'sticky', 'feature']

export function useSectionVariant(ref, want, hasOdds) {
  const book = useBook()
  const [auto, setAuto] = useState('split')
  useLayoutEffect(() => {
    if (book || want || !ref.current) return
    const main = ref.current.closest('main')
    if (!main) return
    const i = [...main.querySelectorAll('section[data-turn]')].indexOf(ref.current)
    const v = CYCLE[Math.max(0, i) % CYCLE.length]
    const next = v === 'feature' && !hasOdds ? 'split' : v
    if (next !== auto) setAuto(next)
  })
  // the site now uses one compact layout for every story section (the words on
  // the left, the numbers beside them, the two charts under both); the turn is
  // kept only where a page asks for a layout by name
  if (book) return 'split'
  return want || 'split'
}

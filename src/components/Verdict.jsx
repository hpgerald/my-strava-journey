import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBook } from './BookContext.js'

// A verdict stamp: a claim made in the story, tied to the case that tests it in
// The Habit on Trial. It shows the verdict the test reached this week and opens
// that case. The verdicts come from the same file the trial chapter reads, so a
// stamp can never say more than the test found.
const LABEL = { proven: 'Proven', supported: 'Supported', not: 'Not proven' }
let cache = null
function useVerdicts() {
  const [v, setV] = useState(cache ? cache.v : null)
  useEffect(() => {
    if (!cache) {
      cache = { v: null }
      cache.p = fetch(`${import.meta.env.BASE_URL}data/evidence.json`).then((r) => r.json()).then((j) => { cache.v = j.verdicts || {}; return cache.v })
    }
    let live = true
    cache.p.then((x) => { if (live) setV(x) }).catch(() => {})
    return () => { live = false }
  }, [])
  return v
}

// cases: the case numbers that test the claim, for example [1, 2]
export default function Verdict({ cases }) {
  const book = useBook()
  const V = useVerdicts()
  if (book || !cases || !cases.length) return null
  return (
    <p className="vstamp">
      <span className="vstamp__k">Tested</span>
      {cases.map((n) => {
        const v = V ? V[`c${n}`] : null
        const nn = String(n).padStart(2, '0')
        return (
          <Link key={n} to={`/on-trial?case=${n}`} className="vstamp__a" aria-label={`Case ${nn}${v ? `: ${LABEL[v]}` : ''}. Read the test.`}>
            <span className={`ev-v ev-v--${v || 'supported'}`} style={v ? undefined : { visibility: 'hidden' }}>{v ? LABEL[v] : 'Supported'}</span>
            <span className="vstamp__c">Case {nn} <span aria-hidden="true">→</span></span>
          </Link>
        )
      })}
    </p>
  )
}

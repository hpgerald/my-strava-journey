import { useState } from 'react'
import { useBook } from './BookContext.js'

// A small "Share" button for a part of the story or a mountain. It shares the
// page made for it in public/share (scripts/build_share.mjs), which carries its
// own preview card and sends the visitor on to the chapter. On a phone it opens
// the phone's own share sheet; elsewhere it copies the link.
const SITE = 'https://hpgerald.github.io/my-strava-journey/'

export default function ShareLink({ slug, title, className = '' }) {
  const book = useBook()
  const [done, setDone] = useState(false)
  if (book) return null
  const url = `${SITE}share/${slug}.html`
  const go = async () => {
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
      await navigator.clipboard.writeText(url)
      setDone(true); setTimeout(() => setDone(false), 2400)
    } catch { /* the reader closed the share sheet */ }
  }
  return (
    <button type="button" className={`share ${className}`} onClick={go} aria-live="polite">
      {done ? 'Link copied' : 'Share'}
      <span className="share__ico" aria-hidden="true" />
    </button>
  )
}

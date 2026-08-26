import { useState, useId } from 'react'
import { useTable } from '../context/DataContext.jsx'

export function useGlossary() {
  const rows = useTable('glossary')
  const map = {}
  for (const r of rows) map[r.term] = r.definition
  return map
}

// Inline glossary term with a keyboard/hover/tap accessible tooltip.
export default function Term({ name, children }) {
  const gloss = useGlossary()
  const def = gloss[name]
  const id = useId()
  const [open, setOpen] = useState(false)
  const text = children || name

  if (!def) return <span>{text}</span>

  return (
    <span className="term">
      <button
        type="button"
        className="term__btn"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        {text}
      </button>
      <span role="tooltip" id={id} className="term__tip" data-open={open ? 'true' : 'false'}>
        {def}
      </span>
    </span>
  )
}

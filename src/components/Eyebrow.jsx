// A section label. When it starts with a section number ("3 · Count the
// days"), the number is set apart as its own big figure and the words become
// the label beside it, so every numbered section carries the same index mark.
const flat = (c) => (Array.isArray(c) ? c.map(flat).join('') : c == null || c === false ? '' : typeof c === 'object' ? null : String(c))

export default function Eyebrow({ children, className = '' }) {
  const text = flat(children)
  const m = typeof text === 'string' ? text.match(/^(\d{1,2}) · (.+)$/) : null
  if (!m) return <p className={`eyebrow${className ? ` ${className}` : ''}`}>{children}</p>
  return (
    <p className={`eyebrow eyebrow--n${className ? ` ${className}` : ''}`}>
      <span className="eyebrow__n">{m[1].padStart(2, '0')}</span>
      <span className="visually-hidden"> · </span>
      <span className="eyebrow__l">{m[2]}</span>
    </p>
  )
}

// A line of text set as words, each in its own mask, so it can rise into place
// one word after another when the motion layer reveals it. Screen readers get
// the plain sentence: the masks are only spans around the same words.
// `step` is the delay between words in milliseconds.
export default function Words({ children, step = 55 }) {
  if (typeof children !== 'string') return children
  const words = children.split(' ')
  return words.map((w, i) => (
    <span key={i}>
      <span className="kw"><span className="kw__i" style={{ '--d': `${i * step}ms` }}>{w}</span></span>
      {i < words.length - 1 ? ' ' : ''}
    </span>
  ))
}

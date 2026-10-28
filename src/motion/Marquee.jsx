// An endless band of words that runs sideways and leans with the scroll speed.
// The words are read once by screen readers; the moving copies are hidden.
export default function Marquee({ items = [], speed = 40, tone = 'ink', size = 'lg', reverse = false, label }) {
  const run = (hidden) => (
    <span className="mq__run" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={i} className="mq__item">{t}<span className="mq__sep" aria-hidden="true">✦</span></span>
      ))}
    </span>
  )
  return (
    <div className={`mq mq--${tone} mq--${size}${reverse ? ' mq--rev' : ''}`} style={{ '--mq-dur': `${speed}s` }}>
      {label ? <p className="visually-hidden">{label}</p> : null}
      <div className="mq__track" aria-hidden="true">
        {run(true)}{run(true)}
      </div>
    </div>
  )
}

import { useInView, useCountUp } from './Reveal.jsx'

// A row of four equal cells on the site grid: a percentage and the condition it
// belongs to. `tone` colours the number like the chart it summarises
// ('rest' grey, 'move' accent). Numbers count up as the row arrives.
function OddsCell({ value, label, tone, delay, run }) {
  const v = useCountUp(Math.round(value * 100), run, { dur: 1400 })
  return (
    <li className="odds__cell" style={{ transitionDelay: `${delay}ms` }}>
      <span className={`odds__n odds__n--${tone}`}>{v}%</span>
      <span className="odds__c">{label}</span>
    </li>
  )
}

export default function OddsRow({ title, items }) {
  const [ref, inView] = useInView({ threshold: 0.2, rootMargin: '0px' })
  return (
    <div ref={ref} className={`odds${inView ? ' is-in' : ''}`}>
      <p className="odds__title">{title}</p>
      <ol className="odds__row">
        {items.map((it, i) => (
          <OddsCell key={it.label} {...it} delay={i * 110} run={inView} />
        ))}
      </ol>
    </div>
  )
}

import { useState } from 'react'
import { useInView, useCountUp } from './Reveal.jsx'

// A row of four equal cells on the site grid: a number and the condition it
// belongs to. `tone` colours the number like the chart it summarises
// ('rest' grey, 'move' accent). Numbers count up as the row arrives.
// A cell is a share (value 0-1, shown as %) or a plain number (num + unit, with
// `dec` decimals); `sign` prints a plus on positive changes. Pointing at a
// number plays its count again.
// the number itself; remounting it (a new key) plays the count again
function Num({ target, run, dec, sign, unit, isNum }) {
  const v = useCountUp(target, run, { dur: 1400, decimals: dec })
  const shown = `${sign && target > 0 ? '+' : ''}${Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`.replace('-', '\u2212')
  return <>{shown}{isNum ? <span className="odds__u">{unit}</span> : '%'}</>
}

function OddsCell({ value, num, unit, dec = 0, sign = false, label, tone, delay, run }) {
  const f = Math.pow(10, dec)
  const target = num != null ? Math.round(num * f) / f : Math.round(value * 100)
  const [k, setK] = useState(0)
  return (
    <li className="odds__cell" style={{ transitionDelay: `${delay}ms` }} onMouseEnter={() => run && setK((x) => x + 1)}>
      <span className={`odds__n odds__n--${tone}`}>
        <Num key={k} target={target} run={run} dec={dec} sign={sign} unit={unit} isNum={num != null} />
      </span>
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

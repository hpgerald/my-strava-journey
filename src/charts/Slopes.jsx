import { useState } from 'react'

// One little rising hill per category. The slope of each hill is the median
// gradient of that activity type, so flatter sports (running on the flat) draw a
// gentle rise and steep ones (hikes) draw a sharp climb. The value read out is
// the real median grade and the typical elevation gained.
// data: [{ label, grade, display, sub }]   grade = percent, used only for the visual angle
export default function Slopes({ data, maxGrade }) {
  const [hi, setHi] = useState(null)
  const gMax = maxGrade ?? Math.max(1, ...data.map((d) => d.grade))
  const W = 100
  const H = 46
  const base = H - 4

  return (
    <ul className="slopes">
      {data.map((d, i) => {
        // rise scaled so the steepest sport nearly fills the box
        const rise = Math.max(2, (d.grade / gMax) * (base - 4))
        const y2 = base - rise
        const on = hi === i
        return (
          <li
            key={i}
            className={`slopes__row${on ? ' is-hi' : ''}`}
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
          >
            <span className="slopes__label">{d.label}</span>
            <svg className="slopes__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              <polygon
                points={`0,${base} ${W},${y2} ${W},${H} 0,${H}`}
                fill={on ? 'var(--accent)' : 'var(--accent-soft)'}
              />
              <line x1="0" y1={base} x2={W} y2={y2} stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="slopes__val mono">
              {d.display}
              {d.sub ? <span className="text-muted"> {d.sub}</span> : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

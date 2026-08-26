import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toNum } from '../lib/format.js'

// A single 100%-width bar split into proportional segments: "what it's made of".
// The largest slice carries the accent; the rest step down a grey ramp, so the
// dominant category reads at a glance. Identity is never colour-alone: every
// slice is named in the legend and reachable there. When a segment has `to`,
// both the slice and its legend row become links to that page.
// segments: [{ label, value:number, display:string, to? }]  (pre-sorted, largest first)
const RAMP = [
  'var(--accent)', 'var(--grey-85)', 'var(--grey-70)', 'var(--grey-55)', 'var(--grey-45)',
  'var(--grey-35)', 'var(--grey-25)', 'var(--grey-15)', 'var(--grey-10)',
]

export default function ProportionBar({ segments, unit = '', height = 40 }) {
  const [hi, setHi] = useState(null)
  const total = Math.max(1, segments.reduce((a, s) => a + (toNum(s.value) || 0), 0))
  const color = (i) => RAMP[Math.min(i, RAMP.length - 1)]

  return (
    <div className="proportion">
      <div className="proportion__bar" style={{ height }}>
        {segments.map((s, i) => {
          const pct = ((toNum(s.value) || 0) / total) * 100
          return (
            <div
              key={i}
              className={`proportion__seg${hi === i ? ' is-hi' : ''}`}
              style={{ flexGrow: pct, background: color(i) }}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
              title={`${s.label}: ${s.display}${unit ? ' ' + unit : ''} (${pct.toFixed(0)}%)`}
            />
          )
        })}
      </div>
      <ul className="proportion__legend">
        {segments.map((s, i) => {
          const pct = ((toNum(s.value) || 0) / total) * 100
          const body = (
            <>
              <span className="proportion__swatch" style={{ background: color(i) }} />
              <span className="proportion__name">{s.label}</span>
              <span className="proportion__figure mono">
                {s.display}
                {unit ? <span className="text-muted"> {unit}</span> : null}
                <span className="text-muted"> · {Math.round(pct)}%</span>
              </span>
            </>
          )
          const Row = s.to ? Link : 'div'
          return (
            <li
              key={i}
              className={hi === i ? 'is-hi' : ''}
              onMouseEnter={() => setHi(i)}
              onMouseLeave={() => setHi(null)}
            >
              <Row {...(s.to ? { to: s.to } : {})} className={`proportion__legrow${s.to ? ' proportion__legrow--link' : ''}`}>
                {body}
              </Row>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

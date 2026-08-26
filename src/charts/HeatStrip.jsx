import { useState } from 'react'

// A single row of cells shaded by magnitude: a compact way to show a cycle
// (here, the twelve months of the year). Sequential orange, light -> dark, with
// a live readout above. Wrap in <Figure> for the table fallback.
// cells: [{ short, label, value:number }]  (in display order)
const STOPS = [
  [255, 224, 209], // light
  [252, 76, 2], //   accent
  [178, 52, 0], //   deep
]
function ramp(t) {
  const x = Math.max(0, Math.min(1, t))
  const seg = 1 / (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(x / seg))
  const u = (x - i * seg) / seg
  const a = STOPS[i]
  const b = STOPS[i + 1]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`
}

export default function HeatStrip({ cells, unit = 'activities', cellHeight = 44 }) {
  const [hi, setHi] = useState(null)
  const vals = cells.map((c) => c.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const norm = (v) => (max > min ? (v - min) / (max - min) : 0.5)
  const peak = vals.indexOf(max)
  const low = vals.indexOf(min)
  const shown = hi == null ? peak : hi

  return (
    <div className="heatstrip">
      <div className="heatstrip__readout">
        <span className="heatstrip__num mono">{cells[shown].value.toLocaleString()}</span>
        <span className="heatstrip__cap">
          {unit} in {cells[shown].label}
          {hi == null ? ' (the busiest month)' : ''}
        </span>
      </div>
      <p className="heatstrip__sub">
        Quietest is {cells[low].label}, at {cells[low].value.toLocaleString()} {unit}.
      </p>
      <div className="heatstrip__row">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`heatstrip__cellwrap${shown === i ? ' is-hi' : ''}`}
            onMouseEnter={() => setHi(i)}
            onMouseLeave={() => setHi(null)}
          >
            <div className="heatstrip__cell" style={{ background: ramp(norm(c.value)), height: cellHeight }} title={`${c.label}: ${c.value.toLocaleString()} ${unit}`} />
            <span className="heatstrip__lbl mono">{c.short}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend" style={{ alignItems: 'center' }}>
        <span>fewer</span>
        <span aria-hidden="true" style={{ width: 120, height: 10, background: `linear-gradient(90deg, rgb(255,224,209), rgb(252,76,2), rgb(178,52,0))`, display: 'inline-block' }} />
        <span>more {unit}</span>
      </div>
    </div>
  )
}

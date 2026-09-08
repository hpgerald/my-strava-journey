import { useState } from 'react'
import { useWidth } from './useWidth.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (d) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`

// The streak metaphor for Rhythm: the current run of consecutive active days
// drawn as one continuous woven ribbon. The band never once thins to nothing,
// so the streak reads as unbroken; it swells a little on the busier days. The
// open end marks that it is still running. Decorative; the Figure carries the
// readable data.
export default function StreakRibbon({ counts, start, end }) {
  const [ref, width] = useWidth(720)
  const [hover, setHover] = useState(null)

  const days = []
  if (start && end) {
    const s = new Date(`${start}T00:00:00Z`)
    const e = new Date(`${end}T00:00:00Z`)
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      days.push({ key, n: counts[key] || 0 })
    }
  }
  const N = days.length || 1

  const W = Math.max(320, width)
  const H = 96
  const padX = 3
  const midY = H / 2
  const plotW = W - padX * 2
  const step = plotW / N

  // half-thickness: always a substantial band (min), swelling gently with the
  // day's activity count. The swell is smoothed across neighbouring days so a
  // single busy day reads as a soft bump in the weave, not a spike, and the
  // ribbon never thins to a break.
  const capN = 3
  const rawT = days.map((d) => Math.min(1, d.n / capN))
  const R = 3
  const halfArr = rawT.map((_, i) => {
    let sum = 0
    let w = 0
    for (let k = -R; k <= R; k++) {
      const j = i + k
      if (j < 0 || j >= rawT.length) continue
      const wk = R + 1 - Math.abs(k)
      sum += rawT[j] * wk
      w += wk
    }
    const t = w ? sum / w : 0
    return 13 + t * 13
  })
  const halfFor = (n, i) => (i != null && halfArr[i] != null ? halfArr[i] : 13)
  const xAt = (i) => padX + i * step + step / 2

  // build the filled ribbon as one path: tops left-to-right, bottoms back
  let top = ''
  let bot = ''
  days.forEach((d, i) => {
    const x = xAt(i)
    const h = halfFor(d.n, i)
    top += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + (midY - h).toFixed(1) + ' '
  })
  for (let i = days.length - 1; i >= 0; i--) {
    const x = xAt(i)
    const h = halfFor(days[i].n, i)
    bot += 'L' + x.toFixed(1) + ' ' + (midY + h).toFixed(1) + ' '
  }
  // close flush to the ribbon ends
  const startCap = `M ${padX} ${midY} L ${xAt(0)} ${(midY - halfFor(0, 0)).toFixed(1)} `
  const endX = xAt(N - 1)
  const ribbon = `${startCap}${top.replace(/^M/, 'L')} L ${(endX).toFixed(1)} ${midY} ` +
    `${bot.replace(/^L/, 'L')} L ${padX} ${midY} Z`

  return (
    <div ref={ref} className="ribbon">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`The current streak: ${N} consecutive active days drawn as one unbroken ribbon, still running.`}
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(ev) => {
          const rect = ev.currentTarget.getBoundingClientRect()
          const x = ((ev.clientX - rect.left) / rect.width) * W - padX
          const i = Math.max(0, Math.min(N - 1, Math.floor(x / step)))
          const day = days[i]
          if (day) setHover({ i, x: xAt(i), ...day })
        }}
      >
        <path d={ribbon} className="ribbon__band" />
        {/* the thread running down the centre of the weave */}
        <line x1={padX} y1={midY} x2={endX} y2={midY} className="ribbon__core" />
        {hover && (
          <line x1={hover.x} y1={midY - halfFor(hover.n, hover.i) - 3} x2={hover.x} y2={midY + halfFor(hover.n, hover.i) + 3} className="ribbon__cursor" />
        )}
        {/* open end: still going */}
        <circle cx={W - padX} cy={midY} r="5.5" className="ribbon__end" />
      </svg>
      <div className="ribbon__ends" aria-hidden="true">
        <span>{start ? fmt(new Date(`${start}T00:00:00Z`)) : ''}</span>
        <span className="ribbon__still">still going &rarr;</span>
      </div>
      {hover && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(hover.x, 70), W - 70), top: -6 }}>
          <strong>{fmt(new Date(`${hover.key}T00:00:00Z`))}</strong>
          <br />
          {hover.n} {hover.n === 1 ? 'activity' : 'activities'}
        </div>
      )}
    </div>
  )
}

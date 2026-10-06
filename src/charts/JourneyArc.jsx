import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale, smoothLinePath, smoothAreaPath, bisectNearest } from './primitives.js'

// The whole journey as one climbing line: cumulative kilometres on foot from the
// first run to today, with the signature moments pinned straight onto the curve.
// Two years barely lift off the floor, then July 2021 and the line rears up and
// never flattens. The line draws itself left to right on scroll-in.
// points: [{ t:ms, cum:km }] ascending; marks: [{ t:ms, label, sub? }].
const fmtK = (v) => Math.round(v).toLocaleString()

export default function JourneyArc({ points, marks = [] }) {
  const [ref, width] = useWidth(820)
  const [root, inView] = useInView()
  const [hi, setHi] = useState(null)
  if (!points || points.length < 2) return <div ref={ref} />

  const W = Math.max(320, width)
  const narrow = W < 560
  const H = narrow ? 300 : 360
  const m = { t: 54, r: 16, b: 30, l: narrow ? 38 : 52 }
  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const maxCum = points[points.length - 1].cum || 1
  const x = linScale([t0, t1], [m.l, W - m.r])
  const y = linScale([0, maxCum * 1.04], [H - m.b, m.t])
  const xs = points.map((p) => p.t)
  const pts = points.map((p) => [x(p.t), y(p.cum)])

  // year ticks
  const years = []
  const y0 = new Date(t0).getUTCFullYear()
  const y1 = new Date(t1).getUTCFullYear()
  for (let yy = y0; yy <= y1; yy++) years.push({ yy, t: Date.UTC(yy, 0, 1) })

  // nice round km gridlines
  const gridStep = maxCum > 9000 ? 4000 : maxCum > 4000 ? 2000 : 1000
  const grid = []
  for (let g = gridStep; g < maxCum; g += gridStep) grid.push(g)

  // resolve each mark onto the curve, then stack labels so they don't collide
  const resolved = marks
    .map((mk) => {
      const i = bisectNearest(xs, mk.t)
      return { ...mk, cum: points[i].cum, px: x(points[i].t), py: y(points[i].cum) }
    })
    .sort((a, b) => a.px - b.px)
  // label rows: alternate heights up the top margin
  const labelY = (idx) => m.t - 12 - (idx % 3) * 15

  return (
    <div ref={ref} className="jarc">
      <div ref={root} className={`jarc__plot${inView ? ' is-in' : ''}`} style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Cumulative kilometres on foot climbing from zero to ${fmtK(maxCum)} km across seven years, flat for the first two before rising steeply.`}
          style={{ display: 'block' }} onMouseLeave={() => setHi(null)}>
          {grid.map((g) => (
            <g key={g}>
              <line x1={m.l} y1={y(g)} x2={W - m.r} y2={y(g)} stroke="var(--rule-faint)" strokeWidth="1" opacity="0.7" />
              <text x={m.l - 6} y={y(g) + 3} textAnchor="end" className="chart-tick">{fmtK(g)}</text>
            </g>
          ))}
          {years.map((yt) => (
            <text key={yt.yy} x={x(yt.t)} y={H - 9} textAnchor="middle" className="chart-tick">{String(yt.yy).slice(2)}</text>
          ))}
          <line x1={m.l} y1={H - m.b} x2={W - m.r} y2={H - m.b} stroke="var(--rule-faint)" strokeWidth="1" />

          <path className="jarc__area" d={smoothAreaPath(pts, H - m.b)} fill="color-mix(in srgb, var(--accent) 11%, var(--paper))" stroke="none" />
          <path className="jarc__line" d={smoothLinePath(pts)} pathLength="1" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />

          {/* signature moments pinned to the curve */}
          {resolved.map((mk, i) => {
            const ly = labelY(i)
            return (
              <g key={mk.label} className="jarc__mark">
                <line x1={mk.px} y1={mk.py} x2={mk.px} y2={ly + 4} stroke="var(--grey-45)" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx={mk.px} cy={mk.py} r="4" fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.5" />
                <text x={mk.px} y={ly} textAnchor={mk.px > W - 120 ? 'end' : mk.px < 90 ? 'start' : 'middle'} className="jarc__lbl">{mk.label}</text>
              </g>
            )
          })}
          {/* hover scrubber */}
          {points.map((p, i) => (
            <rect key={i} x={pts[i][0] - (W - m.l - m.r) / points.length / 2} y={m.t} width={Math.max(1, (W - m.l - m.r) / points.length)} height={H - m.b - m.t}
              fill="transparent" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
          ))}
          {hi != null && <circle cx={pts[hi][0]} cy={pts[hi][1]} r="3.5" fill="var(--accent-ink)" />}
        </svg>
        {hi != null && (
          <div className="chart-tip" style={{ left: `${Math.min(86, Math.max(8, (pts[hi][0] / W) * 100))}%`, top: 0 }}>
            <strong>{new Date(points[hi].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })}</strong>
            <br />{fmtK(points[hi].cum)} km on foot
          </div>
        )}
      </div>
    </div>
  )
}

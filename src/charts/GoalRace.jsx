import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// Each target as a race against the calendar: one small panel per target, the
// year running left to right and the running total rising. Every year is a grey
// line; the year in progress is orange, with a dot where it stands today. The
// dashed level is the target, and a ring marks the day each year crossed it.
// props: byYear (goals report), targets [{ key, label, unit, target }], fromYear, aria
const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function Panel({ t, years, W, H, narrow, delay }) {
  const m = { l: narrow ? 38 : 46, r: narrow ? 10 : 34, t: 36, b: 22 }
  const max = Math.max(t.target * 1.15, ...years.map((y) => y[t.key].total)) * 1.04
  const X = (i, n) => m.l + (i / (n - 1)) * (W - m.l - m.r)
  const Y = (v) => m.t + (1 - v / max) * (H - m.t - m.b)
  const step = t.unit === 'm' ? (max > 30000 ? 10000 : 5000) : max > 2000 ? 1000 : 500
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  const fmt = (v) => (t.unit === 'm' ? `${v / 1000}k` : v.toLocaleString('en-US'))
  // year labels at the end of each line, nudged apart so none overlap
  const labs = narrow ? [] : years.map((y) => { const c = y[t.key].cum; return { year: y.year, now: y.partial, x: X(c.length - 1, y.ndays) + (y.partial ? 8 : 4), y: Y(c[c.length - 1]) + 4 } })
  const byY = labs.slice().sort((a, b) => a.y - b.y)
  for (let i = 1; i < byY.length; i++) if (Math.abs(byY[i].x - byY[i - 1].x) < 40 && byY[i].y - byY[i - 1].y < 11) byY[i].y = byY[i - 1].y + 11
  return (
    <g>
      <text x={m.l} y={18} className="grace__t">{t.label}</text>
      <text x={W - 10} y={18} textAnchor="end" className="grace__u">{t.target.toLocaleString('en-US')} {t.unit}</text>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--ink)' : 'var(--rule-faint)'} />
          <text x={m.l - 6} y={Y(v) + 4} textAnchor="end" className="cb__gl">{fmt(v)}</text>
        </g>
      ))}
      <line x1={m.l} x2={W - m.r} y1={Y(t.target)} y2={Y(t.target)} className="grace__goal" />
      {MON.map((mm, i) => (i % (narrow ? 2 : 1) === 0 ? <text key={i} x={m.l + ((i + 0.5) / 12) * (W - m.l - m.r)} y={H - 6} textAnchor="middle" className="cb__gl">{mm}</text> : null))}
      {years.map((y, yi) => {
        const c = y[t.key].cum
        const n = y.ndays
        const stepPts = Math.max(1, Math.floor(c.length / 120))
        let d = ''
        for (let i = 0; i < c.length; i += stepPts) d += `${i ? 'L' : 'M'}${X(i, n).toFixed(1)} ${Y(c[i]).toFixed(1)}`
        d += `L${X(c.length - 1, n).toFixed(1)} ${Y(c[c.length - 1]).toFixed(1)}`
        const now = y.partial
        const cl = y[t.key].closed
        return (
          <g key={y.year} className={`grace__y${now ? ' is-now' : ''}`} style={{ '--d': `${delay + yi * 120}ms` }}>
            <path d={d} className="grace__line" pathLength="1" />
            {cl != null && <circle cx={X(cl, n)} cy={Y(t.target)} r={now ? 5 : 3.5} className="grace__hit" />}
            {now && <circle cx={X(c.length - 1, n)} cy={Y(c[c.length - 1])} r="5" className="grace__now" />}
            {!narrow && (() => { const l = labs.find((z) => z.year === y.year); return <text x={l.x} y={l.y} className={`grace__yl${now ? ' is-now' : ''}`}>{now ? `${y.year}` : `'${String(y.year).slice(2)}`}</text> })()}
          </g>
        )
      })}
    </g>
  )
}

export default function GoalRace({ byYear, targets, fromYear = 2021, aria }) {
  const [ref, width] = useWidth(1100)
  const [root, inView] = useInView({ threshold: 0.15 })
  const W = Math.max(300, width)
  const narrow = W < 760
  const cols = narrow ? 1 : 3
  const gap = 24
  const pw = (W - gap * (cols - 1)) / cols
  const ph = narrow ? 230 : 300
  const years = byYear.filter((y) => y.year >= fromYear)
  const H = narrow ? ph * targets.length + gap * (targets.length - 1) : ph
  return (
    <div ref={ref} className={`grace${inView ? ' is-in' : ''}`}>
      <svg ref={root} width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {targets.map((t, i) => (
          <g key={t.key} transform={`translate(${narrow ? 0 : i * (pw + gap)},${narrow ? i * (ph + gap) : 0})`}>
            <Panel t={t} years={years} W={pw} H={ph} narrow={narrow || pw < 340} delay={i * 250} />
          </g>
        ))}
      </svg>
    </div>
  )
}

import { useEffect, useId, useMemo, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView, useCountUp, usePrefersReducedMotion } from '../components/Reveal.jsx'
import { fmtInt, toNum } from '../lib/format.js'

const DAY = 86400000
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// The whole record as one band: every day a line, taller when more was done
// that day. The quiet opening is faint, the long silence is a blank gorge, the
// settled habit is solid ink, and the streak still running glows in accent at
// the right edge, with a pulse on the latest day. It leads the home page.
export default function HeartbeatYears({ activities, km, elevation, streak }) {
  const [ref, width] = useWidth(960)
  const [stage, inView] = useInView({ threshold: 0.1, rootMargin: '0px' })
  const [coRef, coIn] = useInView({ threshold: 0.15, rootMargin: '0px' })
  const reduce = usePrefersReducedMotion()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = useState(null)

  const model = useMemo(() => {
    const counts = new Map()
    for (const a of activities) {
      const d = (a.date || '').slice(0, 10)
      if (d) counts.set(d, (counts.get(d) || 0) + 1)
    }
    const days = [...counts.keys()].sort()
    if (days.length < 2) return null
    const first = Date.parse(days[0] + 'T00:00:00Z')
    const last = Date.parse(days[days.length - 1] + 'T00:00:00Z')
    const span = Math.round((last - first) / DAY) + 1
    const series = new Array(span).fill(0)
    for (const [d, c] of counts) {
      const i = Math.round((Date.parse(d + 'T00:00:00Z') - first) / DAY)
      if (i >= 0 && i < span) series[i] = c
    }
    let streakLen = 0
    for (let i = span - 1; i >= 0 && series[i] > 0; i--) streakLen++
    let gap = { len: 0, start: 0 }
    let run = 0, runStart = 0
    for (let i = 0; i < span; i++) {
      if (series[i] === 0) { if (run === 0) runStart = i; run++; if (run > gap.len) gap = { len: run, start: runStart } }
      else run = 0
    }
    // year segments: boundaries at each 1 January inside the span
    const y0 = new Date(first).getUTCFullYear()
    const y1 = new Date(last).getUTCFullYear()
    const bounds = [0]
    for (let y = y0 + 1; y <= y1; y++) bounds.push(Math.round((Date.UTC(y, 0, 1) - first) / DAY))
    bounds.push(span)
    const segs = []
    for (let k = 0; k < bounds.length - 1; k++) segs.push({ y: y0 + k, mid: (bounds[k] + bounds[k + 1]) / 2 })
    return {
      first, span, series, maxC: Math.max(...series), streakLen, streakStart: span - streakLen,
      activeDays: series.filter((c) => c > 0).length,
      gap, resume: gap.start + gap.len, grid: bounds.slice(1, -1), segs,
    }
  }, [activities])

  // Arm the choreography only once the bars exist and the un-played state has
  // painted (two frames), so the wipe and staged labels always run on load.
  const useArmed = (seen) => {
    const [armed, setArmed] = useState(false)
    useEffect(() => {
      if (!seen || !model || armed) return
      let a = 0, b = 0
      a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)) })
      return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
    }, [seen, armed, model])
    return armed
  }
  const play = useArmed(inView)
  const playCo = useArmed(coIn)

  const actN = useCountUp(activities.length, playCo, { dur: 2700 })
  const kmN = useCountUp(Math.round(toNum(km) || 0), playCo, { dur: 2700 })
  const elevN = useCountUp(Math.round(toNum(elevation) || 0), playCo, { dur: 2700 })
  const streakN = useCountUp(Math.round(toNum(streak) || (model ? model.streakLen : 0)), playCo, { dur: 2700 })

  if (!model) {
    return (
      <div ref={ref} className="beat">
        <div ref={stage} className="beat__stage">
          <div className="beat__head"><p className="beat__key">&nbsp;</p></div>
          <div className="beat__plot beat__plot--empty" />
        </div>
        <div ref={coRef} className="beat__callouts" />
      </div>
    )
  }
  const { first, span, series, maxC, streakLen, streakStart, gap, resume, grid, segs, activeDays } = model

  const W = Math.max(320, width)
  const H = 190
  const pad = { t: 8, b: 2 }
  const plotH = H - pad.t - pad.b
  const minBar = 8
  const px = span / W // one screen pixel, in viewBox units
  const bw = px * 0.85
  const yTop = (c) => pad.t + (plotH - (minBar + (c / maxC) * (plotH - minBar)))
  const colorOf = (i) => (i >= streakStart ? 'var(--accent)' : i < resume ? 'var(--grey-25)' : 'var(--ink)')

  const bars = []
  for (let i = 0; i < span; i++) {
    const c = series[i]
    if (!c) continue
    bars.push(<rect key={i} x={i} y={yTop(c)} width={bw} height={pad.t + plotH - yTop(c)} fill={colorOf(i)} />)
  }

  const fmtDay = (i) => {
    const d = new Date(first + i * DAY)
    return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  }
  const startDate = new Date(first)
  const startLabel = `${MONTH[startDate.getUTCMonth()]} ${startDate.getUTCFullYear()}`
  const gapFrac = (gap.start + gap.len / 2) / span
  const sweepW = Math.max(20, streakLen * 0.4)

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.max(0, Math.min(span - 1, Math.round(((e.clientX - r.left) / r.width) * span)))
    setHover({ i, c: series[i] })
  }

  return (
    <div ref={ref} className="beat">
      <div ref={stage} className={`beat__stage${play ? ' is-in' : ''}`}>
        <div className="beat__head">
          <p className="beat__key">
            Every day from {startLabel} to now, one line each. Taller lines are busier days.
          </p>
          <ul className="beat__legend" aria-label="Colour key">
            <li><i className="beat__sw beat__sw--quiet" aria-hidden="true" />Before the silence</li>
            <li><i className="beat__sw beat__sw--habit" aria-hidden="true" />The habit</li>
            <li><i className="beat__sw beat__sw--streak" aria-hidden="true" />Current streak</li>
          </ul>
        </div>

        <div className="beat__plot">
          <svg width="100%" height={H} viewBox={`0 0 ${span} ${H}`} preserveAspectRatio="none" role="img"
            aria-label={`Every day from ${fmtDay(0)} to ${fmtDay(span - 1)}, one line per day, taller when more was done. Faint through the quiet opening, a ${gap.len}-day blank for the long silence, solid once the habit held, and the last ${streakLen} days in accent for the streak still running.`}>
            <defs>
              <linearGradient id={`sw${uid}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <clipPath id={`sc${uid}`}>
                <rect x={streakStart} y="0" width={streakLen} height={H} />
              </clipPath>
            </defs>
            <g className="beat__grid" aria-hidden="true">
              {grid.map((g) => (
                <line key={g} x1={g} y1={pad.t} x2={g} y2={H - pad.b} stroke="var(--grey-10)" strokeWidth={px} />
              ))}
            </g>
            <g className="beat__bars" aria-hidden="true">{bars}</g>
            {!reduce && play && (
              <g clipPath={`url(#sc${uid})`} aria-hidden="true">
                <rect y="0" height={H} width={sweepW} x={streakStart - sweepW} fill={`url(#sw${uid})`}>
                  <animate attributeName="x" from={streakStart - sweepW} to={span} dur="2.6s" begin="2.8s" repeatCount="indefinite" />
                </rect>
              </g>
            )}
            <line className="beat__base" x1="0" y1={H - pad.b} x2={span} y2={H - pad.b} stroke="var(--ink)" strokeWidth={px * 1.5} />
            {hover && (
              <line x1={hover.i} y1={pad.t} x2={hover.i} y2={H - pad.b} stroke="var(--accent-ink)" strokeWidth={px * 1.5} />
            )}
          </svg>

          <div className="beat__tag beat__tag--gap" style={{ left: `${gapFrac * 100}%` }}>
            <span className="beat__tagnum">{gap.len}</span> days <span className="beat__tag2">silent</span>
          </div>
          <div className="beat__tag beat__tag--streak">
            <span className="beat__tagnum">{streakLen}</span> days, still going
          </div>
          <span className="beat__pulse" aria-hidden="true" />

          <div className="beat__hit" onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true" />
          {hover && (
            <div className="beat__read" style={{ left: `${Math.max(8, Math.min(92, (hover.i / span) * 100))}%` }}>
              <b>{fmtDay(hover.i)}</b>{hover.c ? ` · ${hover.c} ${hover.c === 1 ? 'activity' : 'activities'}` : ' · rest day'}
            </div>
          )}
        </div>

        <div className="beat__axis" aria-hidden="true">
          {segs.map((s, k) => (
            <span key={s.y} style={{ left: `${(s.mid / span) * 100}%`, transitionDelay: `${300 + k * 160}ms` }}>
              <span className="beat__yfull">{s.y}</span><span className="beat__yshort">&rsquo;{String(s.y).slice(2)}</span>
            </span>
          ))}
        </div>
      </div>

      <div ref={coRef} className={`beat__callouts${playCo ? ' is-in' : ''}`}>
        <div className="beat__co">
          <div className="beat__n">{fmtInt(actN)}</div>
          <div className="beat__l">Activities</div>
          <div className="beat__s">on {fmtInt(activeDays)} separate days</div>
        </div>
        <div className="beat__co">
          <div className="beat__n">{fmtInt(kmN)}<span className="beat__u">km</span></div>
          <div className="beat__l">On foot</div>
          <div className="beat__s">a third of the way around the Earth</div>
        </div>
        <div className="beat__co">
          <div className="beat__n">{fmtInt(elevN)}<span className="beat__u">m</span></div>
          <div className="beat__l">Climbed</div>
          <div className="beat__s">nine and a half times up Everest</div>
        </div>
        <div className="beat__co beat__co--accent">
          <div className="beat__n">{fmtInt(streakN)}<span className="beat__u">days</span></div>
          <div className="beat__l">Current streak</div>
          <div className="beat__s">unbroken, and still going</div>
        </div>
      </div>
    </div>
  )
}

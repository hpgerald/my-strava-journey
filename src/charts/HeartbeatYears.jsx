import { useEffect, useMemo, useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView, useCountUp, usePrefersReducedMotion } from '../components/Reveal.jsx'
import { fmtInt, toNum } from '../lib/format.js'

const DAY = 86400000
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const GROUP = (t) => (t === 'Run' ? 'run' : t === 'Walk' ? 'walk' : t === 'TrailRun' || t === 'Hike' ? 'trail' : 'other')
const NAME = { run: 'Run', walk: 'Walk', trail: 'Trail run or hike', other: 'Other activity' }
const H0 = 4 // the sky runs from 4am ...
const H1 = 24 // ... to midnight
const fmtHour = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const ap = hh < 12 ? 'am' : 'pm'; const h12 = hh % 12 === 0 ? 12 : hh % 12; return `${h12}:${String(mm).padStart(2, '0')}${ap}` }
const fmtDate = (t) => { const d = new Date(t); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` }

// The hero: every outing of the record as one dot in a single sky. Across is
// time, down is the hour it started, size is the distance on foot, colour is
// the sport. The two bands (before work, after work), the long silence, the
// switch from running to walking and the streak still running all read from the
// one picture. Dots arrive year by year, then drift gently so the sky looks
// alive; motion stops off screen and for reduced-motion users.
export default function HeartbeatYears({ activities, km, elevation, streak }) {
  const [ref, width] = useWidth(960)
  const [stage, inView] = useInView({ threshold: 0.05, rootMargin: '0px' })
  const [coRef, coIn] = useInView({ threshold: 0.15, rootMargin: '0px' })
  const reduce = usePrefersReducedMotion()
  const canvasRef = useRef(null)
  const [hover, setHover] = useState(null)

  const model = useMemo(() => {
    const pts = []
    for (const a of activities) {
      const s = (a.date || '').replace(' ', 'T')
      const t = Date.parse(s + (s.length > 10 ? 'Z' : 'T00:00:00Z'))
      if (!Number.isFinite(t)) continue
      const d = new Date(t)
      const hour = d.getUTCHours() + d.getUTCMinutes() / 60
      const foot = FOOT.has(a.sport_type)
      pts.push({ t, hour, g: GROUP(a.sport_type), km: foot ? toNum(a.distance_km) || 0 : 0, sport: a.sport_type, raw: a })
    }
    if (pts.length < 10) return null
    pts.sort((p, q) => p.t - q.t)
    const dayKey = (t) => Math.floor(t / DAY)
    const days = [...new Set(pts.map((p) => dayKey(p.t)))].sort((p, q) => p - q)
    let gap = { len: 0, from: days[0], to: days[0] }
    for (let i = 1; i < days.length; i++) { const g = days[i] - days[i - 1] - 1; if (g > gap.len) gap = { len: g, from: days[i - 1], to: days[i] } }
    const daySet = new Set(days)
    let s = days[days.length - 1]
    while (daySet.has(s - 1)) s--
    const streakLen = days[days.length - 1] - s + 1
    const first = pts[0].t
    const last = pts[pts.length - 1].t
    const y0 = new Date(first).getUTCFullYear(), y1 = new Date(last).getUTCFullYear()
    const years = []
    for (let y = y0; y <= y1; y++) years.push({ y, n: pts.filter((p) => new Date(p.t).getUTCFullYear() === y).length })
    const hours = new Array(24).fill(0)
    for (const p of pts) hours[Math.floor(p.hour)] += 1
    const maxBy = (f) => pts.reduce((b, p) => (f(p) > f(b) ? p : b), pts[0])
    const top = (g) => { const c = pts.filter((p) => p.sport === g); return c.length ? c.reduce((b, p) => (p.km > b.km ? p : b), c[0]) : null }
    const notes = [
      { p: pts[0], title: 'The first outing', sub: `${MONTH[new Date(first).getUTCMonth()]} ${y0}` },
      top('Run') && { p: top('Run'), title: top('Run').km >= 42 ? 'The marathon' : 'The longest run', sub: `${top('Run').km.toFixed(1)} km` },
      top('TrailRun') && { p: top('TrailRun'), title: 'The longest trail run', sub: `${top('TrailRun').km.toFixed(1)} km` },
      top('Walk') && { p: top('Walk'), title: 'The longest walk', sub: `${Math.round(top('Walk').km)} km` },
    ].filter(Boolean)
    // a stable seed per dot for its drift
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (const p of pts) { p.ph = rnd() * Math.PI * 2; p.ph2 = rnd() * Math.PI * 2; p.sp = 0.35 + rnd() * 0.55; p.amp = 0.6 + rnd() * 1.4 }
    return { pts, first, last, gap, streakStart: s * DAY, streakLen, years, hours, notes, activeDays: days.length, biggest: maxBy((p) => p.km) }
  }, [activities])

  // geometry, shared by the canvas and the overlay
  const W = Math.max(300, width)
  const narrow = W < 640
  const marg = !narrow // the hour profile on the right
  const lanes = !narrow // callout lanes above the sky
  const m = { l: narrow ? 40 : 44, r: marg ? 88 : 6, t: lanes ? 92 : 40, b: 38 }
  const H = (narrow ? 250 : 330) + m.t + m.b
  const plotH = H - m.t - m.b
  const tSpan = model ? [Date.UTC(new Date(model.first).getUTCFullYear(), new Date(model.first).getUTCMonth(), 1), model.last + 20 * DAY] : [0, 1]
  const X = (t) => m.l + ((t - tSpan[0]) / (tSpan[1] - tSpan[0])) * (W - m.l - m.r)
  const Y = (h) => m.t + ((Math.max(H0, Math.min(H1 - 0.01, h)) - H0) / (H1 - H0)) * plotH
  const rOf = (p) => (p.km > 0 ? 1.4 + Math.sqrt(p.km) * (narrow ? 0.72 : 1.05) : narrow ? 1.3 : 1.7)

  // arm once data exists and the first frame has painted
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!inView || !model || armed) return
    let a = 0, b = 0
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [inView, armed, model])

  // the sky itself: canvas, so 2,000-plus dots can drift at full frame rate
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !model) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(cv)
    const col = {
      run: css.getPropertyValue('--accent').trim() || '#fc4c02',
      walk: css.getPropertyValue('--grey-85').trim() || '#2b2b2b',
      trail: css.getPropertyValue('--accent-ink').trim() || '#b23400',
      other: css.getPropertyValue('--grey-35').trim() || '#a6a6a6',
    }
    const alpha = { run: 0.62, walk: 0.55, trail: 0.7, other: 0.65 }
    const pts = model.pts
    const xs = pts.map((p) => X(p.t)), ys = pts.map((p) => Y(p.hour)), rs = pts.map(rOf)
    const ENTER = 2600 // ms for the sky to fill left to right
    const tMin = pts[0].t, tMax = pts[pts.length - 1].t
    let raf = 0, start = 0, visible = true
    const still = reduce || !armed
    const draw = (now) => {
      if (!start) start = now
      const el = now - start
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        let k = 1
        if (!reduce) {
          if (!armed) k = 0
          else { const at = ((p.t - tMin) / (tMax - tMin)) * ENTER; k = Math.max(0, Math.min(1, (el - at) / 500)) }
        }
        if (k <= 0) continue
        const s = el / 1000
        const dx = still ? 0 : Math.sin(s * p.sp + p.ph) * p.amp
        const dy = still ? 0 : Math.cos(s * p.sp * 0.8 + p.ph2) * p.amp * 1.3
        const ease = 1 - Math.pow(1 - k, 3)
        ctx.globalAlpha = alpha[p.g] * ease
        ctx.fillStyle = col[p.g]
        ctx.beginPath()
        ctx.arc(xs[i] + dx, ys[i] + dy + (1 - ease) * 10, rs[i] * (0.4 + 0.6 * ease), 0, Math.PI * 2)
        ctx.fill()
      }
      // the newest outing breathes
      const lp = pts.length - 1
      if (!reduce && armed && el > ENTER) {
        const b = (Math.sin(el / 420) + 1) / 2
        ctx.globalAlpha = 0.25 * (1 - b)
        ctx.fillStyle = col.run
        ctx.beginPath(); ctx.arc(xs[lp], ys[lp], rs[lp] + 3 + b * (narrow ? 5 : 9), 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      if (!still && visible) raf = requestAnimationFrame(draw)
    }
    const io = new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting
      if (visible && !was && !still) raf = requestAnimationFrame(draw)
    }, { threshold: 0 })
    io.observe(cv)
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, W, H, armed, reduce])

  const actN = useCountUp(activities.length, coIn && !!model, { dur: 2700 })
  const kmN = useCountUp(Math.round(toNum(km) || 0), coIn && !!model, { dur: 2700 })
  const elevN = useCountUp(Math.round(toNum(elevation) || 0), coIn && !!model, { dur: 2700 })
  const streakN = useCountUp(Math.round(toNum(streak) || (model ? model.streakLen : 0)), coIn && !!model, { dur: 2700 })

  if (!model) {
    return (
      <div ref={ref} className="sky">
        <div ref={stage} className="sky__stage"><div className="sky__plot" style={{ height: 420 }} /></div>
        <div ref={coRef} className="beat__callouts" />
      </div>
    )
  }

  const { gap, streakStart, streakLen, years, hours, notes, activeDays, first } = model
  const gx0 = X((gap.from + 1) * DAY), gx1 = X(gap.to * DAY)
  const sx0 = X(streakStart), sx1 = X(model.last)
  const hMax = Math.max(...hours)
  // callouts: two lanes, each note takes the first lane where it does not overlap
  const laneEnd = [-1e9, -1e9]
  const placed = lanes ? notes.map((n) => {
    const x = X(n.p.t), w = 9 + Math.max(n.title.length, n.sub.length) * 7.1
    let lane = laneEnd[0] < x - 8 ? 0 : 1
    if (lane === 1 && laneEnd[1] > x - 8) return null
    if (x + w > W - m.r) return null
    laneEnd[lane] = x + w
    return { ...n, x, y: Y(n.p.hour), lane }
  }).filter(Boolean) : []
  const yearTicks = years.map((yy) => {
    const a = Math.max(tSpan[0], Date.UTC(yy.y, 0, 1)), b = Math.min(tSpan[1], Date.UTC(yy.y + 1, 0, 1))
    return { ...yy, x0: X(Date.UTC(yy.y, 0, 1)), mid: (X(a) + X(b)) / 2 }
  })

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H
    let best = null, bd = 14 * 14
    for (const p of model.pts) {
      const dx = X(p.t) - mx, dy = Y(p.hour) - my, d = dx * dx + dy * dy
      if (d < bd) { bd = d; best = p }
    }
    setHover(best)
  }

  return (
    <div ref={ref} className="sky">
      <div ref={stage} className={`sky__stage${armed ? ' is-in' : ''}`}>
        <div className="sky__head">
          <p className="sky__key">
            Every outing since {MONTH[new Date(first).getUTCMonth()]} {new Date(first).getUTCFullYear()}, one dot each.
            Across is time, down is the hour it started, size is the distance on foot.
          </p>
          <ul className="sky__legend" aria-label="Colour key">
            <li><i className="sky__sw sky__sw--run" aria-hidden="true" />Run</li>
            <li><i className="sky__sw sky__sw--walk" aria-hidden="true" />Walk</li>
            <li><i className="sky__sw sky__sw--trail" aria-hidden="true" />Trail run, hike</li>
            <li><i className="sky__sw sky__sw--other" aria-hidden="true" />Other</li>
          </ul>
        </div>

        <div className="sky__plot" style={{ height: H }}>
          <svg className="sky__under" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {/* hour guides and year lines */}
            {[6, 12, 18].map((h) => (
              <g key={h}>
                <line x1={m.l} x2={W - m.r} y1={Y(h)} y2={Y(h)} stroke="var(--rule-faint)" strokeDasharray="2 4" />
                <text x={m.l - 8} y={Y(h) + 4} textAnchor="end" className="sky__tick">{h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`}</text>
              </g>
            ))}
            {yearTicks.slice(1).map((yy) => (
              <line key={yy.y} x1={yy.x0} x2={yy.x0} y1={m.t - 4} y2={H - m.b} stroke="var(--rule-faint)" />
            ))}
            <rect className="sky__gap" x={gx0} y={m.t} width={Math.max(0, gx1 - gx0)} height={plotH} />
          </svg>
          <canvas ref={canvasRef} className="sky__canvas" style={{ width: W, height: H }} />
          <svg className="sky__over" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`${model.pts.length.toLocaleString()} outings from ${fmtDate(model.first)} to ${fmtDate(model.last)}, placed by date and by the hour they started. Most start before 10 in the morning or after 4 in the afternoon. A ${gap.len}-day gap with no outings, then the habit. The current streak is ${streakLen} days.`}>
            {/* the silence: inside its band when there is room, above it on a phone */}
            {narrow ? (
              <text x={gx0} y={m.t - 18} textAnchor="start" className="sky__gapl"><tspan className="sky__gapn">{gap.len}</tspan> days silent</text>
            ) : (
              <>
                <text x={(gx0 + gx1) / 2} y={m.t + plotH / 2 - 6} textAnchor="middle" className="sky__gapn">{gap.len} days</text>
                <text x={(gx0 + gx1) / 2} y={m.t + plotH / 2 + 16} textAnchor="middle" className="sky__gapl">without one</text>
              </>
            )}
            {/* the streak */}
            <path className="sky__streak" d={`M${sx0} ${m.t - 2} V${m.t - 8} H${sx1} V${m.t - 2}`} fill="none" />
            <text x={sx1} y={m.t - 14} textAnchor="end" className="sky__streakl"><tspan className="sky__streakn">{streakLen}</tspan> {narrow ? 'days in a row' : 'days in a row, still going'}</text>
            {/* callouts */}
            {placed.map((n) => {
              const ly = n.lane === 0 ? 14 : 40
              return (
                <g key={n.title} className="sky__note">
                  <line x1={n.x} x2={n.x} y1={ly + 20} y2={n.y - rOf(n.p) - 5} stroke="var(--ink)" strokeWidth="1" />
                  <circle cx={n.x} cy={n.y} r={rOf(n.p) + 4} fill="none" stroke="var(--ink)" strokeWidth="1.2" />
                  <text x={n.x - 2} y={ly} className="sky__nt">{n.title}</text>
                  <text x={n.x - 2} y={ly + 14} className="sky__ns">{n.sub}</text>
                </g>
              )
            })}
            {/* years, with the count of outings in each */}
            {yearTicks.map((yy) => (
              <g key={yy.y}>
                <text x={yy.mid} y={H - m.b + 16} textAnchor="middle" className="sky__yr">{narrow ? `'${String(yy.y).slice(2)}` : yy.y}</text>
                {!narrow && <text x={yy.mid} y={H - m.b + 31} textAnchor="middle" className="sky__yn">{yy.n.toLocaleString()}</text>}
              </g>
            ))}
            {/* the hour profile on the right: how many outings start in each hour */}
            {marg && (
              <g className="sky__marg">
                <text x={W - m.r + 14} y={m.t - 12} className="sky__tick">by hour</text>
                {hours.slice(H0).map((c, i) => {
                  const h = H0 + i
                  const bh = (plotH / (H1 - H0)) * 0.72
                  return <rect key={h} x={W - m.r + 14} y={Y(h + 0.5) - bh / 2} width={(c / hMax) * (m.r - 22)} height={bh} rx="1.5"
                    className={c / hMax > 0.55 ? 'sky__mb sky__mb--hi' : 'sky__mb'} style={{ '--d': `${i * 40}ms` }} />
                })}
              </g>
            )}
            {hover && (
              <circle cx={X(hover.t)} cy={Y(hover.hour)} r={rOf(hover) + 3} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            )}
          </svg>
          <div className="sky__hit" onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true" />
          {hover && (
            <div className="sky__read" style={{ left: `${Math.max(10, Math.min(90, (X(hover.t) / W) * 100))}%`, top: Math.max(0, Y(hover.hour) - 58) }}>
              <b>{fmtDate(hover.t)}</b> · {fmtHour(hover.hour)}<br />{NAME[hover.g]}{hover.km > 0 ? ` · ${hover.km.toFixed(1)} km` : ''}
            </div>
          )}
        </div>
      </div>

      <div ref={coRef} className={`beat__callouts${coIn ? ' is-in' : ''}`}>
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

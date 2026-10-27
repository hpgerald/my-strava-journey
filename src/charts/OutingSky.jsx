import { useEffect, useMemo, useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView, usePrefersReducedMotion } from '../components/Reveal.jsx'
import { toNum } from '../lib/format.js'

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
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const parseT = (s0) => { const s = (s0 || '').replace(' ', 'T'); return Date.parse(s + (s.length > 10 ? 'Z' : 'T00:00:00Z')) }

// Every outing as one dot in a single sky. Across is time, down is the hour it
// started, size is the distance on foot, colour is the sport. With no `year` it
// draws the whole record (the home hero); with a `year` it draws that year alone,
// month by month, marking its longest silence, its longest streak and its three
// biggest days. Dots arrive left to right, then drift gently so the sky looks
// alive; motion stops off screen and for reduced-motion users.
// props: activities (the year's only, when `year` is set), year?, recordFirstISO?,
//   recordLastISO? (to know whether a streak is still going and what is still to come)
export default function OutingSky({ activities, year, recordFirstISO, recordLastISO }) {
  const [ref, width] = useWidth(960)
  const [stage, inView] = useInView({ threshold: 0.05, rootMargin: '0px' })
  const reduce = usePrefersReducedMotion()
  const canvasRef = useRef(null)
  const [hover, setHover] = useState(null)
  const yearMode = year != null

  const model = useMemo(() => {
    const pts = []
    for (const a of activities) {
      const t = parseT(a.date)
      if (!Number.isFinite(t)) continue
      const d = new Date(t)
      const foot = FOOT.has(a.sport_type)
      pts.push({
        t, hour: d.getUTCHours() + d.getUTCMinutes() / 60, g: GROUP(a.sport_type), sport: a.sport_type,
        km: foot ? toNum(a.distance_km) || 0 : 0, elev: foot ? toNum(a.elevation_gain_m) || 0 : 0, min: toNum(a.moving_time_min) || 0, key: a.activity_key,
      })
    }
    if (pts.length < 3) return null
    pts.sort((p, q) => p.t - q.t)
    const dk = (t) => Math.floor(t / DAY)
    const days = [...new Set(pts.map((p) => dk(p.t)))].sort((p, q) => p - q)
    const recLast = recordLastISO ? dk(parseT(recordLastISO)) : days[days.length - 1]
    const recFirst = recordFirstISO ? dk(parseT(recordFirstISO)) : days[0]
    // the window: the whole record, or the year (from its first month on record)
    let t0, t1
    if (yearMode) {
      const fd = new Date(recFirst * DAY)
      t0 = fd.getUTCFullYear() === year ? Date.UTC(year, fd.getUTCMonth(), 1) : Date.UTC(year, 0, 1)
      t1 = Date.UTC(year + 1, 0, 1)
    } else {
      t0 = Date.UTC(new Date(pts[0].t).getUTCFullYear(), new Date(pts[0].t).getUTCMonth(), 1)
      t1 = pts[pts.length - 1].t + 20 * DAY
    }
    const lastJudged = Math.min(dk(t1) - 1, recLast)
    // the longest silence: between outings, and (in a year) running in from the
    // start of the year or out to its end when the record continues past them
    let gap = { len: 0, from: null, to: null }
    for (let i = 1; i < days.length; i++) { const g = days[i] - days[i - 1] - 1; if (g > gap.len) gap = { len: g, from: days[i - 1], to: days[i] } }
    if (yearMode) {
      const lead = days[0] - dk(t0)
      if (dk(t0) > recFirst && lead > gap.len) gap = { len: lead, from: dk(t0) - 1, to: days[0] }
      const trail = lastJudged - days[days.length - 1]
      if (trail > gap.len) gap = { len: trail, from: days[days.length - 1], to: lastJudged + 1 }
    }
    // the streak: the one still running (whole record) or the year's longest
    const set = new Set(days)
    let sBest = { len: 0, start: days[0], end: days[0] }
    if (!yearMode) {
      let s = days[days.length - 1]
      while (set.has(s - 1)) s--
      sBest = { len: days[days.length - 1] - s + 1, start: s, end: days[days.length - 1] }
    } else {
      let run = 0, st = days[0]
      for (let i = 0; i < days.length; i++) {
        if (i && days[i] - days[i - 1] === 1) run++; else { run = 1; st = days[i] }
        if (run > sBest.len) sBest = { len: run, start: st, end: days[i] }
      }
    }
    const stillGoing = sBest.end === recLast
    // ticks: years for the record, months for a year
    const ticks = []
    if (!yearMode) {
      for (let y = new Date(t0).getUTCFullYear(); y <= new Date(pts[pts.length - 1].t).getUTCFullYear(); y++) {
        ticks.push({ a: Math.max(t0, Date.UTC(y, 0, 1)), b: Math.min(t1, Date.UTC(y + 1, 0, 1)), line: Date.UTC(y, 0, 1), label: String(y), short: `'${String(y).slice(2)}`, n: pts.filter((p) => new Date(p.t).getUTCFullYear() === y).length })
      }
    } else {
      for (let mo = 0; mo < 12; mo++) {
        const a = Date.UTC(year, mo, 1), b = Date.UTC(year, mo + 1, 1)
        if (b <= t0) continue
        ticks.push({ a: Math.max(a, t0), b, line: a, label: MON[mo], short: MON[mo].slice(0, 1), n: pts.filter((p) => p.t >= a && p.t < b).length })
      }
    }
    const hours = new Array(24).fill(0)
    for (const p of pts) hours[Math.floor(p.hour)] += 1
    // callouts
    const best = (f, pool = pts) => (pool.length ? pool.reduce((b, p) => (f(p) > f(b) ? p : b), pool[0]) : null)
    let notes
    if (!yearMode) {
      const top = (g) => best((p) => p.km, pts.filter((p) => p.sport === g))
      notes = [
        { p: pts[0], title: 'The first outing', sub: `${MONTH[new Date(pts[0].t).getUTCMonth()]} ${new Date(pts[0].t).getUTCFullYear()}` },
        top('Run') && { p: top('Run'), title: top('Run').km >= 42 ? 'The marathon' : 'The longest run', sub: `${top('Run').km.toFixed(1)} km` },
        top('TrailRun') && { p: top('TrailRun'), title: 'The longest trail run', sub: `${top('TrailRun').km.toFixed(1)} km` },
        top('Walk') && { p: top('Walk'), title: 'The longest walk', sub: `${Math.round(top('Walk').km)} km` },
      ].filter(Boolean)
    } else {
      const far = best((p) => p.km), up = best((p) => p.elev), long = best((p) => p.min)
      const seen = new Set()
      notes = [
        far && far.km > 0 && { p: far, title: 'Furthest on foot', sub: `${far.km.toFixed(1)} km` },
        up && up.elev > 50 && { p: up, title: 'Most climbed', sub: `${Math.round(up.elev).toLocaleString()} m` },
        long && long.min > 0 && { p: long, title: 'Longest out', sub: hm(long.min) },
      ].filter(Boolean).filter((n) => (seen.has(n.p.key) ? false : (seen.add(n.p.key), true)))
        .sort((a, b) => a.p.t - b.p.t)
    }
    let seed = 7 + (year || 0)
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (const p of pts) { p.ph = rnd() * Math.PI * 2; p.ph2 = rnd() * Math.PI * 2; p.sp = 0.35 + rnd() * 0.55; p.amp = 0.6 + rnd() * 1.4 }
    const future = yearMode && recLast < dk(t1) - 1 ? { from: (recLast + 1) * DAY, to: t1 } : null
    return { pts, t0, t1, gap, streak: sBest, stillGoing, ticks, hours, notes, future, firstT: pts[0].t, lastT: pts[pts.length - 1].t }
  }, [activities, year, yearMode, recordFirstISO, recordLastISO])

  const W = Math.max(300, width)
  const narrow = W < 640
  const marg = !narrow
  const lanes = !narrow
  const m = { l: narrow ? 40 : 44, r: marg ? 88 : 6, t: lanes ? 92 : 40, b: 38 }
  const H = (narrow ? 250 : yearMode ? 300 : 330) + m.t + m.b
  const plotH = H - m.t - m.b
  const tSpan = model ? [model.t0, model.t1] : [0, 1]
  const X = (t) => m.l + ((t - tSpan[0]) / (tSpan[1] - tSpan[0])) * (W - m.l - m.r)
  const Y = (h) => m.t + ((Math.max(H0, Math.min(H1 - 0.01, h)) - H0) / (H1 - H0)) * plotH
  // a year has far fewer dots, so they can be a little bigger
  const rOf = (p) => (p.km > 0 ? 1.4 + Math.sqrt(p.km) * (narrow ? 0.72 : yearMode ? 1.35 : 1.05) : narrow ? 1.3 : yearMode ? 2.2 : 1.7)

  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!inView || !model || armed) return
    let a = 0, b = 0
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [inView, armed, model])

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
    const ENTER = yearMode ? 1800 : 2600
    const tMin = pts[0].t, tMax = pts[pts.length - 1].t
    let raf = 0, start = 0, visible = true
    const still = reduce || !armed
    const draw = (now) => {
      if (!start) start = now
      const el = now - start
      // off screen: keep the clock ticking but skip the drawing work
      if (!still && !visible) { raf = requestAnimationFrame(draw); return }
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        let k = 1
        if (!reduce) {
          if (!armed) k = 0
          else { const at = ((p.t - tMin) / Math.max(1, tMax - tMin)) * ENTER; k = Math.max(0, Math.min(1, (el - at) / 500)) }
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
      const lp = pts.length - 1
      if (!reduce && armed && el > ENTER && model.stillGoing) {
        const b = (Math.sin(el / 420) + 1) / 2
        ctx.globalAlpha = 0.25 * (1 - b)
        ctx.fillStyle = col.run
        ctx.beginPath(); ctx.arc(xs[lp], ys[lp], rs[lp] + 3 + b * (narrow ? 5 : 9), 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      if (!still) raf = requestAnimationFrame(draw)
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(cv)
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, W, H, armed, reduce])

  if (!model) return <div ref={ref} className="sky"><div ref={stage} className="sky__stage"><div className="sky__plot" style={{ height: 380 }} /></div></div>

  const { gap, streak, stillGoing, ticks, hours, notes, future } = model
  const showGap = gap.len >= (yearMode ? 14 : 30)
  const gx0 = showGap ? X((gap.from + 1) * DAY) : 0, gx1 = showGap ? X(gap.to * DAY) : 0
  const sx0 = X(streak.start * DAY), sx1 = X((streak.end + 1) * DAY)
  const showStreak = streak.len >= 3
  const hMax = Math.max(1, ...hours)
  const laneEnd = [-1e9, -1e9]
  const placed = lanes ? notes.map((n) => {
    const x = X(n.p.t), w = 9 + Math.max(n.title.length, n.sub.length) * 7.1
    const lane = laneEnd[0] < x - 8 ? 0 : 1
    if (lane === 1 && laneEnd[1] > x - 8) return null
    if (x + w > W - m.r) return null
    laneEnd[lane] = x + w
    return { ...n, x, y: Y(n.p.hour), lane }
  }).filter(Boolean) : []
  const fromJan = yearMode && streak.start * DAY <= model.t0
  const streakTxt = `${streak.len} ${narrow ? 'days in a row' : fromJan && stillGoing ? 'days in a row, every day so far' : stillGoing ? 'days in a row, still going' : yearMode ? 'days in a row, the longest run' : 'days in a row'}`
  const first = new Date(model.firstT)
  // the streak label sits on its bracket: starting at the bracket when it fits,
  // ending at it otherwise, and never past either edge of the plot
  const lw = 12 + streakTxt.length * (narrow ? 6.4 : 7.2)
  const lStart = sx0 + lw <= W - m.r
  const lx0 = lStart ? sx0 : Math.max(sx1, m.l + lw) - lw, lx1 = lx0 + lw

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H
    let best = null, bd = 14 * 14
    for (const p of model.pts) { const dx = X(p.t) - mx, dy = Y(p.hour) - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p } }
    setHover(best)
  }

  return (
    <div ref={ref} className="sky">
      <div ref={stage} className={`sky__stage${armed ? ' is-in' : ''}`}>
        <div className="sky__head">
          <p className="sky__key">
            {yearMode
              ? `Every outing of ${year}. The higher the dot, the earlier in the day I went out.`
              : `Every outing since ${MONTH[first.getUTCMonth()]} ${first.getUTCFullYear()}. The higher the dot, the earlier in the day I went out.`}
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
            {[6, 12, 18].map((h) => (
              <g key={h}>
                <line x1={m.l} x2={W - m.r} y1={Y(h)} y2={Y(h)} stroke="var(--rule-faint)" strokeDasharray="2 4" />
                <text x={m.l - 8} y={Y(h) + 4} textAnchor="end" className="sky__tick">{h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`}</text>
              </g>
            ))}
            {ticks.slice(1).map((tk) => (
              <line key={tk.line} x1={X(tk.line)} x2={X(tk.line)} y1={m.t - 4} y2={H - m.b} stroke="var(--rule-faint)" />
            ))}
            {showGap && <rect className="sky__gap" x={gx0} y={m.t} width={Math.max(0, gx1 - gx0)} height={plotH} />}
            {future && <rect className="sky__future" x={X(future.from)} y={m.t} width={Math.max(0, X(future.to) - X(future.from))} height={plotH} />}
          </svg>
          <canvas ref={canvasRef} className="sky__canvas" style={{ width: W, height: H }} />
          <svg className="sky__over" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`${model.pts.length.toLocaleString()} outings${yearMode ? ` in ${year}` : ''}, placed by date and by the hour they started.${showGap ? ` The longest stretch without one was ${gap.len} days.` : ''} The longest run of days in a row was ${streak.len}.`}>
            {showGap && (narrow || gx1 - gx0 < 110 ? (showStreak && gx0 < lx1 && gx0 + 125 > lx0 ? null : (
              <text x={gx0} y={m.t - 18} textAnchor="start" className="sky__gapl"><tspan className="sky__gapn">{gap.len}</tspan> days silent</text>
            )) : (
              <>
                <text x={(gx0 + gx1) / 2} y={m.t + plotH / 2 - 6} textAnchor="middle" className="sky__gapn">{gap.len} days</text>
                <text x={(gx0 + gx1) / 2} y={m.t + plotH / 2 + 16} textAnchor="middle" className="sky__gapl">without one</text>
              </>
            ))}
            {future && X(future.to) - X(future.from) > 70 && (
              <text x={(X(future.from) + X(future.to)) / 2} y={m.t + plotH / 2 + 4} textAnchor="middle" className="sky__gapl">still to come</text>
            )}
            {showStreak && (
              <>
                <path className="sky__streak" d={`M${sx0} ${m.t - 2} V${m.t - 8} H${sx1} V${m.t - 2}`} fill="none" />
                <text x={lStart ? lx0 : lx1} y={m.t - 14} textAnchor={lStart ? 'start' : 'end'} className="sky__streakl">
                  <tspan className="sky__streakn">{streak.len}</tspan> {streakTxt.replace(/^\d+ /, '')}
                </text>
              </>
            )}
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
            {ticks.map((tk) => (
              <g key={tk.line}>
                <text x={(X(tk.a) + X(tk.b)) / 2} y={H - m.b + 16} textAnchor="middle" className="sky__yr">{narrow ? tk.short : tk.label}</text>
                {!narrow && <text x={(X(tk.a) + X(tk.b)) / 2} y={H - m.b + 31} textAnchor="middle" className="sky__yn">{tk.n.toLocaleString()}</text>}
              </g>
            ))}
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
            {hover && <circle cx={X(hover.t)} cy={Y(hover.hour)} r={rOf(hover) + 3} fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
          </svg>
          <div className="sky__hit" onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true" />
          {hover && (
            <div className="sky__read" style={{ left: `${Math.max(10, Math.min(90, (X(hover.t) / W) * 100))}%`, top: Math.max(0, Y(hover.hour) - 58) }}>
              <b>{fmtDate(hover.t)}</b> · {fmtHour(hover.hour)}<br />{NAME[hover.g]}{hover.km > 0 ? ` · ${hover.km.toFixed(1)} km` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

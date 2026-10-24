import { useEffect, useMemo, useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView, usePrefersReducedMotion } from '../components/Reveal.jsx'
import { MODES } from '../lib/footReport.js'

// Every outing on foot as a dot against time, and the record it was chasing as
// a staircase: the line holds flat while the best stands and steps up the day it
// breaks. Record-setting outings are ringed; a few are named. Dots arrive left to
// right, then the staircase draws itself; with `alive` the dots drift a little.
// props: points [{ t, v, mode, date }], records [{ t, v }] (the progression, in
//   order), endT (the last day on record), notes [{ t, v, title, sub }], yMax,
//   sqrt (square-root height scale), yTicks, yFmt, yCap, valFmt, alive, aria
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (t) => { const d = new Date(t); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
const NAME = { tread: 'Treadmill run', road: 'Outdoor run', trail: 'Trail run', walk: 'Walk', hike: 'Hike' }

export default function RecordStairs({ points, records, endT, notes = [], yMax, sqrt = false, yTicks = [], yFmt = (v) => v, yCap, valFmt = (v) => v, alive = false, aria, tall = false }) {
  const [ref, width] = useWidth(960)
  const [stage, inView] = useInView({ threshold: 0.1, rootMargin: '0px' })
  const reduce = usePrefersReducedMotion()
  const canvasRef = useRef(null)
  const [armed, setArmed] = useState(false)
  const [hover, setHover] = useState(null)

  const W = Math.max(300, width)
  const narrow = W < 640
  const m = { l: narrow ? 46 : 52, r: narrow ? 10 : 18, t: narrow ? 72 : 78, b: 30 }
  const plotH = narrow ? 280 : tall ? 380 : 320
  const H = m.t + plotH + m.b
  const t0 = useMemo(() => { const d = new Date(Math.min(...points.map((p) => p.t))); return Date.UTC(d.getUTCFullYear(), 0, 1) }, [points])
  const t1 = endT + 20 * 86400000
  const X = (t) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r)
  const f = (v) => (sqrt ? Math.sqrt(Math.max(0, v) / yMax) : Math.max(0, v) / yMax)
  const Y = (v) => m.t + plotH - Math.min(1, f(v)) * plotH
  const rOf = (p) => (narrow ? 1.6 : 2.1) + (p.rec ? 1 : 0)
  const recSet = useMemo(() => new Set(records.map((r) => r.t)), [records])

  // the staircase path: flat while a record stands, a step up when it breaks
  let d = ''
  records.forEach((r, i) => {
    const x = X(r.t), y = Y(r.v)
    d += i ? ` V${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`
    const nx = i < records.length - 1 ? X(records[i + 1].t) : X(endT)
    d += ` H${nx.toFixed(1)}`
  })
  const years = []
  for (let y = new Date(t0).getUTCFullYear(); Date.UTC(y, 0, 1) < t1; y++) years.push(y)

  useEffect(() => {
    if (!inView || armed) return
    let a = 0, b = 0
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [inView, armed])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(cv)
    const col = Object.fromEntries(MODES.map((k) => [k, css.getPropertyValue(`--m-${k}`).trim() || '#888']))
    let seed = 5
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const pts = points.map((p) => ({ ...p, x: X(p.t), y: Y(p.v), ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.5, amp: 0.4 + rnd() * 0.9 }))
    const ENTER = 1800
    let raf = 0, start = 0, visible = true
    const moving = alive && !reduce && armed
    const draw = (now) => {
      if (!start) start = now
      const el = now - start
      if (moving && !visible) { raf = requestAnimationFrame(draw); return }
      ctx.clearRect(0, 0, W, H)
      for (const p of pts) {
        let k = 1
        if (!reduce) { if (!armed) k = 0; else { const at = ((p.x - m.l) / (W - m.l - m.r)) * ENTER; k = Math.max(0, Math.min(1, (el - at) / 500)) } }
        if (k <= 0) continue
        const s = el / 1000
        const dx = moving ? Math.sin(s * p.sp + p.ph) * p.amp : 0
        const dy = moving ? Math.cos(s * p.sp * 0.8 + p.ph) * p.amp : 0
        ctx.globalAlpha = (p.mode === 'hike' ? 0.85 : 0.42) * k
        ctx.beginPath()
        ctx.arc(p.x + dx, p.y + dy, (narrow ? 1.6 : 2.1) * (0.5 + 0.5 * k), 0, Math.PI * 2)
        if (p.mode === 'hike') { ctx.strokeStyle = col.hike; ctx.lineWidth = 1.2; ctx.stroke() } else { ctx.fillStyle = col[p.mode]; ctx.fill() }
      }
      ctx.globalAlpha = 1
      if (!reduce && (moving || el < ENTER + 600)) raf = requestAnimationFrame(draw)
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(cv)
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, W, H, armed, reduce, alive])

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H
    let best = null, bd = 10 * 10
    for (const p of points) { const dx = X(p.t) - mx, dy = Y(p.v) - my, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = p } }
    setHover(best)
  }

  // callouts sit in two lanes above the plot, kept apart left to right
  const laneEnd = [-1e9, -1e9]
  const placed = notes.map((n) => {
    const x = X(n.t), w = 10 + Math.max(n.title.length, (n.sub || '').length) * (narrow ? 6.2 : 7)
    const ax = Math.max(m.l, Math.min(x, W - m.r - w))
    const lane = laneEnd[0] < ax - 6 ? 0 : laneEnd[1] < ax - 6 ? 1 : -1
    if (lane < 0) return null
    laneEnd[lane] = ax + w
    return { ...n, x, ax, lane }
  }).filter(Boolean)
  const len = W * 3

  return (
    <div ref={ref} className="rst">
      <div ref={stage} className={`rst__stage${armed ? ' is-in' : ''}`}>
        <div className="rst__plot" style={{ height: H }}>
          <svg className="rst__under" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--ink)' : 'var(--rule-faint)'} strokeDasharray={v === 0 ? undefined : '2 4'} />
                <text x={m.l - 7} y={Y(v) + 4} textAnchor="end" className="rst__tick">{yFmt(v)}</text>
              </g>
            ))}
            {years.map((y) => (
              <g key={y}>
                {Date.UTC(y, 0, 1) > t0 && <line x1={X(Date.UTC(y, 0, 1))} x2={X(Date.UTC(y, 0, 1))} y1={m.t} y2={m.t + plotH} stroke="var(--rule-faint)" />}
                <text x={X(Math.min(t1, Date.UTC(y, 6, 1)))} y={H - 10} textAnchor="middle" className="rst__tick">{narrow ? `'${String(y).slice(2)}` : y}</text>
              </g>
            ))}
            {yCap && <text x={m.l - 7} y={m.t - (narrow ? 50 : 62)} className="rst__axis">{yCap}</text>}
          </svg>
          <canvas ref={canvasRef} className="rst__canvas" style={{ width: W, height: H }} />
          <svg className="rst__over" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
            <path d={d} className="rst__stair" fill="none" strokeDasharray={len} style={{ '--len': len }} />
            {records.map((r, i) => (
              <circle key={i} cx={X(r.t)} cy={Y(r.v)} r={i === records.length - 1 ? 5.5 : 3.6} className={`rst__rec${i === records.length - 1 ? ' is-now' : ''}`} style={{ '--d': `${1.6 + (i / records.length) * 1.4}s` }} />
            ))}
            {placed.map((n) => {
              const ly = n.lane === 0 ? 14 : 44
              return (
                <g key={n.title} className="rst__note">
                  <line x1={n.x} x2={n.x} y1={ly + (n.sub ? 18 : 6)} y2={Y(n.v) - 7} stroke="var(--ink)" strokeWidth="1" />
                  <text x={n.ax} y={ly} className="rst__nt">{n.title}</text>
                  {n.sub && <text x={n.ax} y={ly + 13} className="rst__ns">{n.sub}</text>}
                </g>
              )
            })}
            {hover && <circle cx={X(hover.t)} cy={Y(hover.v)} r={rOf(hover) + 3.5} fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
          </svg>
          <div className="rst__hit" onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true" />
          {hover && (
            <div className="chart-tip" style={{ left: `${Math.max(12, Math.min(88, (X(hover.t) / W) * 100))}%`, top: Math.max(0, Y(hover.v) - 58) }}>
              <b>{fmtDate(hover.t)}</b> · {NAME[hover.mode]}<br />{valFmt(hover.v)}{recSet.has(hover.t) ? ' · a new record' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

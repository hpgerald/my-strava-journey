import { useEffect, useMemo, useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView, usePrefersReducedMotion } from '../components/Reveal.jsx'
import { MODES, MODE_NAME, TREAD_MIN } from '../lib/footReport.js'

// Every outing on foot placed by how it moved: across is the pace (minutes per
// kilometre, quicker to the left), up is how much it climbed for each kilometre,
// size is the distance and colour is the way of moving. Outings with no climb at
// all (every treadmill run, the indoor walks) sit in a floor lane below the axis,
// spread a little so they can be seen. Each way of moving gathers into its own
// cloud, and the cloud is named at its middle. Dots arrive in the order they were
// logged, then drift gently; motion stops off screen and for reduced motion.
// props: rows (the foot report's per-outing rows), counts {mode: n}
const P0 = 3, P1 = 26 // pace window, minutes per km
const C1 = 160 // climb window, metres per km
const fmtPace = (p) => { const m = Math.floor(p), s = Math.round((p - m) * 60); return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}` }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const median = (v) => { const s = v.slice().sort((a, b) => a - b); const i = (s.length - 1) / 2; return s.length ? (s[Math.floor(i)] + s[Math.ceil(i)]) / 2 : 0 }

export default function FootMap({ rows }) {
  const [ref, width] = useWidth(960)
  const [stage, inView] = useInView({ threshold: 0.05, rootMargin: '0px' })
  const reduce = usePrefersReducedMotion()
  const canvasRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [armed, setArmed] = useState(false)

  const model = useMemo(() => {
    const pts = []
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (const r of rows) {
      if (!(r.km > 0.2) || !(r.min > 0)) continue
      const pace = r.min / r.km
      if (r.mode === 'tread' && pace < TREAD_MIN) continue
      const mpk = r.elev / r.km
      pts.push({ ...r, pace, mpk, flat: r.elev <= 0, jit: rnd(), ph: rnd() * Math.PI * 2, ph2: rnd() * Math.PI * 2, sp: 0.35 + rnd() * 0.5, amp: 0.5 + rnd() * 1.1 })
    }
    pts.sort((a, b) => a.t - b.t)
    const mid = {}
    for (const k of MODES) {
      const g = pts.filter((p) => p.mode === k)
      if (!g.length) continue
      const climbing = g.filter((p) => !p.flat)
      mid[k] = { n: g.length, pace: median(g.map((p) => p.pace)), mpk: climbing.length > g.length / 2 ? median(climbing.map((p) => p.mpk)) : 0, flat: climbing.length <= g.length / 2 }
    }
    return { pts, mid }
  }, [rows])

  const W = Math.max(300, width)
  const narrow = W < 640
  const m = { l: narrow ? 34 : 46, r: narrow ? 8 : 16, t: 18, b: 44 }
  const floorH = narrow ? 30 : 38
  const plotH = narrow ? 300 : 380
  const H = m.t + plotH + 10 + floorH + m.b
  const yFloor0 = m.t + plotH + 10, yFloor1 = yFloor0 + floorH
  const X = (p) => m.l + ((Math.max(P0, Math.min(P1, p)) - P0) / (P1 - P0)) * (W - m.l - m.r)
  const Y = (c) => m.t + plotH - (Math.sqrt(Math.max(0, Math.min(C1, c))) / Math.sqrt(C1)) * plotH
  const posY = (p) => (p.flat ? yFloor0 + 5 + p.jit * (floorH - 10) : Y(p.mpk))
  const rOf = (p) => 1.2 + Math.sqrt(p.km) * (narrow ? 0.62 : 0.9)

  useEffect(() => {
    if (!inView || armed) return
    let a = 0, b = 0
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setArmed(true)) })
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) }
  }, [inView, armed])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !model.pts.length) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(cv)
    const col = Object.fromEntries(MODES.map((k) => [k, css.getPropertyValue(`--m-${k}`).trim() || '#888']))
    const alpha = { tread: 0.5, road: 0.75, trail: 0.8, walk: 0.5, hike: 0.95 }
    const pts = model.pts
    const xs = pts.map((p) => X(p.pace)), ys = pts.map(posY), rs = pts.map(rOf)
    const ENTER = 2600
    let raf = 0, start = 0, visible = true
    const still = reduce || !armed
    const draw = (now) => {
      if (!start) start = now
      const el = now - start
      if (!still && !visible) { raf = requestAnimationFrame(draw); return }
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        let k = 1
        if (!reduce) { if (!armed) k = 0; else { const at = (i / pts.length) * ENTER; k = Math.max(0, Math.min(1, (el - at) / 600)) } }
        if (k <= 0) continue
        const s = el / 1000
        const dx = still ? 0 : Math.sin(s * p.sp + p.ph) * p.amp
        const dy = still ? 0 : Math.cos(s * p.sp * 0.8 + p.ph2) * p.amp * 1.2
        const ease = 1 - Math.pow(1 - k, 3)
        ctx.globalAlpha = alpha[p.mode] * ease
        ctx.beginPath()
        ctx.arc(xs[i] + dx, ys[i] + dy - (1 - ease) * 14, rs[i] * (0.4 + 0.6 * ease), 0, Math.PI * 2)
        if (p.mode === 'hike') { ctx.strokeStyle = col.hike; ctx.lineWidth = 1.6; ctx.stroke() } else { ctx.fillStyle = col[p.mode]; ctx.fill() }
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

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H
    let best = null, bd = 12 * 12
    for (const p of model.pts) { const dx = X(p.pace) - mx, dy = posY(p) - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p } }
    setHover(best)
  }

  // where each cloud is named: a label beside its middle, pushed to the side
  // that keeps it clear of its neighbours
  const sc = plotH / 380
  const place = {
    tread: { dx: 0, dy: -46 * sc, anchor: 'middle' },
    road: { dx: narrow ? -26 : -60, dy: -34 * sc, anchor: 'end' },
    walk: { dx: 18, dy: 70 * sc, anchor: 'start' },
    trail: { dx: narrow ? -16 : -30, dy: -100 * sc, anchor: 'end' },
    hike: { dx: narrow ? -10 : 14, dy: 40 * sc, anchor: narrow ? 'end' : 'start' },
  }
  const paceTicks = narrow ? [5, 10, 15, 20, 25] : [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
  const climbTicks = [5, 10, 25, 50, 100, 150]
  const counts = Object.fromEntries(MODES.map((k) => [k, rows.filter((r) => r.mode === k).length]))

  return (
    <div ref={ref} className="fmap">
      <div ref={stage} className={`fmap__stage${armed ? ' is-in' : ''}`}>
        <div className="fmap__head">
          <p className="fmap__key">Every outing on foot. The quicker ones are on the left and the hillier ones near the top.</p>
          <ul className="fmap__legend" aria-label="Colour key">
            {MODES.map((k) => <li key={k}><i className={`msw msw--${k}`} aria-hidden="true" />{MODE_NAME[k]} <span className="fmap__ln">{counts[k].toLocaleString('en-US')}</span></li>)}
          </ul>
        </div>
        <div className="fmap__plot" style={{ height: H }}>
          <svg className="fmap__under" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            {climbTicks.map((c) => (
              <g key={c}>
                <line x1={m.l} x2={W - m.r} y1={Y(c)} y2={Y(c)} stroke="var(--rule-faint)" strokeDasharray="2 4" />
                <text x={m.l - 7} y={Y(c) + 4} textAnchor="end" className="fmap__tick">{c}</text>
              </g>
            ))}
            <line x1={m.l} x2={W - m.r} y1={m.t + plotH} y2={m.t + plotH} stroke="var(--ink)" />
            <rect x={m.l} y={yFloor0} width={W - m.l - m.r} height={floorH} className="fmap__floor" />
            <text x={m.l - 7} y={yFloor0 + floorH / 2 + 4} textAnchor="end" className="fmap__tick">0</text>
            {paceTicks.map((p) => (
              <text key={p} x={X(p)} y={yFloor1 + 16} textAnchor="middle" className="fmap__tick">{p}:00</text>
            ))}
          </svg>
          <canvas ref={canvasRef} className="fmap__canvas" style={{ width: W, height: H }} />
          <svg className="fmap__over" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`Every outing on foot by pace and by climb per kilometre. ${MODES.filter((k) => model.mid[k]).map((k) => `${MODE_NAME[k]}: ${model.mid[k].n} outings, typical pace ${fmtPace(model.mid[k].pace)} a kilometre, ${model.mid[k].flat ? 'no climb' : `${Math.round(model.mid[k].mpk)} metres up per kilometre`}`).join('. ')}.`}>
            <text x={m.l} y={m.t - 4} className="fmap__axis">metres climbed per km &uarr;</text>
            <text x={W - m.r - 4} y={yFloor0 + 12} textAnchor="end" className="fmap__floorl">{narrow ? 'no climb' : 'no climb recorded'}</text>
            <text x={W - m.r} y={H - 6} textAnchor="end" className="fmap__axis">{narrow ? 'min per km, slower →' : 'minutes per kilometre, slower →'}</text>
            {MODES.filter((k) => model.mid[k]).map((k) => {
              const c = model.mid[k], pl = place[k]
              const cx = X(c.pace), cy = c.flat ? yFloor0 + floorH / 2 : Y(c.mpk)
              const lx = Math.max(m.l + 4, Math.min(W - m.r - 4, cx + pl.dx)), ly = cy + pl.dy
              return (
                <g key={k} className="fmap__lab" style={{ '--d': `${MODES.indexOf(k) * 160}ms` }}>
                  <line x1={cx} y1={cy} x2={lx} y2={ly + (pl.dy < 0 ? 8 : -26)} stroke="var(--ink)" strokeWidth="1" />
                  <circle cx={cx} cy={cy} r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
                  <text x={lx} y={ly - 14} textAnchor={pl.anchor} className="fmap__lt">{MODE_NAME[k]}</text>
                  <text x={lx} y={ly} textAnchor={pl.anchor} className="fmap__ls">{fmtPace(c.pace)} a km</text>
                </g>
              )
            })}
            {hover && <circle cx={X(hover.pace)} cy={posY(hover)} r={rOf(hover) + 3} fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
          </svg>
          <div className="fmap__hit" onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true" />
          {hover && (
            <div className="chart-tip" style={{ left: `${Math.max(12, Math.min(88, (X(hover.pace) / W) * 100))}%`, top: Math.max(0, posY(hover) - 62) }}>
              <b>{fmtDate(hover.date)}</b> · {MODE_NAME[hover.mode]}<br />{hover.km.toFixed(1)} km · {fmtPace(hover.pace)} a km · {Math.round(hover.elev)} m up
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

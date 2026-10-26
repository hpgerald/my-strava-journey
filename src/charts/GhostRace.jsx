import { useEffect, useRef, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView, usePrefersReducedMotion } from '../components/Reveal.jsx'

// The same race, every edition at once. The course is drawn as its height
// profile, one faint line per edition, and each edition is a runner on its own
// line, moving at the pace it really ran each half kilometre. The race plays
// once when it comes into view (about twelve seconds for four hours); when the
// quickest edition crosses the line the others are marked where they were.
// props: race [{ year, moving, track [{ d, alt, t }] }], courseKm, aria
const clock = (sec) => { const m = Math.round(sec / 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }

export default function GhostRace({ race, courseKm, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView({ threshold: 0.3 })
  const reduce = usePrefersReducedMotion()
  const [t, setT] = useState(0)
  const [played, setPlayed] = useState(false)
  const raf = useRef(0)
  const end = Math.max(...race.map((r) => r.moving * 60))
  const quick = race.reduce((b, r) => (!b || r.moving < b.moving ? r : b), null)
  const DUR = 12000

  const play = () => {
    cancelAnimationFrame(raf.current)
    const start = performance.now()
    const step = (now) => {
      const f = Math.min(1, (now - start) / DUR)
      setT(f * end)
      if (f < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => {
    if (!inView || played) return
    setPlayed(true)
    if (reduce) { setT(end); return }
    play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, played, reduce])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 340
  const m = { l: 36, r: narrow ? 30 : 40, t: 40, b: 34 }
  const altMin = Math.min(...race.flatMap((r) => r.track.map((p) => p.alt)))
  const altMax = Math.max(...race.flatMap((r) => r.track.map((p) => p.alt)))
  const X = (d) => m.l + (d / courseKm) * (W - m.l - m.r)
  const Y = (a) => m.t + (1 - (a - altMin) / Math.max(1, altMax - altMin)) * (H - m.t - m.b - 40) + 40
  const at = (r, sec) => {
    const tr = r.track
    if (sec >= tr[tr.length - 1].t) return { ...tr[tr.length - 1], done: true }
    for (let i = 1; i < tr.length; i++) if (tr[i].t >= sec) { const f = (sec - tr[i - 1].t) / (tr[i].t - tr[i - 1].t || 1); return { d: tr[i - 1].d + f * (tr[i].d - tr[i - 1].d), alt: tr[i - 1].alt + f * (tr[i].alt - tr[i - 1].alt) } }
    return tr[0]
  }
  const qDone = quick && t >= quick.moving * 60
  const latest = race[race.length - 1]

  return (
    <div ref={ref} className="ghost">
      <div ref={root} className="ghost__plot">
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {[0, 5, 10, 15, 20].map((k) => (
            <g key={k}>
              <line x1={X(k)} x2={X(k)} y1={m.t + 26} y2={H - m.b} stroke="var(--rule-faint)" />
              <text x={X(k)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{k} km</text>
            </g>
          ))}
          <line x1={X(courseKm)} x2={X(courseKm)} y1={m.t + 10} y2={H - m.b} className="ghost__finish" />
          <text x={X(courseKm)} y={m.t + 4} textAnchor="middle" className="ghost__fl">finish</text>
          {race.map((r) => (
            <path key={`p${r.year}`} d={r.track.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)} ${Y(p.alt).toFixed(1)}`).join('')} className={`ghost__course${r === latest ? ' is-now' : ''}`} />
          ))}
          {qDone && race.filter((r) => r !== quick).map((r) => {
            const p = at(r, quick.moving * 60)
            return <line key={`g${r.year}`} x1={X(p.d)} x2={X(p.d)} y1={Y(p.alt) - 10} y2={Y(p.alt) + 10} className="ghost__mark" />
          })}
          {(() => {
            // each runner's year sits up and to the right, stacked so no two touch
            const pos = race.map((r) => ({ r, p: at(r, t) }))
            const labs = pos.filter((o) => !o.p.done).map((o) => ({ year: o.r.year, x: Math.min(X(o.p.d) + 9, W - m.r - 4), y: Y(o.p.alt) - 8 })).sort((a, b) => b.y - a.y)
            for (let i = 1; i < labs.length; i++) if (Math.abs(labs[i].x - labs[i - 1].x) < 34 && labs[i - 1].y - labs[i].y < 12) labs[i].y = labs[i - 1].y - 12
            return pos.map(({ r, p }) => {
              const now = r === latest
              const l = labs.find((z) => z.year === r.year)
              return (
                <g key={r.year}>
                  <circle cx={X(p.d)} cy={Y(p.alt)} r={now ? 7 : 5.5} className={`ghost__runner${now ? ' is-now' : ''}`} />
                  {l && <text x={l.x} y={l.y} className={`ghost__rl${now ? ' is-now' : ''}`}>{r.year}</text>}
                </g>
              )
            })
          })()}
          <text x={m.l} y={30} className="ghost__clock">{clock(t)}</text>
          <text x={m.l + (narrow ? 64 : 76)} y={30} className="cb__axis">into the race</text>
        </svg>
      </div>
      <ol className="ghost__board" aria-hidden="true">
        {race.slice().sort((a, b) => a.moving - b.moving).map((r) => {
          const fin = t >= r.moving * 60
          const behind = quick && r !== quick ? courseKm - r.atQuickest : 0
          return (
            <li key={r.year} className={`ghost__row${fin ? ' is-in' : ''}${r === latest ? ' is-now' : ''}`}>
              <b>{r.year}</b><span className="mono">{fin ? clock(r.moving * 60) : 'running'}</span>
              <small>{r === quick ? 'the quickest' : `${behind.toFixed(1)} km behind when ${quick.year} finished`}</small>
            </li>
          )
        })}
      </ol>
      <button type="button" className="pmap__btn ghost__replay" onClick={() => { setT(0); play() }}>Run it again</button>
    </div>
  )
}

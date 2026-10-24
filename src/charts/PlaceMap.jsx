import { useEffect, useMemo, useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// A filled map of places, shaded by a value on a log scale so one dominant place
// (home) does not wash out the rest; places with nothing logged stay pale grey.
// Values come from the activity log at load time, so the map refreshes with the
// data. A row of buttons switches the measure. The chosen places are named on the
// map with their value. Places fill in one after another, biggest first.
// props: src (geojson path), nameKey, values { name: { [metric]: number } },
//   metrics [{ key, label, unit, fmt }], labels [names to name on the map],
//   maxHeight, crop [lonMin, latMin, lonMax, latMax] (optional), aria,
//   nudge { name: [dx, dy] } moves a label off a small place, with a leader line
//   (dx, dy are fractions of the map width)
const RAMP = ['#ffe0d1', '#ffb38f', '#ff7a3c', '#fc4c02', '#b23400']
const h2 = (x) => parseInt(x, 16)
function lerp(a, b, t) {
  return `rgb(${Math.round(h2(a.slice(1, 3)) + (h2(b.slice(1, 3)) - h2(a.slice(1, 3))) * t)},${Math.round(h2(a.slice(3, 5)) + (h2(b.slice(3, 5)) - h2(a.slice(3, 5))) * t)},${Math.round(h2(a.slice(5, 7)) + (h2(b.slice(5, 7)) - h2(a.slice(5, 7))) * t)})`
}
function ramp(t) {
  const n = RAMP.length - 1
  const i = Math.min(n - 1, Math.max(0, Math.floor(t * n)))
  return lerp(RAMP[i], RAMP[i + 1], t * n - i)
}
// dark text on the light end of the ramp, light text on the dark end
const inkOn = (t) => (t > 0.62 ? 'var(--paper)' : 'var(--ink)')

export default function PlaceMap({ src, nameKey, values, metrics, labels = [], nudge = {}, maxHeight = 560, crop, aria }) {
  const [ref, width] = useWidth(720)
  const [root, inView] = useInView({ threshold: 0.15 })
  const [fc, setFc] = useState(null)
  const [metric, setMetric] = useState(metrics[0].key)
  const [hover, setHover] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let alive = true
    fetch(`${import.meta.env.BASE_URL}${src}`).then((r) => r.json()).then((d) => alive && setFc(d)).catch(() => alive && setFc({ features: [] }))
    return () => { alive = false }
  }, [src])

  const geo = useMemo(() => {
    if (!fc || !fc.features || !fc.features.length) return null
    const feats = fc.features
    let [lonMin, latMin, lonMax, latMax] = crop || [Infinity, Infinity, -Infinity, -Infinity]
    if (!crop) {
      for (const f of feats) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        for (const p of polys) for (const ring of p) for (const [lo, la] of ring) {
          if (lo < lonMin) lonMin = lo; if (lo > lonMax) lonMax = lo; if (la < latMin) latMin = la; if (la > latMax) latMax = la
        }
      }
    }
    return { feats, lonMin, latMin, lonMax, latMax }
  }, [fc, crop])

  const m = metrics.find((x) => x.key === metric) || metrics[0]
  if (!geo) {
    return <div ref={ref} style={{ height: 320, display: 'grid', placeItems: 'center' }}><span className="source">Loading map…</span></div>
  }

  const W = Math.max(280, width)
  const pad = 8
  const kx = Math.cos((((geo.latMin + geo.latMax) / 2) * Math.PI) / 180) || 1
  const gw = (geo.lonMax - geo.lonMin) * kx, gh = geo.latMax - geo.latMin
  let scale = (W - 2 * pad) / gw
  if (gh * scale > maxHeight - 2 * pad) scale = (maxHeight - 2 * pad) / gh
  const H = gh * scale + 2 * pad
  const offX = pad + (W - 2 * pad - gw * scale) / 2
  const px = (lo) => offX + (lo - geo.lonMin) * kx * scale
  const py = (la) => pad + (geo.latMax - la) * scale

  const valOf = (name) => (values[name] ? values[name][metric] || 0 : 0)
  const max = Math.max(1, ...Object.values(values).map((v) => v[metric] || 0))
  const tOf = (v) => Math.log(v + 1) / Math.log(max + 1)
  const ranked = Object.keys(values).filter((k) => valOf(k) > 0).sort((a, b) => valOf(b) - valOf(a))

  const shapes = geo.feats.map((f, i) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    let d = ''
    let best = null, bestA = 0
    for (const p of polys) {
      for (const ring of p) d += ring.map(([lo, la], j) => `${j ? 'L' : 'M'}${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join('') + 'Z'
      // the label sits at the middle of the biggest outer ring
      const ring = p[0]
      let A = 0, cx = 0, cy = 0
      for (let j = 0; j < ring.length - 1; j++) {
        const [x0, y0] = [px(ring[j][0]), py(ring[j][1])], [x1, y1] = [px(ring[j + 1][0]), py(ring[j + 1][1])]
        const c = x0 * y1 - x1 * y0
        A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
      }
      if (Math.abs(A) > bestA) { bestA = Math.abs(A); best = A ? [cx / (3 * A), cy / (3 * A)] : null }
    }
    const name = f.properties[nameKey]
    const v = valOf(name)
    return { i, name, d, v, c: best, rank: ranked.indexOf(name) }
  })
  const labelled = shapes.filter((s) => labels.includes(s.name) && s.c && s.v > 0)
  const narrow = W < 520
  const hv = hover != null ? shapes[hover] : null

  return (
    <div ref={ref} className={`pmap${inView ? ' is-in' : ''}`}>
      {metrics.length > 1 && (
        <div className="pmap__btns" role="group" aria-label="Shade the map by">
          {metrics.map((x) => (
            <button key={x.key} type="button" className={`pmap__btn${x.key === metric ? ' is-on' : ''}`} aria-pressed={x.key === metric} onClick={() => setMetric(x.key)}>{x.label}</button>
          ))}
        </div>
      )}
      <div ref={root} className="pmap__plot" style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${aria} Shaded by ${m.label.toLowerCase()}: ${ranked.map((k) => `${k} ${m.fmt(valOf(k))}`).join(', ')}.`} style={{ display: 'block' }}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }) }}
          onMouseLeave={() => setHover(null)}>
          {shapes.map((s) => (
            <path key={s.i} d={s.d} fillRule="evenodd" className={`pmap__shape${s.v > 0 ? ' is-on' : ''}${hover === s.i ? ' is-hover' : ''}`}
              style={{ '--fill': s.v > 0 ? ramp(tOf(s.v)) : 'var(--grey-06)', '--d': `${s.rank >= 0 ? 200 + s.rank * 70 : 0}ms` }}
              onMouseEnter={() => setHover(s.i)} />
          ))}
          {labelled.map((s) => {
            const t = tOf(s.v)
            const nd = nudge[s.name]
            const ly = nd ? s.c[1] + nd[1] * W : s.c[1]
            let lx = nd ? s.c[0] + nd[0] * W : s.c[0]
            const fill = nd ? 'var(--ink)' : inkOn(t)
            const anchor = nd ? (nd[0] > 0.01 ? 'start' : nd[0] < -0.01 ? 'end' : 'middle') : 'middle'
            // keep a nudged label inside the map
            const tw = (narrow && s.name.length > 12 ? s.name.split(' ')[0] : s.name).length * 6.6
            if (anchor === 'start') lx = Math.min(lx, W - 4 - tw)
            if (anchor === 'end') lx = Math.max(lx, 4 + tw)
            return (
              <g key={s.name} className={`pmap__lab${nd ? ' is-out' : ''}`} style={{ '--d': `${400 + s.rank * 70}ms` }}>
                {nd && <line x1={s.c[0]} y1={s.c[1]} x2={lx - (anchor === 'start' ? 3 : anchor === 'end' ? -3 : 0)} y2={ly - 4} stroke="var(--ink)" strokeWidth="1" />}
                {nd && <circle cx={s.c[0]} cy={s.c[1]} r="2.2" fill="var(--ink)" />}
                <text x={lx} y={ly - 2} textAnchor={anchor} className="pmap__ln" style={{ fill }}>{narrow && s.name.length > 12 ? s.name.split(' ')[0] : s.name}</text>
                <text x={lx} y={ly + 11} textAnchor={anchor} className="pmap__lv" style={{ fill }}>{m.fmt(s.v)}</text>
              </g>
            )
          })}
        </svg>
        {hv && (
          <div className="chart-tip" style={{ left: Math.min(Math.max(pos.x, 70), W - 70), top: Math.max(pos.y - 64, 0) }}>
            <strong>{hv.name}</strong>
            {values[hv.name] ? metrics.map((x) => <span key={x.key}><br />{x.fmt(values[hv.name][x.key] || 0)} {x.unit}</span>) : <><br />nothing logged</>}
          </div>
        )}
      </div>
      <div className="pmap__key" aria-hidden="true">
        <span>less</span>
        <i className="pmap__ramp" style={{ background: `linear-gradient(90deg, ${RAMP.join(',')})` }} />
        <span>more {m.unit}</span>
        <i className="pmap__none" /> <span>none</span>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useWidth } from './useWidth.js'

// Sequential orange ramp (one hue, light -> dark) for magnitude.
const RAMP = ['#ffe0d1', '#ffb38f', '#ff7a3c', '#fc4c02', '#b23400']
const h2 = (x) => parseInt(x, 16)
function hexLerp(a, b, t) {
  const ar = h2(a.slice(1, 3))
  const ag = h2(a.slice(3, 5))
  const ab = h2(a.slice(5, 7))
  const br = h2(b.slice(1, 3))
  const bg = h2(b.slice(3, 5))
  const bb = h2(b.slice(5, 7))
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`
}
function rampColor(t) {
  const n = RAMP.length - 1
  const i = Math.min(n - 1, Math.max(0, Math.floor(t * n)))
  return hexLerp(RAMP[i], RAMP[i + 1], t * n - i)
}

// A filled-polygon choropleth. Value scale is logarithmic so a dominant value
// (home) doesn't flatten the rest. Zero = light grey ("not visited").
// nameKey / valueKey read from each feature's properties.
export default function Choropleth({ src, nameKey, valueKey, unit = 'activities', maxHeight = 560 }) {
  const [ref, width] = useWidth(680)
  const [fc, setFc] = useState(null)
  const [hover, setHover] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let alive = true
    fetch(`${import.meta.env.BASE_URL}${src}`)
      .then((r) => r.json())
      .then((d) => alive && setFc(d))
      .catch(() => alive && setFc({ features: [] }))
    return () => {
      alive = false
    }
  }, [src])

  if (!fc) {
    return (
      <div ref={ref} style={{ height: 320, display: 'grid', placeItems: 'center' }}>
        <span className="source">Loading map…</span>
      </div>
    )
  }
  const feats = fc.features || []
  if (!feats.length) return <div ref={ref} />

  const pad = 12
  let latMin = Infinity
  let latMax = -Infinity
  let lonMin = Infinity
  let lonMax = -Infinity
  const eachCoord = (geom, fn) => {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
    for (const poly of polys) for (const ring of poly) for (const c of ring) fn(c)
  }
  for (const f of feats) eachCoord(f.geometry, ([lo, la]) => {
    if (la < latMin) latMin = la
    if (la > latMax) latMax = la
    if (lo < lonMin) lonMin = lo
    if (lo > lonMax) lonMax = lo
  })
  latMin = Math.max(latMin, -56) // drop Antarctica on the world view
  latMax = Math.min(latMax, 84)

  const midLat = ((latMin + latMax) / 2) * (Math.PI / 180)
  const kx = Math.cos(midLat) || 1
  const geoW = (lonMax - lonMin) * kx || 1
  const geoH = latMax - latMin || 1
  const innerW = Math.max(10, width - 2 * pad)
  let scale = innerW / geoW
  let drawH = geoH * scale
  if (drawH > maxHeight - 2 * pad) {
    drawH = maxHeight - 2 * pad
    scale = drawH / geoH
  }
  const drawW = geoW * scale
  const offX = pad + (innerW - drawW) / 2
  const height = drawH + 2 * pad
  const px = (lo) => offX + (lo - lonMin) * kx * scale
  const py = (la) => pad + (latMax - la) * scale

  const max = Math.max(1, ...feats.map((f) => +f.properties[valueKey] || 0))
  const colorFor = (v) => (!v || v <= 0 ? 'var(--grey-06)' : rampColor(Math.log(v + 1) / Math.log(max + 1)))
  const toPath = (geom) => {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
    let d = ''
    for (const poly of polys)
      for (const ring of poly)
        d += ring.map(([lo, la], i) => `${i ? 'L' : 'M'}${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join('') + 'Z'
    return d
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Choropleth map"
        style={{ display: 'block' }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
        }}
        onMouseLeave={() => setHover(null)}
      >
        {feats.map((f, i) => {
          const v = +f.properties[valueKey] || 0
          const on = hover === i
          return (
            <path
              key={i}
              d={toPath(f.geometry)}
              fill={colorFor(v)}
              fillRule="evenodd"
              stroke={on ? 'var(--ink)' : 'var(--paper)'}
              strokeWidth={on ? 1.2 : 0.5}
              onMouseEnter={() => setHover(i)}
            />
          )
        })}
      </svg>

      {hover != null && (
        <div
          className="chart-tip"
          style={{ left: Math.min(Math.max(pos.x, 60), width - 60), top: Math.max(pos.y - 42, 0) }}
        >
          <strong>{feats[hover].properties[nameKey]}</strong>
          <br />
          {(+feats[hover].properties[valueKey] || 0).toLocaleString()} {unit}
        </div>
      )}

      {/* legend */}
      <div className="chart-legend" style={{ alignItems: 'center' }}>
        <span>fewer</span>
        <span
          aria-hidden="true"
          style={{
            width: 120,
            height: 10,
            background: `linear-gradient(90deg, ${RAMP.join(',')})`,
            display: 'inline-block',
          }}
        />
        <span>more {unit}</span>
        <span>
          <i className="chart-swatch" style={{ background: 'var(--grey-06)', border: '1px solid var(--grey-25)' }} /> none
        </span>
      </div>
    </div>
  )
}

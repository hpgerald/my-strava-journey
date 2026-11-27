import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBook } from './BookContext.js'
import { motionOK } from '../motion/env.js'

// The year's big numbers, told the way Strava tells a Year in Sport: one card
// at a time, each sliding up over the one before as the page scrolls, its
// number rolling into place digit by digit and a small picture drawing itself
// beside it. Only on the site, and only when motion is allowed; My Book and a
// reader who asks for less motion get the plain row of numbers instead.
//   cards [{ tone: 'accent' | 'ink' | 'paper' | 'grey' | 'm-ground' | 'm-tint' | 'm-deep',
//            k, value (string), unit, label, note, art, link { to, label } }]
// The m- tones take a mountain chapter's own colours. NumberDeck shows the deck
// where motion is allowed and the plain row it replaces (`plain`) everywhere else.

const DIG = '0123456789'

// a number that comes up into place: each figure rises from below its own
// line, one a little after the other, and never two figures in one slot
function Odometer({ text, on }) {
  return (
    <span className="odo" aria-hidden="true">
      {[...text].map((ch, i) => (
        <span key={i} className={`odo__w${DIG.includes(ch) ? '' : ' odo__w--s'}`}>
          <span className="odo__g" style={{ transitionDelay: on ? `${100 + i * 70}ms` : '0ms' }}>{ch}</span>
        </span>
      ))}
    </span>
  )
}

export default function YearDeck({ cards, label }) {
  const ref = useRef(null)
  const [p, setP] = useState(0)
  // the first card is in place from the start; its number rolls only once the
  // deck has come well into view, so the roll is never spent below the screen
  const [armed, setArmed] = useState(false)
  const n = cards.length
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    let raf = 0
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const run = Math.max(1, r.height - window.innerHeight)
      setP(Math.min(1, Math.max(0, -r.top / run)))
      setArmed(r.top < window.innerHeight * 0.45 && r.bottom > window.innerHeight * 0.3)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
  // how far each card has come up: the first is there from the start
  const at = (i) => (i === 0 ? 1 : Math.min(1, Math.max(0, p * (n - 1) * 1.15 - (i - 1))))
  const active = cards.reduce((a, _, i) => (at(i) >= 0.55 ? i : a), 0)
  return (
    <section ref={ref} className="ydeck" style={{ '--cards': n }} aria-label={label}>
      <div className="ydeck__stage">
        {cards.map((c, i) => {
          const q = at(i), next = i < n - 1 ? at(i + 1) : 0
          const live = armed && i <= active && (q >= 0.55 || i === 0)
          return (
            <article key={c.label} className={`ydeck__card ydeck__card--${c.tone}${live ? ' is-on' : ''}`}
              style={{ '--q': q.toFixed(3), '--next': next.toFixed(3), zIndex: i + 1 }} aria-hidden={i > active ? 'true' : undefined}>
              <p className="ydeck__k"><span>{c.k}</span><span>{i + 1} / {n}</span></p>
              <div className="ydeck__main">
                <p className="ydeck__num" style={{ '--chars': (String(c.value).length + (c.unit ? c.unit.trim().length * 0.4 + 0.2 : 0)).toFixed(1) }}>
                  <span className="visually-hidden">{c.value}{c.unit ? ` ${c.unit.trim()}` : ''}</span>
                  <Odometer text={c.value} on={live} />
                  {c.unit ? <span className="ydeck__u">{c.unit}</span> : null}
                </p>
                <p className="ydeck__l"><span>{c.label}</span></p>
                {c.note ? <p className="ydeck__c"><span>{c.note}</span></p> : null}
                {c.link && i === active ? <p className="ydeck__a">{c.link.to ? <Link to={c.link.to}>{c.link.label}</Link> : <a href={c.link.href} onClick={c.link.onClick}>{c.link.label}</a>}</p> : null}
              </div>
              <div className={`ydeck__art${c.wide ? ' ydeck__art--wide' : ''}`} aria-hidden="true">{c.art}</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// the deck on the site with motion on; the plain row it stands for everywhere else
export function NumberDeck({ cards, label, plain }) {
  const book = useBook()
  const [on] = useState(() => !book && motionOK())
  return on ? <YearDeck cards={cards} label={label} /> : plain
}

// ---- the small pictures, each drawn when its card arrives ----

// a smooth path through points that run left to right, never swinging past
// a neighbour (so a curve that only climbs keeps climbing, and a hill never
// dips below the ground)
export function smoothPath(pts) {
  const n = pts.length
  if (n < 2) return ''
  const dx = [], m = []
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1e-9)) }
  const t = [m[0]]
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]))
  t.push(m[n - 2])
  const f = (v) => v.toFixed(1)
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${f(pts[i][0] + h)} ${f(pts[i][1] + h * t[i])} ${f(pts[i + 1][0] - h)} ${f(pts[i + 1][1] - h * t[i + 1])} ${f(pts[i + 1][0])} ${f(pts[i + 1][1])}`
  }
  return d
}
// values lightly averaged with their neighbours, so a month of zero does not
// cut the line to the ground
const soften = (v) => v.map((x, i) => (2 * x + (v[i - 1] ?? x) + (v[i + 1] ?? x)) / 4)

// one bar for each value, with rounded tops, rising one after the other
export function ArtMonths({ values }) {
  const max = Math.max(1, ...values)
  const step = 232 / values.length, w = Math.max(1.5, step * (values.length > 24 ? 0.7 : 0.62)), r = Math.min(w / 2, 4)
  return (
    <svg viewBox="0 0 240 120" className="dart dart--bars">
      {values.map((v, i) => {
        const h = Math.max(v ? Math.max(2, r * 2) : 0, (v / max) * 104)
        return <rect key={i} x={(4 + i * step + (step - w) / 2).toFixed(2)} y={(116 - h).toFixed(2)} width={w.toFixed(2)} height={h.toFixed(2)} rx={r.toFixed(2)} style={{ '--i': values.length > 24 ? i / 4 : i }} />
      })}
      <line x1="4" x2="236" y1="117" y2="117" className="dart__base" />
    </svg>
  )
}

// the kilometres adding up through the year: a smooth line over a light ground
export function ArtLine({ values }) {
  const max = Math.max(1, values[values.length - 1] || 1), n = values.length
  const pts = values.map((v, i) => [4 + (i / Math.max(1, n - 1)) * 232, 112 - (v / max) * 100])
  const d = smoothPath(pts), end = pts[n - 1]
  return (
    <svg viewBox="0 0 240 120" className="dart dart--line">
      <path d={`${d}L${end[0].toFixed(1)} 116L4 116Z`} className="dart__ground" />
      <path d={d} pathLength="1" className="dart__curve" />
      <circle cx={end[0].toFixed(1)} cy={end[1].toFixed(1)} r="5.5" className="dart__dot" />
    </svg>
  )
}

// the climbing of each month as one smooth range of hills rising from the ground
export function ArtRidge({ values }) {
  const v = soften(values), max = Math.max(1, ...v)
  const step = 232 / Math.max(1, v.length - 1)
  const pts = v.map((x, i) => [4 + i * step, 114 - (x / max) * 100])
  const d = smoothPath(pts)
  return (
    <svg viewBox="0 0 240 120" className="dart dart--ridge">
      <path d={`${d}L236 116L4 116Z`} className="dart__hill" />
      <path d={d} className="dart__rim" />
      <line x1="4" x2="236" y1="116.5" y2="116.5" className="dart__base" />
    </svg>
  )
}

// the 24 hours of the day round a clock face, a dot at each hour, bigger at
// the hours with more outings (midnight at the top)
export function ArtClock({ hours }) {
  const max = Math.max(1, ...hours)
  return (
    <svg viewBox="0 0 120 120" className="dart dart--clock">
      <circle cx="60" cy="60" r="44" className="dart__dial" />
      {hours.map((v, h) => {
        const a = (h / 24) * 2 * Math.PI - Math.PI / 2
        return <circle key={h} cx={(60 + 44 * Math.cos(a)).toFixed(1)} cy={(60 + 44 * Math.sin(a)).toFixed(1)} r={v ? (1.6 + 7.4 * Math.sqrt(v / max)).toFixed(2) : 1.2} className={v ? 'dart__hr' : 'dart__hr is-none'} style={{ '--i': h }} />
      })}
      <circle cx="60" cy="60" r="3" className="dart__tick" />
    </svg>
  )
}

// a ring filling up to a share (0 to 1), with the share written inside
export function ArtRing({ share }) {
  const r = 46, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, share || 0))
  return (
    <svg viewBox="0 0 120 120" className="dart dart--ring">
      <circle cx="60" cy="60" r={r} className="dart__track" />
      <circle cx="60" cy="60" r={r} className="dart__fill" style={{ '--len': c, '--to': c * (1 - f) }} transform="rotate(-90 60 60)" />
    </svg>
  )
}

// a height line drawn from the start up to a share of the way (0 to 1), over
// the whole line in a light shade
export function ArtProfile({ alts, upTo = 1 }) {
  if (!alts || alts.length < 2) return null
  // thin the line to about 60 points and smooth it, so it reads as a slope
  const k = Math.max(1, Math.floor(alts.length / 60))
  const a = alts.filter((_, i) => i % k === 0 || i === alts.length - 1)
  const lo = Math.min(...a), hi = Math.max(...a)
  const pts = a.map((v, i) => [4 + (i / (a.length - 1)) * 232, 112 - ((v - lo) / Math.max(1, hi - lo)) * 100])
  const n = Math.max(2, Math.round(pts.length * upTo)), end = pts[n - 1]
  const full = smoothPath(pts), part = smoothPath(pts.slice(0, n))
  return (
    <svg viewBox="0 0 240 120" className="dart dart--prof">
      <path d={full} className="dart__ghost" />
      <path d={`${part}L${end[0].toFixed(1)} 116L4 116Z`} className="dart__ground" />
      <path d={part} pathLength="1" className="dart__line" />
      <circle cx={end[0].toFixed(1)} cy={end[1].toFixed(1)} r="5.5" className="dart__dot" />
    </svg>
  )
}

// the record from its first day to its last as one rounded band; `mark`
// [from, to] as shares of the span, drawn solid (a stretch), and `gap` as a
// break in the band (a long silence)
export function ArtSpan({ mark, gap }) {
  const x = (f) => 8 + f * 224
  return (
    <svg viewBox="0 0 240 40" className="dart dart--span">
      {gap ? (
        <>
          {gap[0] > 0.01 ? <line x1={x(0)} x2={Math.max(x(0), x(gap[0]) - 6)} y1="20" y2="20" className="dart__band" /> : null}
          <line x1={x(gap[0]) + 2} x2={x(gap[1]) - 2} y1="20" y2="20" className="dart__gap" />
          {gap[1] < 0.99 ? <line x1={Math.min(x(1), x(gap[1]) + 6)} x2={x(1)} y1="20" y2="20" className="dart__band" /> : null}
        </>
      ) : <line x1={x(0)} x2={x(1)} y1="20" y2="20" className="dart__band" />}
      {mark ? <line x1={x(mark[0])} x2={Math.max(x(mark[0]) + 0.1, x(mark[1]))} y1="20" y2="20" pathLength="1" className="dart__mark" /> : null}
    </svg>
  )
}

// a day as a ring, drawn round for the share of its 24 hours
export function ArtDayFill({ share }) {
  const r = 46, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, share || 0))
  return (
    <svg viewBox="0 0 120 120" className="dart dart--day">
      <circle cx="60" cy="60" r={r} className="dart__track" />
      <circle cx="60" cy="60" r={r} className="dart__fill" style={{ '--len': c, '--to': c * (1 - f) }} transform="rotate(-90 60 60)" />
    </svg>
  )
}

// shapes from a map (already projected to the 0-240 by 0-120 box), some lit
export function ArtShapes({ shapes }) {
  return (
    <svg viewBox="0 0 240 160" className="dart dart--map">
      {shapes.map((s, i) => <path key={i} d={s.d} className={s.on ? 'dart__on' : 'dart__off'} style={{ '--i': i }} />)}
    </svg>
  )
}

// map features (GeoJSON) to paths fitted in the 240 by 160 box, lit where isOn(feature)
export function geoShapes(features, isOn) {
  const rings = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [])
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const f of features) for (const poly of rings(f.geometry)) for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  const k = Math.min(232 / (x1 - x0), 152 / (y1 - y0)), ox = (240 - (x1 - x0) * k) / 2, oy = (160 - (y1 - y0) * k) / 2
  return features.map((f) => ({
    on: !!isOn(f),
    d: rings(f.geometry).map((poly) => poly[0].map(([x, y], i) => `${i ? 'L' : 'M'}${(ox + (x - x0) * k).toFixed(1)} ${(oy + (y1 - y) * k).toFixed(1)}`).join('') + 'Z').join(''),
  }))
}

// all the values as one smooth hill of how often each size came up, with the
// biggest set apart as a dot far out on the right
export function ArtDots({ values }) {
  const max = Math.max(1e-9, ...values), vs = values.filter((v) => v > 0)
  const N = 48, bw = 0.06, dens = []
  for (let i = 0; i <= N; i++) { const x = i / N; let t = 0; for (const v of vs) { const z = (v / max - x) / bw; t += Math.exp(-0.5 * z * z) } dens.push(t) }
  const top = Math.max(1e-9, ...dens)
  const pts = dens.map((t, i) => [4 + (i / N) * 216, 110 - (t / top) * 96])
  const d = smoothPath(pts)
  return (
    <svg viewBox="0 0 240 120" className="dart dart--dots">
      <path d={`${d}L220 112L4 112Z`} className="dart__hill" />
      <path d={d} className="dart__rim" />
      <line x1="4" x2="236" y1="112.5" y2="112.5" className="dart__base" />
      <circle cx="220" cy="105" r="7" className="dart__big" />
    </svg>
  )
}

// one small dot for each item, row after row, appearing a row at a time
export function ArtDotField({ count, cols = 60 }) {
  const rows = Math.ceil(count / cols), step = 236 / cols, r = Math.max(0.7, step * 0.32)
  const H = rows * step + 4
  const dots = []
  for (let i = 0; i < count; i++) dots.push(<circle key={i} cx={2 + (i % cols) * step + step / 2} cy={2 + Math.floor(i / cols) * step + step / 2} r={r} style={{ '--i': Math.floor(i / cols) }} />)
  return <svg viewBox={`0 0 240 ${H.toFixed(1)}`} className="dart dart--field">{dots}</svg>
}

// a smooth line adding up, with the ground under it lightly filled
export function ArtArea({ values }) {
  const max = Math.max(1e-9, ...values), n = values.length
  const pts = values.map((v, i) => [4 + (i / Math.max(1, n - 1)) * 232, 112 - (v / max) * 100])
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < n; i++) {
    const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  const end = pts[n - 1]
  return (
    <svg viewBox="0 0 240 120" className="dart dart--area">
      <path d={`${d}L${end[0].toFixed(1)} 116L4 116Z`} className="dart__ground" />
      <path d={d} pathLength="1" className="dart__curve" />
      <circle cx={end[0]} cy={end[1]} r="5" className="dart__dot" />
    </svg>
  )
}

// one peak for each Everest climbed, the last one as tall as the share left over
export function ArtPeaks({ ratio }) {
  // one small mountain for each Everest, side by side, the last one cut to
  // the part that is left
  const full = Math.floor(ratio), part = ratio - full, n = full + (part > 0.05 ? 1 : 0)
  const step = 232 / Math.max(1, n), w = step * 0.9, H = w * 0.95
  return (
    <svg viewBox={`0 0 240 ${(H + 4).toFixed(1)}`} className="dart dart--peaks">
      {Array.from({ length: n }, (_, i) => {
        const h = (i < full ? 1 : part) * H, x = 4 + i * step + (step - w) / 2, b = H + 2
        // the cut one keeps the slopes of a full mountain, with a flat top
        const t = H - h, inset = (w / 2) * (t / H)
        const d = i < full
          ? `M${x.toFixed(1)} ${b.toFixed(1)}L${(x + w / 2).toFixed(1)} 2L${(x + w).toFixed(1)} ${b.toFixed(1)}Z`
          : `M${x.toFixed(1)} ${b.toFixed(1)}L${(x + inset).toFixed(1)} ${(2 + t).toFixed(1)}L${(x + w - inset).toFixed(1)} ${(2 + t).toFixed(1)}L${(x + w).toFixed(1)} ${b.toFixed(1)}Z`
        return <path key={i} d={d} style={{ '--i': i }} className={i >= full ? 'is-part' : ''} />
      })}
    </svg>
  )
}

// every day as a small square, row after row, filled on a day with an outing
export function ArtDayGrid({ days, cols = 70 }) {
  const step = 236 / cols, s = step * 0.78, rows = Math.ceil(days.length / cols), H = rows * step + 4
  return (
    <svg viewBox={`0 0 240 ${H.toFixed(1)}`} className="dart dart--days">
      {days.map((on, i) => <rect key={i} x={(2 + (i % cols) * step).toFixed(2)} y={(2 + Math.floor(i / cols) * step).toFixed(2)} width={s.toFixed(2)} height={s.toFixed(2)} className={on ? 'is-on' : ''} style={{ '--i': Math.floor(i / cols) }} />)}
    </svg>
  )
}

// a tower of small squares for each year, one square for `per` items, with the
// year under it
export function ArtTowers({ years, per = 25 }) {
  const n = years.length, colW = 232 / n, s = Math.min(colW * 0.62, 7), gap = s * 0.35
  const maxH = Math.max(...years.map((y) => Math.ceil(y.n / per)))
  const H = maxH * (s + gap) + 18
  return (
    <svg viewBox={`0 0 240 ${H.toFixed(1)}`} className="dart dart--towers">
      {years.map((y, k) => {
        const cx = 4 + colW * k + colW / 2, m = Math.round(y.n / per) || (y.n ? 1 : 0)
        return (
          <g key={y.label}>
            {Array.from({ length: m }, (_, j) => <rect key={j} x={(cx - s / 2).toFixed(2)} y={(H - 18 - (j + 1) * (s + gap) + gap).toFixed(2)} width={s.toFixed(2)} height={s.toFixed(2)} rx={(s * 0.2).toFixed(2)} style={{ '--i': k * 3 + j * 0.6 }} />)}
            <text x={cx.toFixed(1)} y={(H - 4).toFixed(1)} textAnchor="middle">{y.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// one row for each year, filled for the share of its days that had an outing
export function ArtYearFill({ years }) {
  const rowH = 9, gap = 4, H = years.length * (rowH + gap)
  return (
    <svg viewBox={`0 0 240 ${H}`} className="dart dart--yfill">
      {years.map((y, k) => (
        <g key={y.label} style={{ '--i': k }}>
          <text x="0" y={(k * (rowH + gap) + rowH - 1.5).toFixed(1)}>{y.label}</text>
          <rect className="dart__yt" x="22" y={k * (rowH + gap)} width="214" height={rowH} rx="2" />
          <rect className="dart__yf" x="22" y={k * (rowH + gap)} width={(214 * y.share).toFixed(1)} height={rowH} rx="2" />
        </g>
      ))}
    </svg>
  )
}

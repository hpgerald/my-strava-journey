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

// twelve bars, one a month, rising one after the other
export function ArtMonths({ values }) {
  const max = Math.max(1, ...values)
  const step = 232 / values.length, w = Math.max(1.5, step * 0.72)
  return (
    <svg viewBox="0 0 240 120" className="dart dart--bars">
      {values.map((v, i) => {
        const h = Math.max(v ? 2 : 0, (v / max) * 104)
        return <rect key={i} x={4 + i * step} y={116 - h} width={w} height={h} style={{ '--i': values.length > 24 ? i / 4 : i }} />
      })}
    </svg>
  )
}

// the kilometres adding up through the year, drawn as one line
export function ArtLine({ values }) {
  const max = Math.max(1, values[values.length - 1] || 1)
  const pts = values.map((v, i) => `${(4 + (i / Math.max(1, values.length - 1)) * 232).toFixed(1)},${(116 - (v / max) * 108).toFixed(1)}`)
  return (
    <svg viewBox="0 0 240 120" className="dart dart--line">
      <polyline points={pts.join(' ')} pathLength="1" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="6" />
    </svg>
  )
}

// the climbing of each month as a ridge that rises out of the ground
export function ArtRidge({ values }) {
  const max = Math.max(1, ...values)
  const step = 232 / Math.max(1, values.length - 1)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(4 + i * step).toFixed(1)} ${(116 - (v / max) * 104).toFixed(1)}`).join('')
  return (
    <svg viewBox="0 0 240 120" className="dart dart--ridge">
      <path d={`${d}L236 118L4 118Z`} />
    </svg>
  )
}

// the 24 hours of the day, a spoke for each hour, longer for more outings
export function ArtClock({ hours }) {
  const max = Math.max(1, ...hours)
  return (
    <svg viewBox="0 0 120 120" className="dart dart--clock">
      <circle cx="60" cy="60" r="16" />
      {hours.map((v, h) => {
        const a = (h / 24) * 2 * Math.PI - Math.PI / 2, r1 = 20, r2 = 20 + (v / max) * 38
        return <line key={h} x1={60 + r1 * Math.cos(a)} y1={60 + r1 * Math.sin(a)} x2={60 + r2 * Math.cos(a)} y2={60 + r2 * Math.sin(a)} style={{ '--i': h }} />
      })}
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

// a height line drawn from the start up to a share of the way (0 to 1)
export function ArtProfile({ alts, upTo = 1 }) {
  if (!alts || alts.length < 2) return null
  const lo = Math.min(...alts), hi = Math.max(...alts)
  const n = Math.max(2, Math.round(alts.length * upTo))
  const pts = alts.map((a, i) => [4 + (i / (alts.length - 1)) * 232, 116 - ((a - lo) / Math.max(1, hi - lo)) * 104])
  const d = (xs) => xs.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')
  const end = pts[n - 1]
  return (
    <svg viewBox="0 0 240 120" className="dart dart--prof">
      <path d={d(pts)} className="dart__ghost" />
      <path d={d(pts.slice(0, n))} pathLength="1" className="dart__line" />
      <circle cx={end[0]} cy={end[1]} r="6" className="dart__dot" />
    </svg>
  )
}

// the record from its first day to its last as one band; `mark` [from, to] as
// shares of the span, drawn in the card's own colour (a gap, a stretch)
export function ArtSpan({ mark, gap }) {
  return (
    <svg viewBox="0 0 240 60" className="dart dart--span">
      <rect x="4" y="24" width="232" height="12" className="dart__band" />
      {gap ? <rect x={4 + gap[0] * 232} y="20" width={Math.max(2, (gap[1] - gap[0]) * 232)} height="20" className="dart__gap" /> : null}
      {mark ? <rect x={4 + mark[0] * 232} y="18" width={Math.max(3, (mark[1] - mark[0]) * 232)} height="24" className="dart__mark" /> : null}
    </svg>
  )
}

// a day as a clock face, filled for the share of its 24 hours
export function ArtDayFill({ share }) {
  const f = Math.max(0.002, Math.min(0.999, share || 0)), a = f * 2 * Math.PI
  const x = 60 + 50 * Math.sin(a), y = 60 - 50 * Math.cos(a)
  return (
    <svg viewBox="0 0 120 120" className="dart dart--day">
      <circle cx="60" cy="60" r="50" className="dart__track" />
      <path d={`M60 60L60 10A50 50 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)}Z`} className="dart__wedge" />
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

// every value as a small dot along one line, stacked where they crowd, with the
// biggest drawn large at its end
export function ArtDots({ values }) {
  const max = Math.max(1e-9, ...values)
  const bins = new Map()
  const dots = values.filter((v) => v > 0 && v < max).map((v) => { const k = Math.round((4 + (v / max) * 220) / 5); const n = bins.get(k) || 0; bins.set(k, n + 1); return [k * 5, 104 - Math.min(n, 16) * 5] })
  return (
    <svg viewBox="0 0 240 120" className="dart dart--dots">
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" className="dart__d" />)}
      <circle cx={4 + 220 + 4} cy={98} r="9" className="dart__big" />
      <line x1="4" x2="236" y1="112" y2="112" className="dart__axis" />
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

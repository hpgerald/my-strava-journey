import { useEffect, useRef, useState } from 'react'

// The year's big numbers, told the way Strava tells a Year in Sport: one card
// at a time, each sliding up over the one before as the page scrolls, its
// number rolling into place digit by digit and a small picture drawing itself
// beside it. Only on the site, and only when motion is allowed; My Book and a
// reader who asks for less motion get the plain row of numbers instead.
//   cards [{ tone: 'accent' | 'ink' | 'paper', k, value (string), unit, label, note, art }]

const DIG = '0123456789'

// a number that rolls into place: every digit is a column of 0 to 9 that
// slides to its digit, the columns a little after each other
function Odometer({ text, on }) {
  let d = 0
  return (
    <span className="odo" aria-hidden="true">
      {[...text].map((ch, i) => {
        if (!DIG.includes(ch)) return <span key={i} className="odo__s">{ch}</span>
        const k = d++
        return (
          <span key={i} className="odo__w">
            <span className="odo__c" style={{ '--n': on ? Number(ch) : 0, transitionDelay: on ? `${120 + k * 90}ms` : '0ms' }}>
              {[...DIG].map((x) => <span key={x}>{x}</span>)}
            </span>
          </span>
        )
      })}
    </span>
  )
}

export default function YearDeck({ cards, label }) {
  const ref = useRef(null)
  const [p, setP] = useState(0)
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
          const live = i <= active && (q >= 0.55 || i === 0)
          return (
            <article key={c.label} className={`ydeck__card ydeck__card--${c.tone}${live ? ' is-on' : ''}`}
              style={{ '--q': q.toFixed(3), '--next': next.toFixed(3), zIndex: i + 1 }} aria-hidden={i > active ? 'true' : undefined}>
              <p className="ydeck__k"><span>{c.k}</span><span>{i + 1} / {n}</span></p>
              <div className="ydeck__main">
                <p className="ydeck__num">
                  <span className="visually-hidden">{c.value}{c.unit ? ` ${c.unit.trim()}` : ''}</span>
                  <Odometer text={c.value} on={live} />
                  {c.unit ? <span className="ydeck__u">{c.unit}</span> : null}
                </p>
                <p className="ydeck__l"><span>{c.label}</span></p>
                {c.note ? <p className="ydeck__c"><span>{c.note}</span></p> : null}
              </div>
              <div className="ydeck__art" aria-hidden="true">{c.art}</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ---- the small pictures, each drawn when its card arrives ----

// twelve bars, one a month, rising one after the other
export function ArtMonths({ values }) {
  const max = Math.max(1, ...values)
  return (
    <svg viewBox="0 0 240 120" className="dart dart--bars">
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * 104)
        return <rect key={i} x={4 + i * 19.6} y={116 - h} width={14} height={h} style={{ '--i': i }} />
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

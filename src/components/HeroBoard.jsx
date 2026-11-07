import { useEffect, useRef } from 'react'
import { useInView, useCountUp } from './Reveal.jsx'

// The front page, filling the first screen with no idle space: the title on one
// line from margin to margin, every month of the record as a bar (with the long silence, the comeback and the streak marked
// on it, and the "Siku kwa siku" seal in the empty stretch on the left), and the
// four big numbers counting up along the foot. Decoration for the eye: the same
// record is told in words below it for screen readers.
// props: months [{ k: 'YYYY-MM', n }], streakFrom 'YYYY-MM', streakSinceLabel,
//   gap { days, fromKey }, comebackKey, nums { n, km, elev, streak }
const fmt = (v) => Math.round(v || 0).toLocaleString('en-US')
const seal = 'SIKU KWA SIKU · DAY BY DAY · SIKU KWA SIKU · DAY BY DAY · '

export default function HeroBoard({ months, streakFrom, streakSinceLabel, gap, comebackKey, nums }) {
  const [ref, inView] = useInView({ threshold: 0.05, rootMargin: '0px' })
  // fit the title to the column: measure it once at a known size, then scale,
  // again whenever the column changes width or the fonts arrive
  const tw = useRef(null)
  useEffect(() => {
    const box = tw.current
    if (!box) return undefined
    const t = box.firstElementChild
    const fit = () => {
      t.style.fontSize = '100px'
      const w = t.scrollWidth
      if (w > 0) t.style.fontSize = `${(100 * box.clientWidth) / w}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit)
    return () => ro.disconnect()
  }, [])
  const ready = !!nums && nums.n > 0
  const nN = useCountUp(nums ? nums.n : 0, inView && ready, { dur: 2400 })
  const kmN = useCountUp(nums ? nums.km : 0, inView && ready, { dur: 2400 })
  const elN = useCountUp(nums ? nums.elev : 0, inView && ready, { dur: 2400 })
  const stN = useCountUp(nums ? nums.streak : 0, inView && ready, { dur: 2400 })
  const N = months.length
  const top = Math.max(1, ...months.map((m) => m.n))
  const at = (k) => Math.max(0, months.findIndex((m) => m.k >= k))
  const pc = (i) => `${((i / Math.max(1, N)) * 100).toFixed(2)}%`
  const years = months.map((m, i) => ({ y: m.k.slice(0, 4), i })).filter((m, i, a) => !i || m.y !== a[i - 1].y)
  const chars = [...'Showing up']
  const sIdx = at(streakFrom)

  return (
    <div ref={ref} className={`hx${inView ? ' is-in' : ''}`}>
      <div className="hx__tw" ref={tw}>
        <p className="hx__t">
          {chars.map((ch, i) => (ch === ' '
            ? <span key={i} className="hx__sp"> </span>
            : <span key={i} className="hx__ch" style={{ '--i': i }}>{ch}</span>))}
          <b className="hx__ch hx__dot" style={{ '--i': chars.length }}>.</b>
        </p>
      </div>

      {N ? (
        <div className="hx__chart">
          <div className="hx__plot">
          <div className="hx__seal">
            <svg viewBox="0 0 200 200">
              <defs><path id="hx-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
              <g className="hx__spin">
                <text className="hx__sealt"><textPath href="#hx-ring" textLength="486" lengthAdjust="spacing">{seal}</textPath></text>
              </g>
              <circle cx="100" cy="100" r="58" className="hx__sealr" />
              <rect x="88" y="88" width="24" height="24" className="hx__sealdot" />
            </svg>
          </div>
          <div className="hx__bars" style={{ '--n': N }}>
            {months.map((m, i) => (
              <i key={m.k} className={m.k >= streakFrom ? 'is-now' : m.n ? '' : 'is-empty'}
                style={{ '--h': `${Math.max(m.n ? 3 : 0.8, (m.n / top) * 100).toFixed(1)}%`, '--j': i }} />
            ))}
          </div>
          {gap && gap.days > 30 ? (
            <p className="hx__note hx__note--gap" style={{ left: pc(comebackKey ? at(comebackKey) : at(gap.fromKey)) }}><b>{fmt(gap.days)} days</b>without an outing</p>
          ) : null}
          {comebackKey ? (
            <p className="hx__note hx__note--back" style={{ left: pc(at(comebackKey)) }}><b>The comeback</b><span>a few outings a month became dozens</span></p>
          ) : null}
          {sIdx < N ? (
            <>
              <p className="hx__note hx__note--now"><b>The streak</b>every day since {streakSinceLabel}</p>
              <span className="hx__brk" style={{ left: pc(sIdx) }} />
            </>
          ) : null}
          </div>
          <div className="hx__yrs">
            {years.map((y, j) => (
              <span key={y.y} style={{ width: pc((years[j + 1] ? years[j + 1].i : N) - y.i) }}>
                <em className="hx__yl">{y.y}</em><em className="hx__ys">&rsquo;{y.y.slice(2)}</em>
              </span>
            ))}
          </div>
        </div>
      ) : <div className="hx__chart" />}

      <div className="hx__nums">
        <div><b>{fmt(nN)}</b><span>outings</span></div>
        <div><b>{fmt(kmN)}<small>km</small></b><span>on foot</span></div>
        <div><b>{fmt(elN)}<small>m</small></b><span>climbed</span></div>
        <div className="is-acc"><b>{fmt(stN)}<small>days</small></b><span>in a row</span></div>
      </div>
    </div>
  )
}

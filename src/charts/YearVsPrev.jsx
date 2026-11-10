import { useInView } from '../components/Reveal.jsx'

// This year against the one before it, told as change. Every measure starts
// from the same line, last year's total, and a solid band cut to a point runs
// to this year, with this year's total at its tip: right and orange when it
// grew, left and grey when it fell. Outings, kilometres and kudos have
// different units, but as change they share one scale, so the longest band is
// the biggest change whatever it counts. The rows run from the biggest rise to
// the biggest fall.
// While the year is still running, a small mark on each row shows where last
// year stood on the same day, so a part year is also read against a part year.
// rows: [{ label, cur, prev, same?, unit?, decimals? }]; prevYear: number;
// sameDay: '8 Nov' when the year is not finished.
function fmt(v, decimals = 0) {
  return Number(v).toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

const STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1]
const TIMES = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

// Change as a ratio, this year over last. Up to four times as many, the
// scale is in per cent and even; beyond that a per cent scale would squash
// every other arrow, so it switches to "times as many" on a log scale.
function scale(ratios) {
  const rMin = Math.min(1, ...ratios)
  const rMax = Math.max(1, ...ratios)
  if (rMax <= 4) {
    let lo = rMin - 1
    let hi = rMax - 1
    if (hi - lo < 0.1) hi = lo + 0.1
    const step = STEPS.find((v) => (hi - lo) / v <= 5) || 1
    lo = Math.floor(lo / step + 1e-9) * step
    hi = Math.ceil(hi / step - 1e-9) * step
    const ticks = []
    for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000)
    const x = (r) => ((r - 1 - lo) / (hi - lo)) * 100
    // more than four labels crowd a half-width chart: keep every other one, counted from zero
    const keep = ticks.length > 4 ? ticks.filter((t) => Math.round(t / step) % 2 === 0) : ticks
    return { ticks: keep.map((t) => ({ r: t + 1, x: x(t + 1), label: t === 0 ? null : `${t > 0 ? '+' : '−'}${Math.round(Math.abs(t) * 100)}%` })), x }
  }
  const lo = [...TIMES].reverse().find((t) => t <= rMin) || 0.1
  const hi = TIMES.find((t) => t >= rMax) || 5000
  let ticks = TIMES.filter((t) => t >= lo && t <= hi)
  // labels only on the powers of ten (and the low end below one), so they never crowd
  if (ticks.length > 4) ticks = ticks.filter((t) => /^1(0*)$/.test(String(t)) || (t === lo && t < 1))
  const L = (r) => Math.log10(r)
  const x = (r) => ((L(Math.max(r, lo)) - L(lo)) / (L(hi) - L(lo))) * 100
  return { ticks: ticks.map((t) => ({ r: t, x: x(t), label: t === 1 ? null : `×${t >= 1 ? t.toLocaleString('en-GB') : t}` })), x }
}

// The chart's title says what the bars show, in a few words.
export function vsPrevTitle(rows, prevYear) {
  const ok = rows.filter((r) => r.prev > 0)
  const up = ok.filter((r) => r.cur > r.prev).map((r) => r.label.toLowerCase())
  const down = ok.filter((r) => r.cur < r.prev).map((r) => r.label.toLowerCase())
  const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0])
  if (!down.length) return `Every measure up on ${prevYear}`
  if (!up.length) return `Every measure down on ${prevYear}`
  if (down.length <= 2) return `All up on ${prevYear} but ${list(down)}`
  if (up.length <= 2) return `All down on ${prevYear} but ${list(up)}`
  return `${up.length} measures up on ${prevYear}, ${down.length} down`
}

export default function YearVsPrev({ rows, prevYear, sameDay }) {
  const [root, inView] = useInView()
  if (!rows || !rows.length) return null

  const items = rows
    .filter((r) => r.prev > 0 || r.cur > 0)
    .map((r) => ({
      ...r,
      d: r.prev > 0 ? Math.max(r.cur, 0.05 * r.prev) / r.prev : null,
      s: sameDay && r.same != null && r.prev > 0 ? Math.max(r.same, 0.05 * r.prev) / r.prev : null,
    }))
    .sort((a, b) => (b.d ?? Infinity) - (a.d ?? Infinity))
  const S = scale(items.flatMap((r) => [r.d, r.s].filter((v) => v != null)))
  const z = S.x(1)

  return (
    <div ref={root} className={`yvp${inView ? ' is-in' : ''}`} style={{ '--z': `${z}%` }}>
      <div className="yvp__axis" aria-hidden="true">
        <span />
        <span className="yvp__ticks">
          {S.ticks.map((t) => (
            <span key={t.r} className={`yvp__tick${t.label ? '' : ' is-zero'}${t.x < 4 ? ' is-start' : t.x > 96 ? ' is-end' : ''}`} style={{ left: `${t.x}%` }}>
              {t.label || prevYear}
            </span>
          ))}
        </span>
      </div>
      <ol className="yvp__list">
        {items.map((r, i) => {
          const up = r.d == null || r.d >= 1
          const tip = r.d == null ? z : S.x(r.d)
          const a = Math.min(z, tip)
          const w = Math.abs(tip - z)
          // this year's total rides inside the band when the band runs near the
          // edge of the chart, and just past its point otherwise
          const inside = up ? tip > 72 : tip < 28
          const val = <>{fmt(r.cur, r.decimals)}{r.unit ? <span className="yvp__u"> {r.unit}</span> : null}</>
          return (
            <li key={r.label} className={`yvp__row ${up ? 'is-up' : 'is-down'}`}>
              <span className="yvp__lbl">
                <span className="yvp__name">{r.label}</span>
                <span className="yvp__was">{fmt(r.prev, r.decimals)}{r.unit ? ` ${r.unit}` : ''} in {prevYear}</span>
              </span>
              <span className="yvp__track">
                {r.d == null
                  ? <b className="yvp__val is-out" style={{ left: `${z}%` }}>{val}</b>
                  : <>
                      <span className="yvp__band" style={{ left: `${a}%`, width: `${w}%`, transitionDelay: `${i * 80}ms` }} />
                      <b className={`yvp__val ${inside ? 'is-in' : 'is-out'}`} style={{ left: `${tip}%`, transitionDelay: `${i * 80 + 200}ms` }}>{val}</b>
                    </>}
                {r.s != null ? <span className="yvp__same" style={{ left: `${S.x(r.s)}%` }} title={`${prevYear} on ${sameDay}: ${fmt(r.same, r.decimals)}`} /> : null}
              </span>
            </li>
          )
        })}
      </ol>
      {sameDay ? (
        <p className="yvp__leg"><span className="yvp__key" aria-hidden="true" /> where {prevYear} stood on {sameDay}</p>
      ) : null}
    </div>
  )
}

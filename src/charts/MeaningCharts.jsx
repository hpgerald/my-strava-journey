import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')

// One clock face per year: the whole circle is a day, the filled wedge is the
// minutes spent on the move per calendar day, rest days included. The year in
// progress is orange; the years before the habit are grey.
// props: years [{ year, minPerDay, partial, quiet }], aria
export function DayClocks({ years, aria }) {
  const [root, inView] = useInView({ threshold: 0.2 })
  return (
    <ul ref={root} className={`dclock${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      {years.map((y, i) => {
        const f = Math.min(1, y.minPerDay / 1440)
        const tone = y.partial ? 'now' : y.quiet ? 'quiet' : 'ink'
        return (
          <li key={y.year} className={`dclock__y is-${tone}`} style={{ '--d': `${i * 120}ms` }} aria-hidden="true">
            <svg viewBox="0 0 120 120" className="dclock__svg">
              <circle cx="60" cy="60" r="54" className="dclock__face" />
              {Array.from({ length: 24 }, (_, h) => {
                const a = (h / 24) * 2 * Math.PI
                const r0 = h % 6 === 0 ? 45 : 49
                return <line key={h} x1={60 + Math.sin(a) * r0} y1={60 - Math.cos(a) * r0} x2={60 + Math.sin(a) * 53} y2={60 - Math.cos(a) * 53} className="dclock__tick" />
              })}
              <circle cx="60" cy="60" r="22" className="dclock__wedge" pathLength="1" style={{ '--f': f }} transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="2.5" className="dclock__hub" />
            </svg>
            <p className="dclock__v"><b>{n0(y.minPerDay)}</b> min</p>
            <p className="dclock__l">{y.year}{y.partial ? ' so far' : ''}</p>
          </li>
        )
      })}
    </ul>
  )
}

// Two paths against a base year: the share of days out (ink) and the distance
// per calendar day (orange), both as a percentage of the base year. The gap
// between them is shaded, and each point carries its real value.
// props: rows [{ year, a, b, aText, bText }], aLabel, bLabel, aria
export function TwoPaths({ rows, aLabel, bLabel, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 300 : 360
  const m = { l: 44, r: narrow ? 70 : 96, t: 34, b: 30 }
  const base = rows[0]
  const ia = rows.map((r) => (100 * r.a) / base.a)
  const ib = rows.map((r) => (100 * r.b) / base.b)
  const hi = Math.max(140, ...ia, ...ib) + 6
  const x = linScale([0, rows.length - 1], [m.l + 10, W - m.r])
  const y = linScale([0, hi], [H - m.b, m.t])
  const pa = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(ia[i]).toFixed(1)}`).join('')
  const pb = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(ib[i]).toFixed(1)}`).join('')
  const band = pa + rows.slice().reverse().map((r, k) => { const i = rows.length - 1 - k; return `L${x(i).toFixed(1)} ${y(ib[i]).toFixed(1)}` }).join('') + 'Z'
  const last = rows.length - 1
  const sep = Math.abs(y(ia[last]) - y(ib[last])) < 26
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot tpath${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--ink)' : v === 100 ? 'var(--grey-45)' : 'var(--rule-faint)'} strokeDasharray={v === 100 ? '4 3' : undefined} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="cb__gl">{v}%</text>
            </g>
          ))}
          <text x={m.l - 8} y={m.t - 16} className="cb__axis">share of {base.year} &uarr;</text>
          <path d={band} className="tpath__band" />
          <path d={pa} className="tpath__a" pathLength="1" />
          <path d={pb} className="tpath__b" pathLength="1" />
          {rows.map((r, i) => (
            <g key={r.year} className="tpath__pt" style={{ '--d': `${300 + i * 140}ms` }}>
              <circle cx={x(i)} cy={y(ia[i])} r="4.5" className="tpath__da" />
              <circle cx={x(i)} cy={y(ib[i])} r="4.5" className="tpath__db" />
              {!narrow && i > 0 && i < last && <text x={x(i)} y={y(ia[i]) - 10} textAnchor="middle" className="tpath__va">{r.aText}</text>}
              {!narrow && i > 0 && i < last && <text x={x(i)} y={y(ib[i]) + 18} textAnchor="middle" className="tpath__vb">{r.bText}</text>}
              <text x={x(i)} y={H - 8} textAnchor="middle" className="cb__gl">{narrow ? `'${String(r.year).slice(2)}` : r.year}</text>
            </g>
          ))}
          <text x={x(last) + 9} y={y(ia[last]) + (sep && ia[last] >= ib[last] ? -4 : 4)} className="tpath__la">{aLabel}</text>
          <text x={x(last) + 9} y={y(ib[last]) + (sep && ib[last] > ia[last] ? -4 : sep ? 14 : 4)} className="tpath__lb">{bLabel}</text>
        </svg>
      </div>
    </div>
  )
}

// A pile of days: every active day since the habit began is one dot, stacked in
// the 1 km band its distance on foot fell in. Days under the cut-off are orange.
// props: kms [km per active day], cut, per (days per dot), aria
export function DayPile({ kms, cut = 2, per = 5, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const top = 30
  const bins = new Array(top + 1).fill(0)
  for (const k of kms) bins[Math.min(top, Math.floor(k))]++
  const m = { l: 10, r: 10, t: 30, b: 44 }
  const cw = (W - m.l - m.r) / (top + 1)
  const dot = Math.max(2.5, Math.min(7, cw - 2))
  const step = dot + (narrow ? 1 : 1.5)
  const tallest = Math.max(...bins.map((b) => Math.ceil(b / per)))
  const H = m.t + tallest * step + m.b
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot dpile${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          <line x1={m.l} x2={W - m.r} y1={H - m.b + 2} y2={H - m.b + 2} stroke="var(--ink)" />
          {bins.map((b, i) => {
            const nd = Math.ceil(b / per)
            const cx = m.l + cw * (i + 0.5)
            return (
              <g key={i} className={`dpile__col${i < cut ? ' is-small' : ''}`} style={{ '--d': `${i * 30}ms` }}>
                {Array.from({ length: nd }, (_, k) => (
                  <rect key={k} x={cx - dot / 2} y={H - m.b - (k + 1) * step + 1} width={dot} height={dot} rx={dot / 2} />
                ))}
              </g>
            )
          })}
          {[0, 5, 10, 15, 20, 25, 30].map((v) => (
            <text key={v} x={m.l + cw * (v + 0.5)} y={H - m.b + 18} textAnchor="middle" className="cb__gl">{v === 30 ? '30+' : v}</text>
          ))}
          <text x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle" className="cb__axis">km on foot that day &rarr;</text>
          <text x={W - m.r} y={14} textAnchor="end" className="cb__axis">one dot = {per} days</text>
        </svg>
      </div>
    </div>
  )
}

// Every full week as a dot, one row per year, placed by the distance on foot
// that week. The shaded band holds the middle half of the weeks and the tick is
// the median week. The year in progress is orange.
// props: years [{ year, weeks [{ km }], q25, med, q75 }], now, aria
export function WeekStrips({ years, now, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const rowH = narrow ? 42 : 52
  const m = { l: 44, r: 12, t: 16, b: 36 }
  const H = m.t + years.length * rowH + m.b
  const hi = Math.max(160, ...years.flatMap((y) => y.weeks.map((w) => w.km)))
  const x = linScale([0, hi], [m.l, W - m.r])
  const ticks = [0, 25, 50, 75, 100, 125, 150].filter((v) => v <= hi && (!narrow || v % 50 === 0))
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot wstrip${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          <rect x={x(0)} y={m.t} width={x(10) - x(0)} height={years.length * rowH} className="wstrip__low" />
          {ticks.map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={m.t} y2={H - m.b} stroke="var(--rule-faint)" />
              <text x={x(v)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{v}</text>
            </g>
          ))}
          <text x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle" className="cb__axis">km on foot in the week &rarr;</text>
          {years.map((y, yi) => {
            const cy = m.t + yi * rowH + rowH / 2
            const isNow = y.year === now
            return (
              <g key={y.year} className={`wstrip__row${isNow ? ' is-now' : ''}`} style={{ '--d': `${yi * 120}ms` }}>
                <text x={m.l - 8} y={cy + 4} textAnchor="end" className="cdots__y">{y.year}</text>
                <rect x={x(y.q25)} y={cy - rowH * 0.36} width={Math.max(2, x(y.q75) - x(y.q25))} height={rowH * 0.72} rx="3" className="wstrip__band" />
                {y.weeks.map((w, i) => {
                  const j = (((i * 7919) % 13) / 12 - 0.5) * rowH * 0.5
                  return <circle key={w.start} cx={x(w.km)} cy={cy + j} r={narrow ? 2.6 : 3.2} className="wstrip__dot" />
                })}
                <line x1={x(y.med)} x2={x(y.med)} y1={cy - rowH * 0.42} y2={cy + rowH * 0.42} className="wstrip__med" />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// What came the day after: one square per long run, grouped by what followed it.
// props: items [{ next }], order [{ key, label }], aria
export function NextGrid({ items, order, aria }) {
  const [root, inView] = useInView()
  const groups = order.map((o) => ({ ...o, n: items.filter((i) => i.next === o.key).length })).filter((g) => g.n)
  let k = 0
  return (
    <div ref={root} className={`ngrid${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      <div className="ngrid__cells" aria-hidden="true">
        {groups.flatMap((g) => Array.from({ length: g.n }, () => <i key={k} className={`ngrid__c is-${g.key}`} style={{ '--d': `${(k++) * 6}ms` }} />))}
      </div>
      <ul className="ngrid__key" aria-hidden="true">
        {groups.map((g) => (
          <li key={g.key}><i className={`ngrid__c is-${g.key}`} /><b className="mono">{Math.round((100 * g.n) / items.length)}%</b> {g.label} <span className="ngrid__n">({g.n})</span></li>
        ))}
      </ul>
    </div>
  )
}

// The maths of a year's distance: across is the share of days out, up is the
// distance per day out, and every curve is one yearly total. Each year sits
// where its two levers put it.
// props: years [{ year, share, kmPerActive, km, partial }], totals [km], aria
export function IsoKm({ years, totals = [1000, 2000, 3000], aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 320 : 380
  const m = { l: 44, r: 16, t: 30, b: 44 }
  const yMax = 20
  const x = linScale([0.4, 1], [m.l, W - m.r])
  const y = linScale([0, yMax], [H - m.b, m.t])
  const curve = (T) => {
    let d = ''
    for (let s = 0.4; s <= 1.0001; s += 0.01) { const v = T / (365 * s); if (v > yMax) continue; d += `${d ? 'L' : 'M'}${x(s).toFixed(1)} ${y(v).toFixed(1)}` }
    return d
  }
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot isok${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {[0, 5, 10, 15, 20].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--ink)' : 'var(--rule-faint)'} />
              {v > 0 && <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="cb__gl">{v}</text>}
            </g>
          ))}
          {[0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((s) => (
            <text key={s} x={x(s)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{(!narrow || Math.round(s * 10) % 2 === 0) ? `${Math.round(s * 100)}%` : ''}</text>
          ))}
          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">share of days with an outing &rarr;</text>
          <text x={m.l - 8} y={m.t - 16} className="cb__axis">km on foot per day out &uarr;</text>
          {totals.map((T) => {
            const s0 = Math.max(0.415, T / (365 * (yMax - 1)))
            const v = T / (365 * s0)
            return (
              <g key={T} className="isok__iso">
                <path d={curve(T)} />
                <text x={x(s0) + 4} y={y(v) - 7} className="isok__il">{n0(T)} km{narrow ? '' : ' a year'}</text>
              </g>
            )
          })}
          {years.map((yr, i) => {
            const cx = x(Math.max(0.4, yr.share)), cy = y(Math.min(yMax, yr.kmPerActive))
            const right = cx < W * 0.75
            return (
              <g key={yr.year} className={`isok__pt${yr.partial ? ' is-now' : ''}`} style={{ '--d': `${300 + i * 120}ms` }}>
                <circle cx={cx} cy={cy} r={yr.partial ? 7 : 5.5} />
                <text x={right ? cx + 10 : cx - 10} y={cy + 4} textAnchor={right ? 'start' : 'end'} className="isok__pl">{yr.year}{narrow ? '' : `, ${n0(yr.km)} km`}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

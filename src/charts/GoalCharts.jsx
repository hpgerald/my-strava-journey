import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { linScale } from './primitives.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDOY = (y, i) => { const d = new Date(Date.UTC(y, 0, 1) + i * 86400000); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` }

// The day each target was met, one row per year: across is the calendar, a
// coloured ring sits on the day a target was crossed, and a thin bar shows how
// far through the year the record runs. Targets never met that year are listed
// at the row's end with their share.
// props: rows [{ year, ndays, upTo, marks [{ key, label, day | null, share }] }], aria
export function CloseDots({ rows, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const m = { l: 44, r: narrow ? 8 : 12, t: 22, b: 26 }
  const rowH = narrow ? 40 : 48
  const H = m.t + rows.length * rowH + m.b
  const X = (i, n) => m.l + (i / n) * (W - m.l - m.r)
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot cdots${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {MON.map((mm, i) => (i % (narrow ? 3 : 1) === 0 ? (
            <g key={mm}>
              <line x1={X(i * 30.42, 365)} x2={X(i * 30.42, 365)} y1={m.t - 6} y2={H - m.b} stroke="var(--rule-faint)" />
              <text x={X(i * 30.42 + 15, 365)} y={H - 8} textAnchor="middle" className="cb__gl">{mm}</text>
            </g>
          ) : null))}
          {rows.map((r, ri) => {
            const cy = m.t + ri * rowH + rowH / 2
            const open = r.marks.filter((k) => k.day == null)
            return (
              <g key={r.year} className="cdots__row" style={{ '--d': `${ri * 90}ms` }}>
                <text x={m.l - 8} y={cy + 4} textAnchor="end" className="cdots__y">{r.year}</text>
                <line x1={X(0, r.ndays)} x2={X(r.upTo, r.ndays)} y1={cy} y2={cy} className={`cdots__track${r.upTo < r.ndays ? ' is-now' : ''}`} />
                {r.marks.filter((k) => k.day != null).map((k, i) => (
                  <g key={k.key}>
                    <circle cx={X(k.day, r.ndays)} cy={cy} r="7" className={`cdots__dot mstroke--${k.ring}`} />
                    <text x={X(k.day, r.ndays)} y={cy - 11 - i * 0} textAnchor="middle" className="cdots__dl">{narrow ? '' : fmtDOY(r.year, k.day)}</text>
                  </g>
                ))}
                {!narrow && open.length > 0 && (
                  <text x={W - m.r} y={cy + 16} textAnchor="end" className="cdots__open">{open.map((k) => `${k.label.toLowerCase()} ${Math.round(k.share * 100)}%`).join(' · ')}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// Where the year could finish: each bar counts the simulated finishes that land
// in that band, the dashed line is the target and the bars past it are orange.
// The share that clears the target is printed beside the line.
// props: finals (sorted), target, unit, aria
export function SimHist({ finals, target, unit = 'm', aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const H = narrow ? 280 : 340
  const m = { t: 40, r: 12, b: 44, l: 44 }
  const lo = Math.floor(Math.min(finals[0], target) / 500) * 500 - 500
  const hi = Math.ceil(Math.max(finals[finals.length - 1], target) / 500) * 500 + 500
  const bw = 250
  const nb = Math.round((hi - lo) / bw)
  const counts = new Array(nb).fill(0)
  for (const v of finals) counts[Math.min(nb - 1, Math.floor((v - lo) / bw))]++
  const x = linScale([lo, hi], [m.l, W - m.r])
  const y = linScale([0, Math.max(...counts) * 1.12], [H - m.b, m.t])
  const hit = finals.filter((v) => v >= target).length / finals.length
  const step = (hi - lo) > 8000 ? 2000 : 1000
  const ticks = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v)
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke="var(--ink)" />
          {counts.map((c, i) => {
            const v0 = lo + i * bw
            return (
              <g key={i} className={`cb__bar cb__bar--${v0 >= target ? 'big' : 'quiet'}`} style={{ '--d': `${i * 20}ms` }}>
                {c > 0 && <rect x={x(v0) + 0.5} y={y(c)} width={Math.max(1, x(v0 + bw) - x(v0) - 1)} height={y(0) - y(c)} style={{ transformOrigin: `0 ${y(0)}px` }} />}
              </g>
            )
          })}
          {ticks.map((v) => <text key={v} x={x(v)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{(v / 1000).toLocaleString('en-US')}k</text>)}
          <line x1={x(target)} x2={x(target)} y1={m.t - 14} y2={y(0)} className="simh__target" />
          <text x={x(target) + 6} y={m.t - 4} className="simh__tl">{Math.round(hit * 100)}% clear {target.toLocaleString('en-US')} {unit}</text>
          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">where the year finishes, metres climbed &rarr;</text>
          <text x={m.l - 8} y={m.t - 22} className="cb__axis">finishes &uarr;</text>
        </svg>
      </div>
    </div>
  )
}

// Time out on the course, cut into moving and stopped: one bar per edition, the
// moving part solid and the stops hatched at the end, with both read out.
// props: rows [{ label, moving, stopped, now }], aria
export function StopBars({ rows, aria }) {
  const [root, inView] = useInView()
  const top = Math.max(...rows.map((r) => r.moving + r.stopped))
  const hm = (min) => { const h = Math.floor(min / 60), mm = Math.round(min % 60); return h ? `${h} h ${String(mm).padStart(2, '0')}` : `${mm} min` }
  return (
    <div ref={root} className={`hb stopb${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      <p className="chr__key" aria-hidden="true"><i className="chr__barsw" />moving <i className="stopb__sw" />stopped</p>
      <ul className="hb__list" aria-hidden="true">
        {rows.map((r, i) => (
          <li key={r.label} className="hb__row" style={{ '--d': `${i * 90}ms` }}>
            <span className="hb__lbl">{r.label}<small className="hb__sub">{hm(r.moving + r.stopped)} on the course</small></span>
            <span className="hb__track">
              <span className={`hb__bar ${r.now ? 'mfill--road' : 'mfill--ink'}`} style={{ '--v': r.moving / top }} />
              <span className="stopb__stop" style={{ '--v0': r.moving / top, '--v': r.stopped / top }} />
              <b className="hb__val mono" style={{ '--v': (r.moving + r.stopped) / top }}>{hm(r.moving)} <span className="chr__exp">+ {Math.round(r.stopped)} min</span></b>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// A tally: every visit is one stroke, counted in fives the way a tally is kept
// by hand, four upright and the fifth across. Strokes are grouped by month and
// coloured by how the visit was made.
// props: visits [{ n, date, sport, km }], aria
export function Tally({ visits, aria }) {
  const [root, inView] = useInView()
  const months = []
  for (const v of visits) { const k = v.date.slice(0, 7); let g = months.find((x) => x.k === k); if (!g) { g = { k, items: [] }; months.push(g) } g.items.push(v) }
  return (
    <div ref={root} className={`tally${inView ? ' is-in' : ''}`} role="img" aria-label={aria}>
      {months.map((g, gi) => {
        const gates = []
        for (let i = 0; i < g.items.length; i += 5) gates.push(g.items.slice(i, i + 5))
        return (
          <div key={g.k} className="tally__m" style={{ '--d': `${gi * 160}ms` }}>
            <p className="tally__ml">{MON[parseInt(g.k.slice(5, 7), 10) - 1]} <span className="mono">{g.items.length}</span></p>
            <div className="tally__gates">
              {gates.map((gate, j) => (
                <svg key={j} width="44" height="40" viewBox="0 0 44 40" aria-hidden="true" className="tally__gate">
                  {gate.slice(0, 4).map((v, i) => <line key={v.n} x1={6 + i * 9} x2={6 + i * 9} y1="5" y2="35" className={`tally__s ${v.sport === 'Walk' ? 'is-walk' : 'is-run'}`} style={{ '--i': `${(gi * 10 + j * 5 + i) * 40}ms` }} />)}
                  {gate[4] && <line x1="1" x2="38" y1="31" y2="9" className={`tally__s tally__x ${gate[4].sport === 'Walk' ? 'is-walk' : 'is-run'}`} style={{ '--i': `${(gi * 10 + j * 5 + 4) * 40}ms` }} />}
                </svg>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Every calendar month as a bead on a string, one string per year: the bead's
// size is the distance on foot that month, orange beads passed 100 km, and an
// empty ring is a month with no outing at all.
// props: months [{ key, year, mo, n, km }], aria
export function MonthBeads({ months, aria }) {
  const [ref, width] = useWidth(640)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  const years = [...new Set(months.map((m) => m.year))]
  const m = { l: 44, r: 10, t: 22, b: 8 }
  const rowH = narrow ? 32 : 40
  const H = m.t + years.length * rowH + m.b
  const cw = (W - m.l - m.r) / 12
  const maxKm = Math.max(1, ...months.map((x) => x.km))
  const rOf = (km) => 2.5 + Math.sqrt(km / maxKm) * (Math.min(cw, rowH) / 2 - 3)
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot beads${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {MON.map((mm, i) => (i % (narrow ? 2 : 1) === 0 ? <text key={mm} x={m.l + cw * (i + 0.5)} y={12} textAnchor="middle" className="cb__gl">{narrow ? mm[0] : mm}</text> : null))}
          {years.map((y, yi) => {
            const cy = m.t + yi * rowH + rowH / 2
            const row = months.filter((x) => x.year === y)
            const first = row[0], last = row[row.length - 1]
            return (
              <g key={y}>
                <text x={m.l - 8} y={cy + 4} textAnchor="end" className="cdots__y">{y}</text>
                <line x1={m.l + cw * (first.mo - 0.5)} x2={m.l + cw * (last.mo - 0.5)} y1={cy} y2={cy} className="beads__string" />
                {row.map((x, i) => (
                  <circle key={x.key} cx={m.l + cw * (x.mo - 0.5)} cy={cy} r={x.n ? rOf(x.km) : 4} className={`beads__b${x.n === 0 ? ' is-none' : x.km >= 100 ? ' is-big' : ''}`} style={{ '--d': `${(yi * 12 + i) * 18}ms` }}>
                    <title>{`${MON[x.mo - 1]} ${x.year}: ${x.n ? `${Math.round(x.km)} km on foot, ${x.n} outings` : 'no outing'}`}</title>
                  </circle>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

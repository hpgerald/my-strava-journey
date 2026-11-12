import { useWidth } from './useWidth.js'

// The five signature pictures of a year on the site's Year in Sport page.
// Each one answers one question about the year, and each is drawn for the
// phone as well as the desk: no text under 12 px, labels kept off the marks.
//   YearRing   what the days of the year looked like, as one ring
//   KmWaffle   where the kilometres came from, one square for a set distance
//   WeekRidge  the weeks of the year as a ridge, peak and thin weeks marked
//   RankBoard  this year against every other year, on six measures
//   BestDay    the biggest day of the year, against every other outing

const FOOT = ['Walk', 'Run', 'TrailRun', 'Hike']
export const SPORT_NAME = { Walk: 'Walks', Run: 'Runs', TrailRun: 'Trail runs', Hike: 'Hikes' }
export const SPORT_FILL = { Walk: 'var(--grey-55)', Run: 'var(--ink)', TrailRun: 'var(--accent)', Hike: 'var(--grey-35)' }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY = 864e5
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const km = (a) => Number(a.distance_km) || 0

// ---------------------------------------------------------------- the ring
// one spoke a day around the year, January at the top, longer for more
// kilometres on foot and shaded by the sport that carried the day. A day with
// only other activities is a short grey tick, a zero day a faint dot. The
// longest run of days in a row is the dark arc outside.
export function YearRing({ year, acts, startISO, endISO, streak, aria }) {
  const [ref, width] = useWidth(560)
  const S = Math.min(560, Math.max(280, width))
  const narrow = S < 420
  const cx = S / 2, cy = S / 2
  const R0 = S * (narrow ? 0.2 : 0.22), R1 = S * 0.44
  const t0 = Date.UTC(year, 0, 1), nDays = Math.round((Date.UTC(year + 1, 0, 1) - t0) / DAY)
  const byDay = new Map()
  for (const a of acts) {
    const d = (a.date || '').slice(0, 10); const o = byDay.get(d) || { km: 0, sport: null, best: 0, any: true }
    if (FOOT.includes(a.sport_type)) { o.km += km(a); if (km(a) > o.best) { o.best = km(a); o.sport = a.sport_type } }
    byDay.set(d, o)
  }
  const maxKm = Math.max(10, ...[...byDay.values()].map((o) => o.km))
  const ang = (i) => (i / nDays) * 2 * Math.PI - Math.PI / 2
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  const inYear = (d) => d >= startISO && d <= endISO
  const spokes = []
  for (let i = 0; i < nDays; i++) {
    const d = iso(t0 + i * DAY)
    if (!inYear(d)) continue
    const o = byDay.get(d)
    if (!o) { const [x, y] = pt(i, R0 - 4); spokes.push(<circle key={d} cx={x} cy={y} r={1.1} className="yring__zero" />); continue }
    const len = o.km > 0 ? 6 + (R1 - R0 - 6) * Math.sqrt(o.km / maxKm) : 4
    const [x1, y1] = pt(i, R0), [x2, y2] = pt(i, R0 + len)
    spokes.push(<line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={o.sport ? SPORT_FILL[o.sport] : 'var(--grey-25)'} strokeWidth={narrow ? 1.1 : 1.6} />)
  }
  // the longest run of days, clipped to the year
  let arc = null
  if (streak && streak.len >= 7 && streak.startISO) {
    const a = Math.max(0, Math.round((Date.parse(streak.startISO) - t0) / DAY)), b = Math.min(nDays - 1, Math.round((Date.parse(streak.endISO) - t0) / DAY))
    if (b > a) {
      const r = R1 + (narrow ? 8 : 10), [x1, y1] = pt(a, r), [x2, y2] = pt(b + 0.9, r), large = (b - a) / nDays > 0.5 ? 1 : 0
      // the words for the arc are in the text beside the ring, so the arc carries none
      arc = (
        <g className="yring__streak">
          <path d={`M${x1} ${y1}A${r} ${r} 0 ${large} 1 ${x2} ${y2}`} />
        </g>
      )
    }
  }
  const days = [...byDay.keys()].filter(inYear).length
  return (
    <div ref={ref} className="yring">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="img" aria-label={aria} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
        <circle cx={cx} cy={cy} r={R0} className="yring__base" />
        {MON.map((m, k) => {
          const i = Math.round((Date.UTC(year, k, 1) - t0) / DAY)
          const [x1, y1] = pt(i, R0 - 10), [x2, y2] = pt(i, R1 + 2)
          const [tx, ty] = pt(i + 15, R0 - (narrow ? 16 : 20))
          return <g key={m}><line x1={x1} y1={y1} x2={x2} y2={y2} className="yring__mon" /><text x={tx} y={ty + 4} textAnchor="middle" className="yring__ml">{narrow ? m[0] : m}</text></g>
        })}
        {spokes}
        {arc}
        <text x={cx} y={cy + (narrow ? 2 : -4)} textAnchor="middle" className="yring__n" style={narrow ? { fontSize: 24 } : null}>{days}</text>
        <text x={cx} y={cy + (narrow ? 18 : 16)} textAnchor="middle" className="yring__u">days out</text>
      </svg>
      <p className="yset__key">
        {FOOT.filter((k) => [...byDay.values()].some((o) => o.sport === k)).map((k) => <span key={k}><i style={{ background: SPORT_FILL[k] }} />{SPORT_NAME[k]}</span>)}
        <span><i className="is-dot" />a zero day</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- the waffle
// the year's kilometres on foot as squares, one square for a round distance,
// grouped by sport from the biggest share to the smallest
export function KmWaffle({ acts, aria }) {
  const [ref, width] = useWidth(640)
  const W = Math.max(280, width)
  const tot = {}
  for (const a of acts) if (FOOT.includes(a.sport_type)) tot[a.sport_type] = (tot[a.sport_type] || 0) + km(a)
  const all = Object.values(tot).reduce((s, v) => s + v, 0)
  if (!all) return <div ref={ref} />
  const unit = all >= 1500 ? 10 : all >= 300 ? 5 : 1
  const order = FOOT.filter((k) => tot[k] >= unit / 2).sort((p, q) => tot[q] - tot[p])
  const cells = order.flatMap((k) => Array.from({ length: Math.round(tot[k] / unit) }, () => k))
  const cols = W < 420 ? 20 : 25
  const gap = 2, size = Math.min(18, Math.floor((W - gap * (cols - 1)) / cols))
  const rows = Math.ceil(cells.length / cols)
  return (
    <div ref={ref} className="ywaf">
      <svg width={cols * (size + gap)} height={rows * (size + gap)} role="img" aria-label={aria} style={{ display: 'block' }}>
        {cells.map((k, i) => <rect key={i} x={(i % cols) * (size + gap)} y={Math.floor(i / cols) * (size + gap)} width={size} height={size} fill={SPORT_FILL[k]} />)}
      </svg>
      <p className="yset__key">
        {order.map((k) => <span key={k}><i style={{ background: SPORT_FILL[k] }} />{SPORT_NAME[k]} <b>{n0(tot[k])} km</b></span>)}
        <span className="yset__unit">One square is {unit} km.</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- the ridge
// every week of the year, Sunday to Saturday, drawn as one ridge: the height is
// the kilometres on foot that week. The peak week is named, the middle week is
// the dashed line, and the thin weeks (under 10 km) are marked under the ridge.
export function WeekRidge({ series, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 220 : 260
  const m = { l: narrow ? 8 : 12, r: narrow ? 8 : 12, t: 44, b: 34 }
  if (!series.length) return <div ref={ref} />
  const max = Math.max(10, ...series.map((w) => w.km))
  const x = (i) => m.l + (i / Math.max(1, series.length - 1)) * (W - m.l - m.r)
  const y = (v) => H - m.b - (v / max) * (H - m.t - m.b)
  const line = series.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(w.km).toFixed(1)}`).join('')
  const area = `${line}L${x(series.length - 1)} ${H - m.b}L${x(0)} ${H - m.b}Z`
  const pk = series.reduce((b, w, i) => (w.km > series[b].km ? i : b), 0)
  const sorted = series.map((w) => w.km).sort((p, q) => p - q), med = sorted[Math.floor(sorted.length / 2)]
  const wkISO = (w) => iso((w.w * 7 + 3) * DAY)
  const pkDate = new Date(Date.parse(wkISO(series[pk])))
  const pkLabel = `${n0(series[pk].km)} km, week of ${pkDate.getUTCDate()} ${MON[pkDate.getUTCMonth()]}`
  const anchor = x(pk) > W * 0.7 ? 'end' : x(pk) < W * 0.3 ? 'start' : 'middle'
  // month ticks along the bottom
  const ticks = []
  series.forEach((w, i) => { const d = new Date(Date.parse(wkISO(w))); if (d.getUTCDate() <= 7) ticks.push({ i, m: MON[d.getUTCMonth()] }) })
  return (
    <div ref={ref} className="yridge">
      <svg width={W} height={H} role="img" aria-label={aria} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="yridgeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0.08" /></linearGradient>
        </defs>
        <path d={area} fill="url(#yridgeFill)" />
        <path d={line} className="yridge__line" />
        <line x1={m.l} x2={W - m.r} y1={y(med)} y2={y(med)} className="yridge__med" />
        <text x={W - m.r} y={y(med) - 6} textAnchor="end" className="yridge__t">a middle week, {n0(med)} km</text>
        {series.map((w, i) => (w.km < 10 ? <rect key={i} x={x(i) - 2} y={H - m.b + 4} width={4} height={8} className="yridge__thin" /> : null))}
        <circle cx={x(pk)} cy={y(series[pk].km)} r={4.5} className="yridge__pk" />
        <text x={x(pk)} y={y(series[pk].km) - 12} textAnchor={anchor} className="yridge__pkl">{pkLabel}</text>
        {ticks.filter((t, k) => !narrow || k % 2 === 0).map((t) => <text key={t.i} x={x(t.i)} y={H - 4} textAnchor="middle" className="yridge__t">{t.m}</text>)}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------- the ranks
// every year on six measures, one row each: the grey dots are the other years,
// the orange dot is this one, and the words say where it stands
export function RankBoard({ rows, year, partial, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
  return (
    <div ref={ref} className="yrank2" role="img" aria-label={aria}>
      {rows.map((r) => {
        const max = Math.max(...r.values.map((v) => v.v)) || 1
        const me = r.values.find((v) => v.y === year)
        const rank = 1 + r.values.filter((v) => v.v > me.v).length
        return (
          <div key={r.label} className="yrank2__row">
            <p className="yrank2__l">{r.label}<b>{ORD[rank - 1]} of {r.values.length}</b></p>
            <div className="yrank2__track">
              {r.values.filter((v) => v.y !== year).map((v) => <span key={v.y} className="yrank2__dot" style={{ left: `${(v.v / max) * 100}%` }} title={`${v.y}: ${r.fmt(v.v)}`} />)}
              <span className="yrank2__me" style={{ left: `${(me.v / max) * 100}%` }} />
              <span className={`yrank2__v${me.v / max > 0.75 ? ' is-left' : ''}`} style={{ left: `${(me.v / max) * 100}%` }}>{r.fmt(me.v)}</span>
            </div>
          </div>
        )
      })}
      {partial ? <p className="yrank2__note">{year} is still running{narrow ? '' : ', so it can still move up'}.</p> : null}
    </div>
  )
}

// ---------------------------------------------------------------- the best day
// the year's furthest outing on foot, drawn large, with every other outing of
// the year as a small dot on the same line of distance
export function BestDay({ acts, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width)
  const foot = acts.filter((a) => FOOT.includes(a.sport_type) && km(a) > 0)
  if (!foot.length) return <div ref={ref} />
  const best = foot.reduce((b, a) => (km(a) > km(b) ? a : b), foot[0])
  const max = km(best)
  const H = 64
  const x = (v) => 8 + (v / max) * (W - 24)
  // dots stacked in small columns so a crowd of short outings stays readable
  const bins = new Map()
  const dots = foot.filter((a) => a !== best).map((a) => { const k = Math.round(x(km(a)) / 6); const n = bins.get(k) || 0; bins.set(k, n + 1); return { cx: k * 6, cy: H - 10 - Math.min(n, 7) * 6 } })
  return (
    <div ref={ref} className="ybest">
      <svg width={W} height={H + 22} role="img" aria-label={aria} style={{ display: 'block' }}>
        {dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={2.2} className="ybest__dot" />)}
        <circle cx={x(max)} cy={H - 10} r={7} className="ybest__me" />
        <line x1={8} x2={W - 16} y1={H} y2={H} className="ybest__axis" />
        <text x={8} y={H + 18} className="ybest__t">0 km</text>
        <text x={W - 16} y={H + 18} textAnchor="end" className="ybest__t">{max.toFixed(1)} km</text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------- the months
// each month of the year as a column of its kilometres on foot, cut by sport,
// with the climbing of the month as a small orange tick above it
export function MonthStack({ year, acts, aria }) {
  const [ref, width] = useWidth(640)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 230 : 280
  const m = { l: 6, r: 6, t: 52, b: 26 }
  const months = Array.from({ length: 12 }, () => ({ km: {}, tot: 0, elev: 0 }))
  for (const a of acts) {
    if (!FOOT.includes(a.sport_type) || Number(a.year) !== year) continue
    const i = parseInt((a.date || '').slice(5, 7), 10) - 1
    if (i < 0) continue
    months[i].km[a.sport_type] = (months[i].km[a.sport_type] || 0) + km(a)
    months[i].tot += km(a)
    months[i].elev += Number(a.elevation_gain_m) || 0
  }
  const maxKm = Math.max(10, ...months.map((o) => o.tot)), maxEl = Math.max(1, ...months.map((o) => o.elev))
  const bw = (W - m.l - m.r) / 12, inner = bw * 0.62
  const y = (v) => H - m.b - (v / maxKm) * (H - m.t - m.b)
  const best = months.reduce((b, o, i) => (o.tot > months[b].tot ? i : b), 0)
  return (
    <div ref={ref} className="ymon2">
      <svg width={W} height={H} role="img" aria-label={aria} style={{ display: 'block' }}>
        {months.map((o, i) => {
          const x = m.l + i * bw + (bw - inner) / 2
          let acc = 0
          return (
            <g key={i}>
              {FOOT.filter((k) => o.km[k]).map((k) => { const h = (o.km[k] / maxKm) * (H - m.t - m.b); const yy = H - m.b - acc - h; acc += h; return <rect key={k} x={x} y={yy} width={inner} height={Math.max(0, h - 0.5)} fill={SPORT_FILL[k]} /> })}
              {o.elev > 0 ? <rect x={x + inner * 0.3} y={y(o.tot) - 4 - (3 + 21 * (o.elev / maxEl))} width={inner * 0.4} height={3 + 21 * (o.elev / maxEl)} className="ymon2__el" /> : null}
              {i === best && o.tot > 0 ? <text x={x + inner / 2} y={y(o.tot) - 10 - (o.elev > 0 ? 3 + 21 * (o.elev / maxEl) : 0)} textAnchor="middle" className="ymon2__v">{n0(o.tot)} km</text> : null}
              <text x={x + inner / 2} y={H - 8} textAnchor="middle" className="ymon2__m">{narrow ? MON[i][0] : MON[i]}</text>
            </g>
          )
        })}
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="ymon2__axis" />
      </svg>
    </div>
  )
}

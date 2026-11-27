import { useWidth } from './useWidth.js'
import { SPORT_FILL, SPORT_NAME } from './YearSet.jsx'
import { isNamedCountry } from '../lib/geo.js'

// The pictures made for the chapters of each Year in Sport. Each is drawn once
// and filled differently for each year. No text under 12 px, labels kept off
// the marks, and every picture works on a phone as well as on a desk.
//   YearMoments  every day of a stretch as a bar, the stretch's events numbered on it
//   Ladder       each new longest outing as a step
//   StreakCal    a calendar of weeks, Sunday first, with a streak drawn under it
//   SlopeCards   distance and climb of a few days, drawn as simple slopes
//   DayStack     the outings of one day built into one bar
//   KitBars      plain bars (one part or two), with an optional line under them
//   Profile      the height along a course
//   SilenceBand  a long empty stretch with its length
//   DotRows      outings as dots in rows, a bigger dot for a longer outing

const FOOT = ['Walk', 'Run', 'TrailRun', 'Hike']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY = 864e5
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const isoOf = (t) => new Date(t).toISOString().slice(0, 10)
const tOf = (iso) => Date.parse(iso + 'T00:00:00Z')
const km = (a) => Number(a.distance_km) || 0
const el = (a) => Number(a.elevation_gain_m) || 0
export const dayLabel = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]}`
export const COUNTRY_FILL = { Tanzania: 'var(--grey-55)', Kenya: 'var(--accent)', Malawi: 'var(--ink)', 'South Africa': 'var(--grey-25)', Rwanda: 'var(--accent-ink)' }

// the countries of a stretch for a key: African countries by name, the rest as others
function countryKeys(byDay) {
  const cs = [...new Set([...byDay.values()].map((o) => o.country).filter(Boolean))]
  const named = cs.filter(isNamedCountry).map((c) => ({ k: c, fill: COUNTRY_FILL[c] || 'var(--grey-35)', label: c }))
  return cs.some((c) => !isNamedCountry(c)) ? [...named, { k: 'others', fill: 'var(--grey-35)', label: 'Others' }] : named
}
const countryFill = (c) => (c && isNamedCountry(c) ? COUNTRY_FILL[c] || 'var(--grey-35)' : c ? 'var(--grey-35)' : 'var(--grey-15)')

// one entry a day: kilometres and climb on foot, the sport of the longest
// outing on foot, the country, and whether anything at all was logged
export function byDayOf(acts, geoByKey = {}) {
  const m = new Map()
  for (const a of acts) {
    const d = (a.date || '').slice(0, 10)
    const o = m.get(d) || { km: 0, elev: 0, min: 0, n: 0, sport: null, best: 0, country: null }
    o.n += 1
    o.min += Number(a.moving_time_min) || 0
    if (FOOT.includes(a.sport_type)) {
      o.km += km(a); o.elev += el(a)
      if (km(a) >= o.best) { o.best = km(a); o.sport = a.sport_type }
    }
    const g = geoByKey[a.activity_key]
    if (g && g.country && !o.country) o.country = g.country
    m.set(d, o)
  }
  return m
}

// ---------------------------------------------------------------- moments
// props: acts, fromISO, toISO, events [{ iso, label }], measure 'km' | 'elev',
//   colorBy 'sport' | 'country', geoByKey, aria, showList (default true)
export function YearMoments({ acts, fromISO, toISO, events = [], measure = 'km', colorBy = 'sport', geoByKey, aria, showList = true }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 560
  const days = Math.round((tOf(toISO) - tOf(fromISO)) / DAY) + 1
  const byDay = byDayOf(acts.filter((a) => { const d = (a.date || '').slice(0, 10); return d >= fromISO && d <= toISO }), geoByKey)
  const val = (o) => (measure === 'elev' ? o.elev : o.km)
  const max = Math.max(1, ...[...byDay.values()].map(val))
  const evs = events.filter((e) => e.iso >= fromISO && e.iso <= toISO).sort((a, b) => (a.iso < b.iso ? -1 : 1))
  const m = { l: 2, r: 2 }
  const slot = (W - m.l - m.r) / days
  const x = (i) => m.l + i * slot
  // the numbered events take lanes above the bars so no two circles touch
  const R = 11, lanes = [], placed = evs.map((e, k) => {
    const i = Math.round((tOf(e.iso) - tOf(fromISO)) / DAY)
    const cx = Math.min(W - R - 1, Math.max(R + 1, x(i) + slot / 2))
    let lane = 0
    while (lanes[lane] != null && cx - lanes[lane] < 2 * R + 4) lane++
    lanes[lane] = cx
    return { ...e, k: k + 1, i, cx, lane }
  })
  const nl = Math.max(1, lanes.length)
  const top = 8 + nl * (2 * R + 6)
  const barH = narrow ? 110 : 150
  const H = top + barH + 30
  const base = top + barH
  const y = (v) => base - (v > 0 ? 4 + (barH - 4) * Math.sqrt(v / max) : 0)
  const fill = (o) => (colorBy === 'country' ? countryFill(o.country) : o.sport ? SPORT_FILL[o.sport] : 'var(--grey-25)')
  const bw = Math.max(1, slot > 4 ? slot - 1.5 : slot * 0.9)
  const bars = []
  for (let i = 0; i < days; i++) {
    const d = isoOf(tOf(fromISO) + i * DAY), o = byDay.get(d)
    if (!o) continue
    const v = val(o)
    const yy = v > 0 ? y(v) : base - 3
    bars.push(<rect key={d} x={x(i) + (slot - bw) / 2} y={yy} width={bw} height={base - yy} fill={fill(o)} />)
  }
  // the axis: months for a long stretch, Sundays for a short one
  const ticks = []
  if (days > 75) {
    for (let i = 0; i < days; i++) {
      const d = isoOf(tOf(fromISO) + i * DAY)
      if (d.slice(8) === '01' || i === 0) ticks.push({ i, t: narrow ? MON[parseInt(d.slice(5, 7), 10) - 1][0] : MON[parseInt(d.slice(5, 7), 10) - 1] })
    }
  } else {
    const step = days > 35 ? (narrow ? 14 : 7) : narrow ? 7 : 7
    let last = -99
    for (let i = 0; i < days; i++) {
      const t = tOf(fromISO) + i * DAY
      if (new Date(t).getUTCDay() === 0 && i - last >= step) { ticks.push({ i, t: dayLabel(isoOf(t)) }); last = i }
    }
  }
  const keys = colorBy === 'country'
    ? countryKeys(byDay)
    : FOOT.filter((k) => [...byDay.values()].some((o) => o.sport === k)).map((k) => ({ k, fill: SPORT_FILL[k], label: SPORT_NAME[k] }))
  return (
    <div ref={ref} className="ymo">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {ticks.map((t) => <g key={t.i}><line x1={x(t.i)} x2={x(t.i)} y1={top - 4} y2={base + 6} className="ymo__tick" />{x(t.i) < W - (String(t.t).length * 7 + 6) ? <text x={x(t.i) + 3} y={base + 20} className="ymo__tl">{t.t}</text> : null}</g>)}
        {bars}
        <line x1={m.l} x2={W - m.r} y1={base} y2={base} className="ymo__axis" />
        {placed.map((p) => {
          const cy = 8 + R + p.lane * (2 * R + 6)
          const o = byDay.get(p.iso)
          const yb = o ? (val(o) > 0 ? y(val(o)) : base - 3) : base
          return (
            <g key={p.k} className="ymo__ev">
              <line x1={x(p.i) + slot / 2} x2={x(p.i) + slot / 2} y1={cy + R} y2={yb - 2} className="ymo__stem" />
              <circle cx={p.cx} cy={cy} r={R} className="ymo__dot" />
              <text x={p.cx} y={cy + 4.5} textAnchor="middle" className="ymo__n">{p.k}</text>
            </g>
          )
        })}
      </svg>
      {keys.length > 1 ? <p className="yset__key">{keys.map((k) => <span key={k.k}><i style={{ background: k.fill }} />{k.label}</span>)}</p> : null}
      {showList && placed.length ? (
        <ol className="ymo__list">
          {placed.map((p) => <li key={p.k}><b>{p.k}</b><span className="ymo__d">{dayLabel(p.iso)}</span><span className="ymo__l">{p.label}</span></li>)}
        </ol>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- the ladder
// props: steps [{ iso, km, hot }], aria. The treads are even, so close dates
// stay readable; each tread carries its distance and its date.
export function Ladder({ steps, aria }) {
  const [ref, width] = useWidth(640)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 230 : 280
  const m = { t: 30, r: 4, b: 40, l: 4 }
  const n = steps.length
  const tw = (W - m.l - m.r) / n
  const max = Math.max(...steps.map((s) => s.km)) * 1.05
  const y = (v) => H - m.b - (v / max) * (H - m.t - m.b)
  let d = `M${m.l} ${H - m.b}`
  steps.forEach((s, i) => { d += `V${y(s.km)}H${m.l + (i + 1) * tw}` })
  d += `V${H - m.b}Z`
  return (
    <div ref={ref} className="ylad">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        <path d={d} className="ylad__fill" />
        {steps.map((s, i) => (
          <g key={s.iso}>
            <line x1={m.l + i * tw} x2={m.l + (i + 1) * tw} y1={y(s.km)} y2={y(s.km)} className={`ylad__tread${s.hot ? ' is-hot' : ''}`} />
            <text x={m.l + i * tw + tw / 2} y={y(s.km) - 8} textAnchor="middle" className={`ylad__v${s.hot ? ' is-hot' : ''}`}>{narrow ? s.km.toFixed(1) : `${s.km.toFixed(1)} km`}</text>
            <text x={m.l + i * tw + tw / 2} y={H - m.b + 18} textAnchor="middle" className="ylad__d">{dayLabel(s.iso)}</text>
            {s.year ? <text x={m.l + i * tw + tw / 2} y={H - m.b + 34} textAnchor="middle" className="ylad__d">{s.iso.slice(0, 4)}</text> : null}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------- calendar
// weeks run Sunday to Saturday as columns. A long stretch on a narrow screen
// breaks into blocks so each day stays big enough to see.
// props: acts, fromISO, toISO, colorBy 'sport' | 'country' | 'time', geoByKey,
//   streak { fromISO, toISO, label }, aria
const TIME_RAMP = ['#ffe0d1', '#ffb38f', '#fc4c02', '#b23400']
export function StreakCal({ acts, fromISO, toISO, colorBy = 'sport', geoByKey, streak, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 560
  const byDay = byDayOf(acts.filter((a) => { const d = (a.date || '').slice(0, 10); return d >= fromISO && d <= toISO }), geoByKey)
  const t0 = tOf(fromISO) - new Date(tOf(fromISO)).getUTCDay() * DAY
  const weeks = Math.ceil((tOf(toISO) - t0 + DAY) / (7 * DAY))
  const lab = narrow ? 14 : 30, gap = 2
  let cell = Math.floor((W - lab) / weeks) - gap
  let per = weeks
  if (cell < 9) { cell = narrow ? 10 : 11; per = Math.max(4, Math.floor((W - lab) / (cell + gap))) }
  cell = Math.min(cell, 28)
  const blocks = []
  for (let b = 0; b < weeks; b += per) blocks.push([b, Math.min(weeks, b + per)])
  const blockH = 18 + 7 * (cell + gap) + (streak ? 30 : 8)
  const fill = (o) => {
    if (colorBy === 'country') return countryFill(o.country)
    if (colorBy === 'time') { const k = o.min >= 240 ? 3 : o.min >= 90 ? 2 : o.min >= 40 ? 1 : 0; return TIME_RAMP[k] }
    return o.sport ? SPORT_FILL[o.sport] : 'var(--grey-25)'
  }
  const keys = colorBy === 'country'
    ? countryKeys(byDay)
    : colorBy === 'time' ? [{ k: 'a', fill: TIME_RAMP[0], label: 'under 40 min' }, { k: 'b', fill: TIME_RAMP[1], label: '40 to 90 min' }, { k: 'c', fill: TIME_RAMP[2], label: '90 min to 4 h' }, { k: 'd', fill: TIME_RAMP[3], label: '4 h or more' }]
      : FOOT.filter((k) => [...byDay.values()].some((o) => o.sport === k)).map((k) => ({ k, fill: SPORT_FILL[k], label: SPORT_NAME[k] }))
  const H = blocks.length * blockH
  const out = []
  blocks.forEach(([b0, b1], bi) => {
    const oy = bi * blockH
    let lastM = -99
    for (let w = b0; w < b1; w++) {
      const cx = lab + (w - b0) * (cell + gap)
      for (let dw = 0; dw < 7; dw++) {
        const t = t0 + (w * 7 + dw) * DAY, d = isoOf(t)
        if (d < fromISO || d > toISO) continue
        const o = byDay.get(d)
        const cy = oy + 18 + dw * (cell + gap)
        out.push(o ? <rect key={d} x={cx} y={cy} width={cell} height={cell} fill={fill(o)} /> : <rect key={d} x={cx + 0.5} y={cy + 0.5} width={cell - 1} height={cell - 1} className="ycal__zero" />)
        if (d.slice(8) === '01' || (w === b0 && dw === 0 && d >= fromISO) || d === fromISO) {
          if (cx - lastM >= 30) { out.push(<text key={'m' + d} x={cx} y={oy + 12} className="ycal__m">{MON[parseInt(d.slice(5, 7), 10) - 1]}</text>); lastM = cx }
        }
      }
    }
    if (!narrow) { out.push(<text key={'s' + bi} x={0} y={oy + 18 + cell - 1} className="ycal__m">Sun</text>); out.push(<text key={'a' + bi} x={0} y={oy + 18 + 6 * (cell + gap) + cell - 1} className="ycal__m">Sat</text>) }
    if (streak) {
      const wOf = (iso) => Math.floor((tOf(iso) - t0) / (7 * DAY))
      const s0 = Math.max(b0, wOf(streak.fromISO < fromISO ? fromISO : streak.fromISO)), s1 = Math.min(b1 - 1, wOf(streak.toISO > toISO ? toISO : streak.toISO))
      if (s1 >= s0) {
        const yy = oy + 18 + 7 * (cell + gap) + 6
        const xa = lab + (s0 - b0) * (cell + gap), xb = lab + (s1 - b0) * (cell + gap) + cell
        out.push(<line key={'k' + bi} x1={xa} x2={xb} y1={yy} y2={yy} className="ycal__streak" />)
        if (bi === Math.floor(Math.max(0, wOf(streak.fromISO < fromISO ? fromISO : streak.fromISO)) / per) && streak.label) {
          const right = xa > W * 0.55
          out.push(<text key={'kl' + bi} x={right ? xb : xa} y={yy + 18} textAnchor={right ? 'end' : 'start'} className="ycal__sl">{streak.label}</text>)
        }
      }
    }
  })
  return (
    <div ref={ref} className="ycal">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>{out}</svg>
      <p className="yset__key">{keys.map((k) => <span key={k.k}><i style={{ background: k.fill }} />{k.label}</span>)}<span><i className="is-box" />nothing</span></p>
    </div>
  )
}

// ---------------------------------------------------------------- slopes
// props: items [{ iso, title, km, elev, hot, note }], flat (no slopes, for
// days that are about the place more than the height), aria
export function SlopeCards({ items, flat = false, aria }) {
  const maxK = Math.max(1, ...items.map((i) => i.km || 0)), maxE = Math.max(1, ...items.map((i) => i.elev || 0))
  return (
    <ul className={`yslope${flat ? ' yslope--flat' : ''}`} aria-label={aria}>
      {items.map((it) => {
        // one smooth hill on a shared scale: as wide as the distance, as tall
        // as the climb, never stretched by the width of its column
        const w = 48 + 148 * ((it.km || 0) / maxK), h = 6 + 62 * ((it.elev || 0) / maxE)
        const x0 = 100 - w / 2, x1 = 100 + w / 2, top = 74 - h
        const hill = `M${x0.toFixed(1)} 74C${(x0 + w * 0.3).toFixed(1)} 74 ${(100 - w * 0.17).toFixed(1)} ${top.toFixed(1)} 100 ${top.toFixed(1)}C${(100 + w * 0.17).toFixed(1)} ${top.toFixed(1)} ${(x1 - w * 0.3).toFixed(1)} 74 ${x1.toFixed(1)} 74Z`
        return (
          <li key={(it.iso || '') + it.title} className={it.hot ? 'is-hot' : ''}>
            {flat ? null : (
              <svg viewBox="0 0 200 76" className="yslope__svg" aria-hidden="true">
                <path d={hill} className="yslope__hill" />
                <line x1="0" x2="200" y1="74.5" y2="74.5" className="yslope__ground" />
              </svg>
            )}
            {it.v != null ? <p className="yslope__v"><b>{it.v}</b> {it.u}</p> : <p className="yslope__v"><b>{it.km.toFixed(1)}</b> km{it.elev >= 10 ? <> · <b>{n0(it.elev)}</b> m up</> : null}</p>}
            <p className="yslope__t">{it.title}</p>
            <p className="yslope__d">{it.iso ? `${dayLabel(it.iso)} ${it.iso.slice(0, 4)}` : ''}{it.iso && it.note ? ' · ' : ''}{it.note || ''}</p>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------- one day
// props: items [{ label, km, elev, sport }], aria. One bar, cut by the climb
// of each outing, with the outings listed under it in order.
export function DayStack({ items, aria }) {
  const tot = items.reduce((t, i) => t + i.elev, 0) || 1
  const totK = items.reduce((t, i) => t + i.km, 0)
  return (
    <div className="ystack" role="img" aria-label={aria}>
      <div className="ystack__big"><b>{n0(tot)}</b><span>m climbed in one day, {totK.toFixed(1)} km</span></div>
      <div className="ystack__bar">
        {items.map((it, k) => <i key={k} style={{ flexGrow: Math.max(it.elev, tot * 0.012), background: SPORT_FILL[it.sport] || 'var(--grey-25)' }} />)}
      </div>
      <ol className="ystack__list">
        {items.map((it, k) => (
          <li key={k}><i style={{ background: SPORT_FILL[it.sport] || 'var(--grey-25)' }} /><span className="ystack__l">{it.label}</span><span className="ystack__n">{it.km.toFixed(1)} km · {n0(it.elev)} m</span></li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------- bars
// props: items [{ label, value, parts? [{ v, tone }], display, tone, note }],
//   every (label every k-th bar), ticks [values], tickFmt, yCap,
//   line { values, fmt, label } drawn as a strip under the bars, keys [{ tone, label }], aria
export function KitBars({ items, every = 1, ticks = [], tickFmt = (v) => n0(v), yCap, line, keys, aria, H: Hd }) {
  const [ref, width] = useWidth(640)
  const W = Math.max(280, width), narrow = W < 520
  const H0 = Hd || (narrow ? 230 : 280)
  const m = { t: yCap ? 34 : 22, r: 6, b: 28, l: ticks.length ? 40 : 4 }
  const LH = line ? 84 : 0
  const H = H0 + LH
  const vals = items.map((d) => (d.parts ? d.parts.reduce((t, p) => t + p.v, 0) : d.value))
  const max = Math.max(1e-9, ...vals, ...ticks) * 1.08
  const base = H0 - m.b
  const y = (v) => base - (v / max) * (H0 - m.t - m.b)
  const n = items.length
  const slot = (W - m.l - m.r) / n
  const bw = Math.max(1.5, slot * (n > 24 ? 0.78 : n > 9 ? 0.66 : 0.52))
  const bx = (i) => m.l + slot * i + (slot - bw) / 2
  const step = Math.max(every, narrow && n > 12 ? Math.ceil(n / 8) : every)
  // the line strip: its own small scale, values at the ends and at its extremes
  let strip = null
  if (line) {
    const vs = line.values
    const ok = vs.map((v, i) => [i, v]).filter(([, v]) => v != null && v > 0)
    if (ok.length >= 2) {
      const lo = Math.min(...ok.map(([, v]) => v)), hi = Math.max(...ok.map(([, v]) => v))
      const ly = (v) => H0 + 30 + (hi === lo ? 14 : ((line.invert ? hi - v : v - lo) / (hi - lo)) * 30)
      const pts = ok.map(([i, v]) => [bx(i) + bw / 2, ly(v)])
      const show = new Set([ok[0][0], ok[ok.length - 1][0]])
      strip = (
        <g className="ykb__line">
          <text x={W - m.r} y={H0 + 12} textAnchor="end" className="ykb__lc">{line.label}</text>
          <path d={pts.map((p, k) => `${k ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')} />
          {ok.map(([i, v], k) => <g key={i}><circle cx={pts[k][0]} cy={pts[k][1]} r={3} />{show.has(i) ? <text x={pts[k][0] + (k === 0 ? -4 : 4)} y={pts[k][1] + 17} textAnchor={k === 0 ? 'start' : 'end'} className="ykb__lv">{line.fmt(v)}</text> : null}</g>)}
        </g>
      )
    }
  }
  return (
    <div ref={ref} className="ykb">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {ticks.map((g) => <g key={g}><line x1={m.l} x2={W - m.r} y1={y(g)} y2={y(g)} className="ykb__grid" /><text x={m.l - 6} y={y(g) + 4} textAnchor="end" className="ykb__gl">{tickFmt(g)}</text></g>)}
        {items.map((d, i) => {
          let acc = 0
          const parts = d.parts || [{ v: d.value, tone: d.tone }]
          return (
            <g key={i}>
              {parts.map((p, k) => { const y1 = y(acc + p.v), y0 = y(acc); acc += p.v; return <rect key={k} x={bx(i)} y={y1} width={bw} height={Math.max(0, y0 - y1)} className={`ykb__b ykb__b--${p.tone || 'quiet'}`} /> })}
              {d.display ? <text x={bx(i) + bw / 2} y={y(vals[i]) - 6} textAnchor={i === 0 && bw < 20 ? 'start' : i === n - 1 && bw < 20 ? 'end' : 'middle'} className={`ykb__v${d.tone === 'big' ? ' is-hot' : ''}`}>{d.display}</text> : null}
              {d.label && (i % step === 0 || d.force) ? <text x={bx(i) + bw / 2} y={base + 18} textAnchor="middle" className="ykb__gl">{d.label}</text> : null}
            </g>
          )
        })}
        <line x1={m.l} x2={W - m.r} y1={base} y2={base} className="ykb__axis" />
        {yCap ? <text x={m.l} y={14} className="ykb__cap">{yCap}</text> : null}
        {strip}
      </svg>
      {keys ? <p className="yset__key">{keys.map((k) => <span key={k.label}><i className={`ykb__k ykb__b--${k.tone}`} />{k.label}</span>)}</p> : null}
    </div>
  )
}

// ---------------------------------------------------------------- profile
// props: pts [{ d, alt }], label (said at the top right), aria
export function Profile({ pts, label, aria }) {
  const [ref, width] = useWidth(640)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 200 : 240
  const m = { t: 30, r: 8, b: 30, l: 62 }
  if (!pts || pts.length < 2) return <div ref={ref} />
  const maxD = pts[pts.length - 1].d
  const lo = Math.floor(Math.min(...pts.map((p) => p.alt)) / 50) * 50, hi = Math.ceil(Math.max(...pts.map((p) => p.alt)) / 50) * 50
  const x = (d) => m.l + (d / maxD) * (W - m.l - m.r)
  const y = (a) => H - m.b - ((a - lo) / Math.max(1, hi - lo)) * (H - m.t - m.b)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)} ${y(p.alt).toFixed(1)}`).join('')
  return (
    <div ref={ref} className="yprof">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {[lo, hi].map((v) => <g key={v}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="ykb__grid" /><text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="ykb__gl">{n0(v)} m</text></g>)}
        <path d={`${line}L${x(maxD)} ${H - m.b}L${x(0)} ${H - m.b}Z`} className="yprof__fill" />
        <path d={line} className="yprof__line" />
        <text x={m.l} y={H - 8} className="ykb__gl">start</text>
        <text x={W - m.r} y={H - 8} textAnchor="end" className="ykb__gl">{maxD.toFixed(1)} km</text>
        {label ? <text x={W - m.r} y={16} textAnchor="end" className="yprof__lab">{label}</text> : null}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------- silence
// props: fromISO, toISO, aria. Month ticks over an empty band, the length in the middle.
export function SilenceBand({ fromISO, toISO, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const days = Math.round((tOf(toISO) - tOf(fromISO)) / DAY) + 1
  const H = narrow ? 150 : 170
  const x = (i) => 2 + (i / days) * (W - 4)
  const ticks = []
  for (let i = 0; i < days; i++) { const d = isoOf(tOf(fromISO) + i * DAY); if (d.slice(8) === '01') ticks.push({ i, d }) }
  return (
    <div ref={ref} className="ysil">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        <rect x={2} y={22} width={W - 4} height={H - 62} className="ysil__band" />
        {ticks.map((t, k) => <g key={t.d}><line x1={x(t.i)} x2={x(t.i)} y1={22} y2={H - 34} className="ymo__tick" />{(!narrow || k % 3 === 0) ? <text x={x(t.i) + 3} y={H - 18} className="ymo__tl">{MON[parseInt(t.d.slice(5, 7), 10) - 1]}{t.d.slice(5, 7) === '01' ? ` ${t.d.slice(0, 4)}` : ''}</text> : null}</g>)}
        <text x={W / 2} y={22 + (H - 62) / 2 + 12} textAnchor="middle" className="ysil__n">{n0(days)} days</text>
        <text x={2} y={14} className="ymo__tl">{dayLabel(fromISO)} {fromISO.slice(0, 4)}</text>
        <text x={W - 2} y={14} textAnchor="end" className="ymo__tl">{dayLabel(toISO)} {toISO.slice(0, 4)}</text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------- dot rows
// props: rows [{ label, acts }], aria. Dots run in date order; a bigger dot is a longer outing.
export function DotRows({ rows, aria }) {
  const [ref, width] = useWidth(640)
  const W = Math.max(280, width)
  const max = Math.max(1, ...rows.flatMap((r) => r.acts.map(km)))
  const R = (a) => 3 + 9 * Math.sqrt(km(a) / max)
  return (
    <div ref={ref} className="ydots" role="img" aria-label={aria}>
      {rows.map((r) => (
        <div key={r.label} className="ydots__row">
          <p className="ydots__l"><b>{r.acts.length}</b> {r.label}</p>
          <svg width="100%" height={30} viewBox={`0 0 ${W} 30`} aria-hidden="true" style={{ display: 'block' }}>
            {r.acts.map((a, i) => <circle key={i} cx={8 + i * Math.min(26, (W - 16) / Math.max(1, r.acts.length - 1))} cy={15} r={R(a)} className={`ydots__d${r.hot ? ' is-hot' : ''}`} />)}
          </svg>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- races
// props: races [{ date, name, km, min, indoor, virtual }], year, aria. The year
// as a line from January to December, a dot for each race (bigger for a longer
// one), numbered, and the races listed under it with their numbers.
export function RaceStrip({ races, year, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const H = 96, AX = 40
  const t0 = tOf(`${year}-01-01`), t1 = tOf(`${year}-12-31`)
  const x = (iso) => 14 + ((tOf(iso) - t0) / (t1 - t0)) * (W - 28)
  const maxK = Math.max(1, ...races.map((r) => r.km))
  const R = (r) => 4 + 9 * Math.sqrt(r.km / maxK)
  const hm = (m) => { const t = Math.round(m); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
  // numbers sit above their dot; when races are close the next number goes below, then higher up
  let lastX = -99, slot = 0
  const pos = races.map((r) => { const cx = x(r.date); slot = cx - lastX < 24 ? (slot + 1) % 3 : 0; lastX = cx; return { cx, slot } })
  return (
    <div ref={ref} className="yrace" role="img" aria-label={aria}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ display: 'block' }}>
        <line x1={14} x2={W - 14} y1={AX} y2={AX} className="ykb__axis" />
        {MON.map((m, i) => { const iso = `${year}-${String(i + 1).padStart(2, '0')}-01`; return (!narrow || i % 3 === 0) ? <text key={m} x={x(iso)} y={H - 4} className="ykb__gl">{m}</text> : null })}
        {races.map((r, i) => (
          <g key={r.date}>
            <circle cx={pos[i].cx} cy={AX} r={R(r)} className={`yrace__d${r.virtual || r.indoor ? ' is-away' : ''}`} />
            <text x={pos[i].cx} y={pos[i].slot === 1 ? AX + R(r) + 14 : AX - R(r) - 6 - (pos[i].slot === 2 ? 13 : 0)} textAnchor="middle" className="yrace__n">{i + 1}</text>
          </g>
        ))}
      </svg>
      <ol className="yrace__list">
        {races.map((r, i) => (
          <li key={r.date}>
            <span className="yrace__i">{i + 1}</span>
            <span className="yrace__t">{r.name}</span>
            <span className="yrace__m">{dayLabel(r.date)} · {r.km.toFixed(1)} km{r.min ? ` · ${hm(r.min)}` : ''}{r.virtual ? ' · virtual' : r.indoor ? ' · indoors' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------- kudos
// props: acts (the year's outings), year, aria. Every outing on foot as a dot
// across the year, higher for more kudos; the most cheered one in orange.
export function KudosDots({ acts, year, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 190 : 220
  const m = { t: 30, r: 10, b: 26, l: 40 }
  const foot = acts.filter((a) => FOOT.includes(a.sport_type))
  if (!foot.length) return <div ref={ref} />
  const kd = (a) => Number(a.kudos) || 0
  const top = foot.reduce((b, a) => (kd(a) > kd(b) ? a : b), foot[0])
  const max = Math.max(1, kd(top)) * 1.1
  const t0 = tOf(`${year}-01-01`), t1 = tOf(`${year}-12-31`)
  const x = (a) => m.l + ((tOf(a.date.slice(0, 10)) - t0) / (t1 - t0)) * (W - m.l - m.r)
  const y = (v) => H - m.b - (v / max) * (H - m.t - m.b)
  const step = max > 100 ? 50 : max > 40 ? 20 : max > 10 ? 5 : 1
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  const tx = x(top), right = tx > W * 0.7
  return (
    <div ref={ref} className="ykud">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {ticks.map((g) => <g key={g}><line x1={m.l} x2={W - m.r} y1={y(g)} y2={y(g)} className="ykb__grid" /><text x={m.l - 6} y={y(g) + 4} textAnchor="end" className="ykb__gl">{g}</text></g>)}
        {MON.map((mo, i) => (!narrow || i % 3 === 0) ? <text key={mo} x={m.l + (i / 12) * (W - m.l - m.r)} y={H - 6} className="ykb__gl">{mo}</text> : null)}
        {foot.filter((a) => a !== top).map((a, i) => <circle key={i} cx={x(a)} cy={y(kd(a))} r={2.4} className="ykud__d" />)}
        <circle cx={tx} cy={y(kd(top))} r={6} className="ykud__me" />
        <text x={tx + (right ? -10 : 10)} y={y(kd(top)) + 4} textAnchor={right ? 'end' : 'start'} className="ykud__l">{n0(kd(top))} kudos</text>
        <text x={m.l} y={14} className="ykb__cap">kudos on one outing</text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------- rain
// props: days [{ iso, mm, kind: 'out' | 'in' | null }], aria. Each day a bar of
// its rain; the mark under it says whether I went out on foot outside (orange),
// stayed in (black), or had no outing.
export function RainDays({ days, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 200 : 230
  const m = { t: 30, r: 6, b: 46, l: 40 }
  const max = Math.max(10, ...days.map((d) => d.mm)) * 1.08
  const n = days.length
  const slot = (W - m.l - m.r) / n, bw = Math.max(2, slot * 0.66)
  const bx = (i) => m.l + slot * i + (slot - bw) / 2
  const base = H - m.b
  const y = (v) => base - (v / max) * (H - m.t - m.b)
  const ticks = max > 40 ? [0, 25, 50] : [0, 10, 20]
  const top = days.reduce((b, d) => (d.mm > b.mm ? d : b), days[0])
  return (
    <div ref={ref} className="yrain">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {ticks.map((g) => <g key={g}><line x1={m.l} x2={W - m.r} y1={y(g)} y2={y(g)} className="ykb__grid" /><text x={m.l - 6} y={y(g) + 4} textAnchor="end" className="ykb__gl">{g}</text></g>)}
        {days.map((d, i) => (
          <g key={d.iso}>
            <rect x={bx(i)} y={y(d.mm)} width={bw} height={Math.max(0, base - y(d.mm))} className="yrain__b" />
            {d.kind ? <circle cx={bx(i) + bw / 2} cy={base + 12} r={Math.min(4, bw / 2 + 0.5)} className={`yrain__k yrain__k--${d.kind}`} /> : null}
            {(i % (narrow ? 7 : 5) === 0) ? <text x={bx(i) + bw / 2} y={H - 8} textAnchor="middle" className="ykb__gl">{parseInt(d.iso.slice(8), 10)}</text> : null}
          </g>
        ))}
        {top && top.mm > 0 ? <text x={bx(days.indexOf(top)) + bw / 2} y={y(top.mm) - 6} textAnchor="middle" className="ykb__v is-hot">{Math.round(top.mm)} mm</text> : null}
        <line x1={m.l} x2={W - m.r} y1={base} y2={base} className="ykb__axis" />
        <text x={m.l} y={14} className="ykb__cap">mm of rain</text>
      </svg>
      <p className="yset__key"><span><i className="yrain__sw yrain__sw--out" />out on foot, outside</span><span><i className="yrain__sw yrain__sw--in" />indoors only</span></p>
    </div>
  )
}

// ---------------------------------------------------------------- marks
// props: series [{ label, acts }], target, year, toISO, aria. Each series adds
// up its kilometres through the year; a dot marks the day it passed the target.
export function MarkLines({ series, target, year, toISO, aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 520
  const H = narrow ? 230 : 270
  const m = { t: 30, r: narrow ? 70 : 96, b: 26, l: 48 }
  const t0 = tOf(`${year}-01-01`), t1 = tOf(`${year}-12-31`)
  const x = (iso) => m.l + ((tOf(iso) - t0) / (t1 - t0)) * (W - m.l - m.r)
  const lines = series.map((s) => {
    let c = 0
    const pts = [[`${year}-01-01`, 0]]
    let hit = null
    for (const a of s.acts.slice().sort((p, q) => (p.date < q.date ? -1 : 1))) { c += km(a); const d = a.date.slice(0, 10); pts.push([d, c]); if (!hit && c >= target) hit = d }
    pts.push([toISO, c])
    return { ...s, pts, hit, total: c }
  })
  const max = Math.max(target, ...lines.map((l) => l.total)) * 1.06
  const y = (v) => H - m.b - (v / max) * (H - m.t - m.b)
  const ticks = []
  for (let v = 0; v <= max; v += max > 2400 ? 1000 : 500) ticks.push(v)
  // the end labels, kept 14 px apart
  const ly = lines.map((l, k) => ({ k, y: y(l.total) + 4 })).sort((p, q) => p.y - q.y)
  for (let i = 1; i < ly.length; i++) if (ly[i].y - ly[i - 1].y < 16) ly[i].y = ly[i - 1].y + 16
  const labY = {}; ly.forEach((o) => { labY[o.k] = o.y })
  return (
    <div ref={ref} className="ymark">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {ticks.map((g) => <g key={g}><line x1={m.l} x2={W - m.r} y1={y(g)} y2={y(g)} className={g === target ? 'ymark__goal' : 'ykb__grid'} /><text x={m.l - 6} y={y(g) + 4} textAnchor="end" className="ykb__gl">{n0(g)}</text></g>)}
        {MON.map((mo, i) => (!narrow || i % 3 === 0) ? <text key={mo} x={m.l + (i / 12) * (W - m.l - m.r)} y={H - 6} className="ykb__gl">{mo}</text> : null)}
        {lines.map((l, k) => (
          <g key={l.label} className={`ymark__s ymark__s--${k}`}>
            <path d={l.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('')} />
            {l.hit ? <circle cx={x(l.hit)} cy={y(target)} r={5} /> : null}
            <text x={x(toISO) + 6} y={labY[k]} className="ymark__l">{l.label}</text>
          </g>
        ))}
        <text x={m.l} y={14} className="ykb__cap">km this year</text>
      </svg>
    </div>
  )
}

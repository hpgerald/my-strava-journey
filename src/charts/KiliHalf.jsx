import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { usePairH, fitH } from './pairHeight.js'

// The Kilimanjaro Half, taken apart. Every edition runs the same 21.1 km of road:
// 9.5 km up to the turn, the highest point, and 11.6 km back down. Times are
// clock minutes over that stretch (scripts/build_kili_half_detail.py).

const hm = (min) => { const t = Math.round(min); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const ms = (min) => { const s = Math.round(min * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

// The way up and the way down as two panels, side by side, each spanning the
// same number of minutes, so a step on one side is as wide as a step on the
// other. One dot per edition, oldest at the top, joined in order: the path of
// each half from year to year.
// props: race [{ year, up, down }], aria
export function KiliSplit({ race, aria }) {
  const pairH = usePairH()
  const [ref, width] = useWidth(560)
  const [root, inView] = useInView({ threshold: 0.25 })
  const W = Math.max(300, width)
  const narrow = W < 480
  const H = fitH(pairH, narrow ? 300 : 340)
  const rows = race.filter((r) => r.up > 0 && r.down > 0)
  if (rows.length < 2) return <div ref={ref} />
  const m = { t: 58, b: 34, l: narrow ? 40 : 48, r: narrow ? 8 : 14 }
  const gap = narrow ? 26 : 48
  const pw = (W - m.l - m.r - gap) / 2
  // one span of minutes for both panels, each starting a little under its quickest year
  const lo5 = (v) => Math.floor((v - 1) / 5) * 5
  const sides = [
    { key: 'up', name: 'Up to the turnaround', sub: '9.5 km, climbing', vals: rows.map((r) => r.up) },
    { key: 'down', name: 'Back down', sub: '11.6 km, descending', vals: rows.map((r) => r.down) },
  ]
  const span = Math.max(...sides.map((s) => Math.ceil((Math.max(...s.vals) + 2 - lo5(Math.min(...s.vals))) / 5) * 5))
  sides.forEach((s, i) => { s.lo = lo5(Math.min(...s.vals)); s.x0 = m.l + i * (pw + gap) })
  const X = (s, v) => s.x0 + ((v - s.lo) / span) * pw
  const Y = (i) => m.t + 14 + (i / Math.max(1, rows.length - 1)) * (H - m.t - m.b - 28)
  const last = rows.length - 1
  return (
    <div ref={ref} className="cb">
      <div ref={root} className={`cb__plot ksplit${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
          {rows.map((r, i) => (
            <text key={r.year} x={m.l - 10} y={Y(i) + 4} textAnchor="end" className={`ksplit__yr${i === last ? ' is-now' : ''}`}>{r.year}</text>
          ))}
          {sides.map((s) => {
            const ticks = []
            for (let v = s.lo; v <= s.lo + span; v += 5) ticks.push(v)
            const pts = rows.map((r, i) => ({ x: X(s, r[s.key]), y: Y(i), v: r[s.key] }))
            return (
              <g key={s.key}>
                <text x={s.x0} y={m.t - 30} className="ksplit__name">{s.name}</text>
                <text x={s.x0} y={m.t - 14} className="cb__axis">{s.sub}</text>
                {ticks.map((v, j) => (
                  <g key={v}>
                    <line x1={X(s, v)} x2={X(s, v)} y1={m.t} y2={H - m.b} stroke="var(--rule-faint)" />
                    {(narrow ? j % 2 === 1 : j < ticks.length - 1 || s.key === 'down') ? <text x={X(s, v)} y={H - m.b + 18} textAnchor="middle" className="cb__gl">{hm(v)}</text> : null}
                  </g>
                ))}
                <line x1={s.x0} x2={s.x0 + pw} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
                <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} className="ksplit__path" fill="none" pathLength="1" />
                {pts.map((p, i) => (
                  <g key={i} className="ksplit__pt" style={{ '--d': `${0.35 + i * 0.22}s` }}>
                    <circle cx={p.x} cy={p.y} r={i === last ? 7 : 5} className={i === last ? 'ksplit__dot is-now' : 'ksplit__dot'} />
                    {/* the time beside its dot, on the side with room */}
                    <text x={p.x > s.x0 + pw * 0.72 ? p.x - (i === last ? 12 : 10) : p.x + (i === last ? 12 : 10)} y={p.y + 4} textAnchor={p.x > s.x0 + pw * 0.72 ? 'end' : 'start'} className={`ksplit__v cb__halo${i === last ? ' is-now' : ''}`}>{hm(p.v)}</text>
                  </g>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// Every kilometre of every edition, one cell each, under the course it covers.
// A cell is darker the quicker the kilometre; the orange line at its foot is the
// share of it I ran. Under the grid, what the last edition gained on the first,
// kilometre by kilometre.
// props: race [{ year, moving, kms [{ km, min, run }] }], line [{ d, alt }], turnKm, aria
export function KiliKm({ race, line, turnKm, aria }) {
  const [ref, width] = useWidth(1100)
  const [root, inView] = useInView({ threshold: 0.15 })
  const rows = race.filter((r) => r.kms && r.kms.length)
  if (rows.length < 2 || !line || line.length < 3) return <div ref={ref} />
  const W = Math.max(320, width)
  const narrow = W < 700
  const N = Math.max(...rows.map((r) => r.kms.length))
  const m = { l: narrow ? 40 : 64, r: narrow ? 4 : 8, t: 26 }
  const cw = (W - m.l - m.r) / N
  const prof = narrow ? 64 : 96
  const ch = narrow ? 26 : 38
  const gapR = 3
  const gridTop = m.t + prof + 26
  const gridH = rows.length * ch + (rows.length - 1) * gapR
  const axisY = gridTop + gridH + 16
  const gainTop = axisY + 30
  const gainH = narrow ? 56 : 76
  const H = gainTop + gainH + 22
  const X = (km) => m.l + (km / N) * (W - m.l - m.r)
  // the course: altitude over the same 21 km
  const aMin = Math.min(...line.map((p) => p.alt)), aMax = Math.max(...line.map((p) => p.alt))
  const PY = (a) => m.t + prof - ((a - aMin) / Math.max(1, aMax - aMin)) * (prof - 8)
  const ridge = line.map((p, i) => `${i ? 'L' : 'M'}${X(Math.min(N, p.d)).toFixed(1)} ${PY(p.alt).toFixed(1)}`).join(' ')
  const area = `${ridge} L${X(N)} ${m.t + prof} L${X(0)} ${m.t + prof} Z`
  const top = line.reduce((b, p) => (p.alt > b.alt ? p : b), line[0])
  // colour: the quickest kilometre darkest, the slowest palest, one scale for all
  const all = rows.flatMap((r) => r.kms.map((k) => k.min))
  const lo = Math.min(...all), hi = Math.max(...all)
  // eased, so the ordinary kilometres stay pale and the quick ones stand out dark
  const shade = (v) => 0.07 + 0.86 * Math.pow(1 - (v - lo) / Math.max(0.01, hi - lo), 1.8)
  // what the last edition gained on the first, each kilometre
  const first = rows[0], last = rows[rows.length - 1]
  const gains = last.kms.map((k) => { const f = first.kms.find((x) => x.km === k.km); return { km: k.km, g: f ? f.min - k.min : 0, run: k.run } })
  const gMax = Math.max(1, ...gains.map((g) => Math.abs(g.g)))
  const GY0 = gainTop + gainH * (Math.max(...gains.map((g) => g.g)) / (Math.max(...gains.map((g) => g.g)) + Math.max(0, -Math.min(...gains.map((g) => g.g))) || 1))
  const GS = (v) => (v / gMax) * (GY0 - gainTop)
  const tx = X(turnKm)
  return (
    <div ref={ref} className="cb">
      <p className="kkm__key" aria-hidden="true">
        <span><i className="kkm__ksw kkm__ksw--q" /><i className="kkm__ksw kkm__ksw--m" /><i className="kkm__ksw kkm__ksw--s" />quicker to slower</span>
        <span><i className="kkm__kr" />the part of a kilometre I ran</span>
      </p>
      <div ref={root} className={`cb__plot kkm${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block', overflow: 'visible' }}>
          {/* the course */}
          <path d={area} className="kkm__land" />
          <path d={ridge} className="kkm__ridge" fill="none" />
          {!narrow ? <text x={X(turnKm / 2)} y={m.t + prof - 10} textAnchor="middle" className="kkm__dir">up to the turnaround</text> : null}
          {!narrow ? <text x={X(turnKm + (N - turnKm) / 2)} y={m.t + prof - 10} textAnchor="middle" className="kkm__dir">back down</text> : null}
          <text x={X(0)} y={PY(line[0].alt) - 8} className="cb__gl">{Math.round(line[0].alt).toLocaleString('en-US')} m</text>
          <circle cx={X(top.d)} cy={PY(top.alt)} r="4" className="kkm__top" />
          <text x={X(top.d)} y={PY(top.alt) - 10} textAnchor="middle" className="kkm__turn">the turnaround, {Math.round(top.alt).toLocaleString('en-US')} m</text>
          <line x1={tx} x2={tx} y1={PY(top.alt) + 6} y2={axisY - 12} className="kkm__tline" />

          {/* the grid */}
          {rows.map((r, ri) => {
            const y = gridTop + ri * (ch + gapR)
            const now = r === last
            return (
              <g key={r.year}>
                <text x={m.l - 10} y={y + ch / 2 + 4} textAnchor="end" className={`kkm__yr${now ? ' is-now' : ''}`}>{r.year}</text>
                {r.kms.map((k) => {
                  const a = shade(k.min)
                  const x = X(k.km - 1) + 1
                  return (
                    <g key={k.km} className="kkm__cell" style={{ '--d': `${(k.km - 1) * 28 + ri * 60}ms` }}>
                      <rect x={x} y={y} width={cw - 2} height={ch} rx="1.5" className="kkm__sq" style={{ fillOpacity: a }} />
                      {!narrow ? <text x={x + (cw - 2) / 2} y={y + ch / 2 + 2} textAnchor="middle" className={`kkm__n${a > 0.5 ? ' is-dark' : ''}`}>{ms(k.min)}</text> : null}
                      {k.run > 0 ? <rect x={x} y={y + ch - 4} width={(cw - 2) * Math.min(1, k.run)} height="4" className="kkm__run" /> : null}
                    </g>
                  )
                })}
              </g>
            )
          })}
          {Array.from({ length: N }, (_, i) => i + 1).filter((k) => !narrow || k === 1 || k % 5 === 0).map((k) => (
            <text key={k} x={X(k - 0.5)} y={axisY} textAnchor="middle" className="cb__gl">{k}</text>
          ))}
          <text x={m.l - 10} y={axisY} textAnchor="end" className="cb__gl">km</text>

          {/* what the last edition gained on the first */}
          <text x={m.l} y={gainTop - 8} className="kkm__gk">{narrow ? `Gained on ${first.year}, each km` : `Minutes ${last.year} gained on ${first.year}, each kilometre`}</text>
          <line x1={m.l} x2={W - m.r} y1={GY0} y2={GY0} stroke="var(--ink)" />
          {gains.map((g) => {
            const x = X(g.km - 1) + cw * 0.18
            const h = GS(g.g)
            return (
              <g key={g.km} className="kkm__gain" style={{ '--d': `${0.9 + (g.km - 1) * 0.03}s` }}>
                <rect x={x} y={h >= 0 ? GY0 - h : GY0} width={cw * 0.64} height={Math.max(1, Math.abs(h))} className={g.run >= 0.5 ? 'kkm__gb is-run' : 'kkm__gb'} />
                {!narrow && g.g >= 1.5 ? <text x={x + cw * 0.32} y={GY0 - h - 6} textAnchor="middle" className="kkm__gv">{g.g.toFixed(1)}</text> : null}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// The countdown to race day: on the day k days before the race I set out to
// cover k km in one outing, never less than 5 km. Each column is one day: its
// longest outing in the colour of the way I moved, the rest of the day's
// kilometres on foot stacked above it in grey, and the countdown drawn as a
// stepped line across the top. Race day stands at the end.
// props: days [{ iso, k, target, longest, kind, rest }], race { km }, aria
const CD_FILL = { tread: 'var(--m-tread)', road: 'var(--m-road)', walk: 'var(--m-walk)', trail: 'var(--m-trail)', hike: 'var(--m-hike)' }
const CD_NAME = { tread: 'Run indoors', road: 'Run outside', walk: 'Walk', trail: 'Trail run', hike: 'Hike' }
export function RaceCountdown({ days, race, aria }) {
  const [ref, width] = useWidth(1100)
  const [root, inView] = useInView({ threshold: 0.2 })
  if (!days || days.length < 5) return <div ref={ref} />
  const W = Math.max(320, width)
  const narrow = W < 640
  const H = narrow ? 260 : 320
  const m = { l: narrow ? 34 : 44, r: 6, t: 34, b: 46 }
  const cols = days.length + 1
  const slot = (W - m.l - m.r) / cols
  const bw = Math.max(6, slot * (narrow ? 0.7 : 0.62))
  const max = Math.max(...days.map((d) => d.longest + d.rest), race ? race.km : 0, ...days.map((d) => d.target))
  const top = Math.ceil(max / 10) * 10
  const Y = (v) => H - m.b - (v / top) * (H - m.b - m.t)
  const X = (i) => m.l + slot * i + slot / 2
  const ticks = []
  for (let t = 0; t <= top; t += 10) ticks.push(t)
  // the countdown as a stepped line over the columns
  const step = days.map((d, i) => `${i ? 'L' : 'M'}${(X(i) - slot / 2).toFixed(1)} ${Y(d.target).toFixed(1)} L${(X(i) + slot / 2).toFixed(1)} ${Y(d.target).toFixed(1)}`).join(' ')
  const kinds = [...new Set(days.map((d) => d.kind))]
  const every = narrow ? 5 : 2
  return (
    <div ref={ref} className="kcd">
      <p className="kkm__key kcd__key" aria-hidden="true">
        {kinds.map((k) => <span key={k}><i className="kcd__sw" style={{ background: CD_FILL[k] }} />{CD_NAME[k]}</span>)}
        <span><i className="kcd__sw kcd__sw--rest" />the rest of the day</span>
        <span><i className="kcd__ln" />the countdown</span>
      </p>
      <div ref={root} className={`kcd__plot${inView ? ' is-in' : ''}`}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke={t ? 'var(--rule-faint)' : 'var(--ink)'} strokeWidth="1" />
              <text x={m.l - 6} y={Y(t) + 4} textAnchor="end" className="chart-tick">{t}</text>
            </g>
          ))}
          <text x={m.l - 6} y={m.t - 16} textAnchor="end" className="chart-tick">km</text>
          {days.map((d, i) => (
            <g key={d.iso} className="kcd__day" style={{ '--d': `${i * 0.04}s` }}>
              <rect x={X(i) - bw / 2} y={Y(d.longest)} width={bw} height={Math.max(0, Y(0) - Y(d.longest))} fill={CD_FILL[d.kind]} />
              {d.rest > 0.3 ? <rect x={X(i) - bw / 2} y={Y(d.longest + d.rest)} width={bw} height={Math.max(0, Y(d.longest) - Y(d.longest + d.rest))} className="kcd__rest" /> : null}
              {(narrow ? d.k % 5 === 0 : i % every === 0 || i === days.length - 1) ? <text x={X(i)} y={H - m.b + 18} textAnchor="middle" className="chart-tick">{`T-${d.k}`}</text> : null}
            </g>
          ))}
          <path d={step} className="kcd__step" />
          <text x={X(0) - slot / 2 + 2} y={Y(days[0].target) - 8} className="kcd__lab">{`${days[0].target} km on day one`}</text>
          {race ? (
            <g>
              <rect x={X(days.length) - bw / 2} y={Y(race.km)} width={bw} height={Y(0) - Y(race.km)} className="kcd__race" />
              <text x={X(days.length)} y={H - m.b + 18} textAnchor="end" className="chart-tick">race</text>
            </g>
          ) : null}
          <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" className="chart-tick">days to the race &rarr;</text>
        </svg>
      </div>
    </div>
  )
}

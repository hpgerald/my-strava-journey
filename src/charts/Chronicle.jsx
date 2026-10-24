import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'

// The whole record as one chronicle: time runs left to right, and each lane holds
// one kind of moment. Milestones every 250 outings, the firsts on foot, the trips
// abroad and new regions, the shoes from first outing to last, and the streaks
// and silences. A faint row of monthly outings runs underneath for scale. Marks
// arrive in the order they happened. Hover any mark to read it.
// props: data (from buildChronicle), aria
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const ORD = (n) => `${n.toLocaleString('en-US')}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
const COUNTRY_KEY = { Kenya: 'road', Malawi: 'trail', 'South Africa': 'tread', Rwanda: 'walk', Other: 'quiet' }

// greedy rows: each label takes the first row where it fits after the last one.
// With `stalks`, a label in a lower row also needs its stalk (at x) to clear every
// label in the rows above it.
function pack(items, rows, gap = 8, stalks = false) {
  const spans = Array.from({ length: rows }, () => [])
  return items.map((it) => {
    for (let r = 0; r < rows; r++) {
      const fits = spans[r].every(([a, b]) => b < it.x0 - gap || a > it.x1 + gap)
      const clear = !stalks || spans.slice(0, r).every((row) => row.every(([a, b]) => it.x < a - 3 || it.x > b + 3))
      if (fits && clear) { spans[r].push([it.x0, it.x1]); return { ...it, row: r } }
    }
    return { ...it, row: -1 }
  })
}

export default function Chronicle({ data, aria }) {
  const [ref, width] = useWidth(1100)
  const [root, inView] = useInView({ threshold: 0.08, rootMargin: '0px' })
  const [tip, setTip] = useState(null)
  const W = Math.max(300, width)
  const narrow = W < 640
  const m = { l: narrow ? 8 : 104, r: narrow ? 8 : 16 }
  const t0 = Date.UTC(Number(data.firstISO.slice(0, 4)), 0, 1)
  const t1 = Date.UTC(Number(data.lastISO.slice(0, 4)) + 1, 0, 1)
  const tOf = (iso) => Date.parse(iso + 'T12:00:00Z')
  const X = (iso) => m.l + ((tOf(iso) - t0) / (t1 - t0)) * (W - m.l - m.r)
  const fr = (iso) => (tOf(iso) - t0) / (t1 - t0)
  const cw = narrow ? 5.6 : 6.4 // rough width of a character of label text

  // lanes, top to bottom
  const L = {}
  let y = 30
  const off = narrow ? 14 : 0 // on phones the lane title gets its own line above the marks
  const lane = (key, title, h) => { L[key] = { y, c: y + off, h: h + off, title }; y += h + off }
  lane('mile', 'Milestones', narrow ? 40 : 52)
  lane('first', 'Firsts on foot', narrow ? 34 : 126)
  lane('place', 'Abroad', narrow ? 34 : 70)
  lane('region', 'New regions', narrow ? 26 : 34)
  const shoeRows = 3
  lane('shoe', 'Shoes', narrow ? 40 : 30 + shoeRows * 18)
  lane('streak', 'Streaks and silences', narrow ? 46 : 62)
  lane('tex', 'Outings a month', narrow ? 34 : 44)
  const H = y + 8

  const years = []
  for (let yy = new Date(t0).getUTCFullYear(); Date.UTC(yy, 0, 1) < t1; yy++) years.push(yy)
  const show = (e, text) => (ev) => {
    const r = ev.currentTarget.ownerSVGElement.getBoundingClientRect()
    setTip({ x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H, text })
  }
  const hide = () => setTip(null)

  // milestones
  const miles = data.milestones.filter((x) => x.n === 1 || x.n % 500 === 0)
  // firsts: labels packed into three rows
  // firsts on the same day share one mark and one label
  const sameDay = []
  for (const f of data.firsts) { const last = sameDay[sameDay.length - 1]; if (last && last.date === f.date) { last.title = `${last.title} and ${f.title.replace('First', 'first')}`; last.detail = `${last.detail}; ${f.detail}` } else sameDay.push({ ...f }) }
  const firstLab = pack(sameDay.map((f) => { const x = X(f.date); return { ...f, x, x0: x - 2, x1: x + 8 + f.title.length * cw } }), 4, 10)
  // shoes: bars packed into rows so overlapping pairs never collide
  const shoeBars = pack(data.shoes.map((s) => ({ ...s, x0: X(s.first), x1: Math.max(X(s.last), X(s.first) + 3) })), shoeRows, 2)
  const maxMonth = Math.max(1, ...data.monthly.map((d) => d.n))
  const monthW = (W - m.l - m.r) / ((t1 - t0) / (30.44 * 86400000))

  return (
    <div ref={ref} className={`chron${inView ? ' is-in' : ''}`}>
      <div ref={root} className="chron__plot" style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }} onMouseLeave={hide}>
          {/* years */}
          {years.map((yy) => {
            const x0 = X(`${yy}-01-01`), x1 = X(`${yy + 1}-01-01`)
            return (
              <g key={yy}>
                {yy % 2 === 0 && <rect x={x0} y={22} width={x1 - x0} height={H - 30} className="chron__band" />}
                <text x={(x0 + x1) / 2} y={14} textAnchor="middle" className="chron__yr">{narrow ? `'${String(yy).slice(2)}` : yy}</text>
              </g>
            )
          })}
          {/* lane titles and rules */}
          {Object.entries(L).map(([k, l]) => (
            <g key={k}>
              <line x1={narrow ? 0 : 0} x2={W - m.r} y1={l.y} y2={l.y} className="chron__rule" />
              {narrow
                ? <text x={4} y={l.y + 11} className="chron__lt chron__lt--n">{l.title}</text>
                : <text x={0} y={l.y + 16} className="chron__lt">{l.title}</text>}
            </g>
          ))}

          {/* milestones */}
          {miles.map((mi) => {
            const x = X(mi.date), cy = L.mile.c + (narrow ? 26 : 30)
            return (
              <g key={mi.n} className="chron__m" style={{ '--d': `${fr(mi.date) * 1.8}s` }} onMouseEnter={show(mi, `${fmtDay(mi.date)} · the ${ORD(mi.n)} outing${mi.days ? `, ${mi.days} days after the ${ORD(mi.n - 250)}` : ''}`)}>
                <rect x={x - 5} y={cy - 5} width="10" height="10" transform={`rotate(45 ${x} ${cy})`} className="chron__dia" />
                <text x={x} y={cy - 11} textAnchor="middle" className="chron__ml">{mi.n === 1 ? '1st' : ORD(mi.n)}</text>
              </g>
            )
          })}
          {data.milestones.filter((x) => x.n !== 1 && x.n % 500 !== 0).map((mi) => (
            <line key={mi.n} x1={X(mi.date)} x2={X(mi.date)} y1={L.mile.c + (narrow ? 22 : 26)} y2={L.mile.c + (narrow ? 30 : 34)} className="chron__tick chron__m" style={{ '--d': `${fr(mi.date) * 1.8}s` }} />
          ))}

          {/* firsts */}
          {firstLab.map((f) => {
            const dy = L.first.c + (narrow ? 20 : 16)
            const ly = L.first.c + 40 + Math.max(0, f.row) * 22
            return (
              <g key={f.title} className="chron__m" style={{ '--d': `${fr(f.date) * 1.8}s` }} onMouseEnter={show(f, `${fmtDay(f.date)} · ${f.title}, ${f.detail}`)}>
                {!narrow && f.row >= 0 && <line x1={f.x} x2={f.x} y1={dy + 5} y2={ly - 4} className="chron__stalk" />}
                <circle cx={f.x} cy={dy} r={narrow ? 4 : 5} className={`mfill--${f.mode} chron__dot`} />
                {!narrow && f.row >= 0 && <text x={f.x + 4} y={ly + 4} className="chron__el">{f.title}</text>}
              </g>
            )
          })}

          {/* abroad */}
          {data.stays.map((s, i) => {
            const x0 = X(s.start), x1 = Math.max(X(s.end), x0 + 3)
            return (
              <rect key={i} x={x0} y={L.place.c + (narrow ? 14 : 44)} width={x1 - x0} height={narrow ? 12 : 16} rx="1.5" className={`mfill--${COUNTRY_KEY[s.country] || 'quiet'} chron__m chron__bar`} style={{ '--d': `${fr(s.start) * 1.8}s` }}
                onMouseEnter={show(s, `${fmtDay(s.start)}${s.end !== s.start ? ` to ${fmtDay(s.end)}` : ''} · ${s.country === 'Other' ? 'outside Africa' : s.country}, ${s.days} day${s.days > 1 ? 's' : ''} with an outing`)} />
            )
          })}
          {!narrow && (() => {
            // name each country once, above its first stay
            const seen = new Set()
            const firstStay = data.stays.filter((s) => (seen.has(s.country) ? false : (seen.add(s.country), true)))
            const lab = pack(firstStay.map((s) => { const x = X(s.start); return { ...s, x, x0: x, x1: x + s.country.length * cw + 4 } }), 2, 6)
            return lab.filter((s) => s.row >= 0).map((s) => <text key={s.country} x={s.x} y={L.place.c + (s.row ? 36 : 22)} className="chron__el chron__m" style={{ '--d': `${fr(s.start) * 1.8}s` }}>{s.country}</text>)
          })()}

          {/* new regions of Tanzania */}
          {data.regions.map((r) => (
            <line key={r.region} x1={X(r.date)} x2={X(r.date)} y1={L.region.c + (narrow ? 8 : 10)} y2={L.region.c + (narrow ? 22 : 28)} className="chron__reg chron__m" style={{ '--d': `${fr(r.date) * 1.8}s` }}
              onMouseEnter={show(r, `${fmtDay(r.date)} · first outing in ${r.region}`)} />
          ))}

          {/* shoes */}
          {shoeBars.map((s) => {
            const by = L.shoe.c + (narrow ? 12 : 22) + Math.max(0, s.row) * (narrow ? 9 : 18)
            const bw = s.x1 - s.x0
            const name = s.model
            return (
              <g key={s.id} className="chron__m" style={{ '--d': `${fr(s.first) * 1.8}s` }} onMouseEnter={show(s, `${fmtDay(s.first)} to ${fmtDay(s.last)} · ${s.brand} ${s.model}, ${Math.round(s.km).toLocaleString('en-US')} km${s.retired ? '' : ', still in use'}`)}>
                <rect x={s.x0} y={by} width={bw} height={narrow ? 6 : 12} rx="2" className={`chron__shoe${s.retired ? '' : ' is-now'}`} />
                {!narrow && bw > name.length * cw + 8 && <text x={s.x0 + 5} y={by + 9.5} className="chron__sl">{name}</text>}
              </g>
            )
          })}

          {/* streaks and silences */}
          {data.streaks.map((s) => {
            const x0 = X(s.start), x1 = Math.max(X(s.end), x0 + 2)
            const by = L.streak.c + (narrow ? 20 : 30)
            return (
              <g key={s.start} className="chron__m" style={{ '--d': `${fr(s.start) * 1.8}s` }} onMouseEnter={show(s, `${fmtDay(s.start)} to ${fmtDay(s.end)} · ${s.len} days in a row${s.current ? ', still going' : ''}`)}>
                <rect x={x0} y={by} width={x1 - x0} height={narrow ? 10 : 14} rx="2" className={`chron__streak${s.current ? ' is-now' : ''}`} />
              </g>
            )
          })}
          {data.breaks.filter((b) => b.len >= 30).map((b) => {
            const x0 = X(b.start), x1 = Math.max(X(b.end), x0 + 2)
            const by = L.streak.c + (narrow ? 20 : 30)
            return (
              <g key={b.start} className="chron__m" style={{ '--d': `${fr(b.start) * 1.8}s` }} onMouseEnter={show(b, `${fmtDay(b.start)} to ${fmtDay(b.end)} · ${b.len} days without an outing`)}>
                <rect x={x0} y={by} width={x1 - x0} height={narrow ? 10 : 14} className="chron__gap" />
              </g>
            )
          })}
          {(() => {
            const cand = [
              ...data.streaks.filter((s) => s.len >= 60).map((s) => ({ key: s.start, len: s.len, x: X(s.start), text: narrow ? `${s.len} days` : `${s.len} days${s.current ? ', still going' : ''}`, gap: false, start: s.start })),
              ...data.breaks.filter((b) => b.len >= 300).map((b) => ({ key: b.start, len: b.len, x: X(b.start), text: narrow ? `${b.len} silent` : `${b.len} days silent`, gap: true, start: b.start })),
            ].sort((a, b) => b.len - a.len)
            const taken = []
            const out = []
            for (const c of cand) {
              const w = c.text.length * cw
              const x = Math.min(c.x, W - m.r - w)
              if (taken.some(([a, b]) => !(x + w + 6 < a || x > b + 6))) continue
              taken.push([x, x + w]); out.push({ ...c, lx: x })
            }
            return out.map((c) => <text key={c.key} x={c.lx} y={L.streak.c + (narrow ? 15 : 25)} className={`chron__el chron__m${c.gap ? ' chron__el--gap' : ''}`} style={{ '--d': `${fr(c.start) * 1.8}s` }}>{c.text}</text>)
          })()}

          {/* monthly outings */}
          {data.monthly.map((d) => {
            const x = X(`${d.m}-01`), h = (d.n / maxMonth) * (L.tex.h - (narrow ? 16 : 18))
            return <rect key={d.m} x={x} y={L.tex.y + L.tex.h - 4 - h} width={Math.max(1, monthW - 1)} height={h} className="chron__tex chron__m" style={{ '--d': `${fr(`${d.m}-01`) * 1.8}s` }} />
          })}

          {tip && <line x1={tip.x} x2={tip.x} y1={22} y2={H - 4} className="chron__cursor" />}
        </svg>
        {tip && (
          <div className="chart-tip" style={{ left: Math.min(Math.max(tip.x, 120), W - 120), top: Math.max(0, tip.y - 54) }}>{tip.text}</div>
        )}
      </div>
    </div>
  )
}

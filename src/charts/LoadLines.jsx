import { useWidth } from './useWidth.js'

// Fitness and fatigue across the years, as two lines of daily minutes: fitness
// (the six-week line) in orange, fatigue (the one-week line) in grey. Race and
// mountain days are marked with small ticks under the lines, named on wide screens.
// props: rows [{ iso, atl, ctl }], marks [{ iso, label }], aria
export default function LoadLines({ rows, marks = [], aria }) {
  const [ref, width] = useWidth(720)
  const W = Math.max(280, width), narrow = W < 560
  const H = narrow ? 260 : 340
  const m = { t: 30, r: 8, b: 56, l: 40 }
  if (!rows || rows.length < 10) return <div ref={ref} />
  const t0 = Date.parse(rows[0].iso), t1 = Date.parse(rows[rows.length - 1].iso)
  const x = (iso) => m.l + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - m.l - m.r)
  const top = Math.ceil(Math.max(...rows.map((r) => Math.max(r.atl, r.ctl))) / 50) * 50
  const y = (v) => H - m.b - (v / top) * (H - m.t - m.b)
  const step = Math.max(1, Math.floor(rows.length / (narrow ? 300 : 700)))
  const pts = rows.filter((_, i) => i % step === 0 || i === rows.length - 1)
  const path = (k) => pts.map((r, i) => `${i ? 'L' : 'M'}${x(r.iso).toFixed(1)} ${y(r[k]).toFixed(1)}`).join('')
  const ticks = []
  for (let v = 0; v <= top; v += 50) ticks.push(v)
  const years = []
  for (let yr = Number(rows[0].iso.slice(0, 4)) + 1; yr <= Number(rows[rows.length - 1].iso.slice(0, 4)); yr++) years.push(yr)
  return (
    <div ref={ref} className="load">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria} style={{ display: 'block' }}>
        {ticks.map((v) => <g key={v}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="ykb__grid" /><text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="ykb__gl">{v}</text></g>)}
        {years.map((yr) => { const xx = x(`${yr}-01-01`); return <g key={yr}><line x1={xx} x2={xx} y1={m.t} y2={H - m.b} className="ymo__tick" /><text x={xx + 4} y={H - m.b + 16} className="ykb__gl">{narrow ? `'${String(yr).slice(2)}` : yr}</text></g> })}
        <path d={path('atl')} className="load__atl" />
        <path d={path('ctl')} className="load__ctl" />
        {marks.map((mk, i) => (
          <g key={mk.iso + i} className="load__mk">
            <line x1={x(mk.iso)} x2={x(mk.iso)} y1={H - m.b + 22} y2={H - m.b + 32} />
          </g>
        ))}
        <text x={m.l} y={14} className="ykb__cap">minutes on the move a day</text>
        <text x={W - m.r} y={H - 6} textAnchor="end" className="ykb__gl">ticks: races and mountain days</text>
      </svg>
      <p className="yset__key"><span><i style={{ background: 'var(--accent)' }} />fitness, the last six weeks</span><span><i style={{ background: 'var(--grey-35)' }} />fatigue, the last week</span></p>
    </div>
  )
}

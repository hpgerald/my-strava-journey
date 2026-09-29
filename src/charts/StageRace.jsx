import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The 100 km stage race, March 2023: four evenings of 25 km, back to back. Each
// stage sits on a 0 to 100 km track, coloured by how fast it was walked-run, and
// the line above traces the pace night to night. The story is in that line: after
// two steady openers he dropped nearly half a minute a kilometre and ran the third
// evening quickest of all, holding it on the fourth. Fixed facts of one effort.
const DAYS = [
  { d: 1, km: 25.0, min: 162, date: 'Mar 24' },
  { d: 2, km: 25.1, min: 162, date: 'Mar 25' },
  { d: 3, km: 25.1, min: 150, date: 'Mar 26' },
  { d: 4, km: 25.1, min: 153, date: 'Mar 27' },
].map((x) => ({ ...x, pace: (x.min * 60) / x.km }))
const paceStr = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const clock = (min) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`

export default function StageRace() {
  const [ref, width] = useWidth(700)
  const [hover, setHover] = useState(null)
  const W = Math.max(320, width)
  const narrow = W < 560
  const m = { t: 16, r: 14, b: 30, l: 14 }
  const paceH = narrow ? 66 : 78
  const blockY = m.t + paceH + 6
  const blockH = narrow ? 40 : 46
  const H = blockY + blockH + m.b
  const total = DAYS.reduce((a, b) => a + b.km, 0)
  const totalMin = DAYS.reduce((a, b) => a + b.min, 0)
  const sx = linScale([0, total], [m.l, W - m.r])
  const pMin = Math.min(...DAYS.map((d) => d.pace)), pMax = Math.max(...DAYS.map((d) => d.pace))
  const sy = linScale([pMax + 6, pMin - 6], [m.t + paceH - 8, m.t + 8]) // faster higher
  const cLo = [0xF2, 0xC9, 0xB0], cHi = [0xC2, 0x39, 0x00]
  const paceColor = (p) => { const t = (pMax - p) / (pMax - pMin || 1); const c = cLo.map((s, i) => Math.round(s + (cHi[i] - s) * t)); return `rgb(${c[0]},${c[1]},${c[2]})` }
  const fastI = DAYS.reduce((b, d, i) => (d.pace < DAYS[b].pace ? i : b), 0)

  let acc = 0
  const seg = DAYS.map((d) => { const x0 = sx(acc), x1 = sx(acc + d.km); acc += d.km; return { ...d, x0, x1, cxm: (x0 + x1) / 2 } })

  return (
    <div ref={ref} className="stg">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Four evenings of 25 km building to 100 km, with a pace line that quickens on the third night." style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        <text x={m.l} y={m.t - 2} className="stg__axlbl">PACE, NIGHT BY NIGHT &middot; higher is quicker</text>
        {/* pace trend line */}
        <polyline points={seg.map((s) => `${s.cxm},${sy(s.pace)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {seg.map((s, i) => {
          const on = hover === null || hover === i
          const fast = i === fastI
          return (
            <g key={i} opacity={on ? 1 : 0.5} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={s.cxm} cy={sy(s.pace)} r={fast ? 5 : 4} fill={fast ? 'var(--accent)' : 'var(--paper)'} stroke="var(--accent)" strokeWidth="2" />
              <text x={s.cxm} y={sy(s.pace) - 9} textAnchor="middle" className={`stg__pace${fast ? ' stg__pace--hot' : ''}`}>{paceStr(s.pace)}/km</text>
            </g>
          )
        })}
        {/* the 100 km track, four stages */}
        {seg.map((s, i) => {
          const on = hover === null || hover === i
          return (
            <g key={'b' + i} opacity={on ? 1 : 0.6} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={s.x0 + (i ? 1.5 : 0)} y={blockY} width={s.x1 - s.x0 - (i ? 1.5 : 0)} height={blockH} rx="3" fill={paceColor(s.pace)} />
              <text x={s.cxm} y={blockY + blockH / 2 - 2} textAnchor="middle" className="stg__day">Day {s.d}</text>
              <text x={s.cxm} y={blockY + blockH / 2 + 12} textAnchor="middle" className="stg__km">{Math.round(s.km)} km &middot; {clock(s.min)}</text>
            </g>
          )
        })}
        {/* km ticks */}
        {[0, 25, 50, 75, 100].map((k) => (
          <text key={k} x={sx(k)} y={H - 10} textAnchor={k === 0 ? 'start' : k === 100 ? 'end' : 'middle'} className="stg__tick">{k} km</text>
        ))}
      </svg>
      <div className="stg__legend chart-legend">
        <span><i className="chart-swatch" style={{ background: 'rgb(194,57,0)' }} /> quicker evening</span>
        <span><i className="chart-swatch" style={{ background: 'rgb(242,201,176)' }} /> steadier evening</span>
        <span className="stg__note">{Math.round(total)} km over four nights &middot; {clock(totalMin)} moving in all</span>
      </div>
      {hover != null && seg[hover] && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(seg[hover].cxm - 60, 8), W - 150), top: blockY - 4 }}>
          <strong>Day {seg[hover].d} &middot; {seg[hover].date} 2023</strong>
          <br />
          {seg[hover].km.toFixed(1)} km &middot; {clock(seg[hover].min)} &middot; {paceStr(seg[hover].pace)}/km
        </div>
      )}
    </div>
  )
}

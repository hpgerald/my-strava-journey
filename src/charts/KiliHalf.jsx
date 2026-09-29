import { useState } from 'react'
import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// Four runnings of the same course, read from the real GPS tracks. The terrain on
// top is the course itself: it climbs 268 m to a turnaround near 9 km, then falls
// away for the run home. Below it, one pace ribbon per year, every ~500 m coloured
// by how fast it was run there, pale where slow, deep orange where quick. Read
// down the years and the ribbons warm as the race quickens; read across and every
// year drags on the climb and flies on the drop. props: rows (per-year finishes),
// profile (per-bin { year, bin, dist_km, rel_alt_m, pace_sec }).
const clock = (min) => { const t = Math.round(min); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
const P_FAST = 545, P_SLOW = 780
const SLOW = [0xF2, 0xDE, 0xCC], FAST = [0xCC, 0x39, 0x00]
const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const paceColor = (p) => {
  const t = clamp01((P_SLOW - p) / (P_SLOW - P_FAST))
  const c = SLOW.map((s, i) => Math.round(lerp(s, FAST[i], t)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export default function KiliHalf({ rows, profile }) {
  const [ref, width] = useWidth(680)
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length || !profile || !profile.length) return <div ref={ref} />

  const N = (x) => Number(x) || 0
  const years = [...new Set(profile.map((p) => p.year))].sort()
  const bins = Math.max(...profile.map((p) => Number(p.bin))) + 1
  const byYear = Object.fromEntries(years.map((y) => [y, profile.filter((p) => p.year === y).sort((a, b) => Number(a.bin) - Number(b.bin))]))
  const finish = Object.fromEntries(rows.map((r) => [r.year, N(r.moving_min)]))
  const distKm = byYear[years[0]].map((p) => N(p.dist_km))
  const totalKm = distKm[distKm.length - 1] + (distKm[1] - distKm[0]) / 2
  // shared course profile: average relative altitude across the years
  const sharedAlt = Array.from({ length: bins }, (_, i) => {
    const vs = years.map((y) => N(byYear[y][i]?.rel_alt_m))
    return vs.reduce((a, b) => a + b, 0) / vs.length
  })

  const W = Math.max(320, width)
  const narrow = W < 560
  const leftW = narrow ? 78 : 98
  const padR = 14
  const plotL = leftW, plotR = W - padR
  const plotW = plotR - plotL
  const cellW = plotW / bins
  const elevH = narrow ? 58 : 72
  const ribH = narrow ? 22 : 26
  const ribGap = 7
  const topPad = 20
  const elevTop = topPad
  const ribsTop = elevTop + elevH + 26
  const H = ribsTop + years.length * (ribH + ribGap) + 26

  const sx = linScale([0, totalKm], [plotL, plotR])
  const aMin = Math.min(...sharedAlt), aMax = Math.max(...sharedAlt)
  const sy = linScale([aMin, aMax], [elevTop + elevH, elevTop + 6])
  const peakBin = sharedAlt.indexOf(aMax)

  // elevation area path
  const ptsTop = sharedAlt.map((a, i) => `${(plotL + (i + 0.5) * cellW).toFixed(1)},${sy(a).toFixed(1)}`)
  const areaPath = `M${plotL},${elevTop + elevH} L` + ptsTop.join(' L') + ` L${plotR},${elevTop + elevH} Z`
  const linePath = 'M' + ptsTop.join(' L')

  const kmTicks = [0, 5, 10, 15, 20].filter((k) => k <= totalKm)

  return (
    <div ref={ref} className="kh">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="The Kilimanjaro Half Marathon course elevation with four years of pace ribbons, faster each year."
        style={{ display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* km gridlines spanning terrain + ribbons */}
        {kmTicks.map((k) => (
          <line key={'g' + k} x1={sx(k)} y1={elevTop} x2={sx(k)} y2={ribsTop + years.length * (ribH + ribGap) - ribGap} className="kh__grid" />
        ))}

        {/* course terrain */}
        <path d={areaPath} fill="var(--grey-10)" />
        <path d={linePath} fill="none" stroke="var(--grey-45)" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx={sx(distKm[peakBin])} cy={sy(aMax)} r="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.6" />
        <text x={sx(distKm[peakBin])} y={sy(aMax) - 7} textAnchor="middle" className="kh__peak">the turn &middot; +{Math.round(aMax)} m</text>
        <text x={plotL} y={elevTop + elevH + 15} className="kh__terr">THE COURSE &middot; climbs {Math.round(aMax)} m, then falls</text>

        {/* pace ribbons, one per year */}
        {years.map((y, yi) => {
          const ry = ribsTop + yi * (ribH + ribGap)
          const dim = hover && hover.y !== y
          return (
            <g key={y} opacity={dim ? 0.5 : 1}>
              {byYear[y].map((p, i) => {
                const on = !hover || (hover.y === y && hover.i === i)
                return (
                  <rect
                    key={i}
                    x={plotL + i * cellW} y={ry} width={cellW + 0.6} height={ribH}
                    fill={paceColor(N(p.pace_sec))}
                    stroke={hover && hover.y === y && hover.i === i ? 'var(--ink)' : 'none'}
                    strokeWidth={on ? 1 : 0}
                    onMouseEnter={() => setHover({ y, i })}
                    onMouseLeave={() => setHover(null)}
                  />
                )
              })}
              <text x={leftW - 10} y={ry + ribH / 2 - 2} textAnchor="end" className={`kh__yr${yi === years.length - 1 ? ' kh__yr--hot' : ''}`}>{y}</text>
              <text x={leftW - 10} y={ry + ribH / 2 + 11} textAnchor="end" className="kh__fin">{clock(finish[y])}</text>
            </g>
          )
        })}

        {/* distance axis */}
        {kmTicks.map((k) => (
          <text key={'k' + k} x={sx(k)} y={H - 8} textAnchor="middle" className="kh__tick">{k === 0 ? 'start' : k + ' km'}</text>
        ))}
      </svg>

      <div className="kh__legend">
        <span className="kh__legttl">pace</span>
        <span className="kh__ramp" />
        <span className="kh__legend-lo">slower</span>
        <span className="kh__legend-hi">quicker</span>
        <span className="kh__legnote">each cell ≈ 500 m of the course</span>
      </div>

      {hover && byYear[hover.y] && byYear[hover.y][hover.i] && (() => {
        const p = byYear[hover.y][hover.i]
        const sec = N(p.pace_sec)
        return (
          <div className="chart-tip" style={{ left: Math.min(Math.max(plotL + hover.i * cellW - 60, 8), W - 180), top: ribsTop - 6 }}>
            <strong>{hover.y} &middot; {N(p.dist_km).toFixed(1)} km in</strong>
            <br />
            {Math.floor(sec / 60)}:{String(Math.round(sec % 60)).padStart(2, '0')}/km &middot; {N(p.rel_alt_m) >= 0 ? '+' : ''}{Math.round(N(p.rel_alt_m))} m
            <br />
            finished in {clock(finish[hover.y])}
          </div>
        )
      })()}
    </div>
  )
}

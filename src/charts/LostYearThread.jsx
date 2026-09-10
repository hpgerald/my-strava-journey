import { useWidth } from './useWidth.js'
import { linScale } from './primitives.js'

// The lost year, told in three beats on one thread: the biggest single day ever
// (a 240 km ride into Kenya), then a 353-day flatline of silence, then the July
// 2021 ignition. rows: monthly_totals [{month, activities}].
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const mlabel = (k) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`

export default function LostYearThread({ rows, spikeMonth = '2020-07', igniteMonth = '2021-07', from = '2020-01', to = '2021-12' }) {
  const [ref, width] = useWidth(720)
  if (!rows || !rows.length) return <div ref={ref} />

  const by = {}
  for (const r of rows) by[r.month] = (by[r.month] || 0) + (Number(r.activities) || 0)
  // continuous month window
  const [y0, m0] = from.split('-').map(Number)
  const [y1, m1] = to.split('-').map(Number)
  const months = []
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m++) {
    if (m > 12) { m = 1; y++ }
    const key = `${y}-${String(m).padStart(2, '0')}`
    months.push({ key, v: by[key] || 0 })
  }

  const W = Math.max(320, width)
  const H = 260
  const pad = { t: 58, b: 40, l: 14, r: 14 }
  const base = H - pad.b
  const maxV = Math.max(...months.map((d) => d.v)) || 1
  const barMaxH = base - pad.t
  const sx = linScale([0, months.length - 1], [pad.l + 10, W - pad.r - 10])
  const barW = Math.max(3, ((W - pad.l - pad.r) / months.length) * 0.62)
  const idxOf = (k) => months.findIndex((d) => d.key === k)
  const si = idxOf(spikeMonth)
  const gi = idxOf(igniteMonth)

  return (
    <div ref={ref} className="lyt">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="The biggest day, then a 353-day silence, then the July 2021 ignition."
        style={{ display: 'block' }}
      >
        {/* baseline */}
        <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} className="lyt__base" />

        {/* the dead stretch between spike month and ignition */}
        {si >= 0 && gi >= 0 && (
          <>
            <rect x={sx(si)} y={pad.t - 6} width={sx(gi) - sx(si)} height={base - pad.t + 6} className="lyt__gapband" />
            <text x={(sx(si) + sx(gi)) / 2} y={pad.t - 40} textAnchor="middle" className="lyt__gaptitle">353 days</text>
            <text x={(sx(si) + sx(gi)) / 2} y={pad.t - 26} textAnchor="middle" className="lyt__gapsub">nothing logged</text>
          </>
        )}

        {/* monthly beats */}
        {months.map((d, i) => {
          const h = (d.v / maxV) * barMaxH
          const after = gi >= 0 && i >= gi
          return (
            <rect key={d.key} x={sx(i) - barW / 2} y={base - h} width={barW} height={Math.max(0.6, h)} rx={barW > 4 ? 1 : 0}
              fill={after ? 'var(--accent)' : 'var(--grey-45)'} opacity={after ? 1 : 0.75} />
          )
        })}

        {/* year ticks */}
        {months.map((d, i) => (Number(d.key.slice(5, 7)) === 1 ? (
          <text key={'y' + d.key} x={sx(i)} y={H - 10} textAnchor="middle" className="chart-tick">{d.key.slice(0, 4)}</text>
        ) : null))}

        {/* beat 1: the spike */}
        {si >= 0 && (
          <g>
            <line x1={sx(si)} y1={base} x2={sx(si)} y2={pad.t - 6} className="lyt__mark lyt__mark--spike" />
            <circle cx={sx(si)} cy={pad.t - 6} r="4" fill="var(--ink)" />
            <text x={sx(si)} y={pad.t - 14} textAnchor="middle" className="lyt__spikelbl">240 km into Kenya</text>
            <text x={sx(si)} y={base + 18} textAnchor="middle" className="lyt__foot">{mlabel(spikeMonth)}</text>
          </g>
        )}
        {/* beat 3: ignition */}
        {gi >= 0 && (
          <g>
            <line x1={sx(gi)} y1={base} x2={sx(gi)} y2={pad.t - 6} className="lyt__mark lyt__mark--ignite" />
            <text x={sx(gi)} y={base + 18} textAnchor="middle" className="lyt__foot lyt__foot--ignite">{mlabel(igniteMonth)} · the switch</text>
          </g>
        )}
      </svg>
    </div>
  )
}

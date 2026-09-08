import { useMemo, useState } from 'react'
import { toNum } from '../lib/format.js'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

// A radial seasonality view: the shape, rather than just bar heights, makes
// each year's training rhythm immediately comparable.
export default function SeasonWheel({ rows }) {
  const years = useMemo(
    () => [...new Set(rows.map((r) => (r.month || '').slice(0, 4)).filter(Boolean))].sort(),
    [rows],
  )
  const [selected, setSelected] = useState('All')
  const values = Array(12).fill(0)
  for (const row of rows) {
    const year = (row.month || '').slice(0, 4)
    const month = Number((row.month || '').slice(5, 7))
    if ((selected === 'All' || year === selected) && month >= 1 && month <= 12) {
      values[month - 1] += toNum(row.activities) || 0
    }
  }
  const max = Math.max(...values, 1)
  const size = 360
  const center = size / 2
  const inner = 55
  const outer = 132
  const point = (angle, radius) => [center + Math.sin(angle) * radius, center - Math.cos(angle) * radius]

  return (
    <div className="season-wheel">
      <div className="season-wheel__controls" role="group" aria-label="Select a season">
        {['All', ...years].map((year) => (
          <button
            type="button"
            key={year}
            className="season-wheel__button"
            aria-pressed={selected === year}
            onClick={() => setSelected(year)}
          >
            {year === 'All' ? 'All years' : year}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Activities by calendar month, ${selected === 'All' ? 'all years combined' : selected}`}>
        <circle className="season-wheel__guide" cx={center} cy={center} r={outer} />
        <circle className="season-wheel__guide" cx={center} cy={center} r={(inner + outer) / 2} />
        <circle className="season-wheel__guide season-wheel__guide--in" cx={center} cy={center} r={inner} />
        {/* the shape: a filled radar through each month's tip, so the year's
            rhythm reads as a silhouette, not just twelve bars */}
        <polygon
          className="season-wheel__shape"
          points={values
            .map((value, index) => {
              const [px, py] = point((index / 12) * Math.PI * 2, inner + ((outer - inner) * value) / max)
              return `${px.toFixed(1)},${py.toFixed(1)}`
            })
            .join(' ')}
        />
        {values.map((value, index) => {
          const angle = (index / 12) * Math.PI * 2
          const [x1, y1] = point(angle, inner)
          const [tx, ty] = point(angle, inner + ((outer - inner) * value) / max)
          const [lx, ly] = point(angle, outer + 20)
          return (
            <g key={index}>
              <line className="season-wheel__spoke" x1={x1} y1={y1} x2={tx} y2={ty} />
              <circle className="season-wheel__tip" cx={tx} cy={ty} r="3.2" />
              <text className="season-wheel__month" x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">{MONTHS[index]}</text>
              <title>{`${MONTHS[index]}: ${Math.round(value)} activities`}</title>
            </g>
          )
        })}
        <text className="season-wheel__value" x={center} y={center - 4} textAnchor="middle">{Math.round(values.reduce((sum, value) => sum + value, 0))}</text>
        <text className="season-wheel__label" x={center} y={center + 16} textAnchor="middle">activities</text>
      </svg>
    </div>
  )
}

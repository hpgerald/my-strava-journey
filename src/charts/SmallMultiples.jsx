import { useWidth } from './useWidth.js'
import { linScale, smoothLinePath, smoothAreaPath } from './primitives.js'

// A grid of tiny area charts, one per series, all sharing a y-scale so they are
// comparable. Avoids categorical colour entirely (each panel is labelled).
// series: [{ name, sub, points:[{x,y}] }]
export default function SmallMultiples({ series, height = 92, columns }) {
  const [ref, width] = useWidth(680)
  const cols = columns || (width < 420 ? 1 : width < 680 ? 2 : 3)
  const gap = 1
  const panelW = (width - (cols - 1) * gap) / cols

  const allY = series.flatMap((s) => s.points.map((p) => p.y))
  const yMax = Math.max(1, ...allY)
  const allX = series.flatMap((s) => s.points.map((p) => p.x))
  const xMin = Math.min(...allX)
  const xMax = Math.max(...allX)

  const m = { t: 30, r: 8, b: 6, l: 8 }

  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, borderTop: '1px solid var(--rule)', borderLeft: '1px solid var(--rule)' }}>
      {series.map((s) => {
        const iw = panelW - m.l - m.r
        const ih = height - m.t - m.b
        const sx = linScale([xMin, xMax], [m.l, m.l + iw])
        const sy = linScale([0, yMax], [m.t + ih, m.t])
        const pts = s.points.map((p) => [sx(p.x), sy(p.y)])
        return (
          <div key={s.name} style={{ borderRight: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
            <svg width="100%" height={height} viewBox={`0 0 ${panelW} ${height}`} role="img" aria-label={s.name} style={{ display: 'block' }}>
              <text x={m.l} y={16} className="chart-panel-title">
                {s.name}
              </text>
              {s.sub ? (
                <text x={m.l} y={26} className="chart-tick">
                  {s.sub}
                </text>
              ) : null}
              {pts.length > 1 && <path d={smoothAreaPath(pts, sy(0))} fill="var(--accent-mute)" />}
              {pts.length > 1 && <path d={smoothLinePath(pts)} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />}
              <line x1={m.l} x2={m.l + iw} y1={sy(0)} y2={sy(0)} stroke="var(--rule-faint)" strokeWidth="1" />
            </svg>
          </div>
        )
      })}
    </div>
  )
}

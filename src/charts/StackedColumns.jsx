import { useState } from 'react'

// 100% stacked vertical columns: one column per period, split into two shares
// that always sum to the full height. Built for an indoor/outdoor split by year.
// data: [{ label, top, bottom }]  (top = accent share, bottom = grey share; raw counts)
// keys: { top, bottom } legend labels
export default function StackedColumns({ data, keys = { top: 'Outdoor', bottom: 'Indoor' }, height = 240 }) {
  const [hi, setHi] = useState(null)
  const pad = { t: 10, b: 22 }
  const ih = height - pad.t - pad.b

  return (
    <div className="stackcol">
      <div className="stackcol__legend mono">
        <span className="stackcol__key"><i className="stackcol__sw stackcol__sw--top" />{keys.top}</span>
        <span className="stackcol__key"><i className="stackcol__sw stackcol__sw--bot" />{keys.bottom}</span>
      </div>
      <div className="stackcol__plot" style={{ height: `${height}px` }} onMouseLeave={() => setHi(null)}>
        {data.map((d, i) => {
          const total = (d.top || 0) + (d.bottom || 0)
          const topPct = total ? (d.top / total) * 100 : 0
          const botPct = total ? (d.bottom / total) * 100 : 0
          const on = hi === i
          return (
            <div
              key={i}
              className={`stackcol__col${on ? ' is-hi' : ''}`}
              onMouseEnter={() => setHi(i)}
            >
              <div className="stackcol__bar" style={{ height: `${ih}px`, marginTop: `${pad.t}px` }}>
                <span className="stackcol__seg stackcol__seg--top" style={{ height: `${topPct}%` }}>
                  {topPct >= 16 ? <span className="stackcol__pct mono">{Math.round(topPct)}</span> : null}
                </span>
                <span className="stackcol__seg stackcol__seg--bot" style={{ height: `${botPct}%` }}>
                  {botPct >= 16 ? <span className="stackcol__pct mono">{Math.round(botPct)}</span> : null}
                </span>
              </div>
              <span className="stackcol__lbl mono">{d.label}</span>
              {on ? (
                <div className="stackcol__tip">
                  <strong>{d.label}</strong>
                  <br />
                  {keys.top} {d.top} · {keys.bottom} {d.bottom}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

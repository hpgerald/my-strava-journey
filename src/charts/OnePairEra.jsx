import { useWidth } from './useWidth.js'
import { linScale, smoothLinePath } from './primitives.js'

// One pair, one era. A single shoe read closely: the months it carried, its
// kilometres mounting as a line, and the few numbers that give it a character -
// how fast, how steep, how quickly it was used up. One card per meaningful pair,
// not a template stamped on all eleven. props: pair { brand, model, role, first,
// last, km, kmMo, pace, trailPct, elev, retired, monthly:[{month, cum}], note }.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const label = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
const paceStr = (p) => p > 0 ? `${Math.floor(p)}:${String(Math.round((p - Math.floor(p)) * 60)).padStart(2, '0')}` : 'n/a'

export default function OnePairEra({ pair }) {
  const [ref, width] = useWidth(380)
  if (!pair) return <div ref={ref} />
  const W = Math.max(240, width)
  const H = 72
  const m = { t: 8, r: 8, b: 8, l: 8 }
  const mly = pair.monthly || []
  const maxC = Math.max(1, ...mly.map((d) => d.cum))
  const x = linScale([0, Math.max(1, mly.length - 1)], [m.l, W - m.r])
  const y = linScale([0, maxC], [H - m.b, m.t])
  const pts = mly.map((d, i) => [x(i), y(d.cum)])

  return (
    <div ref={ref} className="opr">
      <div className="opr__head">
        <span className={`opr__role${pair.retired ? '' : ' opr__role--live'}`}>{pair.role}</span>
        <h3 className="opr__name">{pair.brand} {pair.model.replace(/\s*\(.*\)$/, '')}</h3>
        <p className="opr__era mono">{label(pair.first)} &rarr; {pair.retired ? label(pair.last) : 'still running'}</p>
      </div>
      {mly.length > 1 && (
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Kilometres in the ${pair.model} mounting from first to last use, reaching ${Math.round(pair.km)} km.`} style={{ display: 'block' }}>
          <path d={`${smoothLinePath(pts)} L${(W - m.r).toFixed(1)} ${(H - m.b).toFixed(1)} L${m.l} ${(H - m.b).toFixed(1)} Z`} fill="color-mix(in srgb, var(--accent) 12%, var(--paper))" stroke="none" />
          <path d={smoothLinePath(pts)} fill="none" stroke="var(--accent)" strokeWidth="2" />
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill="var(--accent)" />
        </svg>
      )}
      <ul className="opr__stats">
        <li><span className="opr__v">{Math.round(pair.km).toLocaleString()}</span><span className="opr__l">km total</span></li>
        <li><span className="opr__v">{Math.round(pair.kmMo)}</span><span className="opr__l">km / month</span></li>
        <li><span className="opr__v">{paceStr(pair.pace)}</span><span className="opr__l">median /km</span></li>
        <li><span className="opr__v">{pair.trailPct >= 50 ? 'Trail' : 'Road'}</span><span className="opr__l">{Math.round(pair.trailPct)}% off-road</span></li>
      </ul>
      <p className="opr__note">{pair.note}</p>
    </div>
  )
}

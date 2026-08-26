import { toNum, fmtNum } from '../lib/format.js'
import Tag from './Tag.jsx'

// "Then vs now": two bars on one shared scale, the debut half-year against the
// latest year. Thin rounded marks, the value read at the end of each bar, and
// the multiple called out as a badge. Bars are decorative (aria-hidden); every
// number is present as text.
export default function CompareBar({
  label,
  baselineLabel,
  baselineValue,
  targetLabel,
  targetValue,
  unit,
  direction,
  plain,
  source,
}) {
  const b = toNum(baselineValue) ?? 0
  const t = toNum(targetValue) ?? 0
  const max = Math.max(b, t, 1)
  const bw = Math.max(1.5, (b / max) * 100)
  const tw = Math.max(1.5, (t / max) * 100)
  // short tag for the bar row (a bare year where the label starts with one)
  const shortOf = (s) => (String(s).match(/^\d{4}/) || [String(s)])[0]

  return (
    <div className="cmp">
      <div className="cmp__head">
        <h3 className="cmp__title">{label}</h3>
        {direction ? <Tag>{direction}</Tag> : null}
      </div>

      <div className="cmp__rows" aria-hidden="true">
        <div className="cmp__row">
          <span className="cmp__yr mono">{shortOf(baselineLabel)}</span>
          <span className="cmp__track">
            <span className="cmp__fill cmp__fill--then" style={{ width: `${bw}%` }} />
          </span>
          <span className="cmp__val mono">
            {fmtNum(baselineValue)}
            {unit ? <span className="text-muted"> {unit}</span> : null}
          </span>
        </div>
        <div className="cmp__row">
          <span className="cmp__yr mono">{shortOf(targetLabel)}</span>
          <span className="cmp__track">
            <span className="cmp__fill cmp__fill--now" style={{ width: `${tw}%` }} />
          </span>
          <span className="cmp__val mono">
            {fmtNum(targetValue)}
            {unit ? <span className="text-muted"> {unit}</span> : null}
          </span>
        </div>
      </div>

      {/* text equivalent of the two bars, hidden from view but read by AT */}
      <dl className="visually-hidden">
        <dt>{baselineLabel}</dt>
        <dd>{fmtNum(baselineValue)} {unit}</dd>
        <dt>{targetLabel}</dt>
        <dd>{fmtNum(targetValue)} {unit}</dd>
      </dl>

      {plain ? <p className="cmp__note">{plain}</p> : null}
      {source ? <div className="source" style={{ marginTop: 'var(--sp-2)' }}>Source: {source}</div> : null}
    </div>
  )
}

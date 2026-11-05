import { useWidth } from './useWidth.js'
import { useInView } from '../components/Reveal.jsx'
import { floatStyle } from '../motion/drift.js'
import { linScale, linePath } from './primitives.js'

// The charts of "The Habit on Trial": one full-width figure per case, all at
// the same height, drawn from evidence.json. Lines draw in, bars rise and dots
// wash in once the chart is on screen; scatter dots then float in place.

const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`
const mmss = (v) => { const s = Math.round(v * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

// shared frame: measures the width, picks the height, reports inView
function useFrame(Hd = 360, Hn = 300) {
  const [ref, width] = useWidth(720)
  const [root, inView] = useInView()
  const W = Math.max(300, width)
  const narrow = W < 520
  return { ref, root, inView, W, narrow, H: narrow ? Hn : Hd }
}

function Grid({ m, W, y, ticks, fmt }) {
  return ticks.map((t) => (
    <g key={`g${t}`}>
      <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--rule-faint)" />
      <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="cb__gl">{fmt(t)}</text>
    </g>
  ))
}

function Key({ items }) {
  return (
    <p className="evc__key" aria-hidden="true">
      {items.map(([cls, label]) => <span key={label}><i className={`evc__sw ${cls}`} />{label}</span>)}
    </p>
  )
}

function Svg({ f, aria, children }) {
  return (
    <div ref={f.ref} className="cb evc">
      <div ref={f.root} className={`cb__plot evc__plot${f.inView ? ' is-in' : ''}`}>
        <svg width="100%" height={f.H} viewBox={`0 0 ${f.W} ${f.H}`} role="img" aria-label={aria} style={{ display: 'block' }}>{children}</svg>
      </div>
    </div>
  )
}

// 1. detrended fluctuation, real days against shuffled days, log-log
export function DfaChart({ curve, alpha, shuf, aria }) {
  const f = useFrame()
  const { W, H } = f
  const m = { t: 30, r: 16, b: 44, l: 46 }
  const lx = (v) => Math.log10(v)
  const all = curve.real.concat(curve.shuffled).map(lx)
  const lo = Math.min(...all) - 0.05, hi = Math.max(...all) + 0.05
  const x = linScale([lx(6), lx(200)], [m.l, W - m.r]), y = linScale([lo, hi], [H - m.b, m.t])
  const yt = [0.25, 0.5, 1, 2].filter((v) => lx(v) > lo && lx(v) < hi)
  const line = (k) => curve.scales.map((s, i) => [x(lx(s)), y(lx(curve[k][i]))])
  return (
    <>
      <Key items={[['is-acc', `my days, α ${alpha.toFixed(2)}`], ['is-grey', `shuffled days, α ${shuf.toFixed(2)}`]]} />
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={(v) => y(lx(v))} ticks={yt} fmt={(v) => v} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        {[7, 14, 30, 60, 120].map((t) => <text key={t} x={x(lx(t))} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{t}</text>)}
        {[['shuffled', 'is-grey'], ['real', 'is-acc']].map(([k, cls], j) => (
          <g key={k} className={`evc__series ${cls}`} style={{ '--d': `${j * 500}ms` }}>
            <path d={linePath(line(k))} pathLength="1" className="evc__line" />
            {line(k).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.2" className="evc__dot" style={{ '--d': `${j * 500 + 300 + i * 40}ms` }} />)}
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">window length, days (log scale)</text>
        <text x={m.l - 8} y={m.t - 16} className="cb__axis">fluctuation (log scale)</text>
      </Svg>
    </>
  )
}

// 2. chance of going out tomorrow after k days out, or k rest days
export function MomentumChart({ on, off, aria }) {
  const f = useFrame()
  const { W, H, narrow } = f
  const m = { t: 30, r: 16, b: 44, l: 46 }
  const x = linScale([0.5, 14.5], [m.l, W - m.r]), y = linScale([0.2, 1], [H - m.b, m.t])
  const pts = (arr) => arr.map(([k, h, n]) => [x(k), y(h / n), n])
  return (
    <>
      <Key items={[['is-acc', 'after this many days out in a row'], ['is-grey', 'after this many rest days in a row']]} />
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={y} ticks={[0.25, 0.5, 0.75, 1]} fmt={(v) => pct(v)} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        {Array.from({ length: 14 }, (_, i) => i + 1).filter((k) => !narrow || k % 2 === 1 || k === 14).map((k) => <text key={k} x={x(k)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{k}</text>)}
        {[[off, 'is-grey'], [on, 'is-acc']].map(([arr, cls], j) => (
          <g key={cls} className={`evc__series ${cls}`} style={{ '--d': `${j * 500}ms` }} data-float>
            <path d={linePath(pts(arr))} pathLength="1" className="evc__line" />
            {pts(arr).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={2.5 + Math.sqrt(p[2]) * (narrow ? 0.3 : 0.42)} className="evc__dot evc__dot--soft flt" style={{ '--d': `${j * 500 + 300 + i * 50}ms`, ...floatStyle(j * 20 + i) }} />)}
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">days in a row so far</text>
        <text x={m.l - 8} y={m.t - 16} className="cb__axis">out the next day</text>
      </Svg>
    </>
  )
}

// 3. active days per week with the eras the changepoint test found
export function ErasChart({ weekly, segments, aria }) {
  const f = useFrame()
  const { W, H } = f
  const m = { t: 30, r: 16, b: 30, l: 34 }
  const t = (iso) => Date.parse(`${iso}T00:00:00Z`)
  const t0 = t(weekly[0][0]), t1 = t(weekly[weekly.length - 1][0]) + 7 * 864e5
  const x = linScale([t0, t1], [m.l, W - m.r]), y = linScale([0, 7.4], [H - m.b, m.t])
  const bw = (W - m.l - m.r) / weekly.length
  const y0 = +weekly[0][0].slice(0, 4) + 1, y1 = +weekly[weekly.length - 1][0].slice(0, 4)
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i)
  return (
    <>
      <Key items={[['is-grey', 'one week'], ['is-acc is-bar', 'average of each era']]} />
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={y} ticks={[0, 2, 4, 6, 7]} fmt={(v) => v} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        {years.map((yy) => <text key={yy} x={x(t(`${yy}-01-01`))} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{yy}</text>)}
        <g className="evc__bars">
          {weekly.map(([d, v], i) => v ? <rect key={d} x={x(t(d))} y={y(v)} width={Math.max(0.6, bw - 0.4)} height={y(0) - y(v)} className="evc__bar is-grey" style={{ '--d': `${Math.round((i / weekly.length) * 900)}ms`, transformOrigin: `0 ${y(0)}px` }} /> : null)}
        </g>
        {segments.map(([a, b, mean], i) => (
          <g key={a} className="evc__seg" style={{ '--d': `${1000 + i * 250}ms` }}>
            <line x1={x(t(a))} x2={x(t(b))} y1={y(mean)} y2={y(mean)} pathLength="1" className="evc__line evc__line--seg" />
            <text x={(x(t(a)) + x(t(b))) / 2} y={y(mean) - 9} textAnchor="middle" className="evc__lbl evc__fade cb__halo">{mean.toFixed(1)}</text>
          </g>
        ))}
        <text x={m.l - 8} y={m.t - 16} className="cb__axis">active days in the week</text>
      </Svg>
    </>
  )
}

// 5. share of days out by month, with the fitted yearly wave
export function SeasonChart({ months, curve, low, aria }) {
  const f = useFrame()
  const { W, H, narrow } = f
  const m = { t: 30, r: 16, b: 30, l: 46 }
  const MON = narrow ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mid = [16, 46, 75, 106, 136, 167, 197, 228, 259, 289, 320, 350]
  const x = linScale([0, 366], [m.l, W - m.r]), y = linScale([0, 0.9], [H - m.b, m.t])
  const bw = ((W - m.l - m.r) / 12) * 0.56
  return (
    <>
      <Key items={[['is-grey', 'month'], ['is-acc', 'quietest months'], ['is-ink is-line', 'fitted yearly wave']]} />
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={y} ticks={[0, 0.2, 0.4, 0.6, 0.8]} fmt={(v) => pct(v)} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        {months.map(([mm, v], i) => (
          <g key={mm}>
            <rect x={x(mid[i]) - bw / 2} y={y(v)} width={bw} height={y(0) - y(v)} rx="2" className={`evc__bar ${low.includes(mm) ? 'is-acc' : 'is-grey'}`} style={{ '--d': `${i * 60}ms`, transformOrigin: `0 ${y(0)}px` }} />
            <text x={x(mid[i])} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{MON[i]}</text>
          </g>
        ))}
        <path d={linePath(curve.map(([d, v]) => [x(d), y(v)]))} pathLength="1" className="evc__line evc__line--ink" style={{ '--d': '900ms' }} />
        <text x={m.l - 8} y={m.t - 16} className="cb__axis">share of days with an outing</text>
      </Svg>
    </>
  )
}

// 6. treadmill runs by distance in 100 m bins
export function HeapChart({ hist, aria }) {
  const f = useFrame()
  const { W, H } = f
  const m = { t: 30, r: 16, b: 44, l: 40 }
  const mx = Math.max(...hist.map((r) => r[1]))
  const top = Math.ceil((mx * 1.08) / 20) * 20
  const x = linScale([1.95, 22.05], [m.l, W - m.r]), y = linScale([0, top], [H - m.b, m.t])
  const bw = (W - m.l - m.r) / hist.length
  const hot = (d) => [5, 10, 15].some((t) => Math.abs(d - t) < 0.06)
  const ticks = []; for (let v = 0; v <= top; v += 20) ticks.push(v)
  return (
    <>
      <Key items={[['is-acc', 'the 100 m bin at 5, 10 or 15 km'], ['is-grey', 'any other distance']]} />
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={y} ticks={ticks} fmt={(v) => v} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        {[5, 10, 15, 21.1].map((t) => <text key={t} x={x(t)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{t} km</text>)}
        {hist.map(([d, n], i) => n ? <rect key={d} x={x(d) - bw / 2} y={y(n)} width={Math.max(1, bw - 0.5)} height={y(0) - y(n)} className={`evc__bar ${hot(d) ? 'is-acc' : 'is-grey'}`} style={{ '--d': `${Math.round((i / hist.length) * 900)}ms`, transformOrigin: `0 ${y(0)}px` }} /> : null)}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">distance of the treadmill run</text>
        <text x={m.l - 8} y={m.t - 16} className="cb__axis">runs in each 100 m</text>
      </Svg>
    </>
  )
}

// 7. treadmill pace by year: median and the middle half of runs
export function TreadPaceChart({ byYear, from, cur, aria }) {
  const f = useFrame()
  const { W, H, narrow } = f
  const m = { t: 30, r: 16, b: 30, l: 46 }
  const ys = byYear.map((r) => r[0])
  const x = linScale([ys[0] - 0.5, ys[ys.length - 1] + 0.5], [m.l, W - m.r])
  const lo = Math.floor(Math.min(...byYear.map((r) => r[1])) - 0.4), hi = Math.ceil(Math.max(...byYear.map((r) => r[3])) + 0.3)
  const y = linScale([lo, hi], [m.t, H - m.b])
  const ticks = []; for (let v = lo; v <= hi; v += 1) ticks.push(v)
  const tone = (yy) => (yy < from ? 'is-grey' : yy === cur ? 'is-acc' : 'is-ink')
  return (
    <>
      <Key items={[['is-ink', 'median run'], ['is-acc', String(cur)], ['is-grey', `before ${from}, few runs`]]} />
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={y} ticks={ticks} fmt={(v) => mmss(v)} />
        {byYear.map(([yy, q1, md, q3], i) => (
          <g key={yy} className={`evc__box ${tone(yy)}`} style={{ '--d': `${i * 90}ms` }}>
            <line x1={x(yy)} x2={x(yy)} y1={y(q1)} y2={y(q3)} className="evc__iqr" />
            <circle cx={x(yy)} cy={y(md)} r="5" className="evc__dot" />
            <text x={x(yy) + 10} y={y(md) + 4} className="evc__lbl evc__fade">{mmss(md)}</text>
            <text x={x(yy)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{narrow ? `'${String(yy).slice(2)}` : yy}</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        <text x={m.l - 8} y={m.t - 16} className="cb__axis">min per km, quicker at the top</text>
      </Svg>
    </>
  )
}

// 8, 9 and 10: a cloud of points, with an optional fitted line
export function EvScatter({ points, xDomain, yDomain, xTicks, yTicks, xFmt = (v) => v, yFmt = (v) => v, xCap, yCap, fit, fitLabel, keyItems, aria }) {
  const f = useFrame()
  const { W, H, narrow } = f
  const m = { t: 30, r: 16, b: 44, l: 46 }
  const x = linScale(xDomain, [m.l, W - m.r]), y = linScale(yDomain, [H - m.b, m.t])
  const cx = (v) => x(Math.max(xDomain[0], Math.min(xDomain[1], v)))
  const cy = (v) => y(Math.max(yDomain[0], Math.min(yDomain[1], v)))
  const fl = fit ? [[x(xDomain[0]), cy(fit.intercept + fit.slope * xDomain[0])], [x(xDomain[1]), cy(fit.intercept + fit.slope * xDomain[1])]] : null
  return (
    <>
      {keyItems ? <Key items={keyItems} /> : null}
      <Svg f={f} aria={aria}>
        <Grid m={m} W={W} y={y} ticks={yTicks} fmt={yFmt} />
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--ink)" />
        {xTicks.map((t) => <text key={t} x={x(t)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{xFmt(t)}</text>)}
        <g data-float>
          {points.map((p, i) => <circle key={i} cx={cx(p.x)} cy={cy(p.y)} r={narrow ? 2.2 : 2.8} className={`evc__pt ${p.tone || 'is-grey'} flt`} style={{ '--d': `${Math.round((i / points.length) * 900)}ms`, ...floatStyle(i) }} />)}
        </g>
        {fl ? (
          <g className="evc__fit">
            <path d={linePath(fl)} pathLength="1" className="evc__line evc__line--ink" style={{ '--d': '1000ms' }} />
            <text x={fl[0][0] + (fl[1][0] - fl[0][0]) * 0.97} y={fl[0][1] + (fl[1][1] - fl[0][1]) * 0.97 - 12} textAnchor="end" className="evc__lbl evc__lbl--b evc__fade cb__halo" style={{ '--d': '1800ms' }}>{fitLabel}</text>
          </g>
        ) : null}
        {xCap && <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">{xCap}</text>}
        {yCap && <text x={m.l - 8} y={m.t - 16} className="cb__axis">{yCap}</text>}
      </Svg>
    </>
  )
}

// 11. the day after a long day, against the day after any other day out
export function LongDayChart({ groups, aria }) {
  const f = useFrame()
  const { W, H } = f
  const m = { t: 18, r: 16, b: 10, l: 0 }
  const gh = (H - m.t - m.b) / groups.length
  return (
    <Svg f={f} aria={aria}>
      {groups.map((g, gi) => {
        const top = m.t + gi * gh
        const max = g.max || Math.max(...g.rows.map((r) => r.value)) * 1.15
        const x = linScale([0, max], [m.l, W - m.r - 64])
        const rh = Math.min(30, (gh - 40) / g.rows.length - 26)
        return (
          <g key={g.title}>
            <text x={m.l} y={top + 10} className="cb__axis">{g.title}</text>
            {g.rows.map((r, i) => {
              const yy = top + 30 + i * (rh + 28)
              return (
                <g key={r.label} className={`evc__hb ${r.tone}`} style={{ '--d': `${gi * 300 + i * 150}ms` }}>
                  <text x={m.l} y={yy + 2} className="evc__lbl">{r.label}</text>
                  <rect x={m.l} y={yy + 8} width={W - m.r - 64 - m.l} height={rh} rx="2" className="evc__track" />
                  <rect x={m.l} y={yy + 8} width={Math.max(0, x(r.value) - m.l)} height={rh} rx="2" className="evc__hbar" style={{ transformOrigin: `${m.l}px 0` }} />
                  <text x={W - m.r} y={yy + 8 + rh / 2 + 5} textAnchor="end" className="evc__lbl evc__lbl--b evc__fade">{r.display}</text>
                </g>
              )
            })}
          </g>
        )
      })}
    </Svg>
  )
}

// 12. the effect of each factor on kudos, with its 95% interval. Wide: the
// labels sit in their own column; narrow: each label sits above its row.
export function KudosChart({ effects, aria }) {
  const f = useFrame(Math.max(360, effects.length * 42 + 56), Math.max(300, effects.length * 50 + 56))
  const { W, H, narrow } = f
  const m = { t: 10, r: 16, b: 40, l: narrow ? 12 : 190 }
  const lo = Math.min(-40, ...effects.map((e) => e[2])), hi = Math.max(60, ...effects.map((e) => e[3]))
  const x = linScale([lo, hi], [m.l, W - m.r])
  const rh = (H - m.t - m.b) / effects.length
  const ticks = [-40, -20, 0, 20, 40, 60].filter((t) => t >= lo && t <= hi)
  return (
    <>
      <Key items={[['is-acc', 'clear effect, p under 0.05'], ['is-grey is-ring', 'interval crosses zero']]} />
      <Svg f={f} aria={aria}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} stroke={t === 0 ? 'var(--ink)' : 'var(--rule-faint)'} />
            <text x={x(t)} y={H - m.b + 16} textAnchor="middle" className="cb__gl">{`${t > 0 ? '+' : ''}${t}%`.replace('-', '\u2212')}</text>
          </g>
        ))}
        {effects.map(([lab, est, a, b, p], i) => {
          const sig = p < 0.05
          const yy = narrow ? m.t + rh * i + rh * 0.7 : m.t + rh * (i + 0.5)
          return (
            <g key={lab} className={`evc__wh ${sig ? 'is-acc' : 'is-grey'}`} style={{ '--d': `${i * 90}ms` }}>
              {narrow
                ? <text x={m.l} y={yy - 12} className="evc__lbl evc__fade cb__halo">{lab}</text>
                : <text x={m.l - 14} y={yy + 4} textAnchor="end" className="evc__lbl evc__fade">{lab}</text>}
              <line x1={x(a)} x2={x(b)} y1={yy} y2={yy} className="evc__ci" />
              <circle cx={x(est)} cy={yy} r="5" className={`evc__dot${sig ? '' : ' is-open'}`} />
            </g>
          )
        })}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="cb__axis">change in kudos</text>
      </Svg>
    </>
  )
}

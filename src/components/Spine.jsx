import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { MOUNTAINS } from '../lib/mountainList.js'

// The spine: a thin band across the top of every page that is the record
// itself, August 2019 to now. Each month is a bar as tall as its outings, the
// long layoff is an empty stretch, the streak is orange, and each mountain is a
// mark at the day I was on it. It fills from the left as you read: on the story
// it follows the part on screen, so the fill stands at the year you are reading;
// on any other page it follows the page. On a wide screen it opens on hover or
// focus into a small chart whose parts and mountains can be clicked.
const PARTS = [
  { n: 1, name: 'Before the habit' }, { n: 2, name: 'The comeback' }, { n: 3, name: 'The mountains' },
  { n: 4, name: 'The road' }, { n: 5, name: 'No zero days' },
]
const mk = (y, m) => `${y}-${String(m).padStart(2, '0')}`
const next = (k) => { let [y, m] = k.split('-').map(Number); m += 1; if (m > 12) { y += 1; m = 1 } return mk(y, m) }

export default function Spine() {
  const monthly = useTable('monthly_totals')
  const trips = useTable('mountain_trips')
  const meta = useKeyed('meta', 'key', 'value')
  const life = useKeyed('lifetime_totals', 'metric', 'value')
  const { pathname } = useLocation()
  const go = useNavigate()
  const bar = useRef(null)

  const S = useMemo(() => {
    if (!monthly.length) return null
    const c = Object.fromEntries(monthly.map((r) => [r.month, +r.activities || 0]))
    const keys = Object.keys(c).sort()
    const months = []
    for (let k = keys[0]; k <= keys[keys.length - 1]; k = next(k)) months.push({ k, n: c[k] || 0 })
    const N = months.length
    const top = Math.max(1, ...months.map((m) => m.n))
    // the longest run of empty months is the layoff
    let gap = null, run = null
    months.forEach((m, i) => {
      if (!m.n) { run = run ? { ...run, to: i } : { from: i, to: i } } else run = null
      if (run && (!gap || run.to - run.from > gap.to - gap.from)) gap = { ...run }
    })
    const end = meta.coverage_end || ''
    const streak = +life['Current Streak (Days)'] || 0
    const sFrom = end && streak ? new Date(Date.parse(end) - (streak - 1) * 864e5).toISOString().slice(0, 7) : '9999-99'
    const at = (k) => Math.max(0, months.findIndex((m) => m.k >= k.slice(0, 7)))
    const back = gap ? months[gap.to + 1].k : months[0].k
    const ranges = [[months[0].k, gap ? months[gap.from].k : months[0].k], [back, '2022-12'], ['2023-01', '2023-12'], ['2024-01', '2024-12'], ['2025-01', months[N - 1].k]]
    const marks = MOUNTAINS.map((mt) => {
      const ds = trips.filter((t) => t.mountain === mt.id).map((t) => t.date).sort()
      return ds.length ? { ...mt, i: at(ds[0]), more: ds.slice(1).map(at) } : null
    }).filter(Boolean)
    return { months, N, top, gap, sFrom, at, ranges, marks, years: months.map((m, i) => ({ y: m.k.slice(0, 4), i })).filter((m, i, a) => !i || m.y !== a[i - 1].y) }
  }, [monthly, trips, meta, life])

  // the fill: on the story it is the month of the part on screen, elsewhere how far down the page
  useEffect(() => {
    if (!S) return undefined
    let raf = 0
    const read = () => {
      raf = 0
      const el = bar.current
      if (!el) return
      const vh = window.innerHeight
      let f
      const parts = [...document.querySelectorAll('section.spart[data-from]')]
      if (parts.length) {
        const mid = vh * 0.4
        const cur = parts.filter((p) => p.getBoundingClientRect().top <= mid).pop()
        if (!cur) f = 0
        else {
          const r = cur.getBoundingClientRect()
          const t = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)))
          const a = S.at(cur.dataset.from), b = S.at(cur.dataset.to) + 1
          f = (a + (b - a) * t) / S.N
        }
      } else {
        const d = document.documentElement
        f = Math.min(1, Math.max(0, window.scrollY / Math.max(1, d.scrollHeight - vh)))
      }
      el.style.setProperty('--read', f.toFixed(4))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    const t = setInterval(on, 1500)
    read()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); clearInterval(t); cancelAnimationFrame(raf) }
  }, [S, pathname])

  if (!S) return null
  const pc = (i) => `${((i / S.N) * 100).toFixed(3)}%`
  const toPart = (n) => (e) => {
    e.preventDefault()
    const el = document.getElementById(`part-${n}`)
    if (el && pathname === '/') el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else go(`/?part=${n}`)
  }
  const bars = (cls) => (
    <div className={`spine__bars ${cls}`} aria-hidden="true">
      {S.months.map((m) => (
        <i key={m.k} className={`${m.k >= S.sFrom ? 'is-now' : ''}${m.n ? '' : ' is-empty'}`} style={{ '--hh': `${m.n ? Math.max(8, (m.n / S.top) * 100).toFixed(1) : 0}%` }} />
      ))}
    </div>
  )
  return (
    <nav className="spine" aria-label="The record, 2019 to now" ref={bar}>
      <div className="spine__in">
        <div className="spine__track">
          {bars('is-base')}
          {bars('is-read')}
          {S.gap ? <span className="spine__gap" style={{ left: pc(S.gap.from), width: pc(S.gap.to - S.gap.from + 1) }} aria-hidden="true" /> : null}
          {S.marks.map((m) => (
            <span key={m.id} className="spine__mtn" style={{ left: pc(m.i + 0.5) }}>
              {m.more.map((j, k) => <i key={k} className="spine__again" style={{ left: `calc(${pc(j - m.i)} * 1)` }} aria-hidden="true" />)}
              <a href={`#${m.to}`} onClick={(e) => { e.preventDefault(); go(m.to) }} className="spine__peak"><span>{m.name}</span></a>
            </span>
          ))}
        </div>
        <ol className="spine__parts">
          {S.ranges.map(([a, b], i) => (
            <li key={i} style={{ left: pc(S.at(a)), width: pc(S.at(b) - S.at(a) + 1) }}>
              <a href="#/" onClick={toPart(i + 1)}><b>{a.slice(0, 4)}</b><span>{PARTS[i].name}</span></a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}

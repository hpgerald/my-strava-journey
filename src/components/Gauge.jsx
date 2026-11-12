import { useEffect, useRef, useState } from 'react'

// The gauge at the side of a mountain chapter, in place of the year spine:
// an altitude scale on Kilimanjaro, the clock of the day on Hanang. Each band of
// the chapter says where it stands (data-at on the band: a value, or a from and
// a to that the band runs through as it scrolls). The marker follows the band on
// screen and the ground of the chapter follows the marker. Wide screens only;
// the same values are written in the scenes.
// props: min, max, stops [{ v, label }], fmt (v => text), ground (v => colour or ''),
//   unit (a word under the value)
export default function Gauge({ min, max, stops = [], fmt, ground, unit }) {
  const me = useRef(null)
  const [v, setV] = useState(null)
  useEffect(() => {
    const art = me.current && me.current.closest('.mtn')
    if (!art) return undefined
    let raf = 0
    const read = () => {
      raf = 0
      const mid = window.innerHeight * 0.5
      const bands = [...art.querySelectorAll('[data-at]')]
      const cur = bands.find((b) => { const r = b.getBoundingClientRect(); return r.top <= mid && r.bottom > mid })
      if (!cur) { setV(null); art.style.removeProperty('--ground'); return }
      const at = JSON.parse(cur.dataset.at)
      const r = cur.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)))
      const val = Array.isArray(at) ? at[0] + (at[1] - at[0]) * t : at
      setV(val)
      const g = ground ? ground(val) : ''
      if (g) art.style.setProperty('--ground', g); else art.style.removeProperty('--ground')
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    read()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); art.style.removeProperty('--ground') }
  }, [ground])
  const pos = (x) => `${(100 - ((x - min) / (max - min)) * 100).toFixed(2)}%`
  return (
    <div ref={me} className={`gauge${v == null ? '' : ' is-on'}`} aria-hidden="true">
      {v != null ? (
        <p className="gauge__val">
          <b>{fmt ? fmt(v) : Math.round(v)}</b>{unit ? <small>{unit}</small> : null}
          <span>{(stops.filter((s) => v >= s.v - 1).pop() || stops[0] || {}).label}</span>
        </p>
      ) : null}
      <div className="gauge__scale">
        {stops.map((s) => (
          <span key={s.v} className={`gauge__stop${v != null && v >= s.v ? ' is-past' : ''}`} style={{ top: pos(s.v) }}><i />{s.label}</span>
        ))}
        {v != null ? <span className="gauge__mark" style={{ top: pos(Math.min(max, Math.max(min, v))) }} /> : null}
        <span className="gauge__fill" style={{ height: v == null ? 0 : `${(((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100).toFixed(2)}%` }} />
      </div>
    </div>
  )
}

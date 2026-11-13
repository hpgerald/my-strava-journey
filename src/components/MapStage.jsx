import { useEffect, useRef, useState } from 'react'
import PlaceMap from '../charts/PlaceMap.jsx'
import { useBook } from './BookContext.js'

// The map that filled in: Tanzania holds the screen while the years pass beside
// it, and each region lights up in the year I first went out there. The step on
// screen sets the year; the map keeps every region found up to that year, the
// new ones named. Without room to hold the map (a phone, the book) the map
// shows the whole record and the years read as a list under it.
// props: regions [{ region, first, n }], metrics, nudge, pins
const list = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)

export default function MapStage({ regions, metrics, nudge, pins }) {
  const book = useBook()
  const years = [...new Set(regions.map((r) => Number(r.first.slice(0, 4))))].sort((a, b) => a - b)
  const all = (() => { const y0 = years[0], y1 = years[years.length - 1]; const out = []; for (let y = y0; y <= y1; y++) out.push(y); return out })()
  const [year, setYear] = useState(all[all.length - 1])
  const steps = useRef(null)
  useEffect(() => {
    const box = steps.current
    if (!box || book || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) setYear(Number(e.target.dataset.year)) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    box.querySelectorAll('[data-year]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [book, all.length])
  const shown = regions.filter((r) => Number(r.first.slice(0, 4)) <= year)
  const fresh = regions.filter((r) => Number(r.first.slice(0, 4)) === year).map((r) => r.region)
  const values = Object.fromEntries(shown.map((r) => [r.region, { n: r.n }]))
  return (
    <div className="mstage">
      <div className="mstage__map">
        <p className="mstage__yr" aria-hidden="true"><b>{year}</b><span>{shown.length} of 31 regions</span></p>
        <PlaceMap
          src="data/tz_regions.geojson" nameKey="region" values={values} metrics={[metrics[0]]}
          labels={fresh} nudge={nudge} pins={pins} maxHeight={480}
          aria={`Map of Tanzania with the regions I had gone out in by ${year}: ${shown.map((r) => r.region).join(', ')}.`}
        />
      </div>
      <ol className="mstage__steps" ref={steps}>
        {all.map((y) => {
          const nw = regions.filter((r) => Number(r.first.slice(0, 4)) === y).sort((a, b) => (a.first < b.first ? -1 : 1))
          const upto = regions.filter((r) => Number(r.first.slice(0, 4)) <= y).length
          return (
            <li key={y} data-year={y} className={y === year ? 'is-on' : ''}>
              <p className="mstage__k">{y}</p>
              <p className="mstage__t">
                {nw.length
                  ? <>First time out in {list(nw.map((r) => r.region))}.</>
                  : 'No new region this year.'}
              </p>
              <p className="mstage__s">{upto} of 31 regions {y === all[all.length - 1] ? 'so far' : 'by the end of the year'}.</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

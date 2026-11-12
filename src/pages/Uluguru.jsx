import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Mountain, { Band, Scene, Ledger, BigNumber, Plates } from '../components/Mountain.jsx'
import Plate from '../components/Plate.jsx'
import BondwaClimbs from '../charts/BondwaClimbs.jsx'
import HBars from '../charts/HBars.jsx'
import RouteMap from '../charts/RouteMap.jsx'
import Relief from '../charts/Relief.jsx'
import { useTable } from '../context/DataContext.jsx'
import { buildUluguru, routesOf } from '../lib/mountains.js'

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const fmtMonth = (iso) => `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${fmtMonth(iso)}`
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const r10 = (v) => Math.round(v / 10) * 10

// Uluguru: the mountain I go back to. Every trip to Bondwa Peak drawn over the
// last, led by the wet day in March 2025 that holds my biggest climb in one outing.
export default function Uluguru() {
  const tripRows = useTable('mountain_trips')
  const profileRows = useTable('bondwa_profiles')
  const routeRows = useTable('mountain_routes')
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const geo = useMemo(() => Object.fromEntries(activityGeo.map((g) => [g.activity_key, g])), [activityGeo])
  const U = useMemo(() => buildUluguru(tripRows, profileRows, activities, geo), [tripRows, profileRows, activities, geo])
  const routes = useMemo(() => routesOf(routeRows, 'uluguru'), [routeRows])

  if (!U || !Object.keys(routes).length) return <Mountain id="uluguru" standfirst="" />
  const { trips, best } = U
  const first = trips[0]
  const later = trips.slice(1)
  // the trips before Kilimanjaro, March 2023, were training for it
  const training = trips.filter((t) => t.date < '2023-03-06').length
  const times = WORD[trips.length] || String(trips.length)
  // Bondwa Peak on the map: the highest point of the featured trip is the southern end of its line
  const bestLine = routes[best.trip]
  const peak = bestLine.reduce((b, p) => (p[0] < b[0] ? p : b), bestLine[0])
  const lines = trips.map((t) => ({ key: t.trip, pts: routes[t.trip], tone: t.trip === best.trip ? 'main' : t.trip === first.trip ? 'faint' : 'back' }))
  const marks = [
    { at: routes[first.trip][0], label: 'Morogoro', sub: `${n0(first.startAlt)} m`, kind: 'start' },
    { at: bestLine[0], label: 'The trailhead', sub: `${n0(best.startAlt)} m`, kind: 'hut' },
    { at: peak, label: 'Bondwa Peak', sub: `${n0(best.hi)} m on my watch`, kind: 'top' },
  ]
  const wet = best.sky === 'Rain'
  // did the day drop more than 100 m on the way to its highest point?
  const hiAt = best.profile.findIndex((q) => q.alt === best.hi)
  let run = 0
  const dip = best.profile.slice(0, hiAt).some((q) => { run = Math.max(run, q.alt); return run - q.alt > 100 })

  return (
    <Mountain
      id="uluguru"
      relief={<Relief lines={trips.map((t) => { const d = t.profile[t.profile.length - 1].d || 1; return t.profile.map((p) => ({ x: p.d / d, alt: p.alt })) })} />}
      hero="uluguru-hero"
      standfirst={<>A mountain you can reach becomes a habit of its own. Bondwa Peak stands above Morogoro, in the Uluguru Mountains, and I have been up {times} times.</>}
      facts={[
        { label: 'trips to Bondwa Peak', value: String(trips.length) },
        { label: `climbed on ${fmtDay(best.date)}`, value: n0(best.climb), unit: 'm' },
        { label: 'climbed in Morogoro, all outings', value: n0(U.climb), unit: 'm' },
        { label: 'of all the climbing in my record', value: `${Math.round(U.share * 100)}%` },
      ]}
    >
      <Band>
        <Scene
          label={`${cap(times)} times up`}
          title="First for training, then for camping."
          figTitle="Every trip to Bondwa Peak, altitude against distance"
          fig={<BondwaClimbs trips={trips} feature={best.trip}
            aria={`Altitude along each trip to Bondwa Peak: ${trips.map((t) => `${fmtMonth(t.date)}, from ${n0(t.startAlt)} m to ${n0(t.hi)} m over ${k1(t.km)} km`).join('; ')}.`} />}
          note={`Each line is one trip, marked with its year. Orange is ${fmtMonth(best.date)}.`}
          foot={<Ledger rows={trips.map((t) => ({
            k: fmtMonth(t.date),
            v: `${n0(t.climb)} m up · ${k1(t.km)} km`,
            sub: `${hm(t.out)} from start to finish${t.sky ? ` · ${t.sky.toLowerCase()}${t.temp != null ? `, ${Math.round(t.temp)}°` : ''}` : ''}`,
          }))} />}
        >
          {training > 1 ? <p>The first {WORD[training] || training} trips were training for Kilimanjaro. On the first, in {fmtMonth(first.date)}, I started down in the town at {n0(first.startAlt)} m and climbed {n0(first.climb)} m.</p>
            : <p>The first time, in {fmtMonth(first.date)}, I started down in the town at {n0(first.startAlt)} m and climbed {n0(first.climb)} m.</p>}
          <p>After Kilimanjaro I go for the camping. With friends I camp at Morningside, go up to the peak, come back to camp, and leave for town the next day. We take it easy now.</p>
          {later.length ? <p>The later trips start higher, near {n0(r10(later.reduce((s, t) => s + t.startAlt, 0) / later.length))} m, and top out at about {n0(r10(later.reduce((s, t) => s + t.hi, 0) / later.length))} m.</p> : null}
        </Scene>
      </Band>

      <Band>
        <Plates>
          <Plate slot="uluguru-forest" caption="The way up to Bondwa Peak" />
          <Plate slot="uluguru-top" caption={`Bondwa Peak · ${n0(best.hi)} m on my watch`} />
        </Plates>
      </Band>

      <Band night>
        <Scene label={fmtDay(best.date)} title={wet ? 'My biggest climb came in the rain.' : 'My biggest climb.'}>
          <p>{wet ? `It rained hard that day, the air was at ${n0(best.humidity)}% humidity and everything was slippery. The scenery was beautiful all the same. ` : ''}{dip ? 'The path went up, came down and went up again: ' : 'The day was '}{k1(best.km)} km in {hm(best.out)} from start to finish.</p>
        </Scene>
        <BigNumber value={n0(best.climb)} unit="m">{U.bestIsRecord ? 'The most I have climbed in one outing.' : 'Climbed in one outing.'}</BigNumber>
        <Plate slot="uluguru-rain" ratio="16 / 9" caption={`Bondwa Peak · ${fmtDay(best.date)}`} />
      </Band>

      <Band>
        <Scene
          label="The lines on the mountain"
          title="From the town to the top."
          figTitle="Every trip to Bondwa Peak, as my watch drew it"
          fig={<RouteMap lines={lines} marks={marks} ratio={0.8}
            aria={`The GPS lines of ${times} trips to Bondwa Peak in the Uluguru Mountains. The first, in ${fmtMonth(first.date)}, starts in Morogoro at ${n0(first.startAlt)} m. The others start at a trailhead near ${n0(best.startAlt)} m and reach the peak.`} />}
          note={`Orange is ${fmtMonth(best.date)}. The faint line is ${fmtMonth(first.date)}, from the town, with its first 500 m left off. Black are the other trips.`}
          foot={<>
            <HBars
              aria={`The biggest climbs in Morogoro: ${U.climbs.map((c) => `${fmtDay(c.date)}, ${n0(c.climb)} m`).join('; ')}.`}
              rows={U.climbs.map((c) => ({ key: c.key === best.key ? 'trail' : 'walk', label: fmtDay(c.date), sub: `${k1(c.km)} km`, value: c.climb, display: `${n0(c.climb)} m` }))}
            />
            <p className="mtn-scene__more"><Link to="/records">All my climbing records →</Link></p>
          </>}
        >
          <p>Morogoro has given me {n0(U.n)} outings on foot, {n0(U.km)} km and {n0(U.climb)} m of climbing. {cap(WORD[U.inTop20] || String(U.inTop20))} of my twenty biggest climbs are here.</p>
        </Scene>
        <Plate slot="uluguru-people" ratio="21 / 9" caption="On the way to Bondwa Peak" />
      </Band>
    </Mountain>
  )
}

import { useMemo } from 'react'
import Mountain, { Band, Scene, Ledger, BigNumber, Saying, Plates } from '../components/Mountain.jsx'
import Plate from '../components/Plate.jsx'
import HanangDay from '../charts/HanangDay.jsx'
import HBars from '../charts/HBars.jsx'
import RouteMap from '../charts/RouteMap.jsx'
import { useTable } from '../context/DataContext.jsx'
import { buildHN, routesOf, tripsOf } from '../lib/mountains.js'
import { MODE_NAME } from '../lib/footReport.js'

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const clock = (start, min) => { const t = parseInt(start.slice(11, 13), 10) * 60 + parseInt(start.slice(14, 16), 10) + min; const h = Math.floor(t / 60) % 24, m = Math.round(t % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }

// Hanang: the long day. One hike told by the clock, from before sunrise to
// after midnight, and the two races that brought me back.
export default function Hanang() {
  const hnRows = useTable('hanang_2023')
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const routeRows = useTable('mountain_routes')
  const tripRows = useTable('mountain_trips')
  const geo = useMemo(() => Object.fromEntries(activityGeo.map((g) => [g.activity_key, g])), [activityGeo])
  const HN = useMemo(() => buildHN(hnRows, activities, geo), [hnRows, activities, geo])
  const routes = useMemo(() => routesOf(routeRows, 'hanang'), [routeRows])
  const trips = useMemo(() => tripsOf(tripRows, activities, 'hanang'), [tripRows, activities])

  if (!HN || !routes['hike-2023'] || !trips.length) return <Mountain id="hanang" standfirst="" />
  const hike = routes['hike-2023']
  // the top on the map: the point of the line furthest from the start
  const far = (p) => (p[0] - hike[0][0]) ** 2 + (p[1] - hike[0][1]) ** 2
  const top = hike.reduce((b, p) => (far(p) > far(b) ? p : b), hike[0])
  const races = trips.filter((t) => t.trip !== 'hike-2023')
  const lines = [
    ...races.map((t, i) => ({ key: t.trip, pts: routes[t.trip], tone: i ? 'back' : 'faint' })),
    { key: 'hike-2023', pts: hike, tone: 'main' },
  ]
  const marks = [
    { at: hike[0], label: 'The start', sub: `${n0(HN.pts[0].alt)} m`, kind: 'start', side: 'l' },
    { at: top, label: 'The top', sub: `${n0(HN.top.alt)} m on my watch`, kind: 'top' },
  ]
  const rows = trips.map((t) => ({ key: t.trip === 'hike-2023' ? 'trail' : 'walk', label: fmtDay(t.date), sub: `${k1(t.km)} km · ${n0(t.climb)} m up`, value: t.out, display: hm(t.out) }))

  return (
    <Mountain
      id="hanang"
      hero="hanang-hero"
      standfirst={<>A mountain does not care about the clock. On Mount Hanang in Manyara I set out before six in the morning, reached the top in the late afternoon and was back down after two the next morning.</>}
      facts={[
        { label: 'from the start to the finish', value: k1(HN.out / 60), unit: 'h' },
        { label: 'climbed', value: n0(HN.climb), unit: 'm' },
        { label: 'up and back down', value: k1(HN.km), unit: 'km' },
        { label: 'of it counted as moving', value: k1(HN.moving / 60), unit: 'h' },
      ]}
    >
      <Band>
        <Scene
          label={fmtDay(HN.date)}
          title="The day, hour by hour."
          figTitle="Altitude against the clock"
          fig={<HanangDay points={HN.pts} start={HN.start}
            aria={`Altitude of the Mount Hanang hike against the time of day: from ${n0(HN.pts[0].alt)} m at the start to ${n0(HN.top.alt)} m at the top after ${hm(HN.upMin)}, then ${hm(HN.downMin)} back down to ${n0(HN.pts[HN.pts.length - 1].alt)} m.`} />}
          note="The orange line is the way up and the black line the way down. The brackets give the hours each took, and the dotted line marks midnight."
          read="The hike against the clock, from the early-morning start to the finish after midnight. The orange line is the way up and the black line the way down, and the brackets above give the hours each took. The dotted line marks midnight."
          lesson
          foot={<Ledger rows={[
            { k: HN.start.slice(11, 16), v: 'The start', sub: `${n0(HN.pts[0].alt)} m` },
            { k: clock(HN.start, HN.top.t), v: 'The top', sub: `${n0(HN.top.alt)} m on my watch` },
            { k: '21:00', v: 'Still coming down', sub: `${n0(Math.round(HN.at9 / 10) * 10)} m` },
            { k: '00:00', v: 'Midnight', sub: `${n0(Math.round(HN.atMid / 10) * 10)} m` },
            { k: clock(HN.start, HN.pts[HN.pts.length - 1].t), v: 'Back down', sub: `${n0(HN.pts[HN.pts.length - 1].alt)} m` },
          ]} />}
        >
          <p>The top came slowly. The last 300 m took {hm(HN.lastUp)}, about a third of the whole way up. I kept going one step at a time.</p>
          <p>I stood on the top at {clock(HN.start, HN.top.t)}, {hm(HN.upMin)} after the start.</p>
        </Scene>
      </Band>

      <Band>
        <Plates>
          <Plate slot="hanang-dawn" caption={`The start · ${HN.start.slice(11, 16)}`} />
          <Plate slot="hanang-top" caption={`The top · ${n0(HN.top.alt)} m on my watch`} />
        </Plates>
      </Band>

      <Band night>
        <Scene label="After dark" title="Most of the way down came at night.">
          <p>The way down took almost as long as the way up. At nine in the evening I was still at {n0(Math.round(HN.at9 / 10) * 10)} m, and at midnight I was at {n0(Math.round(HN.atMid / 10) * 10)} m.</p>
        </Scene>
        <BigNumber value={k1(HN.out / 60)} unit="hours">{HN.first ? 'The longest day out on foot in my whole record.' : 'From the start to the finish.'}</BigNumber>
        <Plate slot="hanang-night" ratio="16 / 9" caption="The way down, after dark" />
        <Saying sw="Subira huvuta heri">, patience brings good things. That day on Hanang was mostly patience.</Saying>
      </Band>

      {HN.longest && HN.longest.length > 1 ? (
        <Band>
          <Scene
            label="Against my other days"
            title={HN.first ? 'No day out has been longer.' : 'Among my longest days.'}
            figTitle="My longest days out on foot, from the start to the finish"
            fig={<HBars
              aria={`The longest outings on foot by time from start to finish: ${HN.longest.map((r) => `${fmtDay(r.date)}, ${hm(r.out)}`).join('; ')}.`}
              rows={HN.longest.map((r) => ({ key: r.mode, label: fmtDay(r.date), sub: `${MODE_NAME[r.mode].toLowerCase()} · ${k1(r.km)} km · ${n0(r.elev)} m up${r.region ? ` · ${r.region}` : ''}`, value: r.out, display: `${(r.out / 60).toFixed(1)} h` }))}
            />}
            note="Time is counted from the start to the finish, stops included."
            read="My five longest outings on foot, counted from the start to the finish, stops included. The line under each date gives the kind of outing, the distance, the climb and the region."
          >
            <p>{HN.first ? `The day after it in the list took ${hm(HN.longest[1].out)}, ${hm(HN.out - HN.longest[1].out)} less.` : `The longest took ${hm(HN.longest[0].out)}.`}</p>
          </Scene>
        </Band>
      ) : null}

      <Band>
        <Scene
          label="The line on the mountain"
          title="Hanang called me back."
          figTitle="Three days on Hanang"
          fig={<RouteMap lines={lines} marks={marks} ratio={0.6}
            aria={`The GPS lines of three days on Mount Hanang. The hike of ${fmtDay(HN.date)} goes from the start at ${n0(HN.pts[0].alt)} m to the top at ${n0(HN.top.alt)} m and back. The adventure races of ${races.map((t) => t.date.slice(0, 4)).join(' and ')} keep to the lower slopes.`} />}
          note={`Orange is the hike to the top. Grey and black are the adventure races of ${races.map((t) => t.date.slice(0, 4)).join(' and ')}.`}
          foot={<HBars
            aria={`Time from start to finish on each day on Hanang: ${trips.map((t) => `${fmtDay(t.date)}, ${hm(t.out)}`).join('; ')}.`}
            rows={rows}
          />}
        >
          {races.length ? <p>I returned for the adventure race in {races.map((t) => t.date.slice(0, 4)).join(' and ')}. The races keep to the lower slopes, so those days were shorter.</p> : null}
        </Scene>
        <Plate slot="hanang-race" ratio="21 / 9" caption="The Mount Hanang adventure race" />
      </Band>
    </Mountain>
  )
}

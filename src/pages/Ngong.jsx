import { useMemo } from 'react'
import Mountain, { Band, Scene, Ledger, BigNumber, Saying, Plates } from '../components/Mountain.jsx'
import Plate from '../components/Plate.jsx'
import RidgeProfile from '../charts/RidgeProfile.jsx'
import HBars from '../charts/HBars.jsx'
import RouteMap from '../charts/RouteMap.jsx'
import Relief from '../charts/Relief.jsx'
import { useTable } from '../context/DataContext.jsx'
import { buildNgong, routesOf, altAlong } from '../lib/mountains.js'

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const fmtMonth = (iso) => `${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${fmtMonth(iso)}`
const clock = (start, min) => { const t = parseInt(start.slice(0, 2), 10) * 60 + parseInt(start.slice(3, 5), 10) + min; const h = Math.floor(t / 60) % 24, m = Math.round(t % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
const SPORT = { TrailRun: 'a trail run', Hike: 'a hike', Walk: 'a walk', Run: 'a run' }

// Ngong Hills: the ridge across the border. One outing in Kenya, out along the
// tops and back, and the biggest climb I have done outside Tanzania.
export default function Ngong() {
  const tripRows = useTable('mountain_trips')
  const profileRows = useTable('ngong_profile')
  const routeRows = useTable('mountain_routes')
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')
  const geo = useMemo(() => Object.fromEntries(activityGeo.map((g) => [g.activity_key, g])), [activityGeo])
  const N = useMemo(() => buildNgong(tripRows, profileRows, activities, geo), [tripRows, profileRows, activities, geo])
  const routes = useMemo(() => routesOf(routeRows, 'ngong'), [routeRows])

  if (!N || !routes[N.trip.trip]) return <Mountain id="ngong" standfirst="" />
  const { trip: T, start, turn, end, level } = N
  const line = routes[T.trip]
  // the far end on the map: the point of the line furthest from the start
  const far = (p) => (p[0] - line[0][0]) ** 2 + (p[1] - line[0][1]) ** 2
  const top = line.reduce((b, p) => (far(p) > far(b) ? p : b), line[0])
  const lines = [{ key: T.trip, pts: line, tone: 'main', alt: altAlong(N.pts.map((p) => ({ x: p.d / N.end.d, alt: p.alt }))) || undefined }]
  const marks = [
    { at: line[0], label: 'The start', sub: `${n0(start.alt)} m`, kind: 'start', side: 'l' },
    { at: top, label: 'The far end', sub: `${n0(turn.alt)} m on my watch`, kind: 'top' },
    { at: line[line.length - 1], label: 'The finish', sub: `${n0(end.alt)} m`, kind: 'open' },
  ]
  const next = N.abroadNext
  const mapAria = `The GPS line of ${fmtDay(T.date)} on the Ngong Hills in Kenya: from the start at ${n0(start.alt)} m along the ridge to the far end at ${n0(turn.alt)} m, back the same way, and on to the finish at ${n0(end.alt)} m.`
  const mapNote = 'The line goes out along the ridge and comes back on itself, then carries on past the start to the finish.'

  return (
    <Mountain
      id="ngong"
      relief={<Relief lines={[N.pts.map((p) => ({ x: p.d / N.end.d, alt: p.alt }))]} />}
      hero="ngong-hero"
      standfirst={<>I went to the Ngong Hills for one memorable day, and I did not get all of it. In {fmtMonth(T.date)} I was in Nairobi with a friend, and I wanted to walk the whole ridge, from Ngong town to Kiserian. Time ran short, so we turned at the highest point and came back.</>}
      facts={[
        { label: 'along the ridge and back', value: k1(T.km), unit: 'km' },
        { label: 'climbed', value: n0(T.climb), unit: 'm' },
        { label: 'the highest point, on my watch', value: n0(N.hi), unit: 'm' },
        { label: 'from the start to the finish', value: hm(T.out) },
      ]}
    >
      <Band>
        <Scene
          label={fmtDay(T.date)}
          title="Up and down, all the way."
          figTitle="Altitude along the ridge"
          fig={<RidgeProfile pts={N.pts} turnI={N.turnI} level={level}
            aria={`Altitude along the Ngong Hills ridge against distance: from ${n0(start.alt)} m at the start, over several tops, to ${n0(turn.alt)} m at the far end after ${k1(turn.d)} km, back over the same tops, and down to ${n0(end.alt)} m at the finish after ${k1(end.d)} km.`} />}
          note="Out is orange and back is black. The dotted line is where I started."
          foot={<Ledger rows={[
            { k: T.start, v: 'The start', sub: `${n0(start.alt)} m${T.sky ? ` · ${T.sky.toLowerCase()}${T.temp != null ? `, ${Math.round(T.temp)}°` : ''}` : ''}` },
            { k: clock(T.start, turn.t), v: 'The far end', sub: `${n0(turn.alt)} m on my watch · ${k1(turn.d)} km` },
            ...(level ? [{ k: clock(T.start, level.t), v: 'Level with the start again', sub: `${k1(level.d)} km` }] : []),
            { k: clock(T.start, end.t), v: 'The finish', sub: `${n0(end.alt)} m · ${k1(end.d)} km` },
          ]} />}
        >
          <p>A ridge keeps going up and down. Every top was followed by a drop, and then by the next top. The far end was the highest, {n0(turn.alt - start.alt)} m above where I started.</p>
          <p>We turned there, came back over the same tops and kept going down to Ngong town.{end.alt < start.alt ? ` The finish was ${n0(start.alt - end.alt)} m lower than the start, so the last part was all downhill.` : ''}</p>
        </Scene>
      </Band>

      <Band>
        <Plates>
          <Plate slot="ngong-ridge" caption="The ridge" />
          <Plate slot="ngong-top" caption={`The far end · ${n0(turn.alt)} m on my watch`} />
        </Plates>
      </Band>

      <Band night>
        <BigNumber value={n0(T.climb)} unit="m">
          {N.abroadTop && next ? `The most I have climbed in one outing outside Tanzania, ${k1(T.climb / next.climb)} times the next, ${SPORT[next.sport] || 'an outing'} in ${next.country}.` : 'Climbed along the ridge.'}
        </BigNumber>
        <Saying sw="Milima haikutani, binadamu hukutana">, mountains do not meet, but people do. On the ridge my friend gave the day a name, the Ngong wisdom: you do not always get what you wanted.</Saying>
      </Band>

      <Band>
        <Scene
          label="The line on the ridge"
          title="Out, back, and on."
          figTitle="The Ngong Hills, as my watch drew them"
          fig={<RouteMap lines={lines} marks={marks} ratio={0.68} aria={mapAria} />}
          note={mapNote}
          foot={<HBars
            aria={`The biggest climb on foot in one outing, in each country: ${N.countries.map((c) => `${c.country}, ${n0(c.climb)} m`).join('; ')}.`}
            rows={N.countries.map((c) => ({ key: c.country === 'Kenya' ? 'trail' : 'walk', label: c.country, sub: `${fmtMonth(c.date)} · ${k1(c.km)} km`, value: c.climb, display: `${n0(c.climb)} m` }))}
          />}
        >
          <p>My climbing is at home. Outside Tanzania my outings have been flatter, and this day stands far above the rest of them.</p>
          {N.before > 0 ? <p>Before this day the most I had climbed in Kenya was {n0(N.before)} m.</p> : null}
          {N.rank ? <p>In the whole record this day ranks {N.rank === 1 ? 'first' : `number ${N.rank}`} for climbing in one outing.</p> : null}
        </Scene>
      </Band>
    </Mountain>
  )
}

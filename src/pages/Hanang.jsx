import { useMemo } from 'react'
import Mountain, { Band, Scene, Ledger, BigNumber, Saying, Plates } from '../components/Mountain.jsx'
import Plate from '../components/Plate.jsx'
import HanangDay from '../charts/HanangDay.jsx'
import HBars from '../charts/HBars.jsx'
import RouteMap from '../charts/RouteMap.jsx'
import Relief from '../charts/Relief.jsx'
import { useTable } from '../context/DataContext.jsx'
import { buildHN, routesOf, tripsOf, altAlong } from '../lib/mountains.js'
import { MODE_NAME } from '../lib/footReport.js'

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const clock = (start, min) => { const t = parseInt(start.slice(11, 13), 10) * 60 + parseInt(start.slice(14, 16), 10) + min; const h = Math.floor(t / 60) % 24, m = Math.round(t % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }

// minutes from the start to a clock time on the same day (or past midnight)
const minAt = (start, hhmm) => { const s0 = parseInt(start.slice(11, 13), 10) * 60 + parseInt(start.slice(14, 16), 10); const [h, m] = hhmm.split(':').map(Number); return h * 60 + m - s0 }
// the ground follows the sun: pale at dawn, warm through the afternoon, deepest at dusk
const hanangGround = (start, v) => {
  const h = ((parseInt(start.slice(11, 13), 10) * 60 + parseInt(start.slice(14, 16), 10) + v) / 60) % 24
  const sun = h < 6 || h >= 19.5 ? 0.15 : h < 12 ? 0.2 + 0.4 * ((h - 6) / 6) : h < 17 ? 0.6 + 0.2 * ((h - 12) / 5) : 0.8 + 0.2 * ((h - 17) / 2.5)
  const t = sun * 0.42
  const mix = (a, b) => Math.round(a + (b - a) * t)
  return `rgb(${mix(242, 233)}, ${mix(240, 201)}, ${mix(235, 152)})`
}

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
    { key: 'hike-2023', pts: hike, tone: 'main', by: 'index', alt: altAlong(HN.pts.map((p) => ({ x: p.t / HN.pts[HN.pts.length - 1].t, alt: p.alt }))) || undefined },
  ]
  const marks = [
    { at: hike[0], label: 'The start', sub: `${n0(HN.pts[0].alt)} m`, kind: 'start', side: 'l' },
    { at: top, label: 'The top', sub: `${n0(HN.top.alt)} m on my watch`, kind: 'top' },
  ]
  const rows = trips.map((t) => ({ key: t.trip === 'hike-2023' ? 'trail' : 'walk', label: fmtDay(t.date), sub: `${k1(t.km)} km · ${n0(t.climb)} m up`, value: t.out, display: hm(t.out) }))

  return (
    <Mountain
      id="hanang"
      relief={<Relief lines={[HN.pts.map((p) => ({ x: p.t / HN.pts[HN.pts.length - 1].t, alt: p.alt }))]} />}
      gauge={{
        min: 0, max: HN.pts[HN.pts.length - 1].t, unit: 'on the clock',
        stops: [
          { v: 0, label: 'The start' }, { v: HN.top.t, label: 'The top' },
          { v: minAt(HN.start, '21:00'), label: 'Still coming down' }, { v: minAt(HN.start, '24:00'), label: 'Midnight' },
          { v: HN.pts[HN.pts.length - 1].t, label: 'Back down' },
        ],
        fmt: (v) => clock(HN.start, v),
        ground: (v) => hanangGround(HN.start, v),
      }}
      hero="hanang-hero"
      standfirst={<>Coming down can take as long as going up. On Mount Hanang in Manyara I set out before six in the morning and was not back down until after two the next morning.</>}
      facts={[
        { label: 'from the start to the finish', value: k1(HN.out / 60), unit: 'h' },
        { label: 'climbed', value: n0(HN.climb), unit: 'm' },
        { label: 'up and back down', value: k1(HN.km), unit: 'km' },
        { label: 'of it counted as moving', value: k1(HN.moving / 60), unit: 'h' },
      ]}
    >
      <Band at={[0, HN.top.t]}>
        <Scene
          label={fmtDay(HN.date)}
          title="The top came slowly."
          figTitle="Altitude against the clock"
          fig={<HanangDay points={HN.pts} start={HN.start}
            aria={`Altitude of the Mount Hanang hike against the time of day: from ${n0(HN.pts[0].alt)} m at the start to ${n0(HN.top.alt)} m at the top after ${hm(HN.upMin)}, then ${hm(HN.downMin)} back down to ${n0(HN.pts[HN.pts.length - 1].alt)} m.`} />}
          note="Up is orange and down is black, and the two fill almost the same stretch of the day."
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
          <p>The last 300 m of height took {hm(HN.lastUp)}, about a third of my time on the way up. I was with a friend who was very tired, so we took it easy. It was raining hard, the path up there had no marks and we had no guide, so for a while we were lost.</p>
          <p>We stood on the top at {clock(HN.start, HN.top.t)}, {hm(HN.upMin)} after the start.</p>
        </Scene>
      </Band>

      <Band at={[HN.top.t, minAt(HN.start, '19:00')]}>
        <Plates>
          <Plate slot="hanang-dawn" caption={`The start · ${HN.start.slice(11, 16)}`} />
          <Plate slot="hanang-top" caption={`The top · ${n0(HN.top.alt)} m on my watch`} />
        </Plates>
      </Band>

      <Band night at={[minAt(HN.start, '19:00'), HN.pts[HN.pts.length - 1].t]}>
        <Scene label="After dark" title="Most of the way down came at night.">
          <p>Coming down took {hm(HN.downMin)}, only {hm(HN.upMin - HN.downMin)} less than going up. At nine in the evening I was still at {n0(Math.round(HN.at9 / 10) * 10)} m, and at midnight at {n0(Math.round(HN.atMid / 10) * 10)} m.</p>
          <p>The rain did not stop. Halfway down we waited for other friends to reach us, so we could all go down together. I had no lamp of my own, so I used a friend’s torch first and then the torch on my phone.</p>
        </Scene>
        <BigNumber value={k1(HN.out / 60)} unit="hours">On my feet, stops included.</BigNumber>
        <Plate slot="hanang-night" ratio="16 / 9" caption="The way down, after dark" />
        <Saying sw="Subira huvuta heri">, patience brings good things.</Saying>
      </Band>

      {HN.longest && HN.longest.length > 1 ? (
        <Band>
          <Scene
            label="Against my other days"
            title={HN.first ? 'No other day in my log is this long.' : 'Among my longest days.'}
            figTitle="My longest days out on foot, from the start to the finish"
            fig={<HBars
              aria={`The longest outings on foot by time from start to finish: ${HN.longest.map((r) => `${fmtDay(r.date)}, ${hm(r.out)}`).join('; ')}.`}
              rows={HN.longest.map((r) => ({ key: r.mode, label: fmtDay(r.date), sub: `${MODE_NAME[r.mode].toLowerCase()} · ${k1(r.km)} km · ${n0(r.elev)} m up${r.region ? ` · ${r.region}` : ''}`, value: r.out, display: `${(r.out / 60).toFixed(1)} h` }))}
            />}
            read="My five longest outings on foot, counted from the start to the finish, stops included. The line under each date gives the kind of outing, the distance, the climb and the region."
          >
            <p>{HN.first
              ? (HN.longest[1].region === 'Kilimanjaro' && HN.longest[1].date.slice(0, 4) === HN.date.slice(0, 4)
                ? `The next longest is my summit night on Kilimanjaro, in March of the same year. It was ${hm(HN.out - HN.longest[1].out)} shorter.`
                : `The next longest was ${hm(HN.out - HN.longest[1].out)} shorter.`)
              : `The longest took ${hm(HN.longest[0].out)}.`}</p>
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
          note="The hike to the top is orange. The races stay on the lower half of the mountain."
          foot={<HBars
            aria={`Time from start to finish on each day on Hanang: ${trips.map((t) => `${fmtDay(t.date)}, ${hm(t.out)}`).join('; ')}.`}
            rows={rows}
          />}
        >
          {races.length ? <>
            <p>The forest reserve on Hanang runs an adventure race, and I went back for it in {races.map((t) => t.date.slice(0, 4)).join(' and ')}. It goes about halfway up and then turns to a place called Little Ngorongoro, shaped like a crater. There is camping too, and for me it is time away from the busy city. After the race in 2026 I walked all the way down to the bus stand.</p>
          </> : null}
        </Scene>
        <Plate slot="hanang-race" ratio="21 / 9" caption="The Mount Hanang adventure race" />
      </Band>
    </Mountain>
  )
}

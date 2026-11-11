import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Mountain, { Band, Scene, Ledger, BigNumber, Saying, Plates } from '../components/Mountain.jsx'
import Plate from '../components/Plate.jsx'
import KiliClimb from '../charts/KiliClimb.jsx'
import HBars from '../charts/HBars.jsx'
import RouteMap from '../charts/RouteMap.jsx'
import { useTable } from '../context/DataContext.jsx'
import { buildKX, routesOf, tripsOf, KX_TOP, KX_RIM, UHURU } from '../lib/mountains.js'

const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const KX_DAY = ['Day 1', 'Day 2', 'Day 3', 'Summit night']

// Kilimanjaro: the roof. The chapter climbs with the route, from Marangu Gate
// to the huts and into the summit night, where the ground goes dark.
export default function Kilimanjaro() {
  const kxStages = useTable('kili_expedition')
  const kxProfile = useTable('kili_expedition_profile')
  const routeRows = useTable('mountain_routes')
  const tripRows = useTable('mountain_trips')
  const halfRows = useTable('kili_half_parts')
  const halfDays = useTable('kili_half')
  const activities = useTable('activities')
  const activityGeo = useTable('activity_geo')

  const KX = useMemo(() => buildKX(kxStages, kxProfile), [kxStages, kxProfile])
  const routes = useMemo(() => routesOf(routeRows, 'kilimanjaro'), [routeRows])
  const stages = useMemo(() => tripsOf(tripRows, activities, 'kilimanjaro'), [tripRows, activities])
  const half = useMemo(() => halfRows.map((r) => ({ year: r.year, min: +r.course_min })).sort((a, b) => a.year - b.year), [halfRows])
  // a walk back up the mountain in the days after a Half
  const back = useMemo(() => {
    if (!activities.length || !activityGeo.length || !halfDays.length) return null
    const geo = Object.fromEntries(activityGeo.map((g) => [g.activity_key, g]))
    const day = (iso) => Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000
    for (const h of [...halfDays].sort((p, q) => (p.date < q.date ? 1 : -1))) {
      const a = activities.find((r) => { const d = day(r.date) - day(h.date); return d >= 1 && d <= 3 && (geo[r.activity_key] || {}).region === 'Kilimanjaro' && +r.elevation_gain_m >= 600 })
      if (a) return { year: a.date.slice(0, 4), days: day(a.date) - day(h.date), km: +a.distance_km, climb: +a.elevation_gain_m }
    }
    return null
  }, [activities, activityGeo, halfDays])

  if (!KX || !routes['stage-1']) return <Mountain id="kilimanjaro" standfirst="" />
  const s = KX.s
  const last = routes['stage-4'][routes['stage-4'].length - 1]
  const lines = [
    ...['stage-1', 'stage-2', 'stage-3', 'stage-4'].map((k) => ({ key: k, pts: routes[k], tone: 'main' })),
    { key: 'missed', pts: [last, UHURU], tone: 'faint', dashed: true },
  ]
  const marks = [
    { at: routes['stage-1'][0], label: 'Marangu Gate', sub: `${n0(s[0].start)} m`, kind: 'start' },
    { at: routes['stage-2'][0], label: 'Mandara Hut', sub: `${n0(s[0].end)} m`, kind: 'hut', dy: -18 },
    { at: routes['stage-3'][0], label: 'Horombo Hut', sub: `${n0(s[1].end)} m`, kind: 'hut', dy: -18 },
    { at: routes['stage-4'][0], label: 'Kibo Hut', sub: `${n0(s[2].end)} m`, kind: 'hut', dy: 20 },
    { at: last, label: 'The watch stopped', sub: `${n0(s[3].high)} m`, kind: 'open', dy: -22, quiet: true },
    { at: UHURU, label: 'Uhuru Peak', sub: `${n0(KX_TOP)} m`, kind: 'top', side: 'l' },
  ]
  const temp = stages.filter((t) => t.temp != null)
  const faster = half.length > 1 && half.every((h, i) => !i || h.min < half[i - 1].min)
  const three = s[0].dist + s[1].dist + s[2].dist

  return (
    <Mountain
      id="kilimanjaro"
      hero="kili-hero"
      standfirst={<>The mountain is climbed one hut at a time. In March 2023 I went up the Marangu route and reached Uhuru Peak, {n0(KX_TOP)} m, on my first try.</>}
      facts={[
        { label: 'climbed in four days', value: n0(KX.climb), unit: 'm' },
        { label: 'on foot, up and back to Horombo', value: k1(KX.km), unit: 'km' },
        { label: 'from the gate to the summit', value: n0(KX_TOP - s[0].start), unit: 'm' },
        { label: 'huts on the way up', value: '3' },
      ]}
    >
      <Band>
        <Scene
          label="The way up"
          title="Three days to Kibo Hut."
          figTitle="The Marangu route, as my watch drew it"
          fig={<RouteMap lines={lines} marks={marks} ratio={0.74}
            aria={`The Marangu route from Marangu Gate at ${n0(s[0].start)} m past Mandara Hut, Horombo Hut and Kibo Hut at ${n0(s[2].end)} m. The recorded line ends at ${n0(s[3].high)} m on the summit night; Uhuru Peak, ${n0(KX_TOP)} m, is marked beyond it.`} />}
          note="The orange line is the GPS track of the four stages. The dotted line is the part of the summit night my watch did not record."
          foot={<Ledger rows={s.slice(0, 4).map((x, i) => ({
            k: KX_DAY[i],
            v: i < 3 ? `${x.from} to ${x.to}` : 'Kibo Hut towards the top',
            sub: `${i < 3 ? `${k1(x.dist)} km · ${hm(x.elapsed)}` : `${k1(x.km)} km recorded`}${stages[i] && stages[i].temp != null ? ` · ${Math.round(stages[i].temp)}° at the start` : ''}`,
          }))} />}
        >
          <p>From the gate at {n0(s[0].start)} m to Kibo Hut at {n0(s[2].end)} m took three days and {k1(three)} km, and every night was spent higher than the night before.</p>
          {temp.length === 4 ? <p>The air cooled at every hut. It was {Math.round(temp[0].temp)} degrees when I left the gate and {Math.round(temp[3].temp)} when I left Kibo Hut for the top.</p> : null}
        </Scene>
      </Band>

      <Band>
        <Plates>
          <Plate slot="kili-forest" caption="Marangu Gate to Mandara Hut · 6 March 2023" />
          <Plate slot="kili-huts" caption={`Horombo Hut · ${n0(s[1].end)} m`} />
        </Plates>
      </Band>

      <Band>
        <Scene
          label="One hut at a time"
          title={`About ${n0(KX.dayClimb)} m a day.`}
          figTitle="The climb, stage by stage"
          fig={<KiliClimb stages={s} profile={KX.profile} peaks={{ rim: KX_RIM, top: KX_TOP }}
            aria={`Altitude of the Kilimanjaro expedition: Marangu Gate ${n0(s[0].start)} m, Mandara Hut ${n0(s[0].end)} m, Horombo Hut ${n0(s[1].end)} m, Kibo Hut ${n0(s[2].end)} m. On the summit night the watch recorded up to ${n0(s[3].high)} m and stopped; Gilman's Point ${n0(KX_RIM)} m and Uhuru Peak ${n0(KX_TOP)} m follow as a dashed line.`} />}
          note="Each stage is as wide as the ground it covered. The dashed line in the grey band is the part of the summit night the watch missed."
          foot={<HBars
            aria={`Metres climbed on each stage of the way up: ${s.slice(0, 4).map((x, i) => `${KX_DAY[i]} ${n0(x.climb)} m`).join(', ')}.`}
            rows={s.slice(0, 4).map((x, i) => ({ key: 'trail', label: KX_DAY[i], sub: i < 3 ? undefined : 'until the watch stopped', value: x.climb, display: `${n0(x.climb)} m` }))}
          />}
        >
          <p>The days before the summit carried most of the climb: {n0(s[0].climb + s[1].climb + s[2].climb)} m of the {n0(KX.climb)} m. I slept at each hut and started again in the morning.</p>
        </Scene>
      </Band>

      <Band><Plate slot="kili-saddle" ratio="21 / 9" caption={`The saddle, on the way to Kibo Hut · ${n0(s[2].end)} m`} /></Band>

      <Band night>
        <Scene label="The summit night" title="The part my watch did not finish.">
          <p>Before midnight on the third day I set out from Kibo Hut for the top.</p>
          <p>The power saver stopped the recording at {n0(s[3].high)} m, about {n0(Math.round((KX_RIM - s[3].high) / 10) * 10)} m below Gilman’s Point, and the next point it logged was back at Kibo Hut. The top is missing from the record. I carry it in my memory.</p>
        </Scene>
        <BigNumber value={n0(KX_TOP)} unit="m">Uhuru Peak. The last {n0(KX_TOP - s[3].high)} m are not in the log.</BigNumber>
        <Plate slot="kili-summit" ratio="16 / 9" caption={`Uhuru Peak · ${n0(KX_TOP)} m · 9 March 2023`} />
        <Saying sw="Mwenda pole hajikwai">, the one who goes slowly does not stumble. That is the lesson of the mountain, and it is the lesson of this whole record.</Saying>
      </Band>

      {half.length ? (
        <Band>
          <Scene
            label="The road at its foot"
            title={faster ? 'Back every year, a little faster.' : 'Back every year.'}
            fig={<Plate slot="kili-half" caption="The Kilimanjaro Half" />}
            foot={<>
              <HBars
                aria={`Time over the 21.1 km of the Kilimanjaro Half each year: ${half.map((h) => `${h.year}, ${hm(h.min)}`).join('; ')}.`}
                rows={half.map((h, i) => ({ key: i === half.length - 1 ? 'trail' : 'walk', label: String(h.year), value: h.min, display: hm(h.min) }))}
              />
              <p className="mtn-scene__more"><Link to="/goals">The race, kilometre by kilometre →</Link></p>
            </>}
          >
            <p>I go back to the foot of the mountain every year for the Kilimanjaro Half. It is the same road each time, so it shows me plainly where I stand.</p>
            {back ? <p>In {back.year}, {['', 'the day', 'two days', 'three days'][back.days]} after the race, I walked back up to Mandara Hut: {k1(back.km)} km and {n0(back.climb)} m of climbing in one afternoon.</p> : null}
          </Scene>
        </Band>
      ) : null}
    </Mountain>
  )
}

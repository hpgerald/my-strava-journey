import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Mountain, { Band, Scene, Ledger, BigNumber, Saying, Plates } from '../components/Mountain.jsx'
import Plate from '../components/Plate.jsx'
import KiliClimb from '../charts/KiliClimb.jsx'
import HBars from '../charts/HBars.jsx'
import RouteMap from '../charts/RouteMap.jsx'
import Relief from '../charts/Relief.jsx'
import { useTable } from '../context/DataContext.jsx'
import { buildKX, routesOf, tripsOf, KX_TOP, KX_RIM, UHURU, altAlong } from '../lib/mountains.js'

const n0 = (v) => Math.round(v || 0).toLocaleString('en-US')
const k1 = (v) => (v || 0).toFixed(1)
const hm = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} min` : `${m} min` }
const KX_DAY = ['Day 1', 'Day 2', 'Day 3', 'Summit night']

// Kilimanjaro: the roof. The chapter climbs with the route, from Marangu Gate
// to the huts and into the summit night, where the ground goes dark.
// the whole climb as one line for the relief: the stages end to end, each as
// wide as the ground it covered
function kiliLine(KX) {
  const st = KX.s.slice(0, 5)
  const total = st.reduce((a, x) => a + (x.dist || x.km || 0), 0) || 1
  let at = 0
  const out = []
  st.forEach((x, i) => {
    const w = x.dist || x.km || 0
    ;(KX.profile[x.stage] || []).forEach((p) => out.push({ x: (at + p.f * w) / total, alt: p.alt }))
    at += w
  })
  return out
}
// the ground cools as the page climbs: paper at the gate, a cold grey near the top
const kiliGround = (v) => {
  const t = Math.min(1, Math.max(0, (v - 1880) / (5895 - 1880))) * 0.085
  const mix = (a, b) => Math.round(a + (b - a) * t)
  return `rgb(${mix(242, 36)}, ${mix(240, 49)}, ${mix(235, 58)})`
}

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
    ...['stage-1', 'stage-2', 'stage-3', 'stage-4'].map((k, i) => ({ key: k, pts: routes[k], tone: 'main', alt: altAlong(kxProfile.filter((r) => +r.stage === i + 1).map((r) => ({ x: +r.frac, alt: +r.alt_m }))) || undefined })),
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
      relief={<Relief lines={[kiliLine(KX)]} />}
      gauge={{
        min: 1600, max: 6000, unit: 'metres',
        stops: [{ v: s[0].start, label: 'Marangu Gate' }, { v: s[0].end, label: 'Mandara Hut' }, { v: s[1].end, label: 'Horombo Hut' }, { v: s[2].end, label: 'Kibo Hut' }, { v: s[3].high, label: 'The watch stopped' }, { v: KX_TOP, label: 'Uhuru Peak' }],
        fmt: (v) => n0(Math.round(v / 10) * 10),
        ground: kiliGround,
      }}
      hero="kili-hero"
      standfirst={<>I went up Kilimanjaro knowing nothing about climbing it. I joined a group of friends who were getting ready for it, five of us in all, and in March 2023 we went up the Marangu route to Uhuru Peak, {n0(KX_TOP)} m.</>}
      facts={[
        { label: 'climbed in four days', value: n0(KX.climb), unit: 'm' },
        { label: 'on foot, up and back to Horombo', value: k1(KX.km), unit: 'km' },
        { label: 'from the gate to the summit', value: n0(KX_TOP - s[0].start), unit: 'm' },
        { label: 'huts on the way up', value: '3' },
      ]}
    >
      <Band at={[s[0].start, s[0].end]}>
        <Scene
          label="The way up"
          title="Three days to Kibo Hut."
          figTitle="The Marangu route, as my watch drew it"
          fig={<RouteMap lines={lines} marks={marks} ratio={0.74}
            aria={`The Marangu route from Marangu Gate at ${n0(s[0].start)} m past Mandara Hut, Horombo Hut and Kibo Hut at ${n0(s[2].end)} m. The recorded line ends at ${n0(s[3].high)} m on the summit night; Uhuru Peak, ${n0(KX_TOP)} m, is marked beyond it.`} />}
          note="My watch drew all four stages. The dotted end is the part of the summit night it missed."
          foot={<Ledger rows={s.slice(0, 4).map((x, i) => ({
            k: KX_DAY[i],
            v: i < 3 ? `${x.from} to ${x.to}` : 'Kibo Hut towards the top',
            sub: `${i < 3 ? `${k1(x.dist)} km · ${hm(x.elapsed)}` : `${k1(x.km)} km recorded`}${stages[i] && stages[i].temp != null ? ` · ${Math.round(stages[i].temp)}° at the start` : ''}`,
          }))} />}
        >
          <p>Marangu is known as the Coca-Cola route, the easy one, while Machame is the Whiskey route. I was born and raised in Moshi, at the foot of the mountain, so I thought the height would not trouble me.</p>
          <p>From the gate at {n0(s[0].start)} m to Kibo Hut at {n0(s[2].end)} m took three days and {k1(three)} km, and every night was spent higher than the night before.</p>
          {temp.length === 4 ? <p>The air cooled at every hut. It was {Math.round(temp[0].temp)} degrees when I left the gate and {Math.round(temp[3].temp)} when I left Kibo Hut for the top.</p> : null}
        </Scene>
      </Band>

      <Band at={[s[0].end, s[1].end]}>
        <Plates>
          <Plate slot="kili-forest" caption="Marangu Gate to Mandara Hut · 6 March 2023" />
          <Plate slot="kili-huts" caption={`Horombo Hut · ${n0(s[1].end)} m`} />
        </Plates>
      </Band>

      <Band at={[s[1].end, s[2].end]}>
        <Scene
          label="One hut at a time"
          title="I almost quit at the first hut."
          figTitle="The climb, stage by stage"
          fig={<KiliClimb stages={s} profile={KX.profile} peaks={{ rim: KX_RIM, top: KX_TOP }}
            aria={`Altitude of the Kilimanjaro expedition: Marangu Gate ${n0(s[0].start)} m, Mandara Hut ${n0(s[0].end)} m, Horombo Hut ${n0(s[1].end)} m, Kibo Hut ${n0(s[2].end)} m. On the summit night the watch recorded up to ${n0(s[3].high)} m and stopped; Gilman's Point ${n0(KX_RIM)} m and Uhuru Peak ${n0(KX_TOP)} m follow as a dashed line.`} />}
          note="Each stage is as wide as the ground it covered. The dashed line in the grey band is the part of the summit night the watch missed."
          read="The whole way up, one stage after another, each as wide as the ground it covered. The orange line is what my watch recorded. On the summit night it stopped near the crater rim, so the dashed line in the grey band is the part of the night it missed: Gilman’s Point, Uhuru Peak and the way back to Kibo Hut. The grey line is the walk down to Horombo that same afternoon."
          lesson
          foot={<HBars
            aria={`Metres climbed on each stage of the way up: ${s.slice(0, 4).map((x, i) => `${KX_DAY[i]} ${n0(x.climb)} m`).join(', ')}.`}
            rows={s.slice(0, 4).map((x, i) => ({ key: 'trail', label: KX_DAY[i], sub: i < 3 ? undefined : 'until the watch stopped', value: x.climb, display: `${n0(x.climb)} m` }))}
          />}
        >
          <p>We reached Mandara Hut around eight at night, and it was colder than anything I had felt before. I asked myself what the higher camps would be like. The sunrise in the morning brought warmth, and I could tell it was going to be a good day.</p>
          <p>The days before the summit carried most of the climb: {n0(s[0].climb + s[1].climb + s[2].climb)} m of the {n0(KX.climb)} m, about {n0(KX.dayClimb)} m a day.</p>
        </Scene>
      </Band>

      <Band at={s[2].end}><Plate slot="kili-saddle" ratio="21 / 9" caption={`The saddle, on the way to Kibo Hut · ${n0(s[2].end)} m`} /></Band>

      <Band night at={[s[2].end, KX_TOP]}>
        <Scene label="The summit night" title="The part my watch did not finish.">
          <p>At Kibo Hut my head ached like never before, and I thought I would not wake up in time to join the summit team at midnight. I did some deep breathing, fell asleep, and woke around ten at night to go.</p>
          <p>The early sunrise caught us near Gilman’s Point. I have never seen anything like it in my life. The top was clear and there was no crowd. We reached Uhuru Peak around half past ten in the morning, and after about 30 minutes a storm was coming, so we started down.</p>
          <p>My watch saw none of it. The cold and the power saver stopped the recording at {n0(s[3].high)} m, about {n0(Math.round((KX_RIM - s[3].high) / 10) * 10)} m below Gilman’s Point, and the next point it logged was back at Kibo Hut. One day I will go back and record the whole way.</p>
        </Scene>
        <BigNumber value={n0(KX_TOP)} unit="m">Uhuru Peak. The last {n0(KX_TOP - s[3].high)} m are not in the log.</BigNumber>
        <Plate slot="kili-summit" ratio="16 / 9" caption={`Uhuru Peak · ${n0(KX_TOP)} m · 9 March 2023`} />
        <Saying sw="Mwenda pole hajikwai">, the one who goes slowly does not stumble.</Saying>
      </Band>

      {half.length ? (
        <Band at={s[0].start}>
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
            <p>The Kilimanjaro Half is part of the Kilimanjaro International Marathon, run in Moshi, the town where I was born and raised. The half is my size. The race is close to 25 years old, and the week around it is one big celebration in town, the kind you have to be there to feel.</p>
            <p>I never ran it until this habit started. Now I go back every year, and the same road shows me plainly where I stand.</p>
            {back ? <p>In {back.year}, {['', 'the day', 'two days', 'three days'][back.days]} after the race, I walked back up to Mandara Hut: {k1(back.km)} km and {n0(back.climb)} m of climbing in one afternoon.</p> : null}
          </Scene>
        </Band>
      ) : null}
    </Mountain>
  )
}

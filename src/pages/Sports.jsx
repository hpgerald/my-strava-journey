import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import SmallMultiples from '../charts/SmallMultiples.jsx'
import SportSplit from '../charts/SportSplit.jsx'
import SportScatter from '../charts/SportScatter.jsx'
import DistanceHistogram from '../charts/DistanceHistogram.jsx'
import WeekendDirt from '../charts/WeekendDirt.jsx'
import RangeBars from '../charts/RangeBars.jsx'
import StackedColumns from '../charts/StackedColumns.jsx'
import Slopes from '../charts/Slopes.jsx'
import Diverging from '../charts/Diverging.jsx'
import Columns from '../charts/Columns.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

export default function Sports() {
  const sports = useTable('sport_breakdown')
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/sports')

  const years = [...new Set(activities.map((a) => a.year).filter(Boolean))].sort()

  const distByYear = (pred) => {
    const byYear = Object.fromEntries(years.map((y) => [y, 0]))
    for (const a of activities) if (a.year && pred(a)) byYear[a.year] += toNum(a.distance_km) || 0
    return years.map((y) => ({ x: Number(y), y: byYear[y] }))
  }
  const sumDist = (pred) => activities.reduce((s, a) => (pred(a) ? s + (toNum(a.distance_km) || 0) : s), 0)
  const countOf = (pred) => activities.reduce((s, a) => (pred(a) ? s + 1 : s), 0)

  // six on-foot panels: Run and Walk split indoor vs outdoor, plus Trail Run and Hike
  const indoor = (a) => a.trainer === 'Yes'
  const footPanels = [
    { name: 'Run (indoor)', pred: (a) => a.sport_type === 'Run' && indoor(a) },
    { name: 'Run (outdoor)', pred: (a) => a.sport_type === 'Run' && !indoor(a) },
    { name: 'Trail Run', pred: (a) => a.sport_type === 'TrailRun' },
    { name: 'Walk (indoor)', pred: (a) => a.sport_type === 'Walk' && indoor(a) },
    { name: 'Walk (outdoor)', pred: (a) => a.sport_type === 'Walk' && !indoor(a) },
    { name: 'Hike', pred: (a) => a.sport_type === 'Hike' },
  ]
  const series = footPanels.map((p) => ({
    name: p.name,
    sub: `${fmtNum(sumDist(p.pred), 0)} km total`,
    points: distByYear(p.pred),
  }))

  const topSport = sports[0] || {}

  const distSorted = [...sports]
    .filter((s) => toNum(s.distance_km) > 0)
    .sort((a, b) => toNum(b.distance_km) - toNum(a.distance_km))

  // mirrored split: top sports by distance, each with its distance and its
  // activity count, so the inversion (running long, walking frequent) shows.
  const splitData = (() => {
    const top = distSorted.slice(0, 6)
    const rest = distSorted.slice(6)
    const rows = top.map((s) => ({ label: prettySport(s.sport), dist: toNum(s.distance_km), acts: toNum(s.activities) }))
    if (rest.length) {
      rows.push({
        label: `Other (${rest.length})`,
        dist: rest.reduce((a, s) => a + toNum(s.distance_km), 0),
        acts: rest.reduce((a, s) => a + toNum(s.activities), 0),
      })
    }
    return rows
  })()

  // ---- foot deep dive ----
  const FOOT = ['Run', 'Walk', 'TrailRun', 'Hike']
  const prettyFoot = { Run: 'Run', Walk: 'Walk', TrailRun: 'Trail Run', Hike: 'Hike' }
  const footActs = activities.filter((a) => FOOT.includes(a.sport_type))

  const quantiles = (vals) => {
    const s = vals.filter(Number.isFinite).sort((a, b) => a - b)
    if (!s.length) return null
    const q = (p) => {
      const i = (s.length - 1) * p
      const lo = Math.floor(i)
      const hi = Math.ceil(i)
      return s[lo] + (s[hi] - s[lo]) * (i - lo)
    }
    return { p25: q(0.25), med: q(0.5), p75: q(0.75) }
  }
  const fmtPace = (m) => {
    let mm = Math.floor(m)
    let ss = Math.round((m - mm) * 60)
    if (ss === 60) { mm += 1; ss = 0 }
    return `${mm}:${String(ss).padStart(2, '0')}`
  }
  const bySport = (sp) => footActs.filter((a) => a.sport_type === sp)

  // personality plot: each foot sport by typical distance (x) against typical
  // climb (y), bubble sized by how often it is logged.
  const scatterData = FOOT.map((sp) => {
    const acts = bySport(sp)
    const md = quantiles(acts.map((a) => toNum(a.distance_km)).filter((v) => v > 0))
    const me = quantiles(acts.map((a) => toNum(a.elevation_gain_m) || 0))
    return md && me
      ? { key: sp, label: prettyFoot[sp], x: Math.round(md.med * 10) / 10, y: Math.round(me.med), n: acts.length }
      : null
  }).filter(Boolean)

  // distance histogram: foot outings in 1 km bins, long tail folded at the cap
  const HIST_CAP = 25
  const histCount = {}
  for (const a of footActs) {
    const km = toNum(a.distance_km)
    if (km > 0) {
      const b = Math.min(Math.round(km), HIST_CAP)
      histCount[b] = (histCount[b] || 0) + 1
    }
  }
  const distHistBins = []
  for (let km = 1; km <= HIST_CAP; km++) distHistBins.push({ km, count: histCount[km] || 0, cap: km === HIST_CAP })
  const favKm = distHistBins.reduce((b, d) => (d.count > b.count ? d : b), distHistBins[0])

  // weekend vs weekday: trail + hike share of activity
  const isTrail = (a) => a.sport_type === 'TrailRun' || a.sport_type === 'Hike'
  const isWeekend = (a) => a.weekday === 'Saturday' || a.weekday === 'Sunday'
  const wdAll = activities.filter((a) => !isWeekend(a))
  const weAll = activities.filter((a) => isWeekend(a))
  const trailWeekdayPct = wdAll.length ? (100 * wdAll.filter(isTrail).length) / wdAll.length : 0
  const trailWeekendPct = weAll.length ? (100 * weAll.filter(isTrail).length) / weAll.length : 0

  // 1. pace spread (min/km), fastest first
  const paceRows = FOOT.map((sp) => {
    const q = quantiles(
      bySport(sp).map((a) => {
        const d = toNum(a.distance_km)
        return d > 0.05 ? toNum(a.moving_time_min) / d : NaN
      })
    )
    return q
      ? { label: prettyFoot[sp], p25: q.p25, med: q.med, p75: q.p75, display: fmtPace(q.med), sub: `${fmtPace(q.p25)}-${fmtPace(q.p75)}` }
      : null
  })
    .filter(Boolean)
    .sort((a, b) => a.med - b.med)

  // 2. distance spread (km), longest first
  const distRows = FOOT.map((sp) => {
    const q = quantiles(bySport(sp).map((a) => toNum(a.distance_km)).filter((v) => v > 0))
    return q
      ? { label: prettyFoot[sp], p25: q.p25, med: q.med, p75: q.p75, display: fmtNum(q.med, 1), sub: `${fmtNum(q.p25, 1)}-${fmtNum(q.p75, 1)}` }
      : null
  })
    .filter(Boolean)
    .sort((a, b) => b.med - a.med)

  // 3. treadmill vs road running, share by year
  const runYears = years.map((y) => {
    const inCt = countOf((a) => a.sport_type === 'Run' && a.year === y && a.trainer === 'Yes')
    const outCt = countOf((a) => a.sport_type === 'Run' && a.year === y && a.trainer !== 'Yes')
    return { label: String(y).slice(-2), year: y, top: outCt, bottom: inCt }
  })

  // 4. steepness: median grade + typical climb, gentle first
  const gradeRows = FOOT.map((sp) => {
    const g = bySport(sp)
    const qg = quantiles(
      g.map((a) => {
        const d = toNum(a.distance_km)
        return d > 0.05 ? ((toNum(a.elevation_gain_m) || 0) / (d * 1000)) * 100 : NaN
      })
    )
    const qe = quantiles(g.map((a) => toNum(a.elevation_gain_m) || 0))
    return qg && qe
      ? { label: prettyFoot[sp], grade: qg.med, elev: qe.med, display: `${fmtNum(qg.med, 1)}%`, sub: `· ${fmtInt(qe.med)} m up` }
      : null
  })
    .filter(Boolean)
    .sort((a, b) => a.grade - b.grade)

  // 5. time of day, running vs walking
  const TB = [
    ['Early Morning (4-7)', 'Dawn'],
    ['Morning (7-11)', 'Morning'],
    ['Midday (11-14)', 'Midday'],
    ['Afternoon (14-17)', 'Afternoon'],
    ['Evening (17-20)', 'Evening'],
    ['Night (20-4)', 'Night'],
  ]
  const runTot = countOf((a) => a.sport_type === 'Run')
  const walkTot = countOf((a) => a.sport_type === 'Walk')
  const todRows = TB.map(([bucket, lbl]) => ({
    label: lbl,
    left: runTot ? (countOf((a) => a.sport_type === 'Run' && a.time_bucket === bucket) / runTot) * 100 : 0,
    right: walkTot ? (countOf((a) => a.sport_type === 'Walk' && a.time_bucket === bucket) / walkTot) * 100 : 0,
  }))

  // 6. trails by weekday
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const trailWeekday = WD.map((d) => ({
    label: d.slice(0, 2),
    day: d,
    value: countOf((a) => (a.sport_type === 'TrailRun' || a.sport_type === 'Hike') && a.weekday === d),
  }))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Sports' }]}
      number="03"
      title="Sports"
      subtitle="What the work is made of"
      lede={`${sports.length} sports in the log, but two carry it. By activity count ${prettySport(
        topSport.sport
      ).toLowerCase()} leads; by distance running does. Look closer and they specialise: running is fast, flat and mostly indoors, while walking piles up the outdoor kilometres and, quietly, three-quarters of the climbing. Pick any sport for its totals, trend and best days.`}
      prev={prev}
      next={next}
    >
      {/* The mix, in one glance */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <Figure
          n="01"
          title="Distance against days"
          note="Each sport off a shared centre: its share of every kilometre on the left, its share of every session on the right. The bars cross over. Running is a long left bar and a stub on the right; walking is the exact inverse, a fraction of the ground but the bulk of the days out."
          source="Overview"
          tableCaption="Share of total distance and total activities by sport"
          columns={['Sport', 'Distance', 'Activities']}
          rows={splitData.map((s) => [
            s.label,
            fmtNum(s.dist, 0) + ' km',
            fmtInt(s.acts),
          ])}
        >
          <SportSplit items={splitData} />
        </Figure>
      </section>

      {/* Trend per sport */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Distance by year, on foot"
          note="Six ways of covering ground on foot, every panel on the same scale. Running is logged mostly on the treadmill; walking is almost all outdoors, and it is the walking that climbs."
          source="Activity Log"
          tableCaption="Distance in km by category and year"
          columns={['Category', ...years]}
          rows={series.map((s) => [s.name, ...s.points.map((p) => String(Math.round(p.y)))])}
        >
          <SmallMultiples series={series} columns={3} />
        </Figure>
      </section>

      {/* Sport personalities */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="02"
          title="How each sport behaves"
          note="Every foot sport placed by its typical outing: how far it goes across the bottom, how much it climbs up the side, the bubble sized by how often it is logged. Running lands far out and flat on the floor. The trails and the hike float high on almost no distance. Walking is the busy dot in between."
          source="Activity Log"
          tableCaption="Median distance, median climb and count by foot sport"
          columns={['Sport', 'Median km', 'Median climb', 'Logged']}
          rows={scatterData.map((p) => [p.label, fmtNum(p.x, 1), `${fmtInt(p.y)} m`, fmtInt(p.n)])}
        >
          <SportScatter points={scatterData} />
        </Figure>
      </section>

      {/* Favourite distance */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="03"
          title="The body has a favourite number"
          note={`Every foot outing sorted into one-kilometre bins. The distribution is not smooth: it spikes hard at a clean ${favKm.km} km, logged ${favKm.count} times, with a second tower at 10 km. The pull of a round number, the instinct to finish on a tidy figure rather than stop at 4.7 or 9.3.`}
          source="Activity Log"
          tableCaption="Foot outings by distance, one-kilometre bins"
          columns={['Distance km', 'Outings']}
          rows={distHistBins.filter((b) => b.count > 0).map((b) => [`${b.km}${b.cap ? '+' : ''}`, String(b.count)])}
        >
          <DistanceHistogram bins={distHistBins} peaks={[5, 10]} />
        </Figure>
      </section>

      {/* Weekends are for dirt */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="04"
          title="Weekends are for dirt"
          note="Trail runs and hikes as a share of everything logged, split by when they happen. Midweek the ground is almost all roads and treadmills; come the weekend the off-road share more than quadruples. The trails wait for Saturday."
          source="Activity Log"
          tableCaption="Trail and hike share of activity, weekday versus weekend"
          columns={['When', 'Trail + hike share']}
          rows={[['Weekday', `${trailWeekdayPct.toFixed(1)}%`], ['Weekend', `${trailWeekendPct.toFixed(1)}%`]]}
        >
          <WeekendDirt weekday={trailWeekdayPct} weekend={trailWeekendPct} />
        </Figure>
      </section>

      {/* Foot deep dive */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <hr className="rule" />
        <div className="section-head">
          <p className="eyebrow">The foot data, unearthed</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
            On foot, up close.
          </h2>
          <p className="detail-head__lede" style={{ marginTop: 'var(--sp-3)' }}>
            Running, walking, trail running and hiking are the spine of the log, and each has a job. Running is
            for speed and stays on the treadmill. Walking is for volume and hills. Trail running and hiking are for
            raw vertical: a trail run climbs 350 metres on average, a hike over 700. Six cuts through the foot data.
          </p>
        </div>

        <div className="grid grid--2">
          <Figure
            title="How fast, on foot"
            note="Typical pace per kilometre. The bar spans the middle half of sessions; the tick marks the median. Running is quickest, hiking slowest."
            source="Activity Log"
            tableCaption="Pace per km: median and middle-50% range"
            columns={['Category', 'Median /km', 'Range']}
            rows={paceRows.map((r) => [r.label, r.display, r.sub])}
          >
            <RangeBars data={paceRows} unit="/km" axisNote="band = middle half of sessions · tick = median" />
          </Figure>

          <Figure
            title="How far, on foot"
            note="Typical distance per outing. Runs cover the most ground per session; walks are short and frequent."
            source="Activity Log"
            tableCaption="Distance in km: median and middle-50% range"
            columns={['Category', 'Median km', 'Range']}
            rows={distRows.map((r) => [r.label, r.display, r.sub])}
          >
            <RangeBars data={distRows} unit="km" axisNote="band = middle half of sessions · tick = median" />
          </Figure>
        </div>

        <div className="grid grid--2" style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            title="The treadmill years"
            note="Each column is a year of runs, split into the share done outdoors versus on the treadmill. The early years are almost all indoors; lately the road is winning back."
            source="Activity Log"
            tableCaption="Runs per year by setting"
            columns={['Year', 'Outdoor', 'Indoor']}
            rows={runYears.map((r) => [r.year, String(r.top), String(r.bottom)])}
          >
            <StackedColumns data={runYears} keys={{ top: 'Outdoor', bottom: 'Treadmill' }} height={230} />
          </Figure>

          <Figure
            title="How steep it gets"
            note="The slope of each row is a sport's median gradient, the typical climb beside it. Running is nearly flat. The ground only tilts up on the trails and the hikes."
            source="Activity Log"
            tableCaption="Median gradient and median elevation gain"
            columns={['Category', 'Median grade', 'Median climb']}
            rows={gradeRows.map((r) => [r.label, r.display, `${fmtInt(r.elev)} m`])}
          >
            <Slopes data={gradeRows} />
          </Figure>
        </div>

        <div className="grid grid--2" style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            title="When you head out"
            note="Each band is a slice of the day, as a share of that sport's own sessions. Runs skew to the dark ends, dawn and night; walks cluster in the evening."
            source="Activity Log"
            tableCaption="Share of runs and walks by time of day"
            columns={['Time of day', 'Run', 'Walk']}
            rows={todRows.map((r) => [r.label, `${Math.round(r.left)}%`, `${Math.round(r.right)}%`])}
          >
            <Diverging rows={todRows} keys={{ left: 'Run', right: 'Walk' }} />
          </Figure>

          <Figure
            title="Weekends are for trails"
            note="Trail runs and hikes counted together by day of the week. They pile up on Saturday and Sunday and all but vanish midweek."
            source="Activity Log"
            tableCaption="Trail runs and hikes by weekday"
            columns={['Weekday', 'Activities']}
            rows={trailWeekday.map((r) => [r.day, String(r.value)])}
          >
            <Columns data={trailWeekday} height={230} />
          </Figure>
        </div>
      </section>
    </DetailFrame>
  )
}

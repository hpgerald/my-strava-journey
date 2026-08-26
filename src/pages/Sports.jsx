import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import SmallMultiples from '../charts/SmallMultiples.jsx'
import ProportionBar from '../charts/ProportionBar.jsx'
import BarChart from '../charts/BarChart.jsx'
import RangeBars from '../charts/RangeBars.jsx'
import StackedColumns from '../charts/StackedColumns.jsx'
import Slopes from '../charts/Slopes.jsx'
import Diverging from '../charts/Diverging.jsx'
import Columns from '../charts/Columns.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { slugify, prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

// Fold a sorted list to top-N named slices plus a single "Other" remainder.
function topWithOther(rows, valueOf, labelOf, n = 5) {
  const top = rows.slice(0, n)
  const rest = rows.slice(n)
  const segs = top.map((r) => ({ label: labelOf(r), value: valueOf(r) }))
  if (rest.length) {
    segs.push({ label: `Other (${rest.length} sports)`, value: rest.reduce((a, r) => a + valueOf(r), 0) })
  }
  return segs
}

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
  const actSorted = [...sports].sort((a, b) => toNum(b.activities) - toNum(a.activities))

  // composition (mix) segments
  const distMix = topWithOther(distSorted, (s) => toNum(s.distance_km), (s) => prettySport(s.sport))
    .map((s) => ({ ...s, display: fmtNum(s.value, 0) }))
  const actMix = topWithOther(actSorted, (s) => toNum(s.activities), (s) => prettySport(s.sport))
    .map((s) => ({ ...s, display: fmtInt(s.value) }))

  // ranked detail: top 3 each, with the related categories combined
  const distCats = [
    { label: 'Run', names: ['Run'], to: `/sports/${slugify('Run')}` },
    { label: 'Walk', names: ['Walk'], to: `/sports/${slugify('Walk')}` },
    { label: 'Trail Run + Hike', names: ['TrailRun', 'Hike'] },
  ]
    .map((c) => {
      const v = sumDist((a) => c.names.includes(a.sport_type))
      return {
        label: c.label,
        value: v,
        display: fmtNum(v, 0),
        unit: 'km',
        sub: `· ${fmtInt(countOf((a) => c.names.includes(a.sport_type)))} acts`,
        to: c.to,
      }
    })
    .sort((a, b) => b.value - a.value)

  const actCats = [
    { label: 'Walk', names: ['Walk'], to: `/sports/${slugify('Walk')}` },
    { label: 'Run', names: ['Run'], to: `/sports/${slugify('Run')}` },
    { label: 'Workout + Therapy', names: ['Workout', 'PhysicalTherapy'] },
  ]
    .map((c) => {
      const v = countOf((a) => c.names.includes(a.sport_type))
      return { label: c.label, value: v, display: fmtInt(v), to: c.to }
    })
    .sort((a, b) => b.value - a.value)

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
      subtitle="What the training is actually made of"
      lede={`${sports.length} sport types in all, but it leans heavily on foot: ${prettySport(
        topSport.sport
      ).toLowerCase()} is the single biggest chunk. Pick any sport for its own totals, trend and best days.`}
      prev={prev}
      next={next}
    >
      {/* The mix, in one glance */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--2">
          <Figure
            title="Share of distance"
            note="Where the kilometres come from. Walking and running dominate the ground covered."
            source="Overview"
            columns={['Sport', 'km']}
            rows={distMix.map((s) => [s.label, s.display])}
          >
            <ProportionBar segments={distMix} unit="km" />
          </Figure>
          <Figure
            title="Share of activities"
            note="Where the sessions go. By count the order shifts: short walks and workouts add up."
            source="Overview"
            columns={['Sport', 'activities']}
            rows={actMix.map((s) => [s.label, s.display])}
          >
            <ProportionBar segments={actMix} unit="acts" />
          </Figure>
        </div>
      </section>

      {/* Trend per sport */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Distance by year, on foot"
          note="Six ways of covering ground on foot, every panel on the same scale. Running is logged mostly on the treadmill; walking is almost all outdoors."
          source="Activity Log"
          tableCaption="Distance in km by category and year"
          columns={['Category', ...years]}
          rows={series.map((s) => [s.name, ...s.points.map((p) => String(Math.round(p.y)))])}
        >
          <SmallMultiples series={series} columns={3} />
        </Figure>
      </section>

      {/* Ranked detail, side by side */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Most distance, on foot"
            note="Running, walking, and the trails, with trail runs and hikes counted together."
            source="Activity Log"
            columns={['Category', 'km']}
            rows={distCats.map((d) => [d.label, d.display])}
          >
            <BarChart data={distCats} showRank />
          </Figure>
          <Figure
            title="Most activities"
            note="The three most-logged, with gym workouts and physical therapy combined."
            source="Activity Log"
            columns={['Category', 'Activities']}
            rows={actCats.map((d) => [d.label, d.display])}
          >
            <BarChart data={actCats} showRank />
          </Figure>
        </div>
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
            Running, walking, trail running and hiking make up the bulk of the log. Six cuts through the foot data:
            how fast, how far, how steep, when, and how the treadmill years give way to the road.
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
            note="The slope of each hill is the median gradient of that sport, with the typical climb read alongside. Flat running gives way to real vertical on the trails and hikes."
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

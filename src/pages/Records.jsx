import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import Figure from '../charts/Figure.jsx'
import DistanceStartLine from '../charts/DistanceStartLine.jsx'
import KudosStarburst from '../charts/KudosStarburst.jsx'
import MotionClock from '../charts/MotionClock.jsx'
import CaloriePlates from '../charts/CaloriePlates.jsx'
import PRPulse from '../charts/PRPulse.jsx'
import RecordWall from '../charts/RecordWall.jsx'
import AscentProfile from '../charts/AscentProfile.jsx'
import MilestoneLadder from '../charts/MilestoneLadder.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { prettySport } from '../lib/slug.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const EVEREST = 8849 // metres, sea level to summit
const KILI = 5895 // Kilimanjaro summit, metres

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parseDay = (s) => new Date(`${(s || '').slice(0, 10)}T00:00:00Z`)
const fmtFull = (s) => {
  const d = parseDay(s)
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
const fmtMon = (s) => {
  const d = parseDay(s)
  return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000)

export default function Records() {
  const activities = useTable('activities')
  const { prev, next } = useSectionPaging('/records')

  const foot = activities.filter((a) => FOOT.has(a.sport_type))
  const maxBy = (rows, key) =>
    rows.reduce((best, a) => (toNum(a[key]) > (toNum(best?.[key]) || -Infinity) ? a : best), null)

  // ---- all-time bests ----
  const furthestRun = maxBy(activities.filter((a) => a.sport_type === 'Run'), 'distance_km')
  const biggestClimb = maxBy(foot, 'elevation_gain_m')
  // Longest single outing, restricted to genuine outdoor efforts: indoor entries
  // and stuck-timer artifacts (trainer flag, no elevation) are excluded so the
  // record reflects a real day out rather than a paused clock left running.
  const outdoorEfforts = foot.filter((a) => a.trainer !== 'Yes' && toNum(a.elevation_gain_m) > 0)
  const longestOut = maxBy(outdoorEfforts, 'moving_time_min')
  const hottest = maxBy(foot, 'relative_effort')
  const mostCal = maxBy(foot, 'calories')
  const mostKudos = maxBy(activities, 'kudos')

  // ---- longest active streak (consecutive calendar days with an activity) ----
  const days = [...new Set(activities.map((a) => (a.date || '').slice(0, 10)).filter(Boolean))].sort()
  let streak = { len: 0, start: null, end: null }
  let cur = 0
  let runStart = days[0]
  let prevD = null
  for (const ds of days) {
    if (prevD && daysBetween(prevD, ds) === 1) cur += 1
    else {
      cur = 1
      runStart = ds
    }
    if (cur > streak.len) streak = { len: cur, start: runStart, end: ds }
    prevD = ds
  }
  const spanDays = daysBetween(days[0], days[days.length - 1]) + 1
  const activePct = Math.round((days.length / spanDays) * 100)

  const records = [
    {
      value: fmtNum(furthestRun?.distance_km, 1),
      unit: 'km',
      title: 'Furthest run',
      detail: 'A full marathon distance, run without leaving the treadmill',
      date: fmtFull(furthestRun?.date),
    },
    {
      value: fmtInt(biggestClimb?.elevation_gain_m),
      unit: 'm up',
      title: 'Biggest climb',
      detail: 'Highest elevation gain in a single activity',
      date: fmtFull(biggestClimb?.date),
    },
    {
      value: fmtNum(toNum(longestOut?.moving_time_min) / 60, 1),
      unit: 'hours',
      title: 'Longest day out',
      detail: `${fmtInt(longestOut?.elevation_gain_m)} m of climbing on Mount Hanang`,
      date: fmtFull(longestOut?.date),
    },
    {
      value: fmtInt(streak.len),
      unit: 'days',
      title: 'Longest active streak',
      detail: `Something logged every day, ${activePct}% of all days active`,
      date: `${fmtMon(streak.start)} to ${fmtMon(streak.end)}`,
    },
    {
      value: fmtInt(hottest?.relative_effort),
      unit: 'effort',
      title: 'Hardest single effort',
      detail: 'Highest relative effort Strava has scored',
      date: fmtFull(hottest?.date),
    },
    {
      value: fmtInt(mostKudos?.kudos),
      unit: 'kudos',
      title: 'Most-cheered activity',
      detail: 'Most kudos received on a single activity',
      date: fmtFull(mostKudos?.date),
    },
  ]

  // ---- aggregate tape measure ----
  const totalDist = foot.reduce((s, a) => s + (toNum(a.distance_km) || 0), 0)
  const totalElev = foot.reduce((s, a) => s + (toNum(a.elevation_gain_m) || 0), 0)
  const totalHours = foot.reduce((s, a) => s + (toNum(a.moving_time_min) || 0), 0) / 60

  // ---- time in motion (all sports): moving vs elapsed ----
  const movingHours = activities.reduce((s, a) => s + (toNum(a.moving_time_min) || 0), 0) / 60
  const elapsedHours = activities.reduce((s, a) => s + (toNum(a.elapsed_time_min) || 0), 0) / 60

  // ---- total energy burned ----
  const totalKcal = activities.reduce((s, a) => s + (toNum(a.calories) || 0), 0)

  // ---- PRs per outing, by year (records come in bursts) ----
  const prAgg = {}
  for (const a of activities) {
    if (!a.year) continue
    const p = (prAgg[a.year] = prAgg[a.year] || { pr: 0, n: 0 })
    p.pr += toNum(a.prs) || 0
    p.n += 1
  }
  const prByYear = Object.keys(prAgg).sort().map((y) => ({ year: y, rate: prAgg[y].pr / prAgg[y].n, total: Math.round(prAgg[y].pr) }))

  // ---- cumulative distance milestones ----
  const chron = [...foot].sort((a, b) => (a.date < b.date ? -1 : 1))
  const marks = [1000, 2500, 5000, 7500, 10000]
  const hit = {}
  let cum = 0
  for (const a of chron) {
    const prevC = cum
    cum += toNum(a.distance_km) || 0
    for (const m of marks) if (prevC < m && m <= cum && !hit[m]) hit[m] = a.date
  }
  const ladder = marks
    .filter((m) => hit[m])
    .map((m) => ({
      km: `${fmtInt(m)} km`,
      date: fmtMon(hit[m]),
      tFrac: daysBetween(days[0], hit[m]) / spanDays,
    }))

  // ---- furthest in each discipline ----
  const furthest = ['Run', 'TrailRun', 'Walk', 'Hike']
    .map((sp) => {
      const a = maxBy(activities.filter((x) => x.sport_type === sp), 'distance_km')
      const names = { Run: 'Run', TrailRun: 'Trail run', Walk: 'Walk', Hike: 'Hike' }
      return a
        ? { label: names[sp], value: toNum(a.distance_km), display: fmtNum(a.distance_km, 1), unit: 'km', sub: `· ${fmtMon(a.date)}` }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value)

  // ---- most-loved activities, identified only by sport and month ----
  const loved = [...activities]
    .filter((a) => toNum(a.kudos) > 0)
    .sort((a, b) => toNum(b.kudos) - toNum(a.kudos))
    .slice(0, 6)
    .map((a) => ({
      label: `${prettySport(a.sport_type)} · ${fmtMon(a.date)}`,
      value: toNum(a.kudos),
      display: fmtInt(a.kudos),
      unit: 'kudos',
    }))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Records' }]}
      number="04"
      title="Records"
      subtitle="The far edges. Longest, highest, hardest."
      lede="Not averages this time. The far edges. A marathon run without leaving the room, a single day that climbed nearly two kilometres, a streak that has held for eight months, and a pile of vertical the size of nine Everests."
      prev={prev}
      next={next}
    >
      {/* The record wall */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <RecordWall records={records} />
        <p className="source" style={{ marginTop: 'var(--sp-4)' }}>Source: Activity Log</p>
      </section>

      {/* Time in motion */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="01"
          title="Ninety-six days in motion"
          note="Add up the moving time on every activity ever logged and it comes to more than three months of continuous movement, day and night without pause. Alongside it runs the dead time: the fraction of the recorded clock spent paused, stopped at a junction, or standing still between efforts."
          source="Activity Log"
          tableCaption="Total moving time against elapsed time"
          columns={['Measure', 'Hours']}
          rows={[
            ['Moving time', fmtInt(movingHours)],
            ['Elapsed (clock) time', fmtInt(elapsedHours)],
            ['Paused / dead time', fmtInt(elapsedHours - movingHours)],
          ]}
        >
          <MotionClock movingHours={movingHours} elapsedHours={elapsedHours} />
        </Figure>
      </section>

      {/* The climb ledger */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <hr className="rule" />
        <div className="section-head">
          <p className="eyebrow">The vertical ledger</p>
          <h2 className="section-head__title" style={{ fontSize: 'var(--fs-2xl)' }}>
            {fmtInt(totalElev)} metres, straight up.
          </h2>
          <p className="detail-head__lede" style={{ marginTop: 'var(--sp-3)' }}>
            Add up every hill, every trail, every set of stairs on foot and the climbing alone reaches{' '}
            {fmtInt(totalElev)} metres. That is Everest, sea to summit, more than nine times over, or Kilimanjaro
            fourteen times. The biggest single day put {fmtInt(biggestClimb?.elevation_gain_m)} metres underfoot at
            once, nearly two vertical kilometres in one hike. Almost none of it came from running.
          </p>
        </div>
        <Figure
          n="02"
          title="Total climb, on foot, as a range of Everests"
          note="Every hill, trail and staircase across the walking, running and hiking, drawn as the mountain range it adds up to: one Everest-height summit for each Everest climbed, with Kilimanjaro marked for scale. The final summit is only the leftover metres."
          source="Activity Log"
          tableCaption="Total foot elevation gain against Everest and Kilimanjaro"
          columns={['Measure', 'Value']}
          rows={[
            ['Total climb on foot', `${fmtInt(totalElev)} m`],
            ['Height of Everest', `${fmtInt(EVEREST)} m`],
            ['Everests climbed', fmtNum(totalElev / EVEREST, 1)],
            ['Kilimanjaros climbed', fmtNum(totalElev / KILI, 1)],
          ]}
        >
          <AscentProfile meters={totalElev} everest={EVEREST} kili={KILI} />
        </Figure>
      </section>

      {/* Energy burned, as food */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="03"
          title="Fuel: the burn, in plates of ugali"
          note="Strava totals the calories each activity burns. Across seven years that comes to over a million and a half, roughly two thousand seven hundred plates of ugali, or the better part of a thousand days of a body's resting energy, spent moving instead."
          source="Activity Log"
          tableCaption="Total calories burned and food equivalent"
          columns={['Measure', 'Value']}
          rows={[
            ['Total calories', `${fmtInt(totalKcal)} kcal`],
            ['Plates of ugali (~600 kcal)', fmtInt(totalKcal / 600)],
            ['Days of resting energy (~2000 kcal)', fmtInt(totalKcal / 2000)],
          ]}
        >
          <CaloriePlates kcal={totalKcal} kcalPerPlate={600} />
        </Figure>
      </section>

      {/* Milestone ladder */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="04"
          title="The road to ten thousand kilometres"
          note="Each rung is the day a running foot-distance total was crossed. The first thousand kilometres took two years of dabbling. The next fifteen hundred took three months, once July 2021 lit the fuse."
          source="Activity Log"
          tableCaption="Date each cumulative foot-distance milestone was crossed"
          columns={['Milestone', 'Crossed']}
          rows={ladder.map((l) => [l.km, l.date])}
        >
          <MilestoneLadder data={ladder} axisNote={`${fmtMon(days[0])} to ${fmtMon(days[days.length - 1])}`} />
        </Figure>
      </section>

      {/* Furthest, off a start line */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="05"
          title="Furthest in each discipline"
          note="Every way of travelling on foot leaves the same start line and runs its own lane to its single longest outing. On one shared distance axis the order is plain: a full marathon on the run out front, a long trail and a long walk in the thirties, the biggest hike barely past halfway."
          source="Activity Log"
          tableCaption="Longest single outing by discipline"
          columns={['Discipline', 'km', 'When']}
          rows={furthest.map((d) => [d.label, d.display, (d.sub || '').replace(/^·\s*/, '')])}
        >
          <DistanceStartLine data={furthest} />
        </Figure>
      </section>

      {/* Most loved, a burst of applause */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="06"
          title="A burst of applause"
          note="The six activities that drew the most kudos, each a ray leaving the centre as long as the cheers it earned. Running fills the burst; a single trail run breaks in among them."
          source="Activity Log"
          tableCaption="The six most-cheered activities by kudos"
          columns={['Activity', 'Kudos']}
          rows={loved.map((d) => [d.label, d.display])}
        >
          <KudosStarburst data={loved} />
        </Figure>
      </section>

      {/* PRs come in bursts */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="07"
          title="Records come in bursts"
          note="A personal record is Strava's flag for a best-ever split. Plotted as a rate per outing by year, they do not fade with age, they pulse: a spike in 2023, then the hungriest year on record in 2026, catching more bests per outing than ever. The dot grows with the number of records that year."
          source="Activity Log"
          tableCaption="Personal records per outing, and total, by year"
          columns={['Year', 'PRs / outing', 'Total PRs']}
          rows={prByYear.map((d) => [d.year, d.rate.toFixed(2), String(d.total)])}
        >
          <PRPulse data={prByYear} />
        </Figure>
      </section>

      {/* Tape measure footer stats */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--3">
          <StatCard value={fmtInt(totalDist)} unit=" km" label="Covered on foot, all time" source="Activity Log" />
          <StatCard value={fmtInt(Math.round(totalHours))} unit=" h" label="Spent moving on foot" source="Activity Log" />
          <StatCard value={fmtInt(days.length)} label={`Days active, ${activePct}% of the span`} source="Activity Log" />
        </div>
      </section>
    </DetailFrame>
  )
}

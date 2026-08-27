import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import Figure from '../charts/Figure.jsx'
import BarChart from '../charts/BarChart.jsx'
import RecordWall from '../charts/RecordWall.jsx'
import EverestLedger from '../charts/EverestLedger.jsx'
import MilestoneLadder from '../charts/MilestoneLadder.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const EVEREST = 8849 // metres, sea level to summit

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

// Tidy a Strava activity title for display: drop hashtags, turn "|" and stray
// "x" separators into middots, strip any separator left dangling at the end.
const clean = (s = '') =>
  s
    .replace(/#\S+/g, '')
    .replace(/\s*[|]\s*/g, ' · ')
    .replace(/\s+[xX]\s+/g, ' · ')
    .replace(/\s*[·|xX]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
const short = (s, n = 30) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…')

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
      detail: 'A marathon distance, in one run on the treadmill',
      date: fmtFull(furthestRun?.date),
    },
    {
      value: fmtInt(biggestClimb?.elevation_gain_m),
      unit: 'm up',
      title: 'Biggest climb',
      detail: short(clean(biggestClimb?.name), 30),
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
      detail: short(clean(mostKudos?.name), 30),
      date: fmtFull(mostKudos?.date),
    },
  ]

  // ---- aggregate tape measure ----
  const totalDist = foot.reduce((s, a) => s + (toNum(a.distance_km) || 0), 0)
  const totalElev = foot.reduce((s, a) => s + (toNum(a.elevation_gain_m) || 0), 0)
  const totalHours = foot.reduce((s, a) => s + (toNum(a.moving_time_min) || 0), 0) / 60

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

  // ---- Kili Half Marathon, the annual return ----
  const kili = activities
    .filter((a) => /kili/i.test(a.name || '') && /half/i.test(a.name || ''))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const kiliBars = kili.map((a) => ({
    label: parseDay(a.date).getUTCFullYear().toString(),
    value: toNum(a.moving_time_min),
    display: `${Math.floor(toNum(a.moving_time_min) / 60)}h ${Math.round(toNum(a.moving_time_min) % 60)}m`,
    sub: `· ${fmtInt(a.kudos)} kudos`,
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

  // ---- most-loved activities ----
  const loved = [...activities]
    .filter((a) => toNum(a.kudos) > 0)
    .sort((a, b) => toNum(b.kudos) - toNum(a.kudos))
    .slice(0, 6)
    .map((a) => ({
      label: short(clean(a.name), 30),
      value: toNum(a.kudos),
      display: fmtInt(a.kudos),
      unit: 'kudos',
    }))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Records' }]}
      number="04"
      title="Records"
      subtitle="The far edges of seven years"
      lede="Not the averages this time, but the outliers: the single longest day, the steepest climb, the streak that would not break, and the metres that stack up to something the size of mountains."
      prev={prev}
      next={next}
    >
      {/* The record wall */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <RecordWall records={records} />
        <p className="source" style={{ marginTop: 'var(--sp-4)' }}>Source: Activity Log</p>
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
            Add up every hill, every trail and every set of stairs across all the walking, running and hiking, and
            the climbing alone comes to {fmtInt(totalElev)} metres. That is Everest, from the beach to the summit,
            more than nine times over.
          </p>
        </div>
        <Figure
          title="Total climb, on foot, measured in Everests"
          note="Each triangle is one ascent of Everest from sea level, 8,849 metres. The last one fills only as far as the leftover metres reach."
          source="Activity Log"
          tableCaption="Total foot elevation gain against Everest"
          columns={['Measure', 'Value']}
          rows={[
            ['Total climb on foot', `${fmtInt(totalElev)} m`],
            ['Height of Everest', `${fmtInt(EVEREST)} m`],
            ['Everests climbed', fmtNum(totalElev / EVEREST, 1)],
          ]}
        >
          <EverestLedger meters={totalElev} everest={EVEREST} />
        </Figure>
      </section>

      {/* Milestone ladder */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="The road to ten thousand kilometres"
          note="Each rung is the day a running total of foot distance was crossed, placed along the full seven-year span. The first thousand took two years; the fifteen hundred after it took three months."
          source="Activity Log"
          tableCaption="Date each cumulative foot-distance milestone was crossed"
          columns={['Milestone', 'Crossed']}
          rows={ladder.map((l) => [l.km, l.date])}
        >
          <MilestoneLadder data={ladder} axisNote={`${fmtMon(days[0])} to ${fmtMon(days[days.length - 1])}`} />
        </Figure>
      </section>

      {/* Kili Half Marathon */}
      {kiliBars.length > 1 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            title="The Kilimanjaro Half, every year"
            note="The same half marathon at the foot of Kilimanjaro, run four years running. Each bar is a finishing time; shorter is faster, and the trend is downward. The crowd shows up too, with the 2023 edition the single most-cheered activity of all."
            source="Activity Log"
            tableCaption="Kilimanjaro Half Marathon finishing time and kudos by year"
            columns={['Year', 'Time', 'Kudos']}
            rows={kili.map((a) => [
              parseDay(a.date).getUTCFullYear().toString(),
              `${Math.floor(toNum(a.moving_time_min) / 60)}h ${Math.round(toNum(a.moving_time_min) % 60)}m`,
              fmtInt(a.kudos),
            ])}
          >
            <BarChart data={kiliBars} showRank={false} />
          </Figure>
        </section>
      )}

      {/* Furthest + most loved */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Furthest in each discipline"
            note="The single longest outing for each way of travelling on foot."
            source="Activity Log"
            columns={['Discipline', 'km']}
            rows={furthest.map((d) => [d.label, d.display])}
          >
            <BarChart data={furthest} showRank />
          </Figure>
          <Figure
            title="The most-loved activities"
            note="The six that pulled in the most kudos. The Kilimanjaro races and a trail marathon top the list."
            source="Activity Log"
            columns={['Activity', 'Kudos']}
            rows={loved.map((d) => [d.label, d.display])}
          >
            <BarChart data={loved} showRank />
          </Figure>
        </div>
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

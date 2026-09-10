import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import DataTable from '../components/DataTable.jsx'
import Figure from '../charts/Figure.jsx'
import CalendarHeatmap from '../charts/CalendarHeatmap.jsx'
import StreakRibbon from '../charts/StreakRibbon.jsx'
import WeekStreakGrid from '../charts/WeekStreakGrid.jsx'
import SeasonWheel from '../charts/SeasonWheel.jsx'
import Matrix from '../charts/Matrix.jsx'
import EffortTide from '../charts/EffortTide.jsx'
import EffortPerKm from '../charts/EffortPerKm.jsx'
import DoublesBar from '../charts/DoublesBar.jsx'
import MiniTrend from '../charts/MiniTrend.jsx'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BUCKETS = [
  ['Early Morning (4-7)', '4–7'],
  ['Morning (7-11)', '7–11'],
  ['Midday (11-14)', '11–14'],
  ['Afternoon (14-17)', '14–17'],
  ['Evening (17-20)', '17–20'],
  ['Night (20-4)', '20–4'],
]

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtMonYr = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${MON3[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
// Monday (ISO) of the week a given YYYY-MM-DD falls in
const weekMondayOf = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`)
  const back = (d.getUTCDay() + 6) % 7 // 0 = Monday
  d.setUTCDate(d.getUTCDate() - back)
  return d.toISOString().slice(0, 10)
}

export default function Rhythm() {
  const activities = useTable('activities')
  const monthly = useTable('monthly_totals')
  const io = useTable('indoor_outdoor')
  const effort = useTable('relative_effort_by_year')
  const pace = useTable('pace_zones')
  const hr = useTable('hr_zones')
  const streaks = useKeyed('streaks', 'metric', 'value')
  const { prev, next } = useSectionPaging('/rhythm')

  // daily counts for the calendar
  const counts = {}
  const years = new Set()
  for (const a of activities) {
    const d = (a.date || '').slice(0, 10)
    if (!d) continue
    counts[d] = (counts[d] || 0) + 1
    years.add(Number(d.slice(0, 4)))
  }
  const yearList = [...years].sort()

  // streak range (Fun Stats: "2025-12-29 → 2026-08-24")
  const streakDatesRaw = streaks['Streak dates'] || ''
  const mDates = streakDatesRaw.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/)
  const streakStart = mDates ? mDates[1] : null
  const streakEnd = mDates ? mDates[2] : null
  const streakLen = streaks['Longest consecutive-day streak'] || streaks['Current streak (as of last activity)'] || ''

  // weekly streak: consecutive Mon-Sun weeks with at least one activity, ending
  // at the most recent activity's week (this is Strava's "week streak")
  const weekCounts = {}
  for (const a of activities) {
    const d = (a.date || '').slice(0, 10)
    if (!d) continue
    const wk = weekMondayOf(d)
    weekCounts[wk] = (weekCounts[wk] || 0) + 1
  }
  const activeWeeks = Object.keys(weekCounts).sort()
  const weekRun = []
  if (activeWeeks.length) {
    let cursor = activeWeeks[activeWeeks.length - 1]
    while (weekCounts[cursor] != null) {
      weekRun.push({ key: cursor, n: weekCounts[cursor] })
      const prev = new Date(`${cursor}T00:00:00Z`)
      prev.setUTCDate(prev.getUTCDate() - 7)
      cursor = prev.toISOString().slice(0, 10)
    }
    weekRun.reverse() // chronological, oldest first
  }
  const weekStreakLen = weekRun.length
  const weekStreakStart = weekRun.length ? weekRun[0].key : null
  // per-52-week-block summary for the readable table
  const weekBlocks = []
  for (let i = 0; i < weekRun.length; i += 52) {
    const block = weekRun.slice(i, i + 52)
    weekBlocks.push([
      `${fmtMonYr(block[0].key)} onward`,
      String(block.length),
      String(block.reduce((s, w) => s + w.n, 0)),
    ])
  }

  // weekday x time-of-day matrix
  const matrix = WEEKDAYS.map(() => BUCKETS.map(() => 0))
  for (const a of activities) {
    const r = WEEKDAYS.indexOf(a.weekday)
    const c = BUCKETS.findIndex(([full]) => full === a.time_bucket)
    if (r >= 0 && c >= 0) matrix[r][c] += 1
  }

  const indoor = io.find((r) => /indoor|trainer/i.test(r.setting)) || {}
  const outdoor = io.find((r) => /outdoor/i.test(r.setting)) || {}

  // text equivalents for the charts (screen readers / readable as text)
  const calRows = yearList.map((y) => {
    let days = 0
    let acts = 0
    for (const [d, n] of Object.entries(counts)) {
      if (d.slice(0, 4) === String(y)) {
        days += 1
        acts += n
      }
    }
    return [String(y), String(days), String(acts)]
  })
  const matrixCols = ['Weekday', ...BUCKETS.map((b) => b[1])]
  const matrixRows = WEEKDAYS.map((w, r) => [w, ...BUCKETS.map((_, c) => String(matrix[r][c]))])

  // yearly effort/cadence series for the mini charts beside the table
  const effortSorted = [...effort].sort((a, b) => Number(a.year) - Number(b.year))
  const effYears = effortSorted.map((r) => r.year)
  const effStart = effYears[0]
  const effEnd = effYears[effYears.length - 1]
  const cadenceSeries = effortSorted.map((r) => toNum(r.avg_cadence) || 0).filter((v) => v > 0)
  const avgEffortSeries = effortSorted.map((r) => toNum(r.avg_relative_effort) || 0)

  // effort spent per km on foot, by year (fitness made visible)
  const FOOT_R = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
  const epkAgg = {}
  for (const a of activities) {
    if (!FOOT_R.has(a.sport_type)) continue
    const re = toNum(a.relative_effort)
    const km = toNum(a.distance_km)
    if (re > 0 && km > 0.3 && a.year) {
      const e = (epkAgg[a.year] = epkAgg[a.year] || { e: 0, k: 0 })
      e.e += re
      e.k += km
    }
  }
  const effortPerKm = Object.keys(epkAgg).sort().map((y) => ({ year: y, value: epkAgg[y].e / epkAgg[y].k, thin: epkAgg[y].k < 400 }))

  // active days by activities-per-day: singles, doubles, three-plus
  const perDay = {}
  for (const a of activities) {
    const d = (a.date || '').slice(0, 10)
    if (d) perDay[d] = (perDay[d] || 0) + 1
  }
  const dayVals = Object.values(perDay)
  const doublesSegs = [
    { label: 'One a day', days: dayVals.filter((v) => v === 1).length },
    { label: 'Two a day', days: dayVals.filter((v) => v === 2).length },
    { label: 'Three or more', days: dayVals.filter((v) => v >= 3).length },
  ]
  const multiPct = Math.round((100 * dayVals.filter((v) => v >= 2).length) / dayVals.length)

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Rhythm' }]}
      number="06"
      title="Rhythm"
      subtitle="When. And how hard."
      lede="The training runs like a metronome. More than half of all calendar days carry an activity, and when one day is active the next usually is too. This is when the work happens, how hard it has settled, and the two streaks, 253 days and 156 weeks, both still alive."
      prev={prev}
      next={next}
    >
      {/* Weekly streak: the three-year milestone */}
      {weekStreakLen >= 8 && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            title="Three years, every single week"
            note={`Strava counts a week streak as consecutive weeks with at least one activity. This run reached ${weekStreakLen} weeks, ${(weekStreakLen / 52).toFixed(weekStreakLen % 52 ? 1 : 0)} years without a gap, starting the week of ${fmtMonYr(weekStreakStart)}, and it is still going. Each cell is a week, one row per year, shaded by how busy that week was.`}
            source="Activity Log"
            tableCaption="Weekly activity across the streak, by year of the run"
            columns={['Stretch', 'Weeks', 'Activities']}
            rows={weekBlocks}
          >
            <WeekStreakGrid weeks={weekRun} />
          </Figure>
        </section>
      )}

      {/* The streak, as one unbroken thread */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="The streak, unbroken"
          note={`The current run of ${streakLen || 'consecutive active days'}, drawn as one continuous thread. Every day is a stitch, taller where more was logged, and the thread has not broken once. The open end is today: it is still going.`}
          source="Activity Log + Fun Stats"
          tableCaption="Current active-day streak"
          columns={['Streak', 'Span']}
          rows={[[streakLen || '', `${streakStart || ''} to ${streakEnd || ''}`]]}
        >
          <StreakRibbon counts={counts} start={streakStart} end={streakEnd} />
        </Figure>
      </section>

      {/* Consistency calendar */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="Every active day"
          note={`Each square is a day, and darker means more activities. The orange stretch is the current run of ${streakLen || 'the streak'}, the longest I've gone without a gap, and it's still alive.`}
          source="Activity Log + Fun Stats"
          tableCaption="Active days and activities per year"
          columns={['Year', 'Active days', 'Activities']}
          rows={calRows}
        >
          <CalendarHeatmap counts={counts} years={yearList} streakStart={streakStart} streakEnd={streakEnd} />
          <div className="chart-legend">
            <span><i className="chart-swatch" style={{ background: 'var(--grey-06)' }} /> none</span>
            <span><i className="chart-swatch" style={{ background: 'var(--grey-45)' }} /> some</span>
            <span><i className="chart-swatch" style={{ background: 'var(--ink)' }} /> most</span>
            <span><i className="chart-swatch" style={{ background: 'var(--accent)' }} /> current streak</span>
          </div>
        </Figure>
      </section>

      {/* Doubles: more than once a day */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          n="03"
          title="Twice in a day, a third of the time"
          note={`Every active day, sorted by how many activities it held. On ${multiPct}% of them there was more than one outing, and a handful of days packed in five. Once the habit took hold, one session a day often was not the whole day.`}
          source="Activity Log"
          tableCaption="Active days by number of activities that day"
          columns={['Activities that day', 'Days']}
          rows={doublesSegs.map((s) => [s.label, String(s.days)])}
        >
          <DoublesBar segs={doublesSegs} />
        </Figure>
      </section>

      {/* Indoor vs outdoor */}
      <section aria-label="Indoor versus outdoor" style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <StatCard value={fmtInt(outdoor.activities)} label="Outdoor activities" note={`${fmtNum(outdoor.distance_km, 0)} km in the open.`} source="Fun Stats" />
          <StatCard value={fmtInt(indoor.activities)} label="Indoor / trainer" note={`${fmtNum(indoor.distance_km, 0)} km on the treadmill, more than the open-air total.`} source="Fun Stats" />
        </div>
      </section>

      {/* Seasonality wheel: the shape of the training year */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <Figure
          title="The shape of the year"
          note="Every activity placed on a twelve-month wheel, so the training year reads as a silhouette rather than a row of bars. The cool dry months around midyear bulge out; the short rains pull it in. Pick a single year to see how its rhythm compares."
          source="Monthly Trends"
          tableCaption="Activities by calendar month, all years combined"
          columns={['Month', 'Activities']}
          rows={monthly.reduce((acc, m) => {
            const mi = Number((m.month || '').slice(5, 7))
            if (mi >= 1 && mi <= 12) acc[mi - 1][1] += toNum(m.activities) || 0
            return acc
          }, MON3.map((mn) => [mn, 0])).map((r) => [r[0], fmtInt(r[1])])}
        >
          <SeasonWheel rows={monthly} />
        </Figure>
      </section>

      {/* Weekday x time heatmap  +  total relative effort, side by side */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <Figure
            title="Weekday × time of day"
            note="Where the activities fall across the week. The single busiest slot is picked out in orange."
            source="Activity Log"
            tableCaption="Activity count by weekday and time of day"
            columns={matrixCols}
            rows={matrixRows}
          >
            <Matrix
              rowLabels={WEEKDAYS}
              colLabels={BUCKETS.map((b) => b[1])}
              get={(r, c) => matrix[r][c]}
              unit="activities"
              rowH={50}
            />
          </Figure>
          <Figure
            title="The effort tide"
            note="The season's total cardiovascular load, rising and ebbing like a tide off a shore line. 2021 was high tide by a distance; then it drew back as fitness caught up and each session cost less, before 2026 began flooding back in."
            source="Zones & Effort"
            tableCaption="Total relative effort by year"
            columns={['Year', 'Total relative effort']}
            rows={effort.map((r) => [r.year, r.total_relative_effort])}
          >
            <EffortTide
              data={[...effort]
                .sort((a, b) => Number(a.year) - Number(b.year))
                .map((r) => ({ label: r.year, value: toNum(r.total_relative_effort) }))}
              fmt={(v) => fmtInt(v)}
            />
          </Figure>
        </div>
      </section>

      {/* Effort per km: fitness made visible */}
      {effortPerKm.length > 2 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="04"
            title="The falling price of a kilometre"
            note="Relative effort divides how hard a session felt by how far it went. Read by year, the cost of a single kilometre on foot falls from about fourteen points in 2019 to under four: the same ground, a fraction of the toll, as fitness rose. The earliest two years rest on light samples and are drawn faint."
            source="Activity Log + Zones & Effort"
            tableCaption="Relative effort spent per km on foot, by year"
            columns={['Year', 'Effort per km']}
            rows={effortPerKm.map((d) => [d.year, d.value.toFixed(1)])}
          >
            <EffortPerKm data={effortPerKm} />
          </Figure>
        </section>
      )}

      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
          Effort and cadence, year by year
        </p>
        <div className="grid grid--2" style={{ alignItems: 'start' }}>
          <div>
            <DataTable
              caption="Total and average relative effort per year"
              columns={[
                { key: 'year', label: 'Year', mono: true },
                { key: 'total_relative_effort', label: 'Total effort', align: 'right', mono: true, render: (r) => fmtInt(r.total_relative_effort) },
                { key: 'avg_relative_effort', label: 'Avg / activity', align: 'right', mono: true, render: (r) => fmtInt(r.avg_relative_effort) },
                { key: 'avg_cadence', label: 'Avg cadence', align: 'right', mono: true, render: (r) => fmtNum(r.avg_cadence) },
              ]}
              rows={effort}
            />
            <p className="source" style={{ marginTop: 'var(--sp-3)' }}>Source: Zones &amp; Effort</p>
          </div>
          <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
            <MiniTrend
              values={cadenceSeries}
              startLabel={effStart}
              endLabel={effEnd}
              caption="Avg cadence per year (spm)"
              fmt={(v) => v.toFixed(0)}
            />
            <MiniTrend
              values={avgEffortSeries}
              startLabel={effStart}
              endLabel={effEnd}
              caption="Avg effort per activity"
              fmt={(v) => fmtInt(v)}
            />
          </div>
        </div>
      </section>

      {/* Zones */}
      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>
          Training zones
        </p>
        <div className="grid grid--2">
          <div>
            <p className="mono" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>Heart-rate zones (bpm)</p>
            <DataTable
              caption="Heart-rate zones"
              columns={[
                { key: 'zone', label: 'Zone', mono: true },
                { key: 'min_bpm', label: 'Min', align: 'right', mono: true },
                { key: 'max_bpm', label: 'Max', align: 'right', mono: true, render: (r) => r.max_bpm || '+' },
              ]}
              rows={hr}
            />
          </div>
          <div>
            <p className="mono" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>Run pace zones (min/km)</p>
            <DataTable
              caption="Run pace zones"
              columns={[
                { key: 'zone', label: 'Zone', mono: true },
                { key: 'min_per_km', label: 'From', align: 'right', mono: true, render: (r) => r.min_per_km || '·' },
                { key: 'max_per_km', label: 'To', align: 'right', mono: true, render: (r) => r.max_per_km || '·' },
              ]}
              rows={pace}
            />
          </div>
        </div>
        <p className="source" style={{ marginTop: 'var(--sp-3)' }}>Source: Zones &amp; Effort</p>
      </section>
    </DetailFrame>
  )
}

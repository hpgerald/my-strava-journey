import DetailFrame from '../components/DetailFrame.jsx'
import StatCard from '../components/StatCard.jsx'
import DataTable from '../components/DataTable.jsx'
import Figure from '../charts/Figure.jsx'
import CalendarHeatmap from '../charts/CalendarHeatmap.jsx'
import Matrix from '../charts/Matrix.jsx'
import Columns from '../charts/Columns.jsx'
import MiniTrend from '../charts/MiniTrend.jsx'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, fmtNum, toNum } from '../lib/format.js'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const BUCKETS = [
  ['Early Morning (4-7)', '4–7'],
  ['Morning (7-11)', '7–11'],
  ['Midday (11-14)', '11–14'],
  ['Afternoon (14-17)', '14–17'],
  ['Evening (17-20)', '17–20'],
  ['Night (20-4)', '20–4'],
]

export default function Rhythm() {
  const activities = useTable('activities')
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

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Rhythm' }]}
      number="06"
      title="Rhythm"
      subtitle="When, and how hard"
      lede="When the training actually happens: which days fill up the calendar, what time of day I head out, indoors versus outside, and how the effort has settled year on year."
      prev={prev}
      next={next}
    >
      {/* Consistency calendar */}
      <section style={{ paddingTop: 'var(--sp-6)' }}>
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

      {/* Indoor vs outdoor */}
      <section aria-label="Indoor versus outdoor" style={{ paddingTop: 'var(--sp-7)' }}>
        <div className="grid grid--2">
          <StatCard value={fmtInt(outdoor.activities)} label="Outdoor activities" note={`${fmtNum(outdoor.distance_km, 0)} km in the open.`} source="Fun Stats" />
          <StatCard value={fmtInt(indoor.activities)} label="Indoor / trainer" note={`${fmtNum(indoor.distance_km, 0)} km on treadmill or trainer.`} source="Fun Stats" />
        </div>
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
            />
          </Figure>
          <Figure
            title="Total relative effort by year"
            note="The season's overall cardiovascular load. It climbed as the training grew, then eased as fitness caught up, and 2026 is on the up again."
            source="Zones & Effort"
            tableCaption="Total relative effort by year"
            columns={['Year', 'Total relative effort']}
            rows={effort.map((r) => [r.year, r.total_relative_effort])}
          >
            <Columns
              data={effort.map((r) => ({ label: r.year, value: toNum(r.total_relative_effort) }))}
              unit="effort"
              formatY={(v) => fmtInt(v)}
            />
          </Figure>
        </div>
      </section>

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

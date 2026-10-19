import DetailFrame from '../components/DetailFrame.jsx'
import Tag from '../components/Tag.jsx'
import Figure from '../charts/Figure.jsx'
import PulseYears from '../charts/PulseYears.jsx'
import LostYearThread from '../charts/LostYearThread.jsx'
import HabitAtlas from '../charts/HabitAtlas.jsx'
import { useTable, useKeyed } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'

export default function Timeline() {
  const rows = useTable('timeline')
  const monthly = useTable('monthly_totals')
  const streaks = useKeyed('streaks', 'metric', 'value')
  const dayStreak = parseInt(streaks['Longest consecutive-day streak'], 10) || 273
  const { prev, next } = useSectionPaging('/timeline')

  // chronological, earliest first
  const items = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Timeline' }]}
      number="08"
      title="Timeline"
      subtitle="In order. First upload to now."
      lede={`Seven years in the order they happened. It opens with a scatter of entries that could easily have faded out, goes silent for 353 straight days, then starts and does not stop. The round-number milestones, the standout days, the borders crossed, all laid in a line, so you can watch a hobby turn into something that looks permanent.`}
      prev={prev}
      next={next}
    >
      {monthly.length > 3 && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>The whole record, year by year</p>
          <Figure
            title="The habit atlas"
            note="Read from the centre out and the quiet years give way to full ones. The two faint rings in the middle are the years before the switch; each ring outward is darker and busier. Seven years drawn as rings, the oldest at the core, each twelve months around and shaded by how busy the month was. Pick a year to read its busiest month and a line about it."
            source="Monthly Trends"
            tableCaption="Activities per year, with the busiest month"
            columns={['Year', 'Activities']}
            rows={[...new Set(monthly.map((m) => m.month.slice(0, 4)))].sort().map((y) => [y, monthly.filter((m) => m.month.slice(0, 4) === y).reduce((a, m) => a + (Number(m.activities) || 0), 0)])}
          >
            <HabitAtlas rows={monthly} />
          </Figure>
        </section>
      )}

      {monthly.length > 3 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="02"
            title="Seven years, one pulse"
            note="The record has a heartbeat, and you can see the moment it quickens. Every month is a beat off the centre line, as tall as the activities it held. For two years it barely registers. Then one month it jumps all at once, and it has not settled since."
            source="Monthly Trends"
            tableCaption="Activities logged per month"
            columns={['Month', 'Activities']}
            rows={monthly.map((m) => [m.month, m.activities])}
          >
            <PulseYears rows={monthly} switchMonth="2021-07" />
          </Figure>
        </section>
      )}

      {monthly.length > 3 && (
        <section style={{ paddingTop: 'var(--sp-7)' }}>
          <Figure
            n="03"
            title="The lost year"
            note="The longest silence in the record sits right before the habit that replaced it. Zoom in on the two years around the switch: some activity through the first half of 2020, then 353 straight days with nothing logged, then the switch and a return that never stopped."
            source="Activity Log + Monthly Trends"
            tableCaption="Activities per month through the lost year"
            columns={['Month', 'Activities']}
            rows={monthly.filter((m) => m.month >= '2020-01' && m.month <= '2021-12').map((m) => [m.month, m.activities])}
          >
            <LostYearThread rows={monthly} spikeMonth="2020-07" igniteMonth="2021-07" from="2020-01" to="2021-12" />
          </Figure>
        </section>
      )}

      <section aria-label="Timeline" style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Milestones, in order</p>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--sp-5)', fontSize: 'var(--fs-sm)' }}>
          In order, from the first upload to now. Each dot marks a moment along the way.
        </p>
        <ol className="htimeline">
          {items.map((it, i) => (
            <li className="htl" key={i}>
              <span className="htl__dot" aria-hidden="true" />
              <div className="htl__meta">
                <span className="htl__idx mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="htl__date mono">{(it.date || '').slice(0, 10)}</span>
              </div>
              {it.category ? <Tag>{it.category}</Tag> : null}
              <h2 className="htl__label">{it.label}</h2>
              {it.note ? <p className="htl__note">{it.note}</p> : null}
              {it.source_page ? (
                <div className="source" style={{ marginTop: 'var(--sp-2)' }}>Source: {it.source_page}</div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </DetailFrame>
  )
}

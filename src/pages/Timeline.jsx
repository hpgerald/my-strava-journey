import DetailFrame from '../components/DetailFrame.jsx'
import Tag from '../components/Tag.jsx'
import Figure from '../charts/Figure.jsx'
import PulseYears from '../charts/PulseYears.jsx'
import LostYearThread from '../charts/LostYearThread.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'

export default function Timeline() {
  const rows = useTable('timeline')
  const monthly = useTable('monthly_totals')
  const { prev, next } = useSectionPaging('/timeline')

  // chronological, earliest first
  const items = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Timeline' }]}
      number="08"
      title="Timeline"
      subtitle="In order. First upload to now."
      lede="Seven years in order, from a single noon bike ride to a 253-day streak still running. The round-number milestones, the standout days, the borders crossed. Every entry dated and sourced."
      prev={prev}
      next={next}
    >
      {monthly.length > 3 && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            title="Seven years, one pulse"
            note="Every month is a beat mirrored off the centre line, as tall as the activities it held. For two years the pulse barely registers. The month the switch is thrown, July 2021, it quickens all at once and it has not settled back since."
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
            n="02"
            title="The lost year, in three beats"
            note="Zoom in on the two years around the switch and the whole arc is there. The biggest single day ever recorded, a 240 km ride across the border into Kenya, then 353 days with nothing logged, then July 2021 and a return that never stopped. The largest effort on record sits right before the longest silence."
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

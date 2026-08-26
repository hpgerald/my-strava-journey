import DetailFrame from '../components/DetailFrame.jsx'
import Tag from '../components/Tag.jsx'
import Figure from '../charts/Figure.jsx'
import AreaLine from '../charts/AreaLine.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'
import { fmtInt, toNum } from '../lib/format.js'

export default function Timeline() {
  const rows = useTable('timeline')
  const monthly = useTable('monthly_totals')
  const { prev, next } = useSectionPaging('/timeline')

  // chronological, earliest first
  const items = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // monthly activity rhythm as context
  const monthPts = monthly
    .map((m) => {
      const t = Date.parse(`${m.month}-01T00:00:00`)
      return { x: t, y: toNum(m.activities) || 0, label: m.month }
    })
    .filter((p) => Number.isFinite(p.x))
    .sort((a, b) => a.x - b.x)

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Timeline' }]}
      number="08"
      title="Timeline"
      subtitle="The story in order"
      lede="The story in order: the first upload, the round-number milestones, a few standout days, the trips abroad, and the streak that's still going. Every entry is dated and sourced."
      prev={prev}
      next={next}
    >
      {monthPts.length > 3 && (
        <section style={{ paddingTop: 'var(--sp-6)' }}>
          <Figure
            title="Activities per month"
            note="How many activities I logged each month, the rhythm those milestones below sit on top of."
            source="Monthly Trends"
            tableCaption="Activities logged per month"
            columns={['Month', 'Activities']}
            rows={monthly.map((m) => [m.month, m.activities])}
          >
            <AreaLine points={monthPts} height={200} yUnit="activities" formatX={(p) => p.label} formatY={(v) => fmtInt(v)} />
          </Figure>
        </section>
      )}

      <section aria-label="Timeline" style={{ paddingTop: 'var(--sp-7)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Milestones, in order</p>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--sp-5)', fontSize: 'var(--fs-sm)' }}>
          Read left to right, top to bottom. Each dot is a marker on the way from the first upload to now.
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

import { useState, useMemo } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import Figure from '../charts/Figure.jsx'
import Slopegraph from '../charts/Slopegraph.jsx'
import { useTable } from '../context/DataContext.jsx'
import { useSectionPaging } from '../lib/sections.js'

function FilterRow({ label, values, counts, active, onSelect }) {
  return (
    <div role="group" aria-label={label} style={{ marginBottom: 'var(--sp-4)' }}>
      <div className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {values.map((v) => {
          const isActive = active === v
          return (
            <button
              key={v}
              type="button"
              className={`filterbtn u-invert ${isActive ? 'is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => onSelect(v)}
              style={{
                border: '1px solid var(--ink)',
                padding: '0.3em 0.7em',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-2xs)',
                letterSpacing: 'var(--tr-wide)',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {v}
              {counts && counts[v] != null ? (
                <span style={{ opacity: 0.6, marginLeft: '0.5em' }}>{counts[v]}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Numbers() {
  const comparisons = useTable('comparisons')
  const { prev, next } = useSectionPaging('/numbers')

  const [cat, setCat] = useState('All')
  const [dim, setDim] = useState('All')

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(comparisons.map((c) => c.category)))],
    [comparisons]
  )
  const dimensions = useMemo(
    () => ['All', ...Array.from(new Set(comparisons.map((c) => c.dimension)))],
    [comparisons]
  )

  const catCounts = useMemo(() => {
    const m = { All: comparisons.length }
    for (const c of comparisons) m[c.category] = (m[c.category] || 0) + 1
    return m
  }, [comparisons])
  const dimCounts = useMemo(() => {
    const m = { All: comparisons.length }
    for (const c of comparisons) m[c.dimension] = (m[c.dimension] || 0) + 1
    return m
  }, [comparisons])

  const filtered = comparisons.filter(
    (c) => (cat === 'All' || c.category === cat) && (dim === 'All' || c.dimension === dim)
  )

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'By the Numbers' }]}
      number="02"
      title="By the Numbers"
      subtitle="Then against now"
      lede="Every headline figure, the first five months of 2019 against 2026 so far. The change is not incremental, it is categorical: a 27-activity dabble turned into a way of life. The bars share a scale; the real numbers sit underneath. Filter by category or measure."
      prev={prev}
      next={next}
    >
      <section aria-label="Filters" style={{ paddingTop: 'var(--sp-6)' }}>
        <FilterRow label="Category" values={categories} counts={catCounts} active={cat} onSelect={setCat} />
        <FilterRow label="Measure" values={dimensions} counts={dimCounts} active={dim} onSelect={setDim} />
        <p className="mono" style={{ fontSize: 'var(--fs-sm)' }} aria-live="polite">
          Showing {filtered.length} of {comparisons.length} figures.
        </p>
      </section>

      <section aria-label="Comparisons" style={{ paddingTop: 'var(--sp-5)' }}>
        {filtered.length === 0 ? (
          <p className="text-muted">No figures match this combination.</p>
        ) : (
          <Figure
            title="Then against now, indexed"
            note="Every metric starts from its 2019 baseline on the left and fans to its 2026 multiple on the right, on a log scale. Orange rises, grey falls. Almost everything multiplied many times over; only ride distance and the effort each session costs went the other way."
            source="Yearly Trends + Activity Log"
            tableCaption="2019 baseline versus 2026 for each metric"
            columns={['Metric', '2019', '2026', 'Change']}
            rows={filtered.map((c) => [c.metric, c.baseline_value, c.target_value, c.direction])}
          >
            <Slopegraph rows={filtered} />
          </Figure>
        )}
      </section>
    </DetailFrame>
  )
}

import { useState, useMemo } from 'react'
import DetailFrame from '../components/DetailFrame.jsx'
import CompareBar from '../components/CompareBar.jsx'
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
      subtitle="Then versus now, side by side"
      lede="Each headline figure, then against now: my first five months in 2019 next to 2026 so far. The two bars share a scale, and the real numbers sit underneath. Filter by category or by what's being measured."
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

      <section aria-label="Comparisons" style={{ paddingTop: 'var(--sp-4)' }}>
        {filtered.length === 0 ? (
          <p className="text-muted">No figures match this combination.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 0,
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 22rem), 1fr))',
              borderTop: '1px solid var(--rule)',
              borderLeft: '1px solid var(--rule)',
            }}
          >
            {filtered.map((c, i) => (
              <div
                key={i}
                style={{
                  borderRight: '1px solid var(--rule)',
                  borderBottom: '1px solid var(--rule)',
                  padding: 'var(--sp-5)',
                }}
              >
                <CompareBar
                  label={c.metric}
                  baselineLabel={c.baseline_label}
                  baselineValue={c.baseline_value}
                  targetLabel={c.target_label}
                  targetValue={c.target_value}
                  unit={c.unit}
                  direction={c.direction}
                  plain={c.plain_language}
                  source={c.source_page}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </DetailFrame>
  )
}

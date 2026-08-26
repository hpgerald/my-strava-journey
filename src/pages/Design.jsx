import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'
import StatCard from '../components/StatCard.jsx'
import IndexHub from '../components/IndexHub.jsx'
import Tag from '../components/Tag.jsx'
import CompareBar from '../components/CompareBar.jsx'
import { useTable } from '../context/DataContext.jsx'
import { fmtInt, fmtCompact } from '../lib/format.js'

const GREYS = [
  ['--ink', 'ink #111'],
  ['--grey-85', 'grey-85'],
  ['--grey-70', 'grey-70'],
  ['--grey-55', 'grey-55'],
  ['--grey-45', 'grey-45'],
  ['--grey-35', 'grey-35'],
  ['--grey-25', 'grey-25'],
  ['--grey-15', 'grey-15'],
  ['--grey-06', 'grey-06'],
  ['--paper', 'paper #fff'],
  ['--accent', 'accent'],
]

const TYPE = [
  ['--fs-4xl', 'Display 4xl', 'display'],
  ['--fs-3xl', 'Display 3xl', 'display'],
  ['--fs-2xl', 'Heading 2xl', 'display'],
  ['--fs-xl', 'Heading xl', ''],
  ['--fs-lg', 'Heading lg', ''],
  ['--fs-md', 'Subhead md', ''],
  ['--fs-base', 'Body base', ''],
  ['--fs-sm', 'Small sm', ''],
  ['--fs-xs', 'Caption xs', 'mono'],
]

function Block({ title, children }) {
  return (
    <section style={{ paddingBlock: 'var(--sp-6)' }}>
      <hr className="rule" />
      <p className="eyebrow" style={{ marginBlock: 'var(--sp-4) var(--sp-5)' }}>
        {title}
      </p>
      {children}
    </section>
  )
}

export default function Design() {
  const lifetime = useTable('lifetime_totals')
  const comparisons = useTable('comparisons')
  const byMetric = (m) => lifetime.find((r) => (r.metric || '').toLowerCase().includes(m)) || {}
  const cmp = comparisons[1] || {} // "Distance in the year"

  const km = byMetric('total km')
  const acts = byMetric('activities')
  const cal = byMetric('calories')

  return (
    <Layout>
      <Container>
        <header style={{ paddingBlock: 'var(--sp-7) var(--sp-4)' }}>
          <p className="eyebrow">Design system</p>
          <h1 className="display" style={{ fontSize: 'var(--fs-3xl)' }}>
            Black, white, grey.
          </h1>
          <p className="measure text-muted">
            Meaning comes from type, scale, rules and whitespace, never colour. Interactive
            elements invert to solid ink on hover and keyboard focus.
          </p>
        </header>

        <Block title="Palette / grey ramp">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            {GREYS.map(([v, label]) => (
              <div key={v} style={{ width: 92 }}>
                <div
                  style={{
                    height: 64,
                    background: `var(${v})`,
                    border: '1px solid var(--grey-25)',
                  }}
                />
                <div className="source" style={{ marginTop: 4 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Type scale">
          <div className="stack">
            {TYPE.map(([v, label, cls]) => (
              <div
                key={v}
                style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)', flexWrap: 'wrap' }}
              >
                <span className="source" style={{ width: 96, flexShrink: 0 }}>
                  {label}
                </span>
                <span className={cls} style={{ fontSize: `var(${v})`, lineHeight: 1.05 }}>
                  Consistency compounds
                </span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Typefaces">
          <div className="grid grid--2">
            <div>
              <p className="display" style={{ fontSize: 'var(--fs-xl)', margin: 0 }}>
                Archivo
              </p>
              <p className="source">Display / Swiss headings</p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, margin: 0 }}>Inter</p>
              <p className="source">
                Body, UI, labels and numerals (tabular figures: <span className="mono">1234567890</span>)
              </p>
            </div>
          </div>
        </Block>

        <Block title="Stat cards (data-driven)">
          <div className="grid grid--3">
            <StatCard value={fmtInt(acts.value)} label="Total activities" source="Overview" />
            <StatCard value={fmtInt(km.value)} unit="km" label="Distance moved" source="Overview" />
            <StatCard
              value={fmtCompact(cal.value)}
              unit="kcal"
              label="Calories burned"
              source="Overview"
            />
          </div>
          <p className="source" style={{ marginTop: 'var(--sp-4)' }}>
            The card below is a link, so hover or tab to it to see the invert.
          </p>
          <div className="grid grid--3" style={{ marginTop: 'var(--sp-3)' }}>
            <StatCard value="7" label="Countries logged" note="Across three continents." to="/where" />
          </div>
        </Block>

        <Block title="Direction chips">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <Tag>Grow x6.7</Tag>
            <Tag>Reduce x3.2</Tag>
            <Tag solid>New</Tag>
            <Tag>↑ Up</Tag>
            <Tag>↓ Down</Tag>
          </div>
        </Block>

        <Block title="Comparison bar (then → now)">
          <div style={{ maxWidth: '34rem' }}>
            <CompareBar
              label={cmp.metric}
              baselineLabel={cmp.baseline_label}
              baselineValue={cmp.baseline_value}
              targetLabel={cmp.target_label}
              targetValue={cmp.target_value}
              unit={cmp.unit}
              direction={cmp.direction}
              plain={cmp.plain_language}
              source={cmp.source_page}
            />
          </div>
        </Block>

        <Block title="Numbered index hub (hover / focus inverts)">
          <IndexHub />
        </Block>

        <Block title="Rules">
          <div className="stack">
            <hr className="rule rule--heavy" />
            <span className="source">rule--heavy (2px)</span>
            <hr className="rule" />
            <span className="source">rule (1px ink)</span>
            <hr className="rule rule--faint" />
            <span className="source">rule--faint (1px grey)</span>
          </div>
        </Block>
      </Container>
    </Layout>
  )
}

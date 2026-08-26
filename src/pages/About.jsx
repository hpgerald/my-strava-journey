import { Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import { useKeyed } from '../context/DataContext.jsx'

function Fact({ label, children }) {
  return (
    <div className="factsheet__row">
      <dt className="factsheet__key">{label}</dt>
      <dd className="factsheet__val mono">{children}</dd>
    </div>
  )
}

export default function About() {
  const meta = useKeyed('meta', 'key', 'value')

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
      title="About"
      subtitle="What this is, and what it isn't"
      lede="My Strava history, put together so anyone can make sense of it, not just me."
    >
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--2" style={{ alignItems: 'start', gap: 'var(--sp-6) var(--sp-8)' }}>
          <div className="stack">
            <p>
              It covers {meta.total_activities || '1,996'} activities from {meta.coverage_start || '2019'}{' '}
              to {meta.coverage_end || '2026'}: running, walking, trail running, cycling, hiking and a
              few odd others, mostly in Tanzania with the occasional trip abroad. It refreshes each week
              as new activities come in.
            </p>

            <h2 className="display" style={{ fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>
              These are aspirations, not achievements
            </h2>
            <p>
              The numbers here are about a habit, not a finish line. A streak counts until the day it
              doesn't; a yearly total is just a year still in progress. Take them as a record of effort
              over time, not a trophy cabinet.
            </p>

            <h2 className="display" style={{ fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>
              Accuracy and limits
            </h2>
            <p>
              Figures are shown as logged on Strava. Distances, times and elevation come straight from
              the activities; the country and region breakdowns are derived from each activity's GPS
              start point and are approximate near international borders. The full method, confidence
              levels and known gaps are documented on the{' '}
              <Link to="/data" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                data page
              </Link>
              . This is a personal record for interest's sake, not coaching, medical or training advice.
            </p>

            <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)' }}>
              Strava is a trademark of Strava, Inc. This site is a personal project and is not affiliated
              with or endorsed by Strava.
            </p>
          </div>

          <aside className="factsheet" aria-label="Fact sheet">
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>The record, in brief</p>
            <dl className="factsheet__list">
              <Fact label="Activities">{meta.total_activities || '1,996'}</Fact>
              <Fact label="Coverage">
                {(meta.coverage_start || '2019-08-17')} to {(meta.coverage_end || '2026-08-24')}
              </Fact>
              <Fact label="Refresh">Weekly</Fact>
              <Fact label="Units">{meta.units || 'metric'}</Fact>
              <Fact label="Data source">{meta.data_source || 'Strava API'}</Fact>
              <Fact label="Last refreshed">{meta.last_refreshed || 'recently'}</Fact>
            </dl>
          </aside>
        </div>
      </section>
    </DetailFrame>
  )
}

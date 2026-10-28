import { Link } from 'react-router-dom'
import DetailFrame from '../components/DetailFrame.jsx'
import { useKeyed } from '../context/DataContext.jsx'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso) => (iso ? `${parseInt(iso.slice(8, 10), 10)} ${MON[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}` : '')
const count = (v) => (v ? Number(v).toLocaleString('en-US') : '')

function Fact({ label, children }) {
  return (
    <div className="factsheet__row">
      <dt className="factsheet__key">{label}</dt>
      <dd className="factsheet__val mono">{children}</dd>
    </div>
  )
}

function Contact({ label, href, children, external }) {
  return (
    <div className="factsheet__row">
      <dt className="factsheet__key">{label}</dt>
      <dd className="factsheet__val mono">
        <a
          className="link"
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      </dd>
    </div>
  )
}

export default function About() {
  const meta = useKeyed('meta', 'key', 'value')

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
      title="About"
      subtitle="What this is and how to read it"
    >
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--2" style={{ alignItems: 'start', gap: 'var(--sp-6) var(--sp-8)' }}>
          <div className="stack">
            <p>
              This site covers {count(meta.total_activities)} activities from {day(meta.coverage_start)}{' '}
              to {day(meta.coverage_end)}. Most are runs, walks, trail runs and hikes, and the rest I call other
              activities. Nearly all of it happened here in Tanzania, with a few trips across the border. I add my new
              activities every week.
            </p>

            <h2 className="display" style={{ fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>
              A habit, counted over time
            </h2>
            <p>
              I am not a professional athlete. This is just my own record of showing up. The streak keeps counting until
              the day it breaks, and this year&rsquo;s totals are for a year that is not finished.
            </p>

            <h2 className="display" style={{ fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>
              What counts
            </h2>
            <p>
              The numbers are as logged on Strava. Distance and climb count only my sports on foot: running, walking,
              trail running and hiking. Everything else still counts as an outing, and in my hours and kudos, but not in
              distance or climb. Countries and regions come from where each activity started, so they can be a little off
              near a border. There is more on the{' '}
              <Link to="/data" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                data page
              </Link>
              . This is a personal record. It is not coaching, medical or training advice.
            </p>

            <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)' }}>
              Strava is a trademark of Strava, Inc. This site is a personal project and is not affiliated
              with or endorsed by Strava.
            </p>
          </div>

          <aside className="factsheet" aria-label="Fact sheet">
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>The record, in brief</p>
            <dl className="factsheet__list">
              <Fact label="Activities">{count(meta.total_activities)}</Fact>
              <Fact label="Coverage">
                {day(meta.coverage_start)} to {day(meta.coverage_end)}
              </Fact>
              <Fact label="Refresh">Weekly</Fact>
              <Fact label="Units">{meta.units || 'metric'}</Fact>
              <Fact label="Data source">My Strava log, pulled weekly through an MCP server</Fact>
              <Fact label="Last refreshed">{day(meta.last_refreshed)}</Fact>
            </dl>
          </aside>
        </div>
      </section>

      <section style={{ paddingTop: 'var(--sp-7)' }}>
        <hr className="rule" />
        <div
          className="grid grid--2"
          style={{ alignItems: 'start', gap: 'var(--sp-6) var(--sp-8)', paddingTop: 'var(--sp-6)' }}
        >
          <div>
            <h2 className="display" style={{ fontSize: 'var(--fs-lg)' }}>
              Get in touch
            </h2>
            <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-3)', maxWidth: '28rem' }}>
              I am Gerald. You can follow my training on Strava, or get in touch any time. <span lang="sw">Karibu</span>, you are welcome.
            </p>
          </div>

          <aside className="factsheet" aria-label="Contact details">
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>Contact</p>
            <dl className="factsheet__list">
              <Contact label="Strava" href="https://www.strava.com/athletes/gtesha" external>
                /athletes/gtesha
              </Contact>
              <Contact label="Email" href="mailto:hpgerald@gmail.com">
                hpgerald@gmail.com
              </Contact>
              <Contact label="Phone" href="tel:+255763453400">
                +255 763 453 400
              </Contact>
              <Contact label="LinkedIn" href="https://www.linkedin.com/in/gtesha/" external>
                /in/gtesha
              </Contact>
              <Contact label="GitHub" href="https://github.com/hpgerald" external>
                /hpgerald
              </Contact>
            </dl>
          </aside>
        </div>
      </section>
    </DetailFrame>
  )
}

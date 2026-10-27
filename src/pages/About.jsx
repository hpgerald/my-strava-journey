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
      lede="My Strava history, laid out so anyone can read it."
    >
      <section style={{ paddingTop: 'var(--sp-6)' }}>
        <div className="grid grid--2" style={{ alignItems: 'start', gap: 'var(--sp-6) var(--sp-8)' }}>
          <div className="stack">
            <p>
              It covers {count(meta.total_activities)} activities from {day(meta.coverage_start)}{' '}
              to {day(meta.coverage_end)}. Most of them are runs, walks, trail runs and hikes, and the rest I just call
              other activities. Nearly all of it happened in Tanzania, with a few trips across the border. I update it
              every week with my new activities.
            </p>

            <h2 className="display" style={{ fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>
              A habit, counted over time
            </h2>
            <p>
              The numbers follow a habit as it grows. A streak keeps counting until the day it breaks, and this
              year&rsquo;s totals are for a year that isn&rsquo;t over yet. It&rsquo;s a record of showing up, more than
              anything else.
            </p>

            <h2 className="display" style={{ fontSize: 'var(--fs-lg)', marginTop: 'var(--sp-4)' }}>
              What counts, and what doesn&rsquo;t
            </h2>
            <p>
              The figures are as logged on Strava. I made one choice that runs through the whole site: distance and
              climb only count my sports on foot, which are running, walking, trail running and hiking. Everything else
              still counts as an outing, and towards my hours and kudos, but its kilometres and climbing are left out,
              because this is about what I do on foot. Countries and regions come from each activity&rsquo;s GPS start
              point, so they can be a little off near a border. There&rsquo;s more on how it&rsquo;s put together on the{' '}
              <Link to="/data" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                data page
              </Link>
              . It&rsquo;s a personal record, kept out of interest. It isn&rsquo;t coaching, medical or training advice.
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
              I&rsquo;m Gerald. You can follow my training on Strava, or get in touch any time.
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

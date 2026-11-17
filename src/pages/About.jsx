import { Link } from 'react-router-dom'
import Plate from '../components/Plate.jsx'
import { DataBody } from './Data.jsx'
import { useSectionJump } from '../lib/sections.js'
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
  useSectionJump()
  const meta = useKeyed('meta', 'key', 'value')

  return (
    <DetailFrame
      crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
      title="About"
      subtitle="Who I am, what counts and how it is made"
    >
      <section className="about-sec">
        <p className="about-lede">
          This site covers {count(meta.total_activities)} activities from {day(meta.coverage_start)}{' '}
          to {day(meta.coverage_end)}. Most are runs, walks, trail runs and hikes, and the rest I call other
          activities. Nearly all of it happened here in Tanzania, with a few trips across the border. I add my new
          activities every week.
        </p>
        <h2 className="about-h">A habit, counted over time</h2>
        <p className="about-p">
          I am not a professional athlete. This is just my own record of showing up. I started this site after Strava counted my 2,000th
          activity, in August 2026: I wanted to tell the story once I reached that milestone. The streak keeps counting until
          the day it breaks, and this year&rsquo;s totals are for a year that is not finished.
        </p>
        <h2 className="about-h">What counts</h2>
        <p className="about-p">
          The numbers are as logged on Strava, less the few activities listed under data cleaning below. Distance
          and climb count only my sports on foot: running, walking, trail running and hiking. Everything else still counts as an
          outing, and in my hours and kudos, but not in distance or climb. Countries and regions come from where each activity
          started, so they can be a little off near a border. There is more in the{' '}
          <Link to="/about?s=about-data" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
            colophon below
          </Link>
          . This is a personal record. It is not coaching, medical or training advice.
        </p>
        <p className="about-note">
          Strava is a trademark of Strava, Inc. This site is a personal project and is not affiliated
          with or endorsed by Strava.
        </p>
      </section>

      <section className="about-sec about-sec--rule">
        <div className="about-touch">
          <Plate slot="portrait" ratio="4 / 5" caption="Gerald Tesha" />
          <div className="about-touch__words">
            <div>
              <h2 className="about-h about-h--first">Get in touch</h2>
              <p className="about-p">
                I am Gerald. You can follow my training on Strava, or get in touch any time. <span lang="sw">Karibu</span>, you are welcome.
              </p>
            </div>
            <div className="about-sheets">
              <aside className="factsheet" aria-label="Contact details">
                <p className="eyebrow">Contact</p>
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
              <aside className="factsheet" aria-label="Fact sheet">
                <p className="eyebrow">The record, in brief</p>
                <dl className="factsheet__list">
                  <Fact label="Activities">{count(meta.total_activities)}</Fact>
                  <Fact label="Coverage">
                    {day(meta.coverage_start)} to {day(meta.coverage_end)}
                  </Fact>
                  <Fact label="Refresh">Weekly</Fact>
                  <Fact label="Units">{meta.units || 'metric'}</Fact>
                  <Fact label="Recorded with">A Samsung Gear S3 Frontier at first, now a COROS PACE Pro</Fact>
                  <Fact label="Data source">My Strava log, pulled weekly through an MCP server</Fact>
                  <Fact label="Last refreshed">{day(meta.last_refreshed)}</Fact>
                </dl>
              </aside>
            </div>
          </div>
        </div>
      </section>
      <section className="about-data about-sec about-sec--rule" aria-labelledby="about-data">
        <p className="eyebrow">The data</p>
        <h2 id="about-data" className="section-head__title">The tables behind the&nbsp;site.</h2>
        <p className="ds-lede text-muted">My own activity data, so I list it here and do not offer it as a download.</p>
        <DataBody />
      </section>
    </DetailFrame>
  )
}

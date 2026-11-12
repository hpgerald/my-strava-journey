#!/usr/bin/env node
// Search and sharing metadata, rebuilt from the data at every weekly refresh.
// Run it after update_readme.py (and after build_evidence.py):
//
//   node scripts/build_seo.mjs          (or: npm run seo)
//
// It writes, from public/data:
//   index.html         the head block between <!-- SEO:START --> and <!-- SEO:END -->
//                      (title, description, canonical, Open Graph, Twitter, JSON-LD)
//                      and the plain-text summary inside #root that crawlers without
//                      JavaScript read (React replaces it on load)
//   public/data/seo.json   a title and description for every chapter, which the
//                      site sets as you move between chapters
//   public/sitemap.xml     with this refresh's date
//   public/og.png      the 1200 x 630 share image, drawn with the latest numbers
//                      (needs Playwright; skipped with a note when it is missing)
//   public/share/      a share card and page for each part and mountain (build_share.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import Papa from 'papaparse'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'public', 'data')
const SITE = 'https://hpgerald.github.io/my-strava-journey/'
// Google Search Console proves ownership with a token; paste it into
// scripts/seo_config.json as "googleSiteVerification" and it goes into the head
let CONFIG = {}
try { CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'seo_config.json'), 'utf8')) } catch { CONFIG = {} }
const GSV = String(CONFIG.googleSiteVerification || '').trim()
const BOOK_PDF = 'book/showing-up-gerald-tesha.pdf'
const SAME_AS = ['https://www.strava.com/athletes/gtesha', 'https://www.linkedin.com/in/gtesha/', 'https://github.com/hpgerald']
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const csv = (name) => Papa.parse(fs.readFileSync(path.join(DATA, `${name}.csv`), 'utf8'), { header: true, skipEmptyLines: true }).data
const kv = (rows, k, v) => Object.fromEntries(rows.map((r) => [r[k], r[v]]))
const n0 = (v) => Math.round(Number(v) || 0).toLocaleString('en-US')
const word = (n) => WORD[n] || String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fmtDay = (iso) => `${parseInt(iso.slice(8, 10), 10)} ${MONTH[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------------------------------------------------------------- the facts
const meta = kv(csv('meta'), 'key', 'value')
const life = kv(csv('lifetime_totals'), 'metric', 'value')
const acts = csv('activities')
const foot = acts.filter((a) => FOOT.has(a.sport_type))
const countries = csv('countries').filter((r) => r.iso_code && r.country !== 'Other')
const regions = csv('tanzania_regions')
const first = meta.coverage_start, last = meta.coverage_end, refreshed = meta.last_refreshed || last
const years = Math.floor((Date.parse(last) - Date.parse(first)) / (365.25 * 864e5))
const kmOf = (pred) => foot.filter(pred).reduce((s, a) => s + (Number(a.distance_km) || 0), 0)
const F = {
  n: acts.length,
  km: Number(life['Total Km']) || kmOf(() => true),
  elev: Number(life['Total Elevation (M)']) || 0,
  streak: Number(life['Current Streak (Days)']) || 0,
  runKm: kmOf((a) => a.sport_type === 'Run' || a.sport_type === 'TrailRun'),
  walkKm: kmOf((a) => a.sport_type === 'Walk'),
  longest: Math.max(...foot.map((a) => Number(a.distance_km) || 0)),
  climb: Math.max(...foot.map((a) => Number(a.elevation_gain_m) || 0)),
  countries: countries.length,
  regions: regions.length,
  firstYear: first.slice(0, 4), lastYear: last.slice(0, 4),
}
const byYear = {}
for (const a of acts) byYear[a.date.slice(0, 4)] = (byYear[a.date.slice(0, 4)] || 0) + 1
let E = null
try { E = JSON.parse(fs.readFileSync(path.join(DATA, 'evidence.json'), 'utf8')) } catch { E = null }
const verdicts = E ? Object.values(E.verdicts) : []
const vc = (v) => verdicts.filter((x) => x === v).length

// ---------------------------------------------------------------- the words
// the name comes first: someone searching for Gerald Tesha should see it at once
const TITLE = `Gerald Tesha · My Strava Journey · ${cap(word(years))} years on foot`
const DESC = `Gerald Tesha's ${word(years)} years on foot, mostly in Tanzania: ${n0(F.n)} outings and ${n0(F.km)} km from his Strava log, with maps, records, tested habits and a free book.`
const OG_DESC = `${n0(F.n)} outings, ${n0(F.km)} km on foot and a ${n0(F.streak)}-day streak so far. ${cap(word(years))} years of Gerald Tesha's Strava log, read as data.`

const routes = {
  // the story first, then the Record, as in the menu
  '/': { title: TITLE, description: DESC },
  '/kilimanjaro': { title: 'Kilimanjaro', description: 'Kilimanjaro by the Marangu route, one hut at a time: the GPS line of the climb, every stage, and the summit night my watch did not finish.' },
  '/hanang': { title: 'Hanang', description: 'Mount Hanang, my longest day on foot: the hike told by the clock from before sunrise to after midnight, and the two races that took me back.' },
  '/uluguru': { title: 'Uluguru', description: 'Bondwa Peak in the Uluguru Mountains, the mountain I go back to: every trip drawn on one chart, and my biggest climb in one outing.' },
  '/ngong': { title: 'Ngong Hills', description: 'The Ngong Hills in Kenya, the ridge across the border: the GPS line out along the tops and back, the altitude of every top, and my biggest climb outside Tanzania.' },
  '/what-it-means': { title: 'What It Means', description: `What ${word(years)} years of logging taught me about keeping a habit, in my own words, with the numbers behind each lesson.` },
  '/numbers': { title: 'Year in Sport', description: `Every year of my log as its own report, from ${n0(byYear[F.firstYear])} outings in ${F.firstYear} to ${n0(byYear[F.lastYear])} in ${F.lastYear}${last.slice(5) < '12-31' ? ' so far' : ''}.` },
  '/sports': { title: 'Sports', description: `My four sports on foot: ${n0(F.runKm)} km of running and ${n0(F.walkKm)} km of walking, with trail runs and hikes, and the treadmill kept apart from the road.` },
  '/records': { title: 'Records', description: `My longest, highest and hardest days on foot: ${F.longest.toFixed(1)} km in one outing, ${n0(F.climb)} m of climbing in one outing, and a ${n0(F.streak)}-day streak.` },
  '/where': { title: 'Where', description: `Where I go out: ${word(F.countries)} African countries and ${word(F.regions)} regions of Tanzania, mapped from where each outing started.` },
  '/timeline': { title: 'Timeline', description: `${cap(word(years))} years in the order they happened: milestones, firsts on foot, trips, streaks and breaks.` },
  '/goals': { title: 'Goals', description: 'The same three targets held against every year: 1,000 km of walking, 1,000 km of running and 24,000 m of climbing on foot.' },
  '/on-trial': { title: 'The Habit on Trial', description: E ? `Twelve things I believe about my habit, tested with statistics against the log: ${word(vc('proven'))} proven, ${word(vc('supported'))} supported and ${word(vc('not'))} not proven.` : 'Twelve things I believe about my habit, tested with statistics against the log.' },
  '/book': { title: 'My Book', description: `Showing Up, the whole story as a free book, with every chart drawn from the log up to ${fmtDay(last)}. Read it online or download the PDF.` },
  '/about': { title: 'About', description: 'How this site was made, what the data covers and how to reach me.' },
  '/data': { title: 'The Data', description: 'Every table behind the site, what it holds and where it comes from.' },
}
fs.writeFileSync(path.join(DATA, 'seo.json'), JSON.stringify({ refreshed, routes }, null, 1) + '\n')

// ---------------------------------------------------------------- the head
const v = refreshed.replace(/-/g, '')
const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE}#website`, url: SITE, name: 'My Strava Journey', alternateName: ['Gerald Tesha', 'Showing Up'], description: DESC, inLanguage: 'en', author: { '@id': `${SITE}#gerald` }, publisher: { '@id': `${SITE}#gerald` }, dateModified: refreshed },
    // the home page is Gerald's own page: Google reads a ProfilePage as a page about one person
    { '@type': 'ProfilePage', '@id': `${SITE}#profile`, url: SITE, name: TITLE, description: DESC, inLanguage: 'en', isPartOf: { '@id': `${SITE}#website` }, mainEntity: { '@id': `${SITE}#gerald` }, dateModified: refreshed, primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}og.png?v=${v}`, width: 1200, height: 630 } },
    { '@type': 'Person', '@id': `${SITE}#gerald`, name: 'Gerald Tesha', givenName: 'Gerald', familyName: 'Tesha', url: SITE, mainEntityOfPage: { '@id': `${SITE}#profile` }, nationality: { '@type': 'Country', name: 'Tanzania' }, description: `Tanzanian runner and walker, author of the free book Showing Up and of My Strava Journey, ${word(years)} years of his Strava log read as data.`, sameAs: SAME_AS },
    {
      '@type': 'Book', '@id': `${SITE}#book`, name: 'Showing Up', alternativeHeadline: `${cap(word(years))} years on foot, from my own log`, author: { '@id': `${SITE}#gerald` },
      bookFormat: 'https://schema.org/EBook', inLanguage: 'en', isAccessibleForFree: true, url: `${SITE}#/book`, dateModified: refreshed,
      encoding: { '@type': 'MediaObject', contentUrl: `${SITE}${BOOK_PDF}`, encodingFormat: 'application/pdf' },
    },
    {
      '@type': 'Dataset', '@id': `${SITE}#data`, name: `My Strava activity log, ${F.firstYear} to ${F.lastYear}`,
      description: `${n0(F.n)} activities from ${fmtDay(first)} to ${fmtDay(last)}, with date, sport, distance, moving time, climb and kudos for each. Names, Strava IDs and exact locations are removed.`,
      creator: { '@id': `${SITE}#gerald` }, isAccessibleForFree: true, temporalCoverage: `${first}/${last}`, dateModified: refreshed,
      variableMeasured: ['distance', 'moving time', 'elevation gain', 'kudos'],
      distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE}data/activities.csv` }],
    },
  ],
}
const head = `<!-- SEO:START (written by scripts/build_seo.mjs at each refresh; do not edit by hand) -->
    <title>${esc(TITLE)}</title>
    <meta name="description" content="${esc(DESC)}" />
    <link rel="canonical" href="${SITE}" />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#141414" />
    <meta name="author" content="Gerald Tesha" />${GSV ? `\n    <meta name="google-site-verification" content="${esc(GSV)}" />` : ''}
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="My Strava Journey" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:title" content="${esc(TITLE)}" />
    <meta property="og:description" content="${esc(OG_DESC)}" />
    <meta property="og:url" content="${SITE}" />
    <meta property="og:updated_time" content="${refreshed}" />
    <meta property="og:image" content="${SITE}og.png?v=${v}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(`${n0(F.n)} outings and ${n0(F.km)} km on foot, ${F.firstYear} to ${F.lastYear}`)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(TITLE)}" />
    <meta name="twitter:description" content="${esc(OG_DESC)}" />
    <meta name="twitter:image" content="${SITE}og.png?v=${v}" />
    <link rel="alternate" type="application/pdf" title="Showing Up, the book" href="${SITE}${BOOK_PDF}" />
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
    <style>#seo-summary { max-width: 42rem; margin: 0 auto; padding: 6rem 1.25rem; font: 1rem/1.55 system-ui, sans-serif; color: #141414; background: #f2f0eb; }</style>
    <!-- SEO:END -->`

// the words a crawler finds before the page runs. They sit in their own div:
// the site's own <main> is also a child of #root, so the style must never
// reach it.
const chapters = Object.entries(routes).filter(([r]) => r !== '/' && r !== '/about' && r !== '/data')
const body = `<!-- SEO:BODY:START -->
      <div id="seo-summary">
        <h1>Gerald Tesha · My Strava Journey</h1>
        <p>${esc(DESC)}</p>
        <ul>
${chapters.map(([r, x]) => `          <li><a href="#${r}">${esc(x.title)}</a>: ${esc(x.description)}</li>`).join('\n')}
        </ul>
        <p><a href="${BOOK_PDF}">Showing Up, the book (PDF)</a> · <a href="data/activities.csv">The activity log (CSV)</a></p>
      </div>
      <!-- SEO:BODY:END -->`

const IDX = path.join(ROOT, 'index.html')
let html = fs.readFileSync(IDX, 'utf8')
if (!html.includes('<!-- SEO:START')) {
  // first run: the block runs from <title> to the end of the JSON-LD script
  const a = html.indexOf('<title>'), b = html.indexOf('</script>', html.indexOf('application/ld+json')) + '</script>'.length
  html = html.slice(0, a) + head + html.slice(b)
} else {
  html = html.replace(/<!-- SEO:START[\s\S]*?<!-- SEO:END -->/, head)
}
html = html.includes('<!-- SEO:BODY:START')
  ? html.replace(/<!-- SEO:BODY:START -->[\s\S]*?<!-- SEO:BODY:END -->/, body)
  : html.replace('<div id="root"></div>', `<div id="root">\n      ${body}\n    </div>`)
fs.writeFileSync(IDX, html)

// ---------------------------------------------------------------- the sitemap
fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${refreshed}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE}${BOOK_PDF}</loc>
    <lastmod>${refreshed}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`)

// ---------------------------------------------------------------- the share image
async function drawOg() {
  let chromium = null
  const req = createRequire(import.meta.url)
  for (const name of ['playwright', 'playwright-core']) {
    if (chromium) break
    try { ({ chromium } = req(name)) } catch { try { ({ chromium } = await import(name)) } catch { chromium = null } }
  }
  if (!chromium) { console.log('og.png kept as it was: Playwright is not installed'); return }
  // fonts go in as data, since a page set from a string may not read local files
  const font = (p) => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'node_modules', '@fontsource-variable', p)).toString('base64')}`
  // outings per month across the whole record, for the strip along the bottom
  const months = []
  for (let y = +F.firstYear, m = +first.slice(5, 7); `${y}-${String(m).padStart(2, '0')}` <= last.slice(0, 7); m === 12 ? (y++, m = 1) : m++) months.push(`${y}-${String(m).padStart(2, '0')}`)
  const perMonth = months.map((k) => acts.filter((a) => a.date.startsWith(k)).length)
  const top = Math.max(...perMonth)
  const streakFrom = new Date(Date.parse(last) - (F.streak - 1) * 864e5).toISOString().slice(0, 7)
  const bars = perMonth.map((c, i) => `<i style="height:${Math.max(c ? 3 : 1, (c / top) * 100).toFixed(1)}%;background:${months[i] >= streakFrom ? '#e04400' : c ? '#141414' : '#d9d6ce'}"></i>`).join('')
  const page = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Archivo; src: url(${font('archivo/files/archivo-latin-wdth-normal.woff2')}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
    @font-face { font-family: Inter; src: url(${font('inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; background: #f2f0eb; color: #141414; font-family: Inter, sans-serif; padding: 56px 64px 48px; display: grid; grid-template-rows: auto 1fr auto auto; }
    .top { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #141414; padding-bottom: 18px; }
    .mark { font-family: Archivo; font-weight: 500; font-size: 30px; letter-spacing: -0.03em; }
    .mark b, .big b { color: #e04400; font-weight: inherit; }
    .by { font-size: 16px; letter-spacing: 0.09em; text-transform: uppercase; color: #5f5d58; font-weight: 500; }
    .big { align-self: center; font-family: Archivo; font-weight: 500; font-size: 104px; line-height: 0.92; letter-spacing: -0.05em; }
    .big span { display: block; color: #5f5d58; }
    .row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; border-top: 1px solid #d9d6ce; padding-top: 16px; }
    .row p { font-size: 15px; color: #5f5d58; line-height: 1.3; }
    .row strong { display: block; font-family: Archivo; font-weight: 500; font-size: 34px; letter-spacing: -0.04em; color: #141414; }
    .row .hot strong { color: #e04400; }
    .strip { display: flex; align-items: flex-end; gap: 2px; height: 40px; margin-top: 20px; }
    .strip i { flex: 1; display: block; }
  </style></head><body>
    <div class="top"><span class="mark">Showing up<b>.</b></span><span class="by">Gerald Tesha · My Strava Journey</span></div>
    <div class="big">${n0(F.n)} outings<b>.</b><span>${n0(F.km)} km on foot.</span></div>
    <div class="row">
      <p class="hot"><strong>${n0(F.streak)}</strong>day streak, still going</p>
      <p><strong>${n0(F.elev)} m</strong>climbed on foot</p>
      <p><strong>${F.countries} countries</strong>in Africa, and ${F.regions} regions of Tanzania</p>
      <p><strong>${F.firstYear} to ${F.lastYear}</strong>each bar below is a month</p>
    </div>
    <div class="strip">${bars}</div>
  </body></html>`
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await p.setContent(page, { waitUntil: 'load' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: path.join(ROOT, 'public', 'og.png') })
  await b.close()
}
await drawOg()
// a share card and page for each part of the story and each mountain
await import('./build_share.mjs')

console.log(`SEO refreshed for ${refreshed}: ${n0(F.n)} outings, ${n0(F.km)} km, ${n0(F.streak)}-day streak, ${Object.keys(routes).length} chapter descriptions`)

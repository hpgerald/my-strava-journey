#!/usr/bin/env node
// A share image for each part of the story and each mountain, rebuilt from the
// data at every weekly refresh (build_seo.mjs runs it at the end):
//
//   node scripts/build_share.mjs
//
// It writes, for each part and mountain:
//   public/share/<slug>.png    a 1200 x 630 card with the part's one line and number
//   public/share/<slug>.html   a small page with its own preview tags that sends a
//                              visitor on to the chapter, since links into the site
//                              itself all share one preview
// Drawing needs Playwright; without it the pages are still written and the old
// images are kept.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import Papa from 'papaparse'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'public', 'data')
const OUT = path.join(ROOT, 'public', 'share')
const SITE = 'https://hpgerald.github.io/my-strava-journey/'
const FOOT = new Set(['Run', 'Walk', 'TrailRun', 'Hike'])
const DAY = 864e5

const csv = (name) => Papa.parse(fs.readFileSync(path.join(DATA, `${name}.csv`), 'utf8'), { header: true, skipEmptyLines: true }).data
const n0 = (v) => Math.round(Number(v) || 0).toLocaleString('en-US')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------------------------------------------------------------- the facts
const acts = csv('activities')
const geo = Object.fromEntries(csv('activity_geo').map((g) => [g.activity_key, g]))
const life = Object.fromEntries(csv('lifetime_totals').map((r) => [r.metric, r.value]))
const meta = Object.fromEntries(csv('meta').map((r) => [r.key, r.value]))
const last = meta.coverage_end
const days = [...new Set(acts.map((a) => a.date.slice(0, 10)))].sort()
// the longest silence, and the comeback after it
let gap = { len: 0, back: days[0] }
for (let i = 1; i < days.length; i++) { const g = Math.round((Date.parse(days[i]) - Date.parse(days[i - 1])) / DAY) - 1; if (g > gap.len) gap = { len: g, back: days[i] } }
const since = days.filter((d) => d >= gap.back)
let maxSince = 0
for (let i = 1; i < since.length; i++) maxSince = Math.max(maxSince, Math.round((Date.parse(since[i]) - Date.parse(since[i - 1])) / DAY) - 1)
const nYear = (y) => acts.filter((a) => a.date.startsWith(y)).length
const elevYear = (y) => acts.filter((a) => a.date.startsWith(y) && FOOT.has(a.sport_type)).reduce((s, a) => s + (Number(a.elevation_gain_m) || 0), 0)
const countriesIn = (y) => new Set(acts.filter((a) => a.date.startsWith(y)).map((a) => (geo[a.activity_key] || {}).country).filter(Boolean)).size
const movingSince = acts.filter((a) => a.date.slice(0, 10) >= gap.back).reduce((s, a) => s + (Number(a.moving_time_min) || 0), 0)
const spanSince = Math.round((Date.parse(last) - Date.parse(gap.back)) / DAY) + 1
const streak = Number(life['Current Streak (Days)']) || 0
const foot = acts.filter((a) => FOOT.has(a.sport_type))
const climbIn = (region, pred = () => true) => foot.filter((a) => (geo[a.activity_key] || {}).region === region && pred(a)).reduce((b, a) => Math.max(b, Number(a.elevation_gain_m) || 0), 0)
const kenya = foot.filter((a) => (geo[a.activity_key] || {}).country === 'Kenya').reduce((b, a) => Math.max(b, Number(a.elevation_gain_m) || 0), 0)
const longestOut = foot.filter((a) => !(a.sport_type === 'TrailRun' && a.trainer === 'Yes')).reduce((b, a) => Math.max(b, Number(a.elapsed_time_min) || 0), 0)

// ---------------------------------------------------------------- the cards
const CARDS = [
  { slug: 'part-1', to: '#/?part=1', k: 'Part 1 · 2019 to mid 2021', t: 'Before the habit', l: `It did not look like a habit yet: ${n0(nYear('2019'))} outings in my first year, ${n0(nYear('2020'))} in my second.`, v: n0(gap.len), u: 'days with nothing in the log' },
  { slug: 'part-2', to: '#/?part=2', k: 'Part 2 · mid 2021 to 2022', t: 'The comeback', l: `From ${n0(nYear('2020'))} outings in a year to ${n0(nYear('2021'))}, then ${n0(nYear('2022'))}.`, v: n0(maxSince), u: 'days, my longest layoff since' },
  { slug: 'part-3', to: '#/?part=3', k: 'Part 3 · 2023', t: 'The mountains', l: 'The year the habit left the flat ground: Kilimanjaro in March, Hanang in April.', v: `${n0(elevYear('2023'))} m`, u: 'climbed on foot that year' },
  { slug: 'part-4', to: '#/?part=4', k: 'Part 4 · 2024', t: 'The road', l: 'Wherever I went that year, the shoes came with me.', v: n0(countriesIn('2024')), u: 'countries in one year' },
  { slug: 'part-5', to: '#/?part=5', k: 'Part 5 · 2025 to 2026', t: 'No zero days', l: 'I started the streak on purpose. My first target is 31 December 2026.', v: n0(streak), u: 'days in a row, still going', hot: true },
  { slug: 'part-6', to: '#/what-it-means', k: 'Part 6 · Looking back', t: 'What it taught me', l: 'About the time of a long lunch each day, kept up for years.', v: `${n0(movingSince / spanSince)} min`, u: 'a day since the comeback, zero days included' },
  { slug: 'kilimanjaro', to: '#/kilimanjaro', k: 'The mountains · Tanzania', t: 'Kilimanjaro', l: 'I went up Kilimanjaro knowing nothing about climbing it.', v: '5,895 m', u: 'Uhuru Peak, March 2023', ground: '#3b4a5c' },
  { slug: 'hanang', to: '#/hanang', k: 'The mountains · Tanzania', t: 'Mount Hanang', l: 'Coming down can take as long as going up.', v: `${(longestOut / 60).toFixed(1)} h`, u: 'my longest day out on foot', ground: '#6b5136' },
  { slug: 'uluguru', to: '#/uluguru', k: 'The mountains · Tanzania', t: 'Uluguru', l: 'A mountain you can reach becomes a habit of its own.', v: `${n0(climbIn('Morogoro'))} m`, u: 'my biggest climb in one outing', ground: '#35503d' },
  { slug: 'ngong', to: '#/ngong', k: 'The mountains · Kenya', t: 'Ngong Hills', l: 'You do not always get what you wanted.', v: `${n0(kenya)} m`, u: 'my biggest climb outside Tanzania', ground: '#4f5d63' },
]

fs.mkdirSync(OUT, { recursive: true })
for (const c of CARDS) {
  const url = `${SITE}${c.to}`, img = `${SITE}share/${c.slug}.png?v=${last}`, title = `${c.t} · Showing Up · Gerald Tesha`
  fs.writeFileSync(path.join(OUT, `${c.slug}.html`), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(c.l)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="My Strava Journey" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(c.l)}" />
    <meta property="og:url" content="${SITE}share/${c.slug}.html" />
    <meta property="og:image" content="${esc(img)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(c.l)}" />
    <meta name="twitter:image" content="${esc(img)}" />
    <meta http-equiv="refresh" content="0; url=${esc(url)}" />
  </head>
  <body>
    <p><a href="${esc(url)}">${esc(c.t)}</a></p>
    <script>location.replace(${JSON.stringify(url)})</script>
  </body>
</html>
`)
}

// ---------------------------------------------------------------- the images
let chromium = null
const req = createRequire(import.meta.url)
for (const name of ['playwright', 'playwright-core']) {
  if (chromium) break
  try { ({ chromium } = req(name)) } catch { try { ({ chromium } = await import(name)) } catch { chromium = null } }
}
if (!chromium) {
  console.log(`share pages written for ${CARDS.length} cards; images kept as they were: Playwright is not installed`)
} else {
  const font = (p) => `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'node_modules', '@fontsource-variable', p)).toString('base64')}`
  const FONTS = `@font-face { font-family: Archivo; src: url(${font('archivo/files/archivo-latin-wdth-normal.woff2')}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
    @font-face { font-family: Inter; src: url(${font('inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }`
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  for (const c of CARDS) {
    const dark = Boolean(c.ground)
    const bg = c.ground || '#f2f0eb', fg = dark ? '#f2f0eb' : '#141414', muted = dark ? 'rgba(242,240,235,0.72)' : '#5f5d58', rule = dark ? 'rgba(242,240,235,0.35)' : '#141414'
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      ${FONTS}
      * { box-sizing: border-box; margin: 0; }
      body { width: 1200px; height: 630px; background: ${bg}; color: ${fg}; font-family: Inter, sans-serif; padding: 56px 64px 52px; display: grid; grid-template-rows: auto 1fr auto; }
      .top { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid ${rule}; padding-bottom: 18px; }
      .mark { font-family: Archivo; font-weight: 500; font-size: 30px; letter-spacing: -0.03em; }
      .mark b { color: #fc4c02; font-weight: inherit; }
      .k { font-size: 16px; letter-spacing: 0.09em; text-transform: uppercase; color: ${muted}; font-weight: 500; }
      .mid { align-self: center; }
      .t { font-family: Archivo; font-weight: 640; font-size: 112px; line-height: 0.92; letter-spacing: -0.05em; }
      .l { margin-top: 22px; font-size: 30px; line-height: 1.3; max-width: 980px; color: ${muted}; }
      .num { display: flex; align-items: baseline; gap: 20px; border-top: 1px solid ${dark ? rule : '#d9d6ce'}; padding-top: 18px; }
      .num strong { font-family: Archivo; font-weight: 560; font-size: 60px; letter-spacing: -0.04em; line-height: 1; color: ${c.hot || dark ? '#fc4c02' : fg}; }
      .num span { font-size: 22px; color: ${muted}; }
    </style></head><body>
      <div class="top"><span class="mark">Showing up<b>.</b></span><span class="k">${esc(c.k)}</span></div>
      <div class="mid"><p class="t">${esc(c.t)}</p><p class="l">${esc(c.l)}</p></div>
      <div class="num"><strong>${esc(c.v)}</strong><span>${esc(c.u)}</span></div>
    </body></html>`, { waitUntil: 'load' })
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: path.join(OUT, `${c.slug}.png`) })
  }
  await b.close()
  console.log(`share cards drawn for ${CARDS.length} parts and mountains`)
}

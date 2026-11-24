// Render My Book to an A4 PDF: public/book/showing-up-gerald-tesha.pdf
//
// Builds on the running site: start `npx vite preview --port 4173` (after
// `npm run build`), then run `node scripts/book_pdf.mjs`. The page is laid out
// with print styles from the start, at the width of the A4 text block, so every
// chart is measured at the size it will print. Re-run after each data refresh
// so the download matches the site; the Print button on the page always gives
// the current figures.
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

//
// With --years it renders instead one small book a year, from #/book/<year>,
// into public/book/showing-up-<year>.pdf (--year 2026 renders just that one).
// Re-run --year for the running year after each weekly refresh.
const BASE = process.env.BOOK_BASE || 'http://localhost:4173/'
const exe = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
const argv = process.argv.slice(2)
const one = argv.includes('--year') ? argv[argv.indexOf('--year') + 1] : null
const JOBS = []
if (argv.includes('--years') || one) {
  const csv = fs.readFileSync('public/data/activities.csv', 'utf8').split('\n').slice(1)
  const years = [...new Set(csv.map((l) => l.slice(l.indexOf(',') + 1, l.indexOf(',') + 5)).filter((y) => /^20\d\d$/.test(y)))].sort()
  for (const y of years) if (!one || one === y) JOBS.push({ url: `${BASE}#/book/${y}`, out: `public/book/showing-up-${y}.pdf`, name: `${y} · Showing Up · Gerald Tesha` })
} else {
  JOBS.push({ url: process.env.BOOK_URL || `${BASE}#/book`, out: process.env.BOOK_OUT || 'public/book/showing-up-gerald-tesha.pdf', name: 'Showing Up · Gerald Tesha' })
}

const browser = await chromium.launch(exe ? { executablePath: exe } : {})
for (const { url: URL, out: OUT, name: NAME } of JOBS) {
// A4 is 210 mm wide; less 15 mm margins each side leaves 180 mm, about 680 px.
// The page is laid out at 960 px, where the grid keeps its desktop columns, and
// scaled down to fit (the print styles size the bleed pages with the same scale).
const SCALE = 680 / 960
const page = await browser.newPage({ viewport: { width: 960, height: 1400 }, deviceScaleFactor: 2 })
await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.bk-back', { timeout: 60000 })
await page.evaluate(() => document.fonts.ready)
// let every chart settle at its final state
await page.waitForTimeout(5000)
await page.evaluate((k) => { document.documentElement.classList.add('pdf-scaled'); document.documentElement.style.setProperty('--k', String(k)); window.dispatchEvent(new Event('resize')) }, 680 / 960)
await page.evaluate((t) => { document.title = t }, NAME)
await page.waitForTimeout(500)

const footer = `<div style="width:100%;padding:0 15mm;display:flex;justify-content:space-between;font-family:Arial,Helvetica,sans-serif;font-size:7px;letter-spacing:0.08em;text-transform:uppercase;color:#6b6b6b;"><span>${NAME.replace(/·/g, '&middot;')}</span><span class="pageNumber"></span></div>`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const opts = { printBackground: true, preferCSSPageSize: true, scale: SCALE, tagged: true, outline: true }
await page.pdf({ ...opts, path: OUT, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer })

// The cover, the part openers and the back cover bleed to the edge and carry no
// page number. Chromium prints the footer on every page, so when qpdf and
// pdftotext are at hand, those pages are swapped for a copy printed without it.
const has = (cmd) => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true } catch { return false } }
if (has('qpdf') && has('pdftotext')) {
  const plain = OUT.replace(/\.pdf$/, '.plain.pdf')
  const numbered = OUT.replace(/\.pdf$/, '.numbered.pdf')
  fs.renameSync(OUT, numbered)
  await page.pdf({ ...opts, path: plain, displayHeaderFooter: false })
  const pages = execFileSync('pdftotext', ['-layout', numbered, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\f').filter((p, i, a) => i < a.length - 1 || p.trim())
  const bleed = new Set(pages.map((t, i) => (i === 0 || i === pages.length - 1 || /^\s*PART (ONE|TWO|THREE|FOUR|FIVE)\b/m.test(t) ? i + 1 : 0)).filter(Boolean))
  const args = [numbered, '--pages']
  for (let p = 1; p <= pages.length; p++) args.push(bleed.has(p) ? plain : numbered, String(p))
  args.push('--', OUT)
  execFileSync('qpdf', args)
  fs.unlinkSync(plain); fs.unlinkSync(numbered)
}
await page.close()
const mb = (fs.statSync(OUT).size / 1048576).toFixed(1)
console.log(`wrote ${OUT} (${mb} MB)`)
}
await browser.close()

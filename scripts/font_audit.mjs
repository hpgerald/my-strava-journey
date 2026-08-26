import { chromium } from 'playwright-core'

const BASE = 'http://localhost:4173/#'
const ROUTES = ['/', '/numbers', '/sports', '/sports/run', '/records', '/where',
  '/rhythm', '/gear', '/timeline', '/what-it-means', '/about', '/design']

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const allFonts = {}
let problems = []

for (const r of ROUTES) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  // walk every element with visible text; collect the actually-rendered font
  const res = await page.evaluate(() => {
    const out = {}
    const bad = []
    const walk = document.querySelectorAll('body *')
    for (const el of walk) {
      if (!el.textContent || !el.textContent.trim()) continue
      // only leaf-ish text nodes
      const hasDirectText = Array.from(el.childNodes).some(
        n => n.nodeType === 3 && n.textContent.trim()
      )
      if (!hasDirectText) continue
      const ff = getComputedStyle(el).fontFamily
      const first = ff.split(',')[0].replace(/["']/g, '').trim()
      out[first] = (out[first] || 0) + 1
      if (/mono|courier|times|georgia|serif|plex/i.test(first) &&
          !/sans-serif/i.test(first)) {
        bad.push({ tag: el.tagName, cls: el.className, ff: first,
          txt: el.textContent.trim().slice(0, 40) })
      }
    }
    return { out, bad }
  })
  for (const [k, v] of Object.entries(res.out)) allFonts[k] = (allFonts[k] || 0) + v
  if (res.bad.length) problems.push({ route: r, bad: res.bad })
}

console.log('=== rendered first-choice font families (across all pages) ===')
console.log(allFonts)
console.log('\n=== suspicious (serif/mono/plex) elements ===')
console.log(problems.length ? JSON.stringify(problems, null, 2) : 'NONE — clean.')

await browser.close()

import { chromium } from 'playwright-core'
const BASE = 'http://localhost:4173/#'
const PAGES = [['m-sports', '/sports'], ['m-gear', '/gear'], ['m-numbers', '/numbers'], ['m-wim', '/what-it-means']]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 360, height: 800 } })
let maxScroll = 0
for (const [name, route] of PAGES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  maxScroll = Math.max(maxScroll, overflow)
  await page.screenshot({ path: `/home/claude/shots/${name}.png`, fullPage: true })
  console.log(name, 'h-overflow px:', overflow)
}
console.log('max horizontal overflow:', maxScroll)
await browser.close()

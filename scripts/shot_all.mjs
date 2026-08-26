import { chromium } from 'playwright-core'
import fs from 'fs'

const BASE = 'http://localhost:4173/#'
const PAGES = [
  ['home', '/'], ['numbers', '/numbers'], ['sports', '/sports'],
  ['sport-run', '/sports/run'], ['records', '/records'], ['where', '/where'],
  ['rhythm', '/rhythm'], ['gear', '/gear'], ['timeline', '/timeline'],
  ['what-it-means', '/what-it-means'],
]
const OUT = '/home/claude/shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 })

for (const [name, route] of PAGES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot', name)
}
await browser.close()

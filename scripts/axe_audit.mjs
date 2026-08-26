import { chromium } from 'playwright-core'
import fs from 'fs'

const AXE = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const BASE = 'http://localhost:4173/#'
const ROUTES = ['/', '/numbers', '/sports', '/records', '/where', '/rhythm', '/gear', '/timeline', '/what-it-means']

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
let total = 0
for (const r of ROUTES) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.evaluate(AXE)
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length,
      sample: v.nodes[0]?.target?.join(' ') }))
  })
  total += res.reduce((a, v) => a + v.n, 0)
  console.log(`${r.padEnd(16)} ${res.length ? JSON.stringify(res) : 'clean'}`)
}
console.log('\nTOTAL violations:', total)
await browser.close()

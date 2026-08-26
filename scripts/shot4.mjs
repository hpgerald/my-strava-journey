import { chromium } from 'playwright-core'
const BASE='http://localhost:4173/#'
const P=[['home','/'],['about','/about'],['rhythm','/rhythm'],['timeline','/timeline']]
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})
const p=await b.newPage({viewport:{width:1280,height:1000}})
for(const [n,r] of P){await p.goto(BASE+r,{waitUntil:'networkidle'});await p.waitForTimeout(800);
await p.screenshot({path:`/home/claude/shots/${n}.png`,fullPage:true});console.log('shot',n)}
await b.close()

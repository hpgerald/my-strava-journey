import { chromium } from 'playwright-core'
const BASE='http://localhost:4173/#'
const P=[['m-records','/records'],['m-where','/where']]
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})
const p=await b.newPage({viewport:{width:360,height:800}})
let mx=0
for(const [n,r] of P){await p.goto(BASE+r,{waitUntil:'networkidle'});await p.waitForTimeout(700);
const o=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
mx=Math.max(mx,o);await p.screenshot({path:`/home/claude/shots/${n}.png`,fullPage:true});console.log(n,'overflow',o)}
console.log('max overflow',mx);await b.close()

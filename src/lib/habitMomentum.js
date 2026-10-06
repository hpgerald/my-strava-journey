// The habit as a Markov process. From the daily active/rest series we read two
// conditional-probability curves that together describe the "physics" of the
// streak:
//   stick[L]   = P(the run reaches L+1 | it has already reached L)   — momentum
//   rebound[g] = P(active tomorrow | g days since the last activity) — rust
// Both are measured only from the switched-on era (the dormant years would
// drown the signal). They share one origin: the day after an active day.
const DAY = 86400000

export function computeHabitMomentum(activeSet, firstISO, lastISO, switchISO = '2021-07-01', maxL = 30) {
  if (!firstISO || !lastISO || !activeSet) return null
  const start = Date.parse(firstISO + 'T00:00:00Z')
  const end = Date.parse(lastISO + 'T00:00:00Z')
  const sw = Date.parse(switchISO + 'T00:00:00Z')
  const n = Math.round((end - start) / DAY) + 1
  if (n < 30) return null

  const a = new Array(n)
  for (let i = 0; i < n; i++) a[i] = activeSet.has(new Date(start + i * DAY).toISOString().slice(0, 10)) ? 1 : 0
  // current run length at each day
  const run = new Array(n)
  let r = 0
  for (let i = 0; i < n; i++) { r = a[i] ? r + 1 : 0; run[i] = r }
  const swIdx = Math.max(1, Math.round((sw - start) / DAY))

  // overall and before/after transition probabilities
  const trans = (lo, hi) => {
    let a1 = 0, a1n = 0, a0 = 0, a0n = 0
    for (let i = Math.max(1, lo); i < hi; i++) {
      if (a[i - 1] === 1) { a1++; if (a[i] === 1) a1n++ } else { a0++; if (a[i] === 1) a0n++ }
    }
    return { p11: a1 ? a1n / a1 : 0, p01: a0 ? a0n / a0 : 0, active: (hi - lo) ? 0 : 0 }
  }
  const after = trans(swIdx, n)
  const before = trans(1, swIdx)

  // stick[L] = P(extend | streak >= L), via difference arrays over post-switch days
  const num = new Array(maxL + 2).fill(0)
  const den = new Array(maxL + 2).fill(0)
  for (let i = swIdx; i < n - 1; i++) {
    const L = Math.min(run[i], maxL)
    if (L < 1) continue
    den[1] += 1; den[L + 1] -= 1
    if (a[i + 1] === 1) { num[1] += 1; num[L + 1] -= 1 }
  }
  for (let L = 1; L <= maxL; L++) { num[L] += num[L - 1] || 0; den[L] += den[L - 1] || 0 }
  const stick = []
  for (let L = 1; L <= maxL; L++) if (den[L] >= 5) stick.push({ L, p: num[L] / den[L], n: den[L] })

  // rebound[g] = P(active tomorrow | g days since last activity), post-switch
  const gNum = {}, gDen = {}
  let gap = 0, seen = false
  for (let i = swIdx; i < n - 1; i++) {
    if (a[i] === 1) { gap = 0; seen = true } else if (seen) gap += 1
    if (!seen) continue
    gDen[gap] = (gDen[gap] || 0) + 1
    if (a[i + 1] === 1) gNum[gap] = (gNum[gap] || 0) + 1
  }
  const rebound = []
  for (let g = 0; g <= 5; g++) if ((gDen[g] || 0) >= 5) rebound.push({ g, p: (gNum[g] || 0) / gDen[g], n: gDen[g] })

  const activeFrac = a.slice(swIdx).reduce((s, v) => s + v, 0) / (n - swIdx)
  return { stick, rebound, after, before, activeFrac, origin: after.p11 }
}

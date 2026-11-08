// Two charts set side by side must read as one pair: their plots start on the
// same line and, where they can, end on the same line. Charts differ in what
// sits above the plot (a colour key, a caption), so after layout this measures
// where each plot really starts and pushes the higher one down by the
// difference. A chart drawn in HTML that stretches (bars, a table) then also
// ends where its partner ends. Stacked pairs (phones) are left alone.

// the plot of a figure: its largest drawing, or the chart's own body when the
// chart is built from HTML rather than SVG; a figure made of many small
// drawings (a grid of rings) is measured as a whole
export function plotOf(fig) {
  const box = fig.querySelector('.sgrid__chart') || fig
  const svgs = [...box.querySelectorAll('svg')].filter((s) => !s.closest('.hb__refk, .cb__key, .chron__key') && s.getBoundingClientRect().height > 80)
  if (svgs.length >= 1 && svgs.length < 4) {
    return svgs.sort((a, b) => b.getBoundingClientRect().height * b.getBoundingClientRect().width - a.getBoundingClientRect().height * a.getBoundingClientRect().width)[0]
  }
  // an HTML chart (or a grid of many small drawings): its body, below any key it carries
  const tallest = (els) => els.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0]
  const isKey = (c) => /key|refk|legend/i.test(typeof c.className === 'string' ? c.className : '')
  let el = tallest([...box.children])
  for (let k = 0; k < 3 && el; k++) {
    const kids = [...el.children]
    if (!kids.some(isKey)) break
    el = tallest(kids.filter((c) => !isKey(c)))
  }
  return el || null
}

// where a plot sits: an svg chart by its baseline (the long axis line at the
// bottom, where the bars stand), anything else by its top edge
function anchorOf(p, fig) {
  const ft = fig.getBoundingClientRect().top
  if (p.tagName.toLowerCase() === 'svg') {
    const w = p.getBoundingClientRect().width
    let base = null
    p.querySelectorAll('line, path').forEach((l) => {
      if (l.tagName.toLowerCase() === 'path' && !/^M[\d.\s-]+[HL][\d.\s-]+$/.test(l.getAttribute('d') || '')) return
      const r = l.getBoundingClientRect()
      if (r.width >= w * 0.5 && r.height <= 3 && (base === null || r.top > base)) base = r.top
    })
    if (base !== null) return { y: base - ft, kind: 'base' }
  }
  return { y: p.getBoundingClientRect().top - ft, kind: 'top' }
}

// Every pair is worked on in step with the others: all measured, then all
// moved, then all measured again, so the page is laid out a few times in all
// rather than a few times for every pair.
const holderOf = (p) => (p.tagName.toLowerCase() === 'svg' ? p.parentElement : p)
// an svg moves by its wrapper's padding, an HTML chart by its own margin
const propOf = (p) => (p.tagName.toLowerCase() === 'svg' ? 'paddingTop' : 'marginTop')
// the difference between the two plots: two svg charts line up on their
// baselines, otherwise on their tops; measured against each figure, so an
// entrance animation on a figure does not count
const gapOf = (x) => {
  const an = x.plots.map((p, i) => anchorOf(p, x.figs[i]))
  if (an[0].kind === 'base' && an[1].kind === 'base') return an[0].y - an[1].y
  const top = (i) => x.plots[i].getBoundingClientRect().top - x.figs[i].getBoundingClientRect().top
  return top(0) - top(1)
}
const setShift = (x, sh) => x.plots.forEach((p, i) => {
  const h = holderOf(p)
  h.style.transition = 'none'
  h.style[propOf(p)] = sh[i] ? `${Math.round(sh[i])}px` : ''
  if (sh[i]) h.dataset.pairShift = '1'; else delete h.dataset.pairShift
})

export function alignPairs(root, only) {
  if (!root) return
  const pairs = only || [...root.querySelectorAll('.sgrid__pair')]
  // 1. the pairs of two figures
  const all = []
  pairs.forEach((pair) => {
    const figs = [...pair.querySelectorAll(':scope > figure')]
    if (figs.length !== 2) return
    all.push({ pair, figs })
  })
  // 2. find each pair's plots and whether it is side by side (reads only; the
  //    old shifts are read off the styles, so nothing is written yet)
  all.forEach((x) => {
    x.plots = x.figs.map(plotOf)
    if (!x.plots[0] || !x.plots[1]) return
    const fr = x.figs.map((f) => f.getBoundingClientRect())
    x.side = Math.abs(fr[0].top - fr[1].top) <= 8 && fr[0].width >= 120 && fr[1].width >= 120
    x.was = x.plots.map((p) => { const h = holderOf(p); return h.dataset.pairShift ? parseFloat(h.style[propOf(p)]) || 0 : 0 })
    if (x.side) x.d = gapOf(x)
  })
  // 3. the shift each pair needs, from where its plots would be with no shift
  const todo = []
  all.forEach((x) => {
    if (!x.plots || !x.plots[0] || !x.plots[1]) return
    if (!x.side) { if (x.was[0] || x.was[1]) setShift(x, [0, 0]); return }
    const raw = x.d - x.was[0] + x.was[1]
    x.raw = raw
    x.shift = Math.abs(raw) >= 1.5 && Math.abs(raw) <= 140 ? (raw < 0 ? [-raw, 0] : [0, raw]) : [0, 0]
    if (Math.abs(x.shift[0] - x.was[0]) >= 1 || Math.abs(x.shift[1] - x.was[1]) >= 1) todo.push(x)
  })
  // 4. move them all (writes), then check them all (reads), a few rounds, as
  //    moving one plot can move the other
  let round = todo
  for (let pass = 0; pass < 3 && round.length; pass++) {
    round.forEach((x) => setShift(x, x.shift))
    round.forEach((x) => { x.d2 = gapOf(x) })
    const next = []
    round.forEach((x) => {
      const before = pass ? x.dPrev : x.raw
      // a layout where both plots move together cannot be aligned this way: undo
      if (Math.abs(x.d2) >= Math.abs(before) - 1 && Math.abs(x.d2) >= 1.5) { x.shift = x.ok || [0, 0]; setShift(x, x.shift); return }
      x.ok = [...x.shift]
      if (Math.abs(x.d2) < 1.5) return
      const hi = x.d2 < 0 ? 0 : 1, lo = 1 - hi
      const s2 = [...x.shift]
      if (s2[lo] > 0) s2[lo] = Math.max(0, s2[lo] - Math.abs(x.d2))
      else s2[hi] += Math.abs(x.d2)
      x.shift = s2
      x.dPrev = x.d2
      next.push(x)
    })
    round = next
  }
}

// a mutation that brings in a new element (a chart drawn or redrawn), as
// against a number counting up, which only swaps text
export const addsElement = (m) => m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1)

// The pair heights of every section, measured together: all checks (reads),
// then all figures freed (writes), then all heights (reads), then all put back
// (writes). Two layouts of the page in all, however many pairs there are.
const queue = new Set()
let frame = 0
const flush = () => {
  frame = 0
  const jobs = [...queue].filter((j) => j.check())
  queue.clear()
  jobs.forEach((j) => j.free())
  jobs.forEach((j) => j.read())
  jobs.forEach((j) => j.done())
}
export function queuePairMeasure(job) {
  queue.add(job)
  // two frames on, so the charts have drawn at their new size first
  if (!frame) frame = requestAnimationFrame(() => { frame = requestAnimationFrame(flush) })
}

// keep every pair in a page aligned as charts load, resize and redraw
export function watchPairs(root) {
  if (!root || typeof window === 'undefined') return () => {}
  let t = 0
  const run = () => { clearTimeout(t); t = setTimeout(() => alignPairs(root), 120) }
  // a chart that redraws at a new height changes its figure's size, not the page's
  // children, so watch every figure in a pair as well
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null
  const seen = new WeakSet()
  const scan = () => { if (ro) root.querySelectorAll('.sgrid__pair > figure').forEach((f) => { if (!seen.has(f)) { seen.add(f); ro.observe(f) } }) }
  const mo = new MutationObserver((list) => { if (list.some(addsElement)) { scan(); run() } })
  mo.observe(root, { childList: true, subtree: true })
  window.addEventListener('resize', run)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run)
  scan()
  run()
  return () => { mo.disconnect(); if (ro) ro.disconnect(); window.removeEventListener('resize', run); clearTimeout(t) }
}

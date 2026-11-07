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

export function alignPairs(root) {
  if (!root) return
  root.querySelectorAll('.sgrid__pair').forEach((pair) => {
    const figs = [...pair.querySelectorAll(':scope > figure')]
    if (figs.length !== 2) return
    const plots = figs.map(plotOf)
    const holder = (p) => (p && p.tagName.toLowerCase() === 'svg' ? p.parentElement : p)
    // an svg moves by its wrapper's padding, an HTML chart by its own margin
    const prop = (p) => (p.tagName.toLowerCase() === 'svg' ? 'paddingTop' : 'marginTop')
    plots.forEach((p) => { const h = p && holder(p); if (h && h.dataset.pairShift) { h.style[prop(p)] = ''; delete h.dataset.pairShift } })
    if (!plots[0] || !plots[1]) return
    const fr = figs.map((f) => f.getBoundingClientRect())
    if (Math.abs(fr[0].top - fr[1].top) > 8 || fr[0].width < 120 || fr[1].width < 120) return
    // measured against each figure, so an entrance animation on a figure does not
    // count; a few passes, because moving one plot can move the other
    // two svg charts line up on their baselines; otherwise on their tops
    const gap = () => {
      const an = plots.map((p, i) => anchorOf(p, figs[i]))
      if (an[0].kind === 'base' && an[1].kind === 'base') return an[0].y - an[1].y
      return (plots[0].getBoundingClientRect().top - figs[0].getBoundingClientRect().top) - (plots[1].getBoundingClientRect().top - figs[1].getBoundingClientRect().top)
    }
    const apply = (sh) => plots.forEach((p, i) => { const h = holder(p); h.style.transition = 'none'; h.style[prop(p)] = sh[i] ? `${Math.round(sh[i])}px` : ''; if (sh[i]) h.dataset.pairShift = '1'; else delete h.dataset.pairShift })
    let shift = [0, 0]
    let d = gap()
    for (let pass = 0; pass < 4 && Math.abs(d) >= 1.5 && Math.abs(d) <= 140; pass++) {
      // move the higher plot down, or bring the other back up if it was moved
      const hi = d < 0 ? 0 : 1, lo = 1 - hi
      const next = [...shift]
      if (next[lo] > 0) next[lo] = Math.max(0, next[lo] - Math.abs(d))
      else next[hi] += Math.abs(d)
      apply(next)
      const d2 = gap()
      // a layout where both plots move together cannot be aligned this way: undo
      if (Math.abs(d2) >= Math.abs(d) - 1) { apply(shift); break }
      shift = next
      d = d2
    }
  })
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
  const mo = new MutationObserver((list) => { if (list.some((m) => m.type === 'childList')) { scan(); run() } })
  mo.observe(root, { childList: true, subtree: true })
  window.addEventListener('resize', run)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run)
  scan()
  run()
  return () => { mo.disconnect(); if (ro) ro.disconnect(); window.removeEventListener('resize', run); clearTimeout(t) }
}

// The scroll-linked layer. One pass per scroll frame writes two progress values
// on every element that asks for them with [data-fx]:
//   --fx-in   0 while the element is below the screen, 1 once its top reaches the top
//   --fx-out  0 while its top is still on screen, 1 once it has scrolled fully past
// CSS turns those numbers into calm, scrubbed motion (see studio.css, "scenes").
// The element list is cached and refreshed when the page changes.
export function createScrollFx() {
  let els = []
  let dirty = true
  let main = null, foot = null, tail = ''
  const mo = typeof MutationObserver !== 'undefined'
    ? new MutationObserver(() => { dirty = true })
    : null
  if (mo) mo.observe(document.body, { childList: true, subtree: true })

  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const set = (el, k, v) => {
    const s = v.toFixed(3)
    if (el.dataset[k] !== s) { el.dataset[k] = s; el.style.setProperty(k === 'fxi' ? '--fx-in' : '--fx-out', s) }
  }

  function update() {
    if (dirty) {
      els = [...document.querySelectorAll('[data-fx]')].filter((el) => !el.closest('.book'))
      main = document.querySelector('main'); foot = document.querySelector('.sfoot')
      dirty = false
    }
    const vh = window.innerHeight || 1
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.bottom < -vh || r.top > vh * 2) continue
      set(el, 'fxi', clamp((vh - r.top) / vh))
      set(el, 'fxo', clamp(-r.top / Math.max(1, r.height)))
      // a pinned scene: how far through the run its first child has travelled
      if (el.dataset.fx === 'pin' && el.firstElementChild) {
        const run = Math.max(1, r.height - el.firstElementChild.offsetHeight)
        const p = clamp(-r.top / run).toFixed(3)
        if (el.dataset.fxp !== p) { el.dataset.fxp = p; el.style.setProperty('--fx-pin', p) }
      }
    }
    // the page's tail: 0 until the end of the content lifts off the footer, 1 when
    // the footer is fully uncovered
    if (main && foot) {
      const mb = main.getBoundingClientRect().bottom
      const t = clamp((vh - mb) / Math.max(1, foot.offsetHeight)).toFixed(3)
      if (t !== tail) { tail = t; document.documentElement.style.setProperty('--fx-tail', t) }
    }
  }

  function destroy() {
    if (mo) mo.disconnect()
    for (const el of els) { el.style.removeProperty('--fx-in'); el.style.removeProperty('--fx-out'); el.style.removeProperty('--fx-pin') }
    document.documentElement.style.removeProperty('--fx-tail')
    els = []
  }

  return { update, destroy, refresh: () => { dirty = true } }
}

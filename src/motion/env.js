// When motion is allowed: never under prefers-reduced-motion, never for an
// automated browser (the PDF renderer, the audits), never inside My Book.
export function motionOK() {
  if (typeof window === 'undefined') return false
  if (navigator.webdriver) return false
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

// a real mouse or trackpad, where a custom cursor and magnetic hover make sense
export function finePointer() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

// the shared smooth-scroll instance, when there is one
export const lenisRef = { current: null }

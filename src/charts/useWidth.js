import { useState, useEffect, useRef } from 'react'

// Measure a container's width so SVG charts can be responsive without a viewBox
// that distorts stroke widths.
export function useWidth(initial = 640) {
  const ref = useRef(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    // the observer reports the first width itself, right after the page is
    // laid out, so nothing here asks the browser to lay the page out early
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w) setWidth((prev) => (Math.abs(w - prev) > 1 ? w : prev))
    })
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [ref, width]
}

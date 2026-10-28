import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { lenisRef } from '../motion/env.js'

// Scroll to the top on every route change (hash navigations don't do this on their own).
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

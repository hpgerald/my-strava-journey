import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scroll to the top on every route change (hash navigations don't do this on their own).
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
